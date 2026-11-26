import { describe, expect, it } from 'vitest';
import { evaluateGate, gateJunit, latestRunsPerSourcePart, runFails, type GateRun } from '../ciGate';

const run = (source: string, part: string, result: string, t: number): GateRun => ({
  source, part, result, summary: `${source} ${result}`, createdAt: new Date(t),
});
const vuln = (severity: string, status = 'open') => ({ osvId: 'CVE-1', severity, status, componentName: 'lib' });

describe('latestRunsPerSourcePart', () => {
  it('keeps the newest run per source and part', () => {
    const latest = latestRunsPerSourcePart([run('sast', '', 'findings', 1), run('sast', '', 'ok', 2), run('sast', 'api', 'ok', 1)]);
    expect(latest).toHaveLength(2);
    expect(latest.find((r) => r.part === '')?.result).toBe('ok');
  });
});

describe('evaluateGate', () => {
  it('passes with triaged vulns and green runs', () => {
    const r = evaluateGate({ vulns: [vuln('CRITICAL', 'not_affected'), vuln('LOW')], runs: [run('sbom', '', 'ok', 1)], require: ['sbom'] });
    expect(r).toEqual({ pass: true, reasons: [] });
  });
  it('fails on open high+ vulns by default, respects failOn', () => {
    expect(evaluateGate({ vulns: [vuln('HIGH')], runs: [] }).reasons[0].code).toBe('open_vulnerabilities');
    expect(evaluateGate({ vulns: [vuln('HIGH')], runs: [], failOn: 'critical' }).pass).toBe(true);
    expect(evaluateGate({ vulns: [vuln('MEDIUM', 'in_triage')], runs: [], failOn: 'medium' }).pass).toBe(false);
  });
  it('blocks actively exploited vulns below the threshold, but not suppressed or triaged ones', () => {
    const kev = { ...vuln('LOW'), kevAddedAt: new Date() };
    expect(evaluateGate({ vulns: [kev], runs: [], failOn: 'critical' }).reasons[0].code).toBe('open_vulnerabilities');
    expect(evaluateGate({ vulns: [{ ...kev, suppressed: true }], runs: [] }).pass).toBe(true);
    expect(evaluateGate({ vulns: [{ ...kev, status: 'not_affected' }], runs: [] }).pass).toBe(true);
    expect(evaluateGate({ vulns: [{ ...vuln('CRITICAL'), suppressed: true }], runs: [] }).pass).toBe(true);
  });
  it('fails on unwaived fail-level policy violations only', () => {
    const v = (level: string, waived = false) => ({ level, waived, policyName: 'No GPL', componentName: 'busybox' });
    expect(evaluateGate({ vulns: [], runs: [], policyViolations: [v('fail')] }).reasons[0]).toEqual({ code: 'policy_violations', message: '1 policy violation (e.g. "No GPL" in busybox)' });
    expect(evaluateGate({ vulns: [], runs: [], policyViolations: [v('warn'), v('info'), v('fail', true)] }).pass).toBe(true);
  });
  it('fails when the latest run of any part has findings, not when an older one had', () => {
    expect(evaluateGate({ vulns: [], runs: [run('sast', 'web', 'findings', 2), run('sast', 'api', 'ok', 2)] }).reasons).toHaveLength(1);
    expect(evaluateGate({ vulns: [], runs: [run('sast', '', 'findings', 1), run('sast', '', 'ok', 2)] }).pass).toBe(true);
  });
  it('fails on a missing required source', () => {
    const r = evaluateGate({ vulns: [], runs: [run('sbom', '', 'ok', 1)], require: ['sbom', 'secrets'] });
    expect(r.reasons).toEqual([{ code: 'missing_source', message: 'no secrets run uploaded for this version' }]);
  });
});

describe('model findings in the gate', () => {
  it('fails on open high architecture findings only when the caller passes a count', () => {
    expect(evaluateGate({ vulns: [], runs: [] }).pass).toBe(true);
    expect(evaluateGate({ vulns: [], runs: [], modelHighFindings: 0 }).pass).toBe(true);
    expect(evaluateGate({ vulns: [], runs: [], modelHighFindings: 2 }).reasons).toEqual([{ code: 'model_findings', message: '2 open high-severity architecture check findings' }]);
  });
});

describe('affected findings in the gate', () => {
  const affected = (remediationCategory: string | null) => ({ ...vuln('CRITICAL', 'affected'), remediationCategory });
  it('pass once users have a fix, a workaround or a mitigation', () => {
    for (const c of ['vendor_fix', 'workaround', 'mitigation']) expect(evaluateGate({ vulns: [affected(c)], runs: [] }).pass, c).toBe(true);
  });
  it('still blocks without a remediation or with none available', () => {
    for (const c of [null, 'none_available', 'no_fix_planned']) expect(evaluateGate({ vulns: [affected(c)], runs: [] }).pass, String(c)).toBe(false);
  });
});

describe('gateJunit', () => {
  it('writes one failed case per reason, escaped', () => {
    const x = gateJunit({ pass: false, reasons: [{ code: 'run_has_findings', message: 'sast: 2 findings <a & "b">' }, { code: 'missing_source', message: 'no sbom run uploaded for this version' }] }, 3);
    expect(x).toContain('tests="2" failures="2"');
    expect(x).toContain('classname="crc.gate.run_has_findings" name="sast: 2 findings &lt;a &amp; &quot;b&quot;&gt;"');
    expect(x.match(/<failure /g)).toHaveLength(2);
    expect(x).toContain('(version 3)');
  });
  it('writes one passed case for a passing gate', () => {
    const x = gateJunit({ pass: true, reasons: [] }, 1);
    expect(x).toContain('tests="1" failures="0"');
    expect(x).not.toContain('<failure');
  });
});

describe('runFails', () => {
  const sast = (m: object, result = 'findings') => ({ source: 'sast', result, metrics: { findings: 1, critical: 0, high: 0, medium: 0, low: 0, info: 0, ...m } });
  it('judges SARIF runs at the threshold, not by the stored verdict', () => {
    expect(runFails(sast({ medium: 2 }), 'high')).toBe(false);
    expect(runFails(sast({ medium: 2 }, 'ok'), 'medium')).toBe(true);
    expect(runFails(sast({ critical: 1 }), 'critical')).toBe(true);
  });
  it('blocks on any secret and keeps the stored verdict of other runs', () => {
    expect(runFails({ source: 'secrets', result: 'ok', metrics: { findings: 1, critical: 0, high: 0, medium: 0, low: 1, info: 0 } }, 'critical')).toBe(true);
    expect(runFails({ source: 'sbom', result: 'findings', metrics: { format: 'cyclonedx' } }, 'low')).toBe(true);
    expect(runFails({ source: 'sast', result: 'ok', metrics: { findings: 3, error: 0, warning: 3, note: 0 } }, 'low')).toBe(false);
  });
  it('lets a lower threshold turn the gate red', () => {
    const runs: GateRun[] = [{ source: 'sast', part: '', result: 'ok', summary: 's', createdAt: new Date(1), metrics: { findings: 1, critical: 0, high: 0, medium: 1, low: 0, info: 0 } }];
    expect(evaluateGate({ vulns: [], runs, failOn: 'high' }).pass).toBe(true);
    expect(evaluateGate({ vulns: [], runs, failOn: 'medium' }).pass).toBe(false);
  });
});
