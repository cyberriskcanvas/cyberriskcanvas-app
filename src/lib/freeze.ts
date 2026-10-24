import { prisma } from './db';

/** Freezes the active version (snapshot of all diagrams) and opens the next one. */
export async function freezeActiveVersion(opts: { projectId: string; label: string; frozenByName: string; userId?: string | null }) {
  const { projectId } = opts;
  const label = opts.label.trim();
  const frozenByName = opts.frozenByName.trim();
  const active = await prisma.projectVersion.findFirst({ where: { projectId, status: 'active' }, orderBy: { number: 'desc' } });
  if (!active) throw new Error('No active version found for this project.');

  return prisma.$transaction(async (tx) => {
    const diagrams = await tx.diagram.findMany({ where: { projectId }, select: { id: true, nodes: true, edges: true, viewport: true } });
    await Promise.all(diagrams.map((d) =>
      tx.diagramVersion.create({
        data: {
          diagramId: d.id,
          userId: opts.userId ?? null,
          nodes: d.nodes as object,
          edges: d.edges as object,
          viewport: d.viewport as object,
          message: `Version ${active.number}: ${label} - ${frozenByName}`,
        },
      }),
    ));
    await tx.projectVersion.update({ where: { id: active.id }, data: { status: 'frozen', label, frozenAt: new Date(), frozenByName } });
    const next = await tx.projectVersion.create({ data: { projectId, number: active.number + 1, label: '', status: 'active' } });
    return { frozenVersionId: active.id, frozenNumber: active.number, nextVersion: next };
  });
}
