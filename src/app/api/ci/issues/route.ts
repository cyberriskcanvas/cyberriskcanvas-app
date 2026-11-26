import { type NextRequest, NextResponse } from 'next/server';
import { authenticateCiToken } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { getTier } from '@/lib/tierLimits';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { deriveTasks } from '@/utils/deriveTasks';
import type { DiagramNode } from '@/types';

/**
 * Work items for the team's issue tracker: open measures and failed security tests.
 * Canvas stays stateless here; public/ci/sync-issues.sh creates and closes the issues
 * with the pipeline's own credentials and finds them again by the stable `key`.
 */
export async function GET(req: NextRequest) {
  const ci = await authenticateCiToken(req);
  if (!ci) return NextResponse.json({ error: 'Invalid or missing CI token' }, { status: 401 });
  if (!TIER_CONFIG[await getTier()].api) {
    return NextResponse.json({ error: 'This feature requires a valid Pro license.' }, { status: 403 });
  }

  const [project, diagrams] = await Promise.all([
    prisma.project.findUnique({ where: { id: ci.projectId }, select: { name: true } }),
    prisma.diagram.findMany({ where: { projectId: ci.projectId, deletedAt: null }, select: { nodes: true } }),
  ]);
  const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '');
  const items = diagrams
    .flatMap((d) => deriveTasks({ nodes: d.nodes as unknown as DiagramNode[] }))
    .filter((t) => t.kind === 'open_measure' || t.kind === 'failed_test')
    .map((t) => ({
      key: t.id,
      kind: t.kind,
      title: `[CRA] ${t.text}`,
      body: `${t.text}\n\nProject: ${project?.name ?? ''}${base ? `\n${base}/dashboard` : ''}`,
    }));
  return NextResponse.json({ items });
}
