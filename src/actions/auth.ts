'use server';

import bcrypt from 'bcryptjs';
import { requireSession, requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireTierFeature } from '@/lib/tierGuard';
import { getLicenseInfo } from '@/lib/license';

import { AVATAR_COLORS } from '@/lib/constants';

// ─── Admin: User Management ───────────────────────────────────────────────────

export async function createUser(
  email: string,
  name: string,
  password: string,
  role: 'user' | 'admin' = 'user',
): Promise<{ success: true } | { error: string }> {
  await requireAdmin();

  if (!email?.trim() || !name?.trim()) return { error: 'Email and name are required' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters' };

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return { error: 'A user with this email already exists.' };

  const passwordHash = await bcrypt.hash(password, 12);
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  await prisma.user.create({
    data: { email: email.toLowerCase(), name: name.trim(), passwordHash, role, color },
  });

  return { success: true };
}

export async function updateUser(
  userId: string,
  data: { name?: string; role?: string; password?: string },
): Promise<void> {
  await requireAdmin();

  const update: Record<string, unknown> = {};
  if (data.name) update.name = data.name.trim();
  if (data.role) update.role = data.role;
  if (data.password) {
    if (data.password.length < 8) throw new Error('Password must be at least 8 characters');
    update.passwordHash = await bcrypt.hash(data.password, 12);
  }

  await prisma.user.update({ where: { id: userId }, data: update });
}

export async function deleteUser(userId: string): Promise<void> {
  const session = await requireAdmin();
  if (userId === session.user.id) throw new Error('Cannot delete your own account');
  await prisma.user.delete({ where: { id: userId } });
}

export async function listUsers() {
  await requireAdmin();
  return prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, color: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

// ─── Profile ──────────────────────────────────────────────────────────────────

const ALLOWED_LOGO_PREFIXES = [
  'data:image/png;base64,',
  'data:image/jpeg;base64,',
  'data:image/webp;base64,',
] as const;

function validateCompanyLogo(logo: string): void {
  if (logo.length > 280_000) throw new Error('Company logo too large (max ~200KB)');
  const allowed = ALLOWED_LOGO_PREFIXES.some((p) => logo.startsWith(p));
  if (!allowed) throw new Error('Company logo must be a PNG, JPEG, or WebP image');
  const base64 = logo.split(',')[1] ?? '';
  if (!/^[A-Za-z0-9+/]+=*$/.test(base64)) throw new Error('Company logo contains invalid data');
}

export async function updateUserProfile(data: {
  name?: string;
  color?: string;
  companyName?: string;
  companyLogo?: string;
  // CSAF publisher profile
  csafPublisherName?: string;
  csafPublisherNamespace?: string;
  csafPublisherCategory?: string;
  csafIssuingAuthority?: string;
  csafContactDetails?: string;
}) {
  const session = await requireSession();
  if (data.companyLogo) {
    await requireTierFeature('whiteLabel');
    validateCompanyLogo(data.companyLogo);
  }
  const VALID_CATEGORIES = ['vendor', 'coordinator', 'discoverer', 'other'];
  return prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: data.name?.trim(),
      color: data.color,
      companyName: data.companyName?.trim(),
      companyLogo: data.companyLogo,
      ...(data.csafPublisherName !== undefined && { csafPublisherName: data.csafPublisherName.trim().slice(0, 256) || null }),
      ...(data.csafPublisherNamespace !== undefined && { csafPublisherNamespace: data.csafPublisherNamespace.trim().slice(0, 512) || null }),
      ...(data.csafPublisherCategory && VALID_CATEGORIES.includes(data.csafPublisherCategory) && { csafPublisherCategory: data.csafPublisherCategory }),
      ...(data.csafIssuingAuthority !== undefined && { csafIssuingAuthority: data.csafIssuingAuthority.trim().slice(0, 512) || null }),
      ...(data.csafContactDetails !== undefined && { csafContactDetails: data.csafContactDetails.trim().slice(0, 1024) || null }),
    },
  });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await requireSession();
  if (!currentPassword || !newPassword) throw new Error('Both passwords are required');
  if (newPassword.length < 8) throw new Error('New password must be at least 8 characters');

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) throw new Error('User not found');
  if (!user.passwordHash) throw new Error('No password set');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error('Current password is incorrect');

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
}

export async function deleteAccount() {
  const session = await requireSession();
  await prisma.user.delete({ where: { id: session.user.id } });
}

// ─── License ──────────────────────────────────────────────────────────────────

export async function getLicenseStatus() {
  await requireAdmin();
  return getLicenseInfo();
}
