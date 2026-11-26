import { Prisma } from '@/generated/prisma/client';
import { prisma } from './db';

// Component inventory across versions and products: "which of our products contain log4j 2.14, GPL code or CVE-x?"

export interface ComponentRow {
  projectId: string;
  projectName: string;
  versionId: string;
  versionNumber: number;
  versionStatus: string;
  key: string;
  name: string;
  version: string | null;
  purl: string | null;
  licenses: string[];
  direct: boolean | null;
  /** Advisories matching this component; triage is not considered (see loadFindings for that). */
  advisories: number;
}

export interface ComponentFilter {
  versionIds?: string[];
  projectIds?: string[];
  /** Part of a purl, name or license, or a CVE/GHSA id (components affected by it). */
  query?: string;
  limit?: number;
}

const like = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function listComponents(f: ComponentFilter = {}): Promise<ComponentRow[]> {
  if (f.versionIds?.length === 0 || f.projectIds?.length === 0) return [];
  const where: Prisma.Sql[] = [];
  if (f.versionIds) where.push(Prisma.sql`c."versionId" IN (${Prisma.join(f.versionIds)})`);
  if (f.projectIds) where.push(Prisma.sql`c."projectId" IN (${Prisma.join(f.projectIds)})`);
  const q = f.query?.trim();
  if (q) {
    where.push(Prisma.sql`(
      c."purl" ILIKE ${like(q)} OR c."name" ILIKE ${like(q)}
      OR EXISTS (SELECT 1 FROM unnest(c."licenses") l WHERE l ILIKE ${like(q)})
      OR EXISTS (SELECT 1 FROM "vulnerability_matches" m JOIN "vulnerabilities" v ON v."id" = m."vulnerabilityId"
                 WHERE m."componentKey" = c."key" AND (upper(v."id") = upper(${q}) OR upper(${q}) = ANY(SELECT upper(a) FROM unnest(v."aliases") a)))
    )`);
  }
  // a component listed in several parts of one version counts once
  return prisma.$queryRaw<Array<ComponentRow & { advisories: bigint }>>`
    SELECT c."projectId", p."name" AS "projectName", c."versionId", ver."number" AS "versionNumber", ver."status" AS "versionStatus",
           c."key", c."name", c."version", c."purl", COALESCE(c."licenses", '{}') AS "licenses", c."direct",
           (SELECT count(*) FROM "vulnerability_matches" m WHERE m."componentKey" = c."key")::int AS "advisories"
    FROM (
      SELECT DISTINCT ON ("versionId", "key") * FROM "project_sbom_components" c
      ${where.length ? Prisma.sql`WHERE ${Prisma.join(where, ' AND ')}` : Prisma.empty}
      ORDER BY "versionId", "key", "createdAt"
    ) c
    JOIN "project_versions" ver ON ver."id" = c."versionId"
    JOIN "projects" p ON p."id" = c."projectId"
    ORDER BY p."name", ver."number" DESC, c."name"
    LIMIT ${f.limit ?? 500}`;
}
