'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertDiagramAccess, assertDiagramWriteAccess } from '@/lib/access';
import { checkTierFeature } from '@/lib/tierGuard';
import { isTierBlock } from '@/lib/tierBlock';

export async function listVersions(diagramId: string) {
  const session = await requireSession();
  await assertDiagramAccess(diagramId, session.user.id);
  return prisma.diagramVersion.findMany({
    where: { diagramId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true, message: true, createdAt: true,
      user: { select: { id: true, name: true, color: true } },
    },
  });
}

export async function createVersion(
  diagramId: string,
  nodes: unknown,
  edges: unknown,
  viewport: unknown,
  message?: string,
) {
  const access = await checkTierFeature('versions');
  if (isTierBlock(access)) return access;

  const session = await requireSession();
  await assertDiagramWriteAccess(diagramId, session.user.id);

  const diagram = await prisma.diagram.findUnique({ where: { id: diagramId } });
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

  const old = await prisma.diagramVersion.findMany({
    where: { diagramId },
    orderBy: { createdAt: 'desc' },
    skip: 50,
    select: { id: true },
  });
  if (old.length > 0) {
    await prisma.diagramVersion.deleteMany({ where: { id: { in: old.map((v) => v.id) } } });
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

  const current = await prisma.diagram.findUnique({ where: { id: diagramId } });
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
    where: { id: diagramId },
    data: {
      nodes: version.nodes as object,
      edges: version.edges as object,
      viewport: version.viewport as object,
    },
  });
}
