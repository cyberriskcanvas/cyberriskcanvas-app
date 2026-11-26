import { prisma } from './db';
import { matchComponents } from './osv';
import { flagExploitedFindings } from './exploited';
import { loadFindings } from './findings';
import { writeSnapshots } from './metrics';
import { componentKey, isAnalysable, type BomComponent, type SbomFormat } from './sbomParse';

export const MAX_COMPONENTS = Number(process.env.SBOM_MAX_COMPONENTS) || 20_000;
const MAX_LEN = { name: 256, version: 64, purl: 1024, short: 256 };
const trim = (s: string | undefined | null, max: number) => (s ? s.trim().slice(0, max) : null);

export interface IngestInput {
  projectId: string;
  versionId: string;
  fileName: string;
  format: SbomFormat;
  components: BomComponent[];
  /** Multi-part products (frontend/backend/image) keep one SBOM per part. */
  part?: string;
}

/**
 * Replaces the SBOM of (version, part) and matches its components against OSV. Triage decisions are
 * stored per product (analyses), so they stay without any copying. Other parts of the version are left untouched.
 */
export async function ingestSbom({ projectId, versionId, fileName, format, components, part = '' }: IngestInput) {
  const rows = components.map((c) => {
    const name = trim(c.name, MAX_LEN.name) ?? '';
    const version = trim(c.version, MAX_LEN.version);
    const purl = trim(c.purl, MAX_LEN.purl);
    return {
      versionId, projectId, name, version, purl, key: componentKey({ name, version, purl }),
      type: trim(c.type, MAX_LEN.short), cpe: trim(c.cpe, MAX_LEN.purl), supplier: trim(c.supplier, MAX_LEN.short),
      licenses: (c.licenses ?? []).slice(0, 10).map((l) => l.slice(0, MAX_LEN.short)),
      hashes: c.hashes?.slice(0, 5) as object | undefined,
      direct: c.direct ?? null,
    };
  });
  await matchComponents([...new Set(rows.map((r) => r.purl).filter(isAnalysable))]);

  const [, sbom] = await prisma.$transaction([
    prisma.projectSbom.deleteMany({ where: { versionId, part } }),
    prisma.projectSbom.create({
      data: { versionId, projectId, part, fileName: fileName.slice(0, 255), format, componentCount: rows.length, components: { create: rows } },
    }),
  ]);

  await flagExploitedFindings().catch((e) => console.error('[exploited] check failed:', e instanceof Error ? e.message : e));

  await writeSnapshots([versionId]).catch((e) => console.error('[metrics] snapshot failed:', e instanceof Error ? e.message : e));

  const findings = await loadFindings({ versionIds: [versionId] });
  return {
    sbomId: sbom.id,
    format: sbom.format,
    componentCount: sbom.componentCount,
    unanalysable: rows.filter((r) => !isAnalysable(r.purl)).length,
    vulnCount: findings.length,
    criticalCount: findings.filter((f) => f.severity === 'CRITICAL').length,
    highCount: findings.filter((f) => f.severity === 'HIGH').length,
    triageKept: findings.filter((f) => f.status !== 'open' || f.justification).length,
  };
}
