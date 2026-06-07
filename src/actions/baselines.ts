'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertProjectAccess, assertProjectWriteAccess } from '@/lib/access';
import { checkTierFeature } from '@/lib/tierGuard';
import { isTierBlock } from '@/lib/tierBlock';
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

  // Find the currently active version
  const activeVersion = await prisma.projectVersion.findFirst({
    where: { projectId, status: 'active' },
    orderBy: { number: 'desc' },
  });
  if (!activeVersion) throw new Error('No active version found for this project.');

  const { frozenVersionId, nextVersion } = await prisma.$transaction(async (tx) => {
    // Snapshot all diagram states
    const diagrams = await tx.diagram.findMany({
      where: { projectId },
      select: { id: true, nodes: true, edges: true, viewport: true },
    });

    await Promise.all(
      diagrams.map((d) =>
        tx.diagramVersion.create({
          data: {
            diagramId: d.id,
            userId: session.user.id,
            nodes: d.nodes as object,
            edges: d.edges as object,
            viewport: d.viewport as object,
            message: `Version ${activeVersion.number}: ${label.trim()} - ${frozenByName.trim()}`,
          },
        }),
      ),
    );

    // Freeze the active version
    await tx.projectVersion.update({
      where: { id: activeVersion.id },
      data: {
        status: 'frozen',
        label: label.trim(),
        frozenAt: new Date(),
        frozenByName: frozenByName.trim(),
      },
    });

    // Create the next active version
    const next = await tx.projectVersion.create({
      data: {
        projectId,
        number: activeVersion.number + 1,
        label: '',
        status: 'active',
      },
    });

    return { frozenVersionId: activeVersion.id, nextVersion: next };
  });

  revalidatePath('/');
  return { ok: true, frozenVersionId, newVersionId: nextVersion.id, newVersionNumber: nextVersion.number };
}

