'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertProjectAccess, assertProjectWriteAccess } from '@/lib/access';
import { sanitizeDismissed } from '@/lib/modelCheckDismissed';

export async function getModelCheckDismissed(projectId: string): Promise<Record<string, string>> {
  const session = await requireSession();
  await assertProjectAccess(projectId, session.user.id);
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { modelCheckDismissed: true } });
  return sanitizeDismissed(p?.modelCheckDismissed);
}

/** Dismisses a finding with a reason, or restores it (reason = null). */
export async function setModelCheckDismissal(projectId: string, findingId: string, reason: string | null): Promise<Record<string, string>> {
  const session = await requireSession();
  await assertProjectWriteAccess(projectId, session.user.id);
  // ponytail: read-modify-write of one JSON column; concurrent edits in the same second can overwrite each other
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { modelCheckDismissed: true } });
  const next = sanitizeDismissed({ ...sanitizeDismissed(p?.modelCheckDismissed), ...(reason ? { [findingId]: reason } : {}) });
  if (!reason) delete next[findingId];
  await prisma.project.update({ where: { id: projectId }, data: { modelCheckDismissed: next } });
  return next;
}
