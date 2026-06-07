import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getTier } from '@/lib/tierLimits';
import SettingsClient from '@/components/Settings/SettingsClient';

export const metadata: Metadata = {
  title: 'Account Settings - CyberRisk Canvas',
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [user, apiKeys, tier] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, name: true, email: true, companyName: true, companyLogo: true,
        passwordHash: true, role: true,
        csafPublisherName: true, csafPublisherNamespace: true,
        csafPublisherCategory: true, csafIssuingAuthority: true, csafContactDetails: true,
        memberships: {
          include: { team: { select: { id: true, name: true, type: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.apiKey.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    getTier(),
  ]);

  if (!user) redirect('/login');

  return (
    <SettingsClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        companyName: user.companyName ?? '',
        companyLogo: user.companyLogo ?? '',
        hasPassword: !!user.passwordHash,
        role: user.role,
        isPro: tier === 'pro',
        csafPublisherName: user.csafPublisherName ?? '',
        csafPublisherNamespace: user.csafPublisherNamespace ?? '',
        csafPublisherCategory: user.csafPublisherCategory ?? 'vendor',
        csafIssuingAuthority: user.csafIssuingAuthority ?? '',
        csafContactDetails: user.csafContactDetails ?? '',
        memberships: user.memberships.map((m) => ({
          id: m.id,
          role: m.role,
          team: { id: m.team.id, name: m.team.name, type: m.team.type },
        })),
      }}
      apiKeys={apiKeys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      }))}
    />
  );
}
