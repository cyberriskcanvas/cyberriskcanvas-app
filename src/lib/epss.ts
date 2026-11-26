import { prisma } from './db';

// EPSS (FIRST): probability that an advisory is exploited in the next 30 days. Daily scores per CVE.
const URL_BASE = 'https://api.first.org/data/v1/epss';
const BATCH = 100;

export interface Epss { epss: number; percentile: number }

/** Scores per CVE. A failed batch is left out, so those advisories keep their old score. */
export async function fetchEpss(cves: string[]): Promise<Map<string, Epss>> {
  const out = new Map<string, Epss>();
  for (let i = 0; i < cves.length; i += BATCH) {
    try {
      const res = await fetch(`${URL_BASE}?cve=${cves.slice(i, i + BATCH).join(',')}&limit=${BATCH}`, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) continue;
      const data = (await res.json()) as { data?: Array<{ cve?: string; epss?: string; percentile?: string }> };
      for (const d of data.data ?? []) {
        const epss = Number(d.epss), percentile = Number(d.percentile);
        if (d.cve && Number.isFinite(epss) && Number.isFinite(percentile)) out.set(d.cve, { epss, percentile });
      }
    } catch { /* offline or air-gapped: keep the last scores */ }
  }
  return out;
}

/** Refreshes the scores of all advisories with a CVE id. */
export async function refreshEpss(): Promise<number> {
  const rows = await prisma.vulnerability.findMany({ where: { cveId: { not: null } }, select: { cveId: true } });
  const scores = await fetchEpss(rows.map((r) => r.cveId!));
  if (scores.size === 0) return 0;
  const ids = [...scores.keys()];
  await prisma.$executeRaw`
    UPDATE "vulnerabilities" t SET "epss" = u.e, "epssPercentile" = u.p
    FROM unnest(${ids}::text[], ${ids.map((id) => scores.get(id)!.epss)}::float8[], ${ids.map((id) => scores.get(id)!.percentile)}::float8[]) AS u(id, e, p)
    WHERE t."cveId" = u.id`;
  return scores.size;
}
