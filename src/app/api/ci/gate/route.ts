import { type NextRequest, NextResponse } from 'next/server';
import { authenticateCiToken } from '@/lib/apiAuth';
import { computeGate, parseGateParams } from '@/lib/ciGateRun';
import { resolveCiVersion } from '@/lib/ciVersion';
import { gateJunit } from '@/lib/ciGate';

/**
 * Release gate for pipelines. 200 when passing, 422 with the reasons when not,
 * so `curl --fail-with-body` fails the job without any JSON parsing.
 * `format=junit` answers with JUnit XML (same status) for CI test-report widgets.
 */
export async function GET(req: NextRequest) {
  const ci = await authenticateCiToken(req);
  if (!ci) return NextResponse.json({ error: 'Invalid or missing CI token' }, { status: 401 });

  const q = new URL(req.url).searchParams;
  const params = parseGateParams(q);
  if ('error' in params) return NextResponse.json({ error: params.error }, { status: 400 });

  const version = await resolveCiVersion(ci.projectId, q.get('version'));
  if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

  const gate = await computeGate(ci.projectId, version.id, params);
  if (q.get('format') === 'junit') {
    return new NextResponse(gateJunit(gate, version.number), { status: gate.pass ? 200 : 422, headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  }
  return NextResponse.json({ ...gate, projectId: ci.projectId, version: version.number }, { status: gate.pass ? 200 : 422 });
}
