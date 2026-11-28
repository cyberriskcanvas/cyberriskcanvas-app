import { type NextRequest, NextResponse } from 'next/server';
import { authenticateCiToken } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { evaluateCiFile, InvalidCiFile } from '@/lib/ciEval';
import { MAX_CI_FILE_SIZE, saveCiFile } from '@/lib/ciStorage';
import { resolveCiVersion } from '@/lib/ciVersion';
import { projectFailOn } from '@/lib/ciGateRun';
import { detectFormat, normaliseComponents, type Bom } from '@/lib/sbomParse';
import { ingestSbom, MAX_COMPONENTS } from '@/lib/sbomIngest';
import { audit } from '@/lib/audit';

/** Ports of the connections in the project's architecture model (what the product is supposed to expose). */
async function declaredPortsOf(projectId: string): Promise<number[]> {
  const diagram = await prisma.diagram.findFirst({ where: { projectId, deletedAt: null }, orderBy: { updatedAt: 'desc' }, select: { edges: true } });
  const ports = new Set<number>();
  for (const e of (diagram?.edges ?? []) as Array<{ data?: { port?: unknown } }>) {
    const p = Number(e.data?.port);
    if (Number.isInteger(p) && p > 0 && p < 65536) ports.add(p);
  }
  return [...ports];
}

const PART_RE = /^[A-Za-z0-9._-]{0,64}$/;

export async function POST(req: NextRequest) {
  const ci = await authenticateCiToken(req);
  if (!ci) return NextResponse.json({ error: 'Invalid or missing CI token' }, { status: 401 });

  const q = new URL(req.url).searchParams;
  const source = q.get('source') ?? '';
  const part = q.get('part') ?? '';
  if (!PART_RE.test(part)) {
    return NextResponse.json({ error: 'part may only contain letters, digits, . _ - (max 64)' }, { status: 400 });
  }
  const url = q.get('url');

  const version = await resolveCiVersion(ci.projectId, q.get('version'));
  if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  if (version.status !== 'active') {
    return NextResponse.json({ error: `Version ${version.number} is frozen; upload to the active version` }, { status: 409 });
  }

  let file: File | null;
  try {
    file = (await req.formData()).get('file') as File | null;
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "Missing multipart field 'file'" }, { status: 400 });
  if (file.size > MAX_CI_FILE_SIZE) return NextResponse.json({ error: 'File exceeds 25 MB limit' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = buffer.toString('utf8');
  let evaluation;
  try {
    evaluation = evaluateCiFile(source, text, { declaredPorts: source === 'ports' ? await declaredPortsOf(ci.projectId) : [], failOn: await projectFailOn(ci.projectId) });
  } catch (err) {
    if (err instanceof InvalidCiFile) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }

  // An SBOM also feeds the vulnerability list (OSV lookup, triage is kept).
  let sbomImport: Awaited<ReturnType<typeof ingestSbom>> | null = null;
  if (source === 'sbom') {
    const bom = JSON.parse(text) as Bom;
    const format = detectFormat(bom);
    const components = normaliseComponents(bom);
    if (components.length > MAX_COMPONENTS) {
      return NextResponse.json({ error: `SBOM has ${components.length} components, the limit is ${MAX_COMPONENTS}` }, { status: 400 });
    }
    if (format && components.length > 0) {
      sbomImport = await ingestSbom({ projectId: ci.projectId, versionId: version.id, fileName: file.name || 'sbom.json', format, components, part });
    }
  }

  const stored = await saveCiFile(ci.projectId, buffer, source === 'ports' ? 'xml' : 'json');
  const run = await prisma.ciRun.create({
    data: {
      projectId: ci.projectId,
      versionId: version.id,
      tokenId: ci.tokenId,
      source,
      part,
      result: evaluation.ok ? 'ok' : 'findings',
      summary: evaluation.summary.slice(0, 500),
      metrics: evaluation.metrics,
      commit: q.get('commit')?.slice(0, 64) || null,
      ref: q.get('ref')?.slice(0, 256) || null,
      url: url && /^https?:\/\//i.test(url) ? url.slice(0, 1024) : null,
      fileName: (file.name || `${source}.json`).slice(0, 255),
      ...stored,
    },
    select: { id: true },
  });

  audit({
    action: 'ci.ingest',
    targetType: 'ci_run',
    targetId: run.id,
    details: { projectId: ci.projectId, source, part, result: evaluation.ok ? 'ok' : 'findings' },
  });

  return NextResponse.json({
    runId: run.id,
    version: version.number,
    source,
    part,
    result: evaluation.ok ? 'ok' : 'findings',
    summary: evaluation.summary,
    ...(sbomImport && { vulnerabilities: { total: sbomImport.vulnCount, critical: sbomImport.criticalCount, high: sbomImport.highCount, triageKept: sbomImport.triageKept } }),
  });
}
