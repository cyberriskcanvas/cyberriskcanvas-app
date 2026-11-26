// Release gate: pure decision over the current findings and the latest CI runs.
import { hasActionableRemediation } from './remediation';
import { severityRank } from './cvss';

export const GATE_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
export type GateSeverity = (typeof GATE_SEVERITIES)[number];

export interface GateRun {
  source: string;
  part: string;
  result: string;
  summary: string;
  createdAt: Date;
  /** Severity counts of SARIF runs ({ critical, high, ... }); older runs and other sources keep their stored verdict. */
  metrics?: unknown;
}

/**
 * Whether a CI run blocks at the given threshold. SARIF runs with severity counts are judged now, so a changed
 * project threshold applies to runs already uploaded; secrets block on any finding.
 */
export function runFails(run: Pick<GateRun, 'source' | 'result' | 'metrics'>, failOn: GateSeverity): boolean {
  const m = run.metrics as Record<string, unknown> | null | undefined;
  if (!m || typeof m.critical !== 'number') return run.result !== 'ok';
  if (run.source === 'secrets') return Number(m.findings) > 0;
  return GATE_SEVERITIES.slice(0, GATE_SEVERITIES.indexOf(failOn) + 1).some((s) => Number(m[s]) > 0);
}

export interface GateVuln {
  osvId: string;
  severity: string | null;
  status: string;
  componentName: string;
  remediationCategory?: string | null;
  suppressed?: boolean;
  /** Known to be exploited in the wild: blocks whatever the severity threshold is. */
  kevAddedAt?: Date | null;
}

export interface GateReason {
  code: 'open_vulnerabilities' | 'policy_violations' | 'run_has_findings' | 'missing_source' | 'model_findings';
  message: string;
}

/** Newest run per (source, part). A product with several parts is only fine when all of its parts are. */
export function latestRunsPerSourcePart<T extends Pick<GateRun, 'source' | 'part' | 'createdAt'>>(runs: T[]): T[] {
  const latest = new Map<string, T>();
  for (const r of runs) {
    const key = `${r.source}\u0000${r.part}`;
    const cur = latest.get(key);
    if (!cur || r.createdAt > cur.createdAt) latest.set(key, r);
  }
  return [...latest.values()];
}

/** Findings at or above `failOn`, or known to be exploited, that still count as untriaged. Suppressed ones never block. */
export function blockingVulns<T extends GateVuln>(vulns: T[], failOn: GateSeverity = 'high'): T[] {
  const threshold = severityRank(failOn);
  return vulns.filter(
    (v) => !v.suppressed && (v.status === 'open' || v.status === 'in_triage' || (v.status === 'affected' && !hasActionableRemediation(v.remediationCategory))) && (severityRank(v.severity) >= threshold || !!v.kevAddedAt),
  );
}

export function evaluateGate(input: {
  vulns: GateVuln[];
  runs: GateRun[];
  /** Rule violations of the version (src/lib/policy.ts); only unwaived `fail` ones block. */
  policyViolations?: Array<{ level: string; waived: boolean; policyName: string; componentName: string }>;
  require?: string[];
  failOn?: GateSeverity;
  /** Open high-severity architecture check findings; only passed when the caller asked for `require=model`. */
  modelHighFindings?: number;
}): { pass: boolean; reasons: GateReason[] } {
  const failOn = input.failOn ?? 'high';
  const reasons: GateReason[] = [];

  // not_affected and fixed are triaged; an affected finding counts once users have a fix, workaround or mitigation.
  // open, in_triage and affected without a remediation still block.
  const blocking = blockingVulns(input.vulns, failOn);
  if (blocking.length > 0) {
    reasons.push({
      code: 'open_vulnerabilities',
      message: `${blocking.length} untriaged ${failOn}+ or actively exploited vulnerabilities (e.g. ${blocking[0].osvId} in ${blocking[0].componentName})`,
    });
  }

  const violations = (input.policyViolations ?? []).filter((v) => v.level === 'fail' && !v.waived);
  if (violations.length > 0) {
    reasons.push({
      code: 'policy_violations',
      message: `${violations.length} policy violation${violations.length === 1 ? '' : 's'} (e.g. "${violations[0].policyName}" in ${violations[0].componentName})`,
    });
  }

  const latest = latestRunsPerSourcePart(input.runs);
  for (const r of latest.filter((x) => runFails(x, failOn))) {
    reasons.push({ code: 'run_has_findings', message: `${r.source}${r.part ? ` (${r.part})` : ''}: ${r.summary}` });
  }

  for (const source of input.require ?? []) {
    if (!latest.some((r) => r.source === source)) {
      reasons.push({ code: 'missing_source', message: `no ${source} run uploaded for this version` });
    }
  }

  if (input.modelHighFindings && input.modelHighFindings > 0) {
    reasons.push({ code: 'model_findings', message: `${input.modelHighFindings} open high-severity architecture check findings` });
  }

  return { pass: reasons.length === 0, reasons };
}

const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

/**
 * JUnit XML of a gate result, for test-report widgets (GitLab `artifacts:reports:junit`, Jenkins, Azure DevOps).
 * One failed test case per reason; a passing gate is one passed test case.
 */
export function gateJunit(gate: { pass: boolean; reasons: GateReason[] }, version: number): string {
  const suite = `CyberRisk Canvas release gate (version ${version})`;
  const cases = gate.pass
    ? [`    <testcase classname="crc.gate" name="release gate passed"/>`]
    : gate.reasons.map((r) => `    <testcase classname="crc.gate.${r.code}" name="${xml(r.message)}">\n      <failure type="${r.code}" message="${xml(r.message)}"/>\n    </testcase>`);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites name="${xml(suite)}" tests="${cases.length}" failures="${gate.pass ? 0 : cases.length}">`,
    `  <testsuite name="${xml(suite)}" tests="${cases.length}" failures="${gate.pass ? 0 : cases.length}">`,
    ...cases,
    '  </testsuite>',
    '</testsuites>',
    '',
  ].join('\n');
}
