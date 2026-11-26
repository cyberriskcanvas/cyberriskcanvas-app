// Evaluates CI result files (SBOM, SARIF). Decides whether a run is "ok" or has
// "findings"; the gate and the UI are built on that verdict.

// sbom/sast/secrets/vulnscan: build-time evidence. dast/tls/ports: tests against the running product,
// run from the customer's own pipeline against their own targets (Canvas never scans anything itself).
import { spdx3Items } from './sbomParse';

export const CI_SOURCES = ['sbom', 'sast', 'secrets', 'vulnscan', 'dast', 'tls', 'ports'] as const;
export type CiSource = (typeof CI_SOURCES)[number];

export class InvalidCiFile extends Error {}

export interface CiEvaluation {
  ok: boolean;
  summary: string;
  metrics: Record<string, number | string>;
}

// BSI TR-03183-2 requires CycloneDX >= 1.6 or SPDX >= 3.0.1.
const MIN_CYCLONEDX: [number, number] = [1, 6];
// Placeholders that are not a version (some generators write "unknown" for version ranges).
const NO_VERSION = new Set(['', 'unknown', 'noassertion', 'none', 'n/a']);

type Json = Record<string, unknown>;

const missing = (v: unknown) => typeof v !== 'string' || NO_VERSION.has(v.trim().toLowerCase());

function parseJson(content: string, allowArray = false): Json {
  let d: unknown;
  try {
    d = JSON.parse(content);
  } catch {
    throw new InvalidCiFile('File is not valid JSON');
  }
  if (typeof d !== 'object' || d === null || (Array.isArray(d) && !allowArray)) throw new InvalidCiFile('File must be a JSON object');
  return d as Json;
}

function specVersion(text: string): [number, number] {
  const [a, b] = text.split('.').map((n) => parseInt(n, 10));
  return [a || 0, b || 0];
}

function evalSbom(d: Json): CiEvaluation {
  const problems: string[] = [];
  let label: string;
  let format: string;
  let count: number;

  if (d.bomFormat === 'CycloneDX') {
    const spec = String(d.specVersion ?? '');
    const comps = Array.isArray(d.components) ? (d.components as Json[]) : [];
    count = comps.length;
    format = 'cyclonedx';
    label = `CycloneDX ${spec}, ${count} components`;
    // Scanners such as Trivy list the lockfile itself as an unversioned "application" that the packages hang under: that is a grouping node, not a component to ship
    const parents = new Set((Array.isArray(d.dependencies) ? (d.dependencies as Json[]) : []).filter((e) => Array.isArray(e?.dependsOn) && (e.dependsOn as unknown[]).length > 0).map((e) => e.ref));
    const grouping = (c: Json) => (c.type === 'application' || c.type === 'file') && typeof c['bom-ref'] === 'string' && parents.has(c['bom-ref']);
    const incomplete = comps.filter((c) => !(c && c.name && !missing(c.version)) && !(c && grouping(c))).length;
    if (incomplete) problems.push(`${incomplete} components without name or version`);
    const [maj, min] = specVersion(spec);
    if (maj < MIN_CYCLONEDX[0] || (maj === MIN_CYCLONEDX[0] && min < MIN_CYCLONEDX[1])) {
      problems.push(`CycloneDX ${spec || '?'} is older than 1.6 (BSI TR-03183-2)`);
    }
  } else if (spdx3Items(d)) {
    const pkgs = spdx3Items(d)!.filter((e) => e?.type === 'software_Package');
    count = pkgs.length;
    format = 'spdx3';
    label = `SPDX 3, ${count} packages`;
    const incomplete = pkgs.filter((e) => !(e.name && !missing(e.software_packageVersion))).length;
    if (incomplete) problems.push(`${incomplete} packages without name or version`);
    if (JSON.stringify(d['@context']).includes('spdx.org/rdf/3.0.0')) problems.push('SPDX 3.0.0 is older than 3.0.1 (BSI TR-03183-2)');
  } else if (typeof d.spdxVersion === 'string' && Array.isArray(d.packages)) {
    const pkgs = d.packages as Json[];
    count = pkgs.length;
    format = 'spdx2';
    label = `${d.spdxVersion}, ${count} packages`;
    problems.push('SPDX 2.x is older than 3.0.1 (BSI TR-03183-2)');
    const incomplete = pkgs.filter((e) => !(e.name && !missing(e.versionInfo))).length;
    if (incomplete) problems.push(`${incomplete} packages without name or version`);
  } else {
    throw new InvalidCiFile('Neither CycloneDX nor SPDX recognised');
  }

  if (count === 0) problems.push('no components contained');
  return { ok: problems.length === 0, summary: [label, ...problems].join('; '), metrics: { format, components: count } };
}

