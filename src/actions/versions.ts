'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertDiagramAccess, assertDiagramWriteAccess } from '@/lib/access';
import { MANUAL_VERSION_LIMIT, selectVersionsToPrune } from '@/lib/versionRetention';

const listSelect = {
  id: true, message: true, createdAt: true, projectVersionId: true,
  user: { select: { id: true, name: true, color: true } },
} as const;

export async function listVersions(diagramId: string) {
  const session = await requireSession();
  await assertDiagramAccess(diagramId, session.user.id);
  // Freeze snapshots are listed in full so they never drop out of sight behind newer manual versions.
  const [snapshots, manual] = await Promise.all([
    prisma.diagramVersion.findMany({ where: { diagramId, projectVersionId: { not: null } }, select: listSelect }),
    prisma.diagramVersion.findMany({
      where: { diagramId, projectVersionId: null },
      orderBy: { createdAt: 'desc' },
      take: MANUAL_VERSION_LIMIT,
      select: listSelect,
    }),
  ]);
  return [...snapshots, ...manual].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function createVersion(
  diagramId: string,
  nodes: unknown,
  edges: unknown,
  viewport: unknown,
  message?: string,
) {
  const session = await requireSession();
  await assertDiagramWriteAccess(diagramId, session.user.id);

  const diagram = await prisma.diagram.findUnique({ where: { id: diagramId, deletedAt: null } });
  if (!diagram) throw new Error('Diagram not found');

  const version = await prisma.diagramVersion.create({
    data: {
      diagramId,
      userId: session.user.id,
      nodes: (nodes ?? diagram.nodes) as object,
      edges: (edges ?? diagram.edges) as object,
      viewport: (viewport ?? diagram.viewport) as object,
      message: message?.trim() || null,
    },
    include: { user: { select: { id: true, name: true, color: true } } },
  });

  const all = await prisma.diagramVersion.findMany({
    where: { diagramId },
    select: { id: true, createdAt: true, projectVersionId: true },
  });
  const prune = selectVersionsToPrune(all);
  if (prune.length > 0) {
    // projectVersionId: null again here so a snapshot can never be deleted through this path.
    await prisma.diagramVersion.deleteMany({ where: { id: { in: prune }, projectVersionId: null } });
  }

  return version;
}

export async function getVersion(diagramId: string, versionId: string) {
  const session = await requireSession();
  await assertDiagramAccess(diagramId, session.user.id);
  return prisma.diagramVersion.findFirst({
    where: { id: versionId, diagramId },
    include: { user: { select: { id: true, name: true, color: true } } },
  });
}

export async function restoreVersion(diagramId: string, versionId: string) {
  const session = await requireSession();
  await assertDiagramWriteAccess(diagramId, session.user.id);

  const version = await prisma.diagramVersion.findFirst({ where: { id: versionId, diagramId } });
  if (!version) throw new Error('Version not found');

  const current = await prisma.diagram.findUnique({ where: { id: diagramId, deletedAt: null } });
  if (current) {
    await prisma.diagramVersion.create({
      data: {
        diagramId,
        userId: session.user.id,
        nodes: current.nodes as object,
        edges: current.edges as object,
        viewport: current.viewport as object,
        message: `Auto-saved before restore to ${new Date(version.createdAt).toLocaleString()}`,
      },
    });
  }

  return prisma.diagram.update({
    where: { id: diagramId, deletedAt: null },
    data: {
      nodes: version.nodes as object,
      edges: version.edges as object,
      viewport: version.viewport as object,
    },
  });
}
