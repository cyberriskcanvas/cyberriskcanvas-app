import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { canAccessProject } from '@/lib/access';
import { assessSeverity, deduplicateVulns } from '@/lib/cvss';
import { queryOsvBatch } from '@/lib/osv';

// ─── CycloneDX / SPDX types ──────────────────────────────────────────────────

interface CdxComponent {
  name?: string;
  version?: string;
  purl?: string;
  type?: string;
}

interface CdxBom {
  bomFormat?: string;
  specVersion?: string;
  components?: CdxComponent[];
  // SPDX-style SBOM (bomFormat absent or "SPDX")
  packages?: Array<{ name?: string; versionInfo?: string; externalRefs?: Array<{ referenceType?: string; referenceLocator?: string }> }>;
}

// ─── Normalise input ──────────────────────────────────────────────────────────

function normaliseComponents(bom: CdxBom): CdxComponent[] {
  if (bom.bomFormat === 'CycloneDX' || bom.packages === undefined) {
    return (bom.components ?? []).filter((c): c is CdxComponent & { name: string } =>
      typeof c.name === 'string' && c.name.trim() !== '',
    );
  }
  // SPDX – convert packages
  return (bom.packages ?? [])
    .filter((p) => typeof p.name === 'string' && p.name.trim() !== '')
    .map((p) => {
      const purl = p.externalRefs?.find((r) => r.referenceType === 'purl')?.referenceLocator;
      return { name: p.name, version: p.versionInfo, purl };
    });
}

// ─── Route handler ────────────────────────────────────────────────────────────

interface RouteContext { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!TIER_CONFIG[authResult.tier].sbom) {
    return NextResponse.json({ error: 'This feature requires a valid Pro license.' }, { status: 403 });
  }

  const { id: projectId } = await ctx.params;

  const hasAccess = await canAccessProject(projectId, authResult.userId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 });
  }

  let bom: CdxBom;
  try {
    bom = JSON.parse(await file.text()) as CdxBom;
  } catch {
    return NextResponse.json({ error: 'File is not valid JSON' }, { status: 400 });
  }

  const isCycloneDX = bom.bomFormat === 'CycloneDX';
  const isSpdx = typeof (bom as Record<string, unknown>).spdxVersion === 'string' || bom.packages !== undefined;
  if (!isCycloneDX && !isSpdx) {
    return NextResponse.json({ error: 'File must be a CycloneDX or SPDX BOM' }, { status: 400 });
  }

  const MAX_COMPONENTS = 1000;
  const rawComponents = normaliseComponents(bom).slice(0, MAX_COMPONENTS);
  if (rawComponents.length === 0) {
    return NextResponse.json({ error: 'No components found in SBOM' }, { status: 400 });
  }

  // ── OSV.dev batch lookup ────────────────────────────────────────────────────

  const osvResults = await queryOsvBatch(rawComponents.map((c) => ({ name: c.name!, version: c.version, purl: c.purl })));

  // ── Resolve the active version ──────────────────────────────────────────────

  const activeVersion = await prisma.projectVersion.findFirst({
    where: { projectId, status: 'active' },
    orderBy: { number: 'desc' },
  });
  if (!activeVersion) {
    return NextResponse.json({ error: 'No active version found for this project.' }, { status: 409 });
  }

  // ── Delete previous SBOM for the active version and persist new one ─────────

  await prisma.projectSbom.deleteMany({ where: { versionId: activeVersion.id } });

  const MAX_LEN = { name: 256, version: 64, purl: 1024 };
  const trim = (s: string | undefined | null, max: number) => s ? s.trim().slice(0, max) : null;

  const sbom = await prisma.projectSbom.create({
    data: {
      versionId: activeVersion.id,
      projectId,
      fileName: file.name.slice(0, 255),
      format: isCycloneDX ? 'CycloneDX' : 'SPDX',
      componentCount: rawComponents.length,
      // Persisted so the periodic CVE re-scan can re-query OSV later, even
      // for components that currently have zero known vulnerabilities.
      components: {
        create: rawComponents.map((c) => ({
          versionId: activeVersion.id,
          projectId,
          name: trim(c.name, MAX_LEN.name) ?? '',
          version: trim(c.version, MAX_LEN.version),
          purl: trim(c.purl, MAX_LEN.purl),
        })),
      },
      vulnerabilities: {
        create: rawComponents.flatMap((c, idx) => {
          const dedupedVulns = deduplicateVulns(osvResults[idx] ?? []);
          return dedupedVulns.map((v) => {
            const { severity, cvssScore } = assessSeverity(v);
            const aliases = v.aliases ?? [];
            const cveId = aliases.find((a) => a.startsWith('CVE-')) ?? null;
            const osvId = cveId ?? aliases.find((a) => a.startsWith('GHSA-')) ?? v.id;
            return {
              versionId: activeVersion.id,
              projectId,
              osvId,
              cveId,
              summary: v.summary ?? null,
              severity,
              cvssScore,
              componentName: trim(c.name, MAX_LEN.name) ?? '',
              componentVersion: trim(c.version, MAX_LEN.version),
              componentPurl: trim(c.purl, MAX_LEN.purl),
            };
          });
        }),
      },
    },
    include: { vulnerabilities: true },
  });

  return NextResponse.json({
    sbomId: sbom.id,
    format: sbom.format,
    componentCount: sbom.componentCount,
    vulnCount: sbom.vulnerabilities.length,
    criticalCount: sbom.vulnerabilities.filter((v) => v.severity === 'CRITICAL').length,
    highCount: sbom.vulnerabilities.filter((v) => v.severity === 'HIGH').length,
  });
}