type Level = 'error' | 'warning' | 'note';

/** Severity of a finding, highest first. The gate threshold is one of the first four. */
export const FINDING_SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export interface SarifFinding {
  severity: FindingSeverity;
  ruleId: string;
  title: string;
  message: string;
  /** "path:line" of the first location, if any. */
  location: string | null;
  helpUri: string | null;
}

/** CVSS-style score (SARIF `security-severity`, the convention of GitHub code scanning) to a severity. */
function fromScore(n: number): FindingSeverity {
  if (n >= 9) return 'critical';
  if (n >= 7) return 'high';
  if (n >= 4) return 'medium';
  return n > 0 ? 'low' : 'info';
}

const LEVEL_SEVERITY: Record<Level, FindingSeverity> = { error: 'high', warning: 'medium', note: 'low' };
const TAG_SEVERITY = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);

const text = (v: unknown) => (typeof (v as Json | undefined)?.text === 'string' ? String((v as Json).text) : '');

/**
 * Findings of a SARIF 2.1.0 file with a severity each: the `security-severity` score of the result or its rule
 * (Trivy, CodeQL, GitHub), else a CRITICAL/HIGH/MEDIUM/LOW rule tag, else the SARIF level (error = high, warning = medium, note = low).
 */
export function sarifFindings(content: string): SarifFinding[] {
  return sarifFindingsOf(parseJson(content));
}

function sarifFindingsOf(d: Json): SarifFinding[] {
  if (d.version !== '2.1.0' || !Array.isArray(d.runs)) throw new InvalidCiFile("Not SARIF 2.1.0 ('version' or 'runs' missing)");
  const out: SarifFinding[] = [];
  for (const run of d.runs as Json[]) {
    for (const inv of (run.invocations as Json[] | undefined) ?? []) {
      if (inv.executionSuccessful === false) throw new InvalidCiFile('The tool reports a failed run (executionSuccessful=false)');
    }
    const driver = ((run.tool as Json | undefined)?.driver as Json | undefined) ?? {};
    const rules = Array.isArray(driver.rules) ? (driver.rules as Json[]) : [];
    const byId = new Map(rules.filter((r) => typeof r.id === 'string').map((r) => [r.id as string, r]));
    for (const res of (run.results as Json[] | undefined) ?? []) {
      const rule = (typeof res.ruleIndex === 'number' ? rules[res.ruleIndex] : undefined) ?? byId.get(String(res.ruleId));
      const raw = (res.properties as Json | undefined)?.['security-severity'] ?? (rule?.properties as Json | undefined)?.['security-severity'];
      const score = raw === undefined || raw === null || raw === '' ? NaN : Number(raw);
      const tags = ((rule?.properties as Json | undefined)?.tags as unknown[] | undefined) ?? [];
      const tag = tags.map((x) => String(x).toUpperCase()).find((x) => TAG_SEVERITY.has(x));
      let level = res.level as string | undefined;
      if (level === undefined) level = (rule?.defaultConfiguration as Json | undefined)?.level as string | undefined;
      const lvl: Level = level === 'error' || level === 'warning' ? level : level === undefined ? 'warning' : 'note';
      // SARIF's default level is "warning"; "none" is informational
      const severity = Number.isFinite(score) ? fromScore(score) : tag ? (tag.toLowerCase() as FindingSeverity) : LEVEL_SEVERITY[lvl];
      const loc = ((res.locations as Json[] | undefined)?.[0]?.physicalLocation as Json | undefined);
      const uri = (loc?.artifactLocation as Json | undefined)?.uri;
      const line = (loc?.region as Json | undefined)?.startLine;
      const ruleId = String(res.ruleId ?? rule?.id ?? '');
      let title = text(rule?.shortDescription) || String(rule?.name ?? '') || ruleId;
      // Semgrep's short description is just "Semgrep Finding: <rule id>": the last part of the id reads better
      if (ruleId.includes('.') && title.endsWith(ruleId)) title = ruleId.split('.').pop()!.replace(/[-_]/g, ' ');
      out.push({
        severity,
        ruleId,
        title: title.slice(0, 300),
        message: text(res.message).slice(0, 1000),
        location: typeof uri === 'string' ? `${uri}${typeof line === 'number' ? `:${line}` : ''}` : null,
        helpUri: typeof rule?.helpUri === 'string' && /^https?:\/\//i.test(rule.helpUri) ? rule.helpUri : null,
      });
    }
  }
  return out;
}

