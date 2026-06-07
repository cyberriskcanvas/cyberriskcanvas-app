import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { assertProjectWriteAccess } from '@/lib/access';
import { assessSeverity, deduplicateVulns, filterToQualitySources, type OsvVuln } from '@/lib/cvss';
import type { Threat, SbomImportResult } from '@/types';

// ─── CycloneDX types ──────────────────────────────────────────────────────────

interface CdxComponent {
  name?: string;
  version?: string;
  purl?: string;
  type?: string;
}

interface CdxBom {
  bomFormat?: string;
  components?: CdxComponent[];
}

interface OsvBatchResponse {
  results: Array<{ vulns: OsvVuln[] | null } | null>;
}

// ─── Local DB shape (mirrors generated Prisma types) ─────────────────────────

interface DbVuln {
  id: string;
  componentId: string;
  osvId: string;
  cveId: string | null;
  summary: string | null;
  severity: string | null;
  cvssScore: number | null;
  source: string;
  createdAt: Date;
}

interface DbComponent {
  id: string;
  diagramId: string;
  nodeId: string;
  name: string;
  version: string | null;
  purl: string | null;
  type: string | null;
  createdAt: Date;
  vulnerabilities: DbVuln[];
}

function summaryToStride(summary: string): Threat['stride'] {
  const s = summary.toLowerCase();
  if (/denial.of.service|\bdos\b|crash|resource.exhaustion/.test(s)) return 'D';
  if (/privilege.escalat|elevation|root\s*access|arbitrary.code|remote.code/.test(s)) return 'E';
  if (/information.disclos|data.leak|sensitive|password|credential|secret|exposure/.test(s)) return 'I';
  if (/spoof|impersonat|forgery|auth.bypass|bypass.auth/.test(s)) return 'S';
  return 'T';
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!TIER_CONFIG[authResult.tier].sbom) {
    return NextResponse.json({ error: 'This feature requires a valid Pro license.' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const diagramId = formData.get('diagramId') as string | null;
  const nodeId = formData.get('nodeId') as string | null;
  const file = formData.get('file') as File | null;

  if (!diagramId || !nodeId || !file) {
    return NextResponse.json({ error: 'Missing diagramId, nodeId or file' }, { status: 400 });
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(diagramId) || !UUID_RE.test(nodeId)) {
    return NextResponse.json({ error: 'Invalid diagramId or nodeId' }, { status: 400 });
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File exceeds 5 MB limit' }, { status: 400 });
  }

  const ALLOWED_MIME = ['application/json', 'text/plain', 'application/octet-stream', ''];
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: 'File must be a JSON file' }, { status: 400 });
  }

  const diagram = await prisma.diagram.findFirst({ where: { id: diagramId } });
  if (!diagram) {
    return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
  }
  try {
    await assertProjectWriteAccess(diagram.projectId, authResult.userId);
  } catch {
    return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
  }

  // ── Parse CycloneDX JSON ────────────────────────────────────────────────────

  let bom: CdxBom;
  try {
    bom = JSON.parse(await file.text()) as CdxBom;
  } catch {
    return NextResponse.json({ error: 'File is not valid JSON' }, { status: 400 });
  }

  if (!bom.bomFormat || bom.bomFormat !== 'CycloneDX') {
    return NextResponse.json({ error: 'File is not a CycloneDX BOM' }, { status: 400 });
  }

  const MAX_COMPONENTS = 1000;
  const MAX_NAME_LEN = 256;
  const MAX_VERSION_LEN = 64;
  const MAX_PURL_LEN = 1024;
  const MAX_TYPE_LEN = 64;

  const allComponents = (bom.components ?? []).filter(
    (c): c is CdxComponent & { name: string } => typeof c.name === 'string' && c.name.trim() !== '',
  );

  if (allComponents.length === 0) {
    return NextResponse.json({ error: 'No components found in SBOM' }, { status: 400 });
  }

  const rawComponents = allComponents.slice(0, MAX_COMPONENTS);

  // ── Query OSV.dev batch API (chunks of 50) ──────────────────────────────────
  // querybatch only returns vuln IDs with no severity data; we enrich afterward.

  const CHUNK = 50;
  const osvResults: OsvVuln[][] = [];

  for (let i = 0; i < rawComponents.length; i += CHUNK) {
    const chunk = rawComponents.slice(i, i + CHUNK);
    // Build queries; track which indices are skipped (no purl, unknown ecosystem)
    // so the osvResults array stays aligned with rawComponents.
    const skipped = new Set<number>();
    type OsvQuery = { package: { purl: string } } | { package: { name: string; ecosystem: string }; version?: string };
    const queries = chunk.flatMap((c, i): OsvQuery[] => {
      if (c.purl) return [{ package: { purl: c.purl } }];
      // Without a purl we cannot reliably determine the ecosystem - skip this component.
      skipped.add(i);
      return [];
    });

    // Fetch OSV results only when there are queryable components.
    let apiResults: OsvVuln[][] = [];
    if (queries.length > 0) {
      try {
        const res = await fetch('https://api.osv.dev/v1/querybatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queries }),
          signal: AbortSignal.timeout(15_000),
        });
        if (res.ok) {
          const data = await res.json() as OsvBatchResponse;
          apiResults = (data.results ?? []).map((r) => r?.vulns ?? []);
        }
      } catch {
        // leave apiResults empty - will be filled with [] below
      }
    }

    // Re-align results with the original chunk indices, inserting [] for skipped.
    let apiIdx = 0;
    for (let j = 0; j < chunk.length; j++) {
      if (skipped.has(j)) {
        osvResults.push([]);
      } else {
        osvResults.push(apiResults[apiIdx] ?? []);
        apiIdx++;
      }
    }
  }

  // ── Enrich: fetch full vuln details for unique IDs ───────────────────────────
  // querybatch returns stub records (id only, severity=null). Fetch full records
  // via /v1/vulns/{id} so assessSeverity has real CVSS / database_specific data.

  const uniqueIds = new Set<string>();
  for (const vulns of osvResults) {
    for (const v of vulns) uniqueIds.add(v.id);
  }

  const CONCURRENCY = 20;
  const idArr = [...uniqueIds];
  const fullVulnMap = new Map<string, OsvVuln>();

  for (let i = 0; i < idArr.length; i += CONCURRENCY) {
    const batch = idArr.slice(i, i + CONCURRENCY);
    const fetched = await Promise.allSettled(
      batch.map(async (id) => {
        try {
          const r = await fetch(`https://api.osv.dev/v1/vulns/${id}`, {
            signal: AbortSignal.timeout(10_000),
          });
          if (r.ok) return (await r.json()) as OsvVuln;
        } catch { /* ignore */ }
        return null;
      }),
    );
    for (const r of fetched) {
      if (r.status === 'fulfilled' && r.value) fullVulnMap.set(r.value.id, r.value);
    }
  }

  // Replace stub records with full records where available
  for (let i = 0; i < osvResults.length; i++) {
    osvResults[i] = osvResults[i].map((v) => fullVulnMap.get(v.id) ?? v);
  }

  // ── Persist to DB + auto-create threats ─────────────────────────────────────

  await prisma.sbomComponent.deleteMany({ where: { diagramId, nodeId } });

  const savedComponents: DbComponent[] = await Promise.all(
    rawComponents.map(async (c, idx) => {
      const vulns = deduplicateVulns(filterToQualitySources(osvResults[idx] ?? []));
      return prisma.sbomComponent.create({
        data: {
          diagramId,
          nodeId,
          name: c.name.trim().slice(0, MAX_NAME_LEN),
          version: c.version ? c.version.trim().slice(0, MAX_VERSION_LEN) : null,
          purl: c.purl ? c.purl.trim().slice(0, MAX_PURL_LEN) : null,
          type: c.type ? c.type.trim().slice(0, MAX_TYPE_LEN) : null,
          vulnerabilities: {
            create: vulns.map((v: OsvVuln) => {
              const { severity, cvssScore } = assessSeverity(v);
              const allAliases = v.aliases ?? [];
              const cveId = allAliases.find((a: string) => a.startsWith('CVE-')) ?? null;
              const canonicalId =
                cveId ??
                allAliases.find((a: string) => a.startsWith('GHSA-')) ??
                v.id;
              return { osvId: canonicalId, cveId, summary: v.summary ?? null, severity, cvssScore };
            }),
          },
        },
        include: { vulnerabilities: true },
      });
    }),
  );

  // ── Auto-create threats for CRITICAL + HIGH CVEs ──────────────────────────

  type StoredNode = {
    id: string;
    data: { threats?: Array<Record<string, unknown>>; [k: string]: unknown };
    [k: string]: unknown;
  };

  const criticalOrHigh = savedComponents.flatMap((comp) =>
    comp.vulnerabilities
      .filter((v) => v.severity === 'CRITICAL' || v.severity === 'HIGH')
      .map((v) => ({ comp, vuln: v })),
  );
  criticalOrHigh.sort((a, b) =>
    a.vuln.severity === 'CRITICAL' ? -1 : b.vuln.severity === 'CRITICAL' ? 1 : 0,
  );
  const toCreate = criticalOrHigh.slice(0, 20);

  let threatsCreated = 0;

  if (toCreate.length > 0) {
    const nodes = (diagram.nodes as unknown) as StoredNode[];
    const targetNode = nodes.find((n) => n.id === nodeId);

    if (targetNode) {
      const existing = (targetNode.data.threats ?? []) as Array<Record<string, unknown>>;
      const manual = existing.filter((t) => t.source !== 'sbom');

      const newThreats: Threat[] = toCreate.map(({ comp, vuln }) => ({
        id: crypto.randomUUID(),
        name: vuln.cveId ? `[${vuln.cveId}] ${comp.name}` : `[${vuln.osvId}] ${comp.name}`,
        stride: summaryToStride(vuln.summary ?? ''),
        description: `[SBOM] ${vuln.summary ?? vuln.osvId} - ${comp.name}${comp.version ? `@${comp.version}` : ''}`,
        source: 'sbom' as const,
      }));

      const updatedNodes = nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, threats: [...manual, ...newThreats] } }
          : n,
      );

      await prisma.diagram.update({
        where: { id: diagramId },
        data: { nodes: updatedNodes as unknown as never },
      });

      threatsCreated = newThreats.length;
    }
  }

  // ── Build response ──────────────────────────────────────────────────────────

  const allVulns = savedComponents.flatMap((c: DbComponent) => c.vulnerabilities);
  const result: SbomImportResult = {
    componentCount: savedComponents.length,
    vulnCount: allVulns.length,
    criticalCount: allVulns.filter((v: DbVuln) => v.severity === 'CRITICAL').length,
    highCount: allVulns.filter((v: DbVuln) => v.severity === 'HIGH').length,
    threatsCreated,
    components: savedComponents.map((c: DbComponent) => ({
      id: c.id,
      name: c.name,
      version: c.version,
      purl: c.purl,
      type: c.type,
      createdAt: c.createdAt.toISOString(),
      vulnerabilities: c.vulnerabilities.map((v: DbVuln) => ({
        id: v.id,
        osvId: v.osvId,
        cveId: v.cveId,
        summary: v.summary,
        severity: v.severity,
        cvssScore: v.cvssScore,
        source: v.source,
      })),
    })),
  };

  return NextResponse.json(result);
}
