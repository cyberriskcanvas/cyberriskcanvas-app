import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { assertProjectWriteAccess } from '@/lib/access';
import { audit } from '@/lib/audit';

interface RouteContext { params: Promise<{ id: string; vid: string }> }

export async function POST(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!TIER_CONFIG[authResult.tier].baselines) {
    return NextResponse.json({ error: 'This feature requires a valid Pro license.' }, { status: 403 });
  }

  const { id: projectId, vid: versionId } = await ctx.params;
  try {
    await assertProjectWriteAccess(projectId, authResult.userId);
  } catch {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let body: { label?: string; frozenByName?: string };
  try { body = await req.json(); } catch { body = {}; }

  const label = (body.label ?? '').trim().slice(0, 128);
  const frozenByName = (body.frozenByName ?? '').trim().slice(0, 256);
  if (!label || !frozenByName) {
    return NextResponse.json({ error: 'label and frozenByName are required.' }, { status: 400 });
  }

  const version = await prisma.projectVersion.findFirst({
    where: { id: versionId, projectId, status: 'active' },
  });
  if (!version) {
    return NextResponse.json({ error: 'Active version not found.' }, { status: 404 });
  }

  // Snapshot all diagrams
  const diagrams = await prisma.diagram.findMany({
    where: { projectId },
    select: { id: true, nodes: true, edges: true, viewport: true },
  });
  await Promise.all(diagrams.map((d) =>
    prisma.diagramVersion.create({
      data: {
        diagramId: d.id,
        nodes: d.nodes as object,
        edges: d.edges as object,
        viewport: d.viewport as object,
        message: `Version ${version.number}: ${label} - ${frozenByName}`,
      },
    }),
  ));

  // Freeze + create next version
  const [, newVersion] = await Promise.all([
    prisma.projectVersion.update({
      where: { id: versionId },
      data: { status: 'frozen', label, frozenAt: new Date(), frozenByName },
    }),
    prisma.projectVersion.create({
      data: { projectId, number: version.number + 1, label: '', status: 'active' },
    }),
  ]);

  audit({
    action: 'version.freeze',
    actorId: authResult.userId,
    targetType: 'version',
    targetId: versionId,
    details: { projectId, number: version.number, label, frozenByName },
  });

  return NextResponse.json({
    frozenVersionId: versionId,
    newVersion: {
      id: newVersion.id,
      number: newVersion.number,
      status: 'active',
      label: '',
      createdAt: newVersion.createdAt.toISOString(),
    },
  });
}