/** Severities at or above a threshold. */
export function atOrAbove(threshold: FindingSeverity): FindingSeverity[] {
  return FINDING_SEVERITIES.slice(0, FINDING_SEVERITIES.indexOf(threshold) + 1);
}

function evalSarif(source: CiSource, d: Json, failOn: FindingSeverity): CiEvaluation {
  const findings = sarifFindingsOf(d);
  const count = Object.fromEntries(FINDING_SEVERITIES.map((s) => [s, 0])) as Record<FindingSeverity, number>;
  for (const f of findings) count[f.severity]++;
  const total = findings.length;
  // Secrets: every finding counts, a leaked key is a leaked key. The others fail at the project's threshold.
  const failing = source === 'secrets' ? total : atOrAbove(failOn).reduce((n, s) => n + count[s], 0);
  const parts = FINDING_SEVERITIES.filter((s) => count[s] > 0).map((s) => `${count[s]} ${s}`);
  return {
    ok: failing === 0,
    summary: `${total} findings${parts.length ? ` (${parts.join(', ')})` : ''}`,
    metrics: { findings: total, ...count },
  };
}

// ── testssl.sh (--jsonfile): flat list of { id, ip, port, severity, finding } ──────────────────
const TLS_FAIL = new Set(['HIGH', 'CRITICAL', 'FATAL']);

function evalTls(content: string): CiEvaluation {
  const d = JSON.parse(content) as unknown;
  // flat array, or { scanResult: [{ protocols: [...], ciphers: [...], ... }] } of the pretty format
  const items: Json[] = [];
  const collect = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') {
      const o = v as Json;
      if (typeof o.severity === 'string' && typeof o.id === 'string') items.push(o);
      else Object.values(o).forEach(collect);
    }
  };
  collect(d);
  if (items.length === 0) throw new InvalidCiFile('No testssl.sh findings found (use --jsonfile)');
  const failing = items.filter((i) => TLS_FAIL.has(String(i.severity).toUpperCase()));
  const medium = items.filter((i) => String(i.severity).toUpperCase() === 'MEDIUM').length;
  const worst = failing.slice(0, 3).map((i) => `${i.id}: ${String(i.finding).slice(0, 60)}`).join('; ');
  return {
    ok: failing.length === 0,
    summary: `${items.length} checks, ${failing.length} high/critical, ${medium} medium${worst ? ` (${worst})` : ''}`,
    metrics: { checks: items.length, failing: failing.length, medium },
  };
}

// ── nmap -oX: open ports compared with the ports declared in the architecture model ────────────
function evalPorts(content: string, declaredPorts: number[]): CiEvaluation {
  if (!/<nmaprun[\s>]/.test(content)) throw new InvalidCiFile('Not an nmap XML report (use -oX)');
  const open = new Set<number>();
  for (const m of content.matchAll(/<port\s+protocol="(?:tcp|udp)"\s+portid="(\d+)">\s*<state\s+state="open"/g)) open.add(parseInt(m[1], 10));
  const ports = [...open].sort((a, b) => a - b);
  const declared = new Set(declaredPorts);
  if (declared.size === 0) {
    return { ok: true, summary: `${ports.length} open ports (${ports.join(', ') || 'none'}); no ports are declared in the architecture model to compare with`, metrics: { open: ports.length, undeclared: 0 } };
  }
  const undeclared = ports.filter((p) => !declared.has(p));
  return {
    ok: undeclared.length === 0,
    summary: undeclared.length === 0 ? `${ports.length} open ports, all declared in the model` : `${undeclared.length} open ports not declared in the model: ${undeclared.join(', ')}`,
    metrics: { open: ports.length, undeclared: undeclared.length },
  };
}

export interface EvalOptions {
  /** Ports of the architecture model's connections, for the `ports` source. */
  declaredPorts?: number[];
  /** SARIF sources fail from this severity on (the project's gate setting); secrets fail on any finding. */
  failOn?: FindingSeverity;
}

export function evaluateCiFile(source: string, content: string, opts: EvalOptions = {}): CiEvaluation {
  if (!(CI_SOURCES as readonly string[]).includes(source)) {
    throw new InvalidCiFile(`Unknown source '${source}', allowed: ${CI_SOURCES.join(', ')}`);
  }
  if (source === 'ports') return evalPorts(content, opts.declaredPorts ?? []);
  const d = parseJson(content, source === 'tls');
  if (source === 'tls') return evalTls(content);
  return source === 'sbom' ? evalSbom(d) : evalSarif(source as CiSource, d, opts.failOn ?? 'high');
}
