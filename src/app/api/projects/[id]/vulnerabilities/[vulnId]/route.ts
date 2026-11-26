import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { assertProjectWriteAccess } from '@/lib/access';
import { parseFindingId } from '@/lib/findings';
import { InvalidAnalysis, updateAnalysis, type AnalysisPatch } from '@/lib/analysis';

interface RouteContext { params: Promise<{ id: string; vulnId: string }> }

/** vulnId is the id of a finding as listed by GET /vulnerabilities. */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!TIER_CONFIG[authResult.tier].sbom) {
    return NextResponse.json({ error: 'This feature requires a valid Pro license.' }, { status: 403 });
  }

  const { id: projectId, vulnId } = await ctx.params;

  try {
    await assertProjectWriteAccess(projectId, authResult.userId);
  } catch {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let body: AnalysisPatch & { comment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const finding = parseFindingId(vulnId);
  if (!finding) return NextResponse.json({ error: 'Vulnerability not found' }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: authResult.userId }, select: { name: true } });
  let updated;
  try {
    updated = await updateAnalysis({
      projectId, componentKey: finding.componentKey, vulnerabilityId: finding.vulnId,
      patch: { status: body.status, justification: body.justification, remediation: body.remediation, suppressed: body.suppressed },
      actorName: user?.name ?? 'API', comment: body.comment,
    });
  } catch (err) {
    if (err instanceof InvalidAnalysis) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
  if (!updated) return NextResponse.json({ error: 'Vulnerability not found' }, { status: 404 });

  return NextResponse.json({
    id: vulnId,
    status: updated.status,
    justification: updated.justification,
    remediationCategory: updated.remediationCategory,
    remediationDetails: updated.remediationDetails,
    remediationUrl: updated.remediationUrl,
    suppressed: updated.suppressed,
    updatedAt: updated.updatedAt.toISOString(),
  });
}
