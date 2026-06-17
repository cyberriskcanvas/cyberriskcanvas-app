'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { invalidateLicenseCache, validateKey } from '@/lib/license';
import type { LicenseInfo } from '@/lib/license';
import { audit } from '@/lib/audit';

export async function saveLicenseKey(key: string): Promise<LicenseInfo> {
  const session = await requireAdmin();

  const trimmed = key.trim();

  await prisma.license.deleteMany({});
  if (trimmed) {
    await prisma.license.create({ data: { key: trimmed } });
  }

  invalidateLicenseCache();

  const info = trimmed ? await validateKey(trimmed) : { valid: false, licensee: null, expiresAt: null };

  audit({
    action: trimmed ? 'license.save' : 'license.remove',
    actorId: session.user.id,
    actorEmail: session.user.email,
    targetType: 'license',
    // Never the key itself - only enough to recognise which one.
    details: trimmed
      ? { keySuffix: trimmed.slice(-4), valid: info.valid, licensee: info.licensee }
      : undefined,
  });

  revalidatePath('/', 'layout');
  return info;
}

export async function getLicenseKeyPreview(): Promise<string | null> {
  await requireAdmin();

  const license = await prisma.license.findFirst();
  if (!license?.key) return null;

  const key = license.key;
  return key.length > 4 ? '••••••••••••' + key.slice(-4) : '••••';
}
