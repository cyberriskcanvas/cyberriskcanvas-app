import { prisma } from './db';
import { assessSeverity, cvssV3Vector, deduplicateVulns, type OsvVuln } from './cvss';
export { isAnalysable } from './sbomParse';

// Matches components against OSV.dev and keeps the advisories in the `vulnerabilities` table, so a restart
// or a second instance does not load them again. Matches are global: they depend on the component only.

const OSV = 'https://api.osv.dev/v1';
const BATCH = 50;
const DETAIL_CONCURRENCY = 20;

interface Stub { id: string; modified?: string }

/** Row of the `vulnerabilities` table for an OSV record. The id is the CVE, else the GHSA id, else the OSV id. */
export function vulnerabilityRow(v: OsvVuln) {
  const aliases = v.aliases ?? [];
  const cveId = [v.id, ...aliases].find((a) => a.startsWith('CVE-')) ?? null;
  const { severity, cvssScore } = assessSeverity(v);
  const fixed = (v.affected ?? []).flatMap((a) => (a.ranges ?? []).flatMap((r) => (r.events ?? []).map((e) => e.fixed)));
  return {
    id: cveId ?? aliases.find((a) => a.startsWith('GHSA-')) ?? v.id,
    osvId: v.id,
    aliases,
    cveId,
    summary: v.summary ?? null,
    severity,
    cvssScore,
    cvssVector: cvssV3Vector(v),
    cwes: v.database_specific?.cwe_ids ?? [],
    fixed: [...new Set(fixed.filter((f): f is string => typeof f === 'string'))],
    fetchedAt: new Date(),
  };
}

/** Advisory stubs per purl, same order. undefined = the request failed: the caller keeps the old matches. */
async function queryStubs(purls: string[]): Promise<Array<Stub[] | undefined>> {
  const out: Array<Stub[] | undefined> = [];
  for (let i = 0; i < purls.length; i += BATCH) {
    const chunk = purls.slice(i, i + BATCH);
    try {
      const res = await fetch(`${OSV}/querybatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: chunk.map((purl) => ({ package: { purl } })) }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { results?: Array<{ vulns?: Stub[] } | null> };
      chunk.forEach((_, j) => out.push(data.results?.[j]?.vulns ?? []));
    } catch {
      chunk.forEach(() => out.push(undefined));
    }
  }
  return out;
}

// querybatch only returns stubs (id, modified): severity, aliases and summary need the full record.
async function fetchRecords(ids: string[]): Promise<Map<string, OsvVuln>> {
  const records = new Map<string, OsvVuln>();
  for (let i = 0; i < ids.length; i += DETAIL_CONCURRENCY) {
    await Promise.all(ids.slice(i, i + DETAIL_CONCURRENCY).map(async (id) => {
      try {
        const r = await fetch(`${OSV}/vulns/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(10_000) });
        if (r.ok) records.set(id, (await r.json()) as OsvVuln);
      } catch { /* the component counts as failed and is retried by the next scan */ }
    }));
  }
  return records;
}

export interface NewMatch { componentKey: string; vulnerabilityId: string }

/**
 * Brings the matches of the given purls up to date (adds new ones, removes withdrawn ones) and stores the
 * advisories. A purl whose lookup failed keeps its old matches. Returns the matches that did not exist before.
 */
export async function matchComponents(purls: string[]): Promise<{ added: NewMatch[]; failed: number }> {
  const stubs = await queryStubs(purls);
  const stubById = new Map<string, Stub>();
  for (const list of stubs) for (const s of list ?? []) stubById.set(s.id, s);

  // Advisories we hold and that were not modified since we loaded them need no request
  const ids = [...stubById.keys()];
  const known = ids.length === 0 ? [] : await prisma.vulnerability.findMany({
    where: { OR: [{ osvId: { in: ids } }, { aliases: { hasSome: ids } }] },
    select: { id: true, osvId: true, aliases: true, fetchedAt: true },
  });
  const catalogId = new Map<string, string>();
  for (const k of known) {
    for (const rid of [k.osvId, ...k.aliases]) {
      const modified = stubById.get(rid)?.modified;
      if (stubById.has(rid) && (!modified || k.fetchedAt >= new Date(modified))) catalogId.set(rid, k.id);
    }
  }
  const records = await fetchRecords(ids.filter((id) => !catalogId.has(id)));

  const rows = new Map<string, ReturnType<typeof vulnerabilityRow>>();
  const wanted = new Map<string, Set<string>>();
  let failed = 0;
  purls.forEach((purl, i) => {
    const list = stubs[i];
    if (!list || list.some((s) => !catalogId.has(s.id) && !records.has(s.id))) { failed++; return; }
    const ofComponent = deduplicateVulns(list.filter((s) => records.has(s.id)).map((s) => records.get(s.id)!));
    const set = new Set(list.map((s) => catalogId.get(s.id)).filter((id): id is string => !!id));
    for (const v of ofComponent) {
      const row = vulnerabilityRow(v);
      rows.set(row.id, row);
      set.add(row.id);
    }
    wanted.set(purl, set);
  });

  const rowList = [...rows.values()];
  for (let i = 0; i < rowList.length; i += 100) {
    await prisma.$transaction(rowList.slice(i, i + 100).map(({ id, ...data }) => prisma.vulnerability.upsert({ where: { id }, create: { id, ...data }, update: data })));
  }

  const keys = [...wanted.keys()];
  const existing = keys.length === 0 ? [] : await prisma.vulnerabilityMatch.findMany({ where: { componentKey: { in: keys } }, select: { componentKey: true, vulnerabilityId: true } });
  const have = new Set(existing.map((m) => `${m.componentKey}\u0000${m.vulnerabilityId}`));
  const added: NewMatch[] = [];
  const stale: NewMatch[] = [];
  for (const [componentKey, set] of wanted) {
    for (const vulnerabilityId of set) if (!have.has(`${componentKey}\u0000${vulnerabilityId}`)) added.push({ componentKey, vulnerabilityId });
  }
  for (const m of existing) if (!wanted.get(m.componentKey)?.has(m.vulnerabilityId)) stale.push(m);

  if (added.length > 0) await prisma.vulnerabilityMatch.createMany({ data: added, skipDuplicates: true });
  for (let i = 0; i < stale.length; i += 500) {
    await prisma.vulnerabilityMatch.deleteMany({ where: { OR: stale.slice(i, i + 500) } });
  }
  return { added, failed };
}
