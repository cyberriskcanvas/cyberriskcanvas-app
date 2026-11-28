import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { loadGateFindings } from '@/lib/policyRun';
import { canAccessProject } from '@/lib/access';
import { evaluateGate, latestRunsPerSourcePart, runFails } from '@/lib/ciGate';
import { projectFailOn } from '@/lib/ciGateRun';
import { resolveCiVersion } from '@/lib/ciVersion';

interface RouteContext { params: Promise<{ id: string }> }

/** Run history of a version plus the newest run per source/part and the gate verdict at the project's threshold. */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { id: projectId } = await ctx.params;
  if (!(await canAccessProject(projectId, authResult.userId))) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const version = await resolveCiVersion(projectId, new URL(req.url).searchParams.get('version'));
  if (!version) return NextResponse.json({ version: null, runs: [], latest: [], gate: { pass: true, reasons: [] } });

  const failOn = await projectFailOn(projectId);
  const [runs, { vulns, policyViolations }] = await Promise.all([
    prisma.ciRun.findMany({
      where: { versionId: version.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, source: true, part: true, result: true, summary: true, commit: true, ref: true, url: true, fileName: true, size: true, createdAt: true, metrics: true },
    }),
    loadGateFindings(version.id),
  ]);

  return NextResponse.json({
    version: { id: version.id, number: version.number, status: version.status },
    failOn,
    // verdicts at the current threshold: changing it applies to runs already uploaded
    runs: runs.slice(0, 50).map(({ metrics, ...r }) => ({ ...r, result: runFails({ ...r, metrics }, failOn) ? 'findings' : 'ok', createdAt: r.createdAt.toISOString() })),
    latest: latestRunsPerSourcePart(runs).map((r) => ({ id: r.id, source: r.source, part: r.part, result: runFails(r, failOn) ? 'findings' : 'ok', summary: r.summary })),
    gate: evaluateGate({ vulns, policyViolations, runs, failOn }),
  });
}
