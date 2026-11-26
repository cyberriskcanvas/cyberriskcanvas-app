import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { canAccessProject } from '@/lib/access';
import { parseFindingId } from '@/lib/findings';

interface RouteContext { params: Promise<{ id: string; vulnId: string }> }

/** Who changed the triage of a finding, when, what and why (newest first). */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!TIER_CONFIG[authResult.tier].sbom) return NextResponse.json({ error: 'This feature requires a valid Pro license.' }, { status: 403 });

  const { id: projectId, vulnId } = await ctx.params;
  if (!await canAccessProject(projectId, authResult.userId)) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const finding = parseFindingId(vulnId);
  if (!finding) return NextResponse.json({ error: 'Vulnerability not found' }, { status: 404 });

  const events = await prisma.analysisEvent.findMany({
    where: { analysis: { projectId, componentKey: finding.componentKey, vulnerabilityId: finding.vulnId } },
    orderBy: { at: 'desc' },
    take: 100,
    select: { at: true, actorName: true, change: true, comment: true },
  });
  return NextResponse.json(events.map((e) => ({ ...e, at: e.at.toISOString() })));
}
