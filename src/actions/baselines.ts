'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertProjectAccess, assertProjectWriteAccess } from '@/lib/access';
import { audit } from '@/lib/audit';
import { checkTierFeature } from '@/lib/tierGuard';
import { isTierBlock } from '@/lib/tierBlock';
import { freezeActiveVersion } from '@/lib/freeze';
import { revalidatePath } from 'next/cache';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the active (unfrozen) version for a project, or null if not found. */
export async function getActiveVersion(projectId: string) {
  const session = await requireSession();
  await assertProjectAccess(projectId, session.user.id);
  return prisma.projectVersion.findFirst({
    where: { projectId, status: 'active' },
    orderBy: { number: 'desc' },
    select: { id: true, number: true, status: true, label: true, frozenAt: true, frozenByName: true, createdAt: true },
  });
}

/** Lists all versions (frozen + active) for a project. */
export async function getProjectVersions(projectId: string) {
  const session = await requireSession();
  await assertProjectAccess(projectId, session.user.id);
  return prisma.projectVersion.findMany({
    where: { projectId },
    orderBy: { number: 'asc' },
    select: {
      id: true, number: true, status: true, label: true,
      frozenAt: true, frozenByName: true, createdAt: true,
      _count: { select: { sboms: true, vulnerabilities: true } },
    },
  });
}

// ─── Branch ───────────────────────────────────────────────────────────────────

/**
 * Sets the label on the current active version (created automatically by
 * freezeVersion) and returns the first diagram ID for navigation.
 */
export async function branchProject(projectId: string, label: string) {
  const access = await checkTierFeature('baselines');
  if (isTierBlock(access)) return access;

  const session = await requireSession();
  await assertProjectWriteAccess(projectId, session.user.id);

  const activeVersion = await prisma.projectVersion.findFirst({
    where: { projectId, status: 'active' },
    orderBy: { number: 'desc' },
  });
  if (!activeVersion) throw new Error('No active version found for this project.');

  if (label.trim()) {
    await prisma.projectVersion.update({
      where: { id: activeVersion.id },
      data: { label: label.trim() },
    });
  }

  const firstDiagram = await prisma.diagram.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  revalidatePath('/');
  return { firstDiagramId: firstDiagram?.id ?? null };
}

// ─── Freeze (replaces lockProject) ────────────────────────────────────────────

/**
 * Freezes the active version of a project and automatically creates a new
 * active version (number + 1).
 *
 * On freeze:
 * - DiagramVersion snapshots are created for all diagrams (existing mechanism).
 * - The active ProjectVersion is marked "frozen" with label + who approved.
 * - A new active ProjectVersion is inserted.
 */
export async function freezeVersion(projectId: string, label: string) {
  const access = await checkTierFeature('baselines');
  if (isTierBlock(access)) return access;

  const session = await requireSession();
  await assertProjectWriteAccess(projectId, session.user.id);
  const frozenByName = session.user.name ?? session.user.email ?? 'Unbekannt';

  const { frozenVersionId, frozenNumber, nextVersion } = await freezeActiveVersion({
    projectId, label, frozenByName, userId: session.user.id,
  });

  audit({
    action: 'version.freeze',
    actorId: session.user.id,
    actorEmail: session.user.email,
    targetType: 'version',
    targetId: frozenVersionId,
    details: { projectId, number: frozenNumber, label: label.trim(), frozenByName: frozenByName.trim() },
  });

  revalidatePath('/');
  return { ok: true, frozenVersionId, newVersionId: nextVersion.id, newVersionNumber: nextVersion.number };
}

