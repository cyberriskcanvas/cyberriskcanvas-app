'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { invalidateLicenseCache, validateKey } from '@/lib/license';
import type { LicenseInfo } from '@/lib/license';

export async function saveLicenseKey(key: string): Promise<LicenseInfo> {
  await requireAdmin();

  const trimmed = key.trim();

  await prisma.license.deleteMany({});
  if (trimmed) {
    await prisma.license.create({ data: { key: trimmed } });
  }

  invalidateLicenseCache();

  const info = trimmed ? await validateKey(trimmed) : { valid: false, licensee: null, expiresAt: null };
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
