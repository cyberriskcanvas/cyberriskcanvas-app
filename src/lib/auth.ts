import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { getTier } from './tierLimits';
import { getLicenseChangedAt } from './license';
import { TIER_CONFIG } from './tierConfig';
import { AVATAR_COLORS } from './constants';
import { isLoginBlocked, registerFailedLogin, clearLoginFailures } from './loginRateLimit';

/**
 * External identity providers (SSO), configured via env vars and gated behind
 * the Pro tier. Each entry is only active when its required env vars are set,
 * so a deployment can run without any of this configured at all.
 */
const SSO_PROVIDERS = {
  oidc: {
    enabled: Boolean(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET),
    name: process.env.OIDC_NAME || 'SSO',
  },
  'microsoft-entra-id': {
    enabled: Boolean(
      process.env.ENTRA_ID_CLIENT_ID && process.env.ENTRA_ID_CLIENT_SECRET && process.env.ENTRA_ID_TENANT_ID
    ),
    name: 'Microsoft',
  },
} as const;

/** SSO providers active in this deployment, for rendering sign-in buttons. */
export function getSsoProviders(): { id: string; name: string }[] {
  return Object.entries(SSO_PROVIDERS)
    .filter(([, config]) => config.enabled)
    .map(([id, config]) => ({ id, name: config.name }));
}

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      color: string;
      tier: string;
      role: string;
      companyName?: string | null;
      companyLogo?: string | null;
    } & Pick<import('next-auth').User, 'name' | 'email' | 'image'>;
  }
  interface User {
    color?: string;
    tier?: string;
    role?: string;
    companyName?: string | null;
    companyLogo?: string | null;
  }
}

async function buildUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  const tier = await getTier();
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    color: user.color,
    role: user.role,
    tier,
    companyName: user.companyName,
    companyLogo: user.companyLogo,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials, request) => {
        const email = String(credentials?.email ?? '').toLowerCase();
        const password = String(credentials?.password ?? '');
        if (!email || !password) return null;

        // Behind a reverse proxy the first x-forwarded-for hop is the client.
        const ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
        if (await isLoginBlocked(email, ip)) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) {
          // Count attempts against unknown accounts too - otherwise an
          // attacker could probe e-mail existence via the rate limiter.
          await registerFailedLogin(email, ip);
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          await registerFailedLogin(email, ip);
          return null;
        }

        await clearLoginFailures(email);
        return buildUser(user.id);
      },
    }),
    // Generic OIDC - works with Keycloak, Okta, Auth0, or any compliant IdP.
    ...(SSO_PROVIDERS.oidc.enabled
      ? [
          {
            id: 'oidc',
            name: SSO_PROVIDERS.oidc.name,
            type: 'oidc' as const,
            issuer: process.env.OIDC_ISSUER,
            clientId: process.env.OIDC_CLIENT_ID,
            clientSecret: process.env.OIDC_CLIENT_SECRET,
          },
        ]
      : []),
    ...(SSO_PROVIDERS['microsoft-entra-id'].enabled
      ? [
          MicrosoftEntraID({
            clientId: process.env.ENTRA_ID_CLIENT_ID!,
            clientSecret: process.env.ENTRA_ID_CLIENT_SECRET!,
            issuer: `https://login.microsoftonline.com/${process.env.ENTRA_ID_TENANT_ID}/v2.0`,
          }),
        ]
      : []),
  ],

  callbacks: {
    async signIn({ account, user, profile }) {
      // Credentials sign-in is fully validated in `authorize` already.
      if (!account || account.provider === 'credentials') return true;

      // External IdP sign-in (OIDC / Microsoft Entra ID) is a Pro feature.
      const tier = await getTier();
      if (!TIER_CONFIG[tier].sso) return '/login?error=SsoRequiresPro';

      const email = String(profile?.email ?? user.email ?? '').toLowerCase();
      if (!email) return '/login?error=SsoNoEmail';

      // Accounts are linked purely by e-mail, so an unverified address at the
      // IdP would allow taking over an existing local account. Reject when the
      // IdP explicitly marks the address unverified; absent claims are allowed
      // because some IdPs (e.g. Microsoft Entra ID) never send email_verified.
      if (profile?.email_verified === false) return '/login?error=SsoEmailUnverified';

      // Just-in-time provisioning: create the account on first SSO login.
      // Team membership stays an admin task, same as for manually created users.
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
        await prisma.user.create({
          data: {
            email,
            name: String(profile?.name ?? user.name ?? email),
            passwordHash: '',
            role: 'user',
            color,
          },
        });
      }

      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        // For external IdPs the provider's `user.id` is its own subject id,
        // not our database id - resolve the local account by e-mail instead.
        let userId = user.id;
        if (account && account.provider !== 'credentials') {
          const email = String(profile?.email ?? user.email ?? '').toLowerCase();
          const dbUser = email ? await prisma.user.findUnique({ where: { email } }) : null;
          if (!dbUser) return token;
          userId = dbUser.id;
        }

        const fresh = await buildUser(userId as string);
        if (!fresh) return token;
        token.id = fresh.id;
        token.color = fresh.color;
        token.tier = fresh.tier;
        token.role = fresh.role;
        token.companyName = fresh.companyName;
        token.companyLogo = fresh.companyLogo;
        token.tierRefreshedAt = Date.now();
        return token;
      }

      // Re-fetch tier from license every 5 minutes, or immediately when the
      // license key was changed (e.g. activated via the admin panel) since
      // the last refresh - so a freshly saved license shows up right away.
      const TIER_TTL_MS = 5 * 60 * 1000;
      const lastRefresh = (token.tierRefreshedAt as number | undefined) ?? 0;
      if (Date.now() - lastRefresh > TIER_TTL_MS || getLicenseChangedAt() > lastRefresh) {
        try {
          const fresh = await buildUser(token.id as string);
          // User no longer exists - invalidate the session instead of letting
          // the deleted account keep its (possibly admin) claims until expiry.
          if (!fresh) return null;
          token.tier = fresh.tier;
          token.role = fresh.role;
          token.companyName = fresh.companyName;
          token.companyLogo = fresh.companyLogo;
        } catch {
          // Transient DB error - keep the existing claims and retry after the TTL.
        }
        token.tierRefreshedAt = Date.now();
      }

      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.color = token.color as string;
        session.user.tier = token.tier as string;
        session.user.role = token.role as string;
        session.user.companyName = token.companyName as string | null;
        session.user.companyLogo = token.companyLogo as string | null;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
  },

  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
});

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return session;
}

/** Bootstrap the initial admin user from env vars on first start. */
export async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Admin';
  if (!email || !password) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const passwordHash = await bcrypt.hash(password, 12);
  const created = await prisma.user.create({
    data: { email, name, passwordHash, role: 'admin', color },
  });
  const { audit } = await import('./audit');
  audit({
    action: 'user.create',
    targetType: 'user',
    targetId: created.id,
    details: { email, role: 'admin', bootstrap: true },
  });
  console.warn(`[bootstrap] Admin user created: ${email}`);
}
