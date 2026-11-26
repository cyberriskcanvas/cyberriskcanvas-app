import { Prisma } from '@/generated/prisma/client';
import { prisma } from './db';
import type { FindingStatus } from './findingStatus';

// The only read path for findings. A finding is a component of a version that matches an advisory
// (components x matches x catalogue), plus the analysis of the product team if there is one.

export { FINDING_STATUSES, UNRESOLVED, type FindingStatus } from './findingStatus';

export interface Finding {
  /** Stable id for URLs: the component and the advisory (see findingId). */
  id: string;
  versionId: string;
  projectId: string;
  componentKey: string;
  componentName: string;
  componentVersion: string | null;
  componentPurl: string | null;
  /** Catalogue id of the advisory: the CVE, else the GHSA or OSV id. Named osvId in the API and in the CSAF input. */
  osvId: string;
  cveId: string | null;
  summary: string | null;
  severity: string | null;
  cvssScore: number | null;
  cvssVector: string | null;
  cwes: string[];
  epss: number | null;
  /** Known to be exploited in the wild (CISA KEV) since. */
  kevAddedAt: Date | null;
  fixed: string[];
  status: FindingStatus;
  justification: string | null;
  remediationCategory: string | null;
  remediationDetails: string | null;
  remediationUrl: string | null;
  suppressed: boolean;
  updatedAt: Date | null;
  firstSeenAt: Date;
}

export const findingId = (componentKey: string, vulnId: string): string =>
  Buffer.from(JSON.stringify([componentKey, vulnId])).toString('base64url');

export function parseFindingId(id: string): { componentKey: string; vulnId: string } | null {
  try {
    const [componentKey, vulnId] = JSON.parse(Buffer.from(id, 'base64url').toString()) as unknown[];
    return typeof componentKey === 'string' && typeof vulnId === 'string' ? { componentKey, vulnId } : null;
  } catch {
    return null;
  }
}

export interface FindingFilter {
  versionIds?: string[];
  projectIds?: string[];
  statuses?: readonly string[];
  /** Only advisories known to be exploited (CISA KEV). */
  kev?: boolean;
  componentKey?: string;
}

type Row = Omit<Finding, 'id' | 'osvId'> & { vulnId: string };

export async function loadFindings(f: FindingFilter = {}): Promise<Finding[]> {
  if (f.versionIds?.length === 0 || f.projectIds?.length === 0) return [];
  const inner: Prisma.Sql[] = [];
  if (f.versionIds) inner.push(Prisma.sql`"versionId" IN (${Prisma.join(f.versionIds)})`);
  if (f.projectIds) inner.push(Prisma.sql`"projectId" IN (${Prisma.join(f.projectIds)})`);
  if (f.componentKey) inner.push(Prisma.sql`"key" = ${f.componentKey}`);
  const outerWhere: Prisma.Sql[] = [];
  if (f.statuses) outerWhere.push(Prisma.sql`COALESCE(a."status", 'open') IN (${Prisma.join([...f.statuses])})`);
  if (f.kev) outerWhere.push(Prisma.sql`v."kevAddedAt" IS NOT NULL`);
  const outer = outerWhere.length ? Prisma.sql`WHERE ${Prisma.join(outerWhere, ' AND ')}` : Prisma.empty;

  // a component listed in several parts of one version counts once
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT c."versionId", c."projectId", c."key" AS "componentKey", c."name" AS "componentName",
           c."version" AS "componentVersion", c."purl" AS "componentPurl",
           v."id" AS "vulnId", v."cveId", v."summary", v."severity", v."cvssScore", v."cvssVector", v."cwes", v."epss",
           v."kevAddedAt", v."fixed", m."firstSeenAt",
           COALESCE(a."status", 'open') AS "status", a."justification", a."remediationCategory",
           a."remediationDetails", a."remediationUrl", COALESCE(a."suppressed", false) AS "suppressed", a."updatedAt"
    FROM (
      SELECT DISTINCT ON ("versionId", "key") * FROM "project_sbom_components"
      ${inner.length ? Prisma.sql`WHERE ${Prisma.join(inner, ' AND ')}` : Prisma.empty}
      ORDER BY "versionId", "key", "createdAt"
    ) c
    JOIN "vulnerability_matches" m ON m."componentKey" = c."key"
    JOIN "vulnerabilities" v ON v."id" = m."vulnerabilityId"
    LEFT JOIN "analyses" a ON a."projectId" = c."projectId" AND a."componentKey" = c."key" AND a."vulnerabilityId" = v."id"
    ${outer}
    ORDER BY v."cvssScore" DESC NULLS LAST, v."id"`;

  return rows.map(({ vulnId, ...r }) => ({ ...r, id: findingId(r.componentKey, vulnId), osvId: vulnId }));
}

/** The active (work in progress) version of each project, or of the given projects. */
export async function activeVersionIds(projectIds?: string[]): Promise<string[]> {
  const versions = await prisma.projectVersion.findMany({
    where: { status: 'active', ...(projectIds ? { projectId: { in: projectIds } } : {}) },
    select: { id: true },
  });
  return versions.map((v) => v.id);
}

/**
 * Versions that get new advisories: the active one, and released (frozen) versions of products still in
 * their support period (CRA Art. 13(8)), or without a support end date.
 */
export async function monitoredVersionIds(): Promise<string[]> {
  const versions = await prisma.projectVersion.findMany({
    where: {
      OR: [
        { status: 'active' },
        { project: { OR: [{ supportPeriodEnd: null }, { supportPeriodEnd: { gt: new Date() } }] } },
      ],
    },
    select: { id: true },
  });
  return versions.map((v) => v.id);
}
