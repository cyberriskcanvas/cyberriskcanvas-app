'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertDiagramAccess } from '@/lib/access';
import type { SbomComponentData } from '@/types';

interface DbVuln {
  id: string;
  osvId: string;
  cveId: string | null;
  summary: string | null;
  severity: string | null;
  cvssScore: number | null;
  source: string;
}

interface DbComponent {
  id: string;
  name: string;
  version: string | null;
  purl: string | null;
  type: string | null;
  createdAt: Date;
  vulnerabilities: DbVuln[];
}

export async function getSbomData(diagramId: string, nodeId: string): Promise<SbomComponentData[]> {
  const session = await requireSession();
  await assertDiagramAccess(diagramId, session.user.id);

  const components: DbComponent[] = await prisma.sbomComponent.findMany({
    where: { diagramId, nodeId },
    include: { vulnerabilities: { orderBy: { severity: 'asc' } } },
    orderBy: { name: 'asc' },
  });

  return components.map((c) => ({
    id: c.id,
    name: c.name,
    version: c.version,
    purl: c.purl,
    type: c.type,
    createdAt: c.createdAt.toISOString(),
    vulnerabilities: c.vulnerabilities.map((v) => ({
      id: v.id,
      osvId: v.osvId,
      cveId: v.cveId,
      summary: v.summary,
      severity: v.severity,
      cvssScore: v.cvssScore,
      source: v.source,
    })),
  }));
}

export async function deleteSbomData(diagramId: string, nodeId: string): Promise<void> {
  const session = await requireSession();
  await assertDiagramAccess(diagramId, session.user.id);

  await prisma.sbomComponent.deleteMany({ where: { diagramId, nodeId } });

  const diagram = await prisma.diagram.findUnique({
    where: { id: diagramId },
    select: { nodes: true },
  });
  if (!diagram) return;

  type StoredNode = {
    id: string;
    data: { threats?: Array<Record<string, unknown>>; [k: string]: unknown };
    [k: string]: unknown;
  };

  const nodes = diagram.nodes as unknown as StoredNode[];
  const updated = nodes.map((n: StoredNode) =>
    n.id === nodeId
      ? { ...n, data: { ...n.data, threats: (n.data.threats ?? []).filter((t) => t.source !== 'sbom') } }
      : n,
  );

  await prisma.diagram.update({
    where: { id: diagramId },
    data: { nodes: updated as unknown as never },
  });
}
