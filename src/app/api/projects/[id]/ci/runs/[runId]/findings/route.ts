import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { canAccessProject } from '@/lib/access';
import { readCiFile } from '@/lib/ciStorage';
import { FINDING_SEVERITIES, InvalidCiFile, sarifFindings } from '@/lib/ciEval';

interface RouteContext { params: Promise<{ id: string; runId: string }> }

/** SARIF sources whose findings can be listed (the others have their own formats and a summary only). */
const SARIF_SOURCES = new Set(['sast', 'secrets', 'vulnscan', 'dast']);
const MAX_FINDINGS = 1000;

/** The findings of one SARIF run, read from the stored file, most severe first. */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!TIER_CONFIG[authResult.tier].api) return NextResponse.json({ error: 'This feature requires a valid Pro license.' }, { status: 403 });

  const { id: projectId, runId } = await ctx.params;
  if (!(await canAccessProject(projectId, authResult.userId))) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const run = await prisma.ciRun.findFirst({ where: { id: runId, projectId }, select: { source: true, storagePath: true } });
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  if (!SARIF_SOURCES.has(run.source)) return NextResponse.json({ error: 'Findings can only be listed for SARIF runs' }, { status: 400 });

  let findings;
  try {
    findings = sarifFindings((await readCiFile(run.storagePath)).toString('utf8'));
  } catch (err) {
    if (err instanceof InvalidCiFile) return NextResponse.json({ error: err.message }, { status: 422 });
    return NextResponse.json({ error: 'File no longer available' }, { status: 410 });
  }
  findings.sort((a, b) => FINDING_SEVERITIES.indexOf(a.severity) - FINDING_SEVERITIES.indexOf(b.severity));
  return NextResponse.json({ source: run.source, total: findings.length, findings: findings.slice(0, MAX_FINDINGS) });
}
