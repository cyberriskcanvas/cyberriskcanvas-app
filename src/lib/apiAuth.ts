import { createHash } from 'crypto';
import { type NextRequest } from 'next/server';
import { auth } from './auth';
import { prisma } from './db';
import { getTier } from './tierLimits';

// getTier() has a 1-day in-process cache - safe to call on every request.

export interface AuthResult {
  userId: string;
  tier: 'free' | 'pro';
  /** true when authenticated via API key (not session) */
  viaApiKey: boolean;
}

/**
 * Authenticates a request via NextAuth session OR Bearer API key.
 * Returns null when neither is valid.
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthResult | null> {
  // 1. Try session first (browser-based requests)
  const session = await auth();
  if (session?.user?.id) {
    // Always fetch the live tier - getTier() uses a 1-day in-process cache
    // so this is fast but never stale after a license key change.
    const tier = await getTier();
    return {
      userId: session.user.id,
      tier,
      viaApiKey: false,
    };
  }

  // 2. Try Bearer token
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith('crc_')) return null;

  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { id: true, userId: true },
  });
  if (!apiKey) return null;

  // Update lastUsedAt without blocking the response
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => { /* non-critical - ignore failures */ });

  const tier = await getTier();
  return { userId: apiKey.userId, tier, viaApiKey: true };
}

/**
 * Authenticates a pipeline request via Bearer CI token (`crci_…`).
 * Unlike authenticateRequest it never accepts sessions or user API keys, and the
 * result is bound to a single project.
 */
export async function authenticateCiToken(req: NextRequest): Promise<{ projectId: string; tokenId: string } | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith('crci_')) return null;

  const token = await prisma.ciToken.findUnique({
    where: { keyHash: createHash('sha256').update(rawKey).digest('hex') },
    select: { id: true, projectId: true },
  });
  if (!token) return null;

  prisma.ciToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } }).catch(() => { /* non-critical */ });
  return { projectId: token.projectId, tokenId: token.id };
}

/**
 * Generates a new API key.
 * Format: <prefix><64 hex chars>, prefix `crc_` for user keys and `crci_` for CI tokens.
 * Returns the raw key (shown once) and the hash + prefix to store.
 */
export function generateApiKey(keyPrefix: 'crc_' | 'crci_' = 'crc_'): { raw: string; hash: string; prefix: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const raw = `${keyPrefix}${hex}`;
  const hash = createHash('sha256').update(raw).digest('hex');
  const prefix = hex.slice(0, 8);
  return { raw, hash, prefix };
}
