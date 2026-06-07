export interface OsvSeverity {
  type: string;
  score: string;
}

export interface OsvVuln {
  id: string;
  aliases?: string[];
  summary?: string;
  severity?: OsvSeverity[];
  database_specific?: { severity?: string; cvss_score?: number };
}

// ─── CVSS score computation ───────────────────────────────────────────────────

function roundup(x: number): number {
  return Math.ceil(x * 10) / 10;
}

export function parseCvssV3(vector: string): number | null {
  const clean = vector.replace(/^CVSS:\d+\.\d+\//, '');
  const m: Record<string, string> = {};
  for (const part of clean.split('/')) {
    const idx = part.indexOf(':');
    if (idx > 0) m[part.slice(0, idx)] = part.slice(idx + 1);
  }
  const AV: Record<string, number> = { N: 0.85, A: 0.62, L: 0.55, P: 0.20 };
  const AC: Record<string, number> = { L: 0.77, H: 0.44 };
  const UI: Record<string, number> = { N: 0.85, R: 0.62 };
  const CIA: Record<string, number> = { H: 0.56, L: 0.22, N: 0.00 };
  const PR_U: Record<string, number> = { N: 0.85, L: 0.62, H: 0.27 };
  const PR_C: Record<string, number> = { N: 0.85, L: 0.50, H: 0.08 };
  const S = m['S'];
  const av = AV[m['AV']], ac = AC[m['AC']], ui = UI[m['UI']];
  const pr = (S === 'C' ? PR_C : PR_U)[m['PR']];
  const c = CIA[m['C']], i = CIA[m['I']], a = CIA[m['A']];
  if ([av, ac, pr, ui, c, i, a].some((v) => v === undefined)) return null;
  const iscBase = 1 - (1 - c) * (1 - i) * (1 - a);
  const isc = S === 'C'
    ? 7.52 * (iscBase - 0.029) - 3.25 * Math.pow(iscBase - 0.02, 15)
    : 6.42 * iscBase;
  const esc = 8.22 * av * ac * pr * ui;
  if (isc <= 0) return 0;
  return roundup(S === 'C' ? Math.min(1.08 * (isc + esc), 10) : Math.min(isc + esc, 10));
}

export function parseCvssV2(vector: string): number | null {
  const m: Record<string, string> = {};
  for (const part of vector.split('/')) {
    const idx = part.indexOf(':');
    if (idx > 0) m[part.slice(0, idx)] = part.slice(idx + 1);
  }
  const AV: Record<string, number> = { N: 1.0, A: 0.646, L: 0.395 };
  const AC: Record<string, number> = { L: 0.71, M: 0.61, H: 0.35 };
  const Au: Record<string, number> = { N: 0.704, S: 0.56, M: 0.45 };
  const CIA: Record<string, number> = { N: 0.0, P: 0.275, C: 0.660 };
  const av = AV[m['AV']], ac = AC[m['AC']], au = Au[m['Au']];
  const c = CIA[m['C']], i = CIA[m['I']], a = CIA[m['A']];
  if ([av, ac, au, c, i, a].some((v) => v === undefined)) return null;
  const impact = 10.41 * (1 - (1 - c) * (1 - i) * (1 - a));
  const exploitability = 20 * av * ac * au;
  const fImpact = impact === 0 ? 0 : 1.176;
  return roundup(((0.6 * impact) + (0.4 * exploitability) - 1.5) * fImpact);
}

export function scoreToSeverityV3(score: number): string {
  if (score >= 9.0) return 'CRITICAL';
  if (score >= 7.0) return 'HIGH';
  if (score >= 4.0) return 'MEDIUM';
  if (score > 0.0) return 'LOW';
  return 'NONE';
}

export function scoreToSeverityV2(score: number): string {
  if (score >= 7.0) return 'HIGH';
  if (score >= 4.0) return 'MEDIUM';
  if (score > 0.0) return 'LOW';
  return 'NONE';
}

export function assessSeverity(vuln: OsvVuln): { severity: string; cvssScore: number | null } {
  const dbSev = vuln.database_specific?.severity?.toUpperCase();
  if (dbSev && ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'].includes(dbSev)) {
    let cvssScore: number | null = vuln.database_specific?.cvss_score ?? null;
    if (cvssScore === null) {
      for (const sv of vuln.severity ?? []) {
        const s = sv.type === 'CVSS_V3' ? parseCvssV3(sv.score)
                : sv.type === 'CVSS_V2' ? parseCvssV2(sv.score)
                : null;
        if (s !== null) { cvssScore = s; break; }
      }
    }
    return { severity: dbSev, cvssScore };
  }
  for (const sv of vuln.severity ?? []) {
    if (sv.type === 'CVSS_V3') {
      const s = parseCvssV3(sv.score);
      if (s !== null) return { severity: scoreToSeverityV3(s), cvssScore: s };
    }
    if (sv.type === 'CVSS_V2') {
      const s = parseCvssV2(sv.score);
      if (s !== null) return { severity: scoreToSeverityV2(s), cvssScore: s };
    }
  }
  return { severity: 'MEDIUM', cvssScore: null };
}

// ─── Union-Find deduplication ─────────────────────────────────────────────────

export function hasSeverityData(vuln: OsvVuln): boolean {
  return !!vuln.database_specific?.severity || (vuln.severity?.length ?? 0) > 0;
}

function severityRank(s: string): number {
  return { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 }[s] ?? -1;
}

export function filterToQualitySources(vulns: OsvVuln[]): OsvVuln[] {
  const withData = vulns.filter(hasSeverityData);
  return withData.length > 0 ? withData : vulns;
}

export function deduplicateVulns(vulns: OsvVuln[]): OsvVuln[] {
  if (vulns.length <= 1) return vulns;
  const par = Array.from({ length: vulns.length }, (_, i) => i);
  const find = (x: number): number => { if (par[x] !== x) par[x] = find(par[x]); return par[x]; };
  const unite = (x: number, y: number) => { par[find(x)] = find(y); };
  const idToIdx = new Map<string, number>();
  for (let i = 0; i < vulns.length; i++) {
    idToIdx.set(vulns[i].id, i);
    for (const a of vulns[i].aliases ?? []) idToIdx.set(a, i);
  }
  for (let i = 0; i < vulns.length; i++) {
    for (const a of vulns[i].aliases ?? []) {
      const j = idToIdx.get(a);
      if (j !== undefined && j !== i) unite(i, j);
    }
  }
  const groups = new Map<number, number[]>();
  for (let i = 0; i < vulns.length; i++) {
    const root = find(i);
    const g = groups.get(root) ?? [];
    g.push(i);
    groups.set(root, g);
  }
  const result: OsvVuln[] = [];
  for (const indices of groups.values()) {
    const ranked = indices
      .map((i) => ({ i, has: hasSeverityData(vulns[i]), rank: severityRank(assessSeverity(vulns[i]).severity) }))
      .sort((a, b) => {
        if (a.has !== b.has) return a.has ? -1 : 1;
        return b.rank - a.rank;
      });
    const winner = { ...vulns[ranked[0].i] };
    const mergedAliases = new Set<string>([...(winner.aliases ?? [])]);
    for (const { i } of ranked.slice(1)) {
      for (const a of vulns[i].aliases ?? []) mergedAliases.add(a);
      mergedAliases.add(vulns[i].id);
    }
    winner.aliases = [...mergedAliases];
    result.push(winner);
  }
  return result;
}
