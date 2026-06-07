'use server';

import { requireSession } from '@/lib/auth';
import { bufferDiagram } from '@/lib/redis';
import { assertDiagramAccess, assertDiagramWriteAccess, assertProjectWriteAccess } from '@/lib/access';
import { getTierLimit, TierError } from '@/lib/tierGuard';
import { prisma } from '@/lib/db';

export async function getDiagram(id: string) {
  const session = await requireSession();
  // Access is verified before diagram data is fetched - avoids reading
  // sensitive node/edge data prior to the authorization check.
  await assertDiagramAccess(id, session.user.id);
  const diagram = await prisma.diagram.findUnique({ where: { id } });
  if (!diagram) throw new Error('Diagram not found');
  return diagram;
}

export async function saveDiagram(
  id: string,
  data: { nodes?: unknown; edges?: unknown; viewport?: unknown; name?: string },
) {
  const session = await requireSession();
  await assertDiagramWriteAccess(id, session.user.id);

  const diagram = await prisma.diagram.findUnique({ where: { id }, select: { projectId: true } });
  if (diagram) {
    const activeVersion = await prisma.projectVersion.findFirst({
      where: { projectId: diagram.projectId, status: 'active' },
      orderBy: { number: 'desc' },
      select: { status: true, label: true, number: true },
    });
    if (activeVersion?.status === 'frozen') {
      throw new Error(`Version ${activeVersion.number}${activeVersion.label ? ` (${activeVersion.label})` : ''} is frozen. Create a new version to make changes.`);
    }
  }

  if (Array.isArray(data.nodes)) {
    const maxNodes = await getTierLimit('maxNodes');
    if (maxNodes !== null) {
      const count = (data.nodes as Array<{ type?: string }>).filter(
        (n) => n?.type !== 'boundary',
      ).length;
      if (count > maxNodes) {
        throw new TierError(
          `Your license is limited to ${maxNodes} components per diagram. Upgrade to a Pro license to add more.`,
        );
      }
    }
  }

  const patch: Record<string, unknown> = {};
  if (data.nodes !== undefined) patch.nodes = data.nodes;
  if (data.edges !== undefined) patch.edges = data.edges;
  if (data.viewport !== undefined) patch.viewport = data.viewport;
  if (data.name !== undefined) patch.name = data.name;

  await bufferDiagram(id, patch, session.user.id);
  return { id };
}

export async function createDiagram(projectId: string, name: string) {
  const session = await requireSession();
  await assertProjectWriteAccess(projectId, session.user.id);
  return prisma.diagram.create({ data: { projectId, name: name.trim() } });
}

export async function deleteDiagram(id: string) {
  const session = await requireSession();
  await assertDiagramWriteAccess(id, session.user.id);
  await prisma.diagram.delete({ where: { id } });
}
