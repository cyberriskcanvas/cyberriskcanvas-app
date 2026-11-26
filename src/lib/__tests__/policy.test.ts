import { describe, expect, it } from 'vitest';
import { evaluatePolicies, mustUse, validatePolicy, type Policy, type PolicyComponent } from '../policy';
import type { Finding } from '../findings';

const comp = (over: Partial<PolicyComponent> = {}): PolicyComponent => ({ projectId: 'p1', versionId: 'v1', key: 'pkg:npm/a@1', name: 'a', version: '1', purl: 'pkg:npm/a@1', licenses: ['MIT'], ...over });
const finding = (over: Partial<Finding> = {}): Finding => ({
  id: 'x', versionId: 'v1', projectId: 'p1', componentKey: 'pkg:npm/a@1', componentName: 'a', componentVersion: '1', componentPurl: 'pkg:npm/a@1',
  osvId: 'CVE-1', cveId: 'CVE-1', summary: null, severity: 'HIGH', cvssScore: 7, cvssVector: null, cwes: ['CWE-79'], epss: 0.4, kevAddedAt: null, fixed: [],
  status: 'open', justification: null, remediationCategory: null, remediationDetails: null, remediationUrl: null, suppressed: false, updatedAt: null, firstSeenAt: new Date(), ...over,
});
const policy = (over: Partial<Policy>): Policy => ({ id: 'pol', name: 'rule', violation: 'fail', operator: 'any', conditions: [], projectIds: [], ...over });

describe('mustUse', () => {
  const gpl = (id: string) => id.startsWith('gpl');
  it('is true when no alternative avoids the license', () => {
    expect(mustUse('GPL-3.0-only', gpl)).toBe(true);
    expect(mustUse('MIT AND GPL-2.0-only', gpl)).toBe(true);
    expect(mustUse('GPL-2.0-only WITH Classpath-exception-2.0', gpl)).toBe(true);
    expect(mustUse('GPL-2.0-only OR MIT', gpl)).toBe(false);
    expect(mustUse('MIT', gpl)).toBe(false);
  });
});

describe('evaluatePolicies', () => {
  it('flags forbidden licenses and license groups, but not a choice the product can avoid', () => {
    const comps = [comp({ key: 'a', licenses: ['GPL-3.0-only'] }), comp({ key: 'b', licenses: ['GPL-3.0-only OR MIT'] }), comp({ key: 'c', licenses: ['LGPL-2.1-only'] })];
    const byLicense = evaluatePolicies([policy({ conditions: [{ subject: 'license', value: 'GPL-3.0-only' }] })], comps, []);
    expect(byLicense.map((v) => v.componentKey)).toEqual(['a']);
    const byGroup = evaluatePolicies([policy({ conditions: [{ subject: 'license_group', value: 'strong-copyleft' }] })], comps, []);
    expect(byGroup.map((v) => v.componentKey)).toEqual(['a']);
  });

  it('flags a missing license and a component without a versioned purl', () => {
    const comps = [comp({ key: 'a', licenses: [] }), comp({ key: 'b', licenses: ['NOASSERTION'] }), comp({ key: 'c', purl: null }), comp({ key: 'd', purl: 'pkg:npm/d' })];
    expect(evaluatePolicies([policy({ conditions: [{ subject: 'license_missing' }] })], comps, []).map((v) => v.componentKey)).toEqual(['a', 'b']);
    expect(evaluatePolicies([policy({ conditions: [{ subject: 'no_purl' }] })], comps, []).map((v) => v.componentKey)).toEqual(['c', 'd']);
  });

  it('blocks components by purl pattern', () => {
    const comps = [comp({ key: 'a', purl: 'pkg:npm/event-stream@3.3.6' }), comp({ key: 'b', purl: 'pkg:npm/event-stream@4.0.0' })];
    const rule = policy({ conditions: [{ subject: 'purl', value: 'pkg:npm/event-stream@3.*' }] });
    expect(evaluatePolicies([rule], comps, []).map((v) => v.componentKey)).toEqual(['a']);
  });

  it('judges findings: severity, KEV, EPSS, CWE; resolved and suppressed ones do not count', () => {
    const c = comp();
    const rule = (subject: 'severity' | 'epss' | 'kev' | 'cwe', value?: string) => evaluatePolicies([policy({ conditions: [{ subject, value }] })], [c], [finding({ kevAddedAt: new Date() })]).length;
    expect(rule('severity', 'HIGH')).toBe(1);
    expect(rule('severity', 'CRITICAL')).toBe(0);
    expect(rule('kev')).toBe(1);
    expect(rule('epss', '0.5')).toBe(0);
    expect(rule('cwe', '79')).toBe(1);
    const sev = policy({ conditions: [{ subject: 'severity', value: 'LOW' }] });
    expect(evaluatePolicies([sev], [c], [finding({ status: 'not_affected' })])).toEqual([]);
    expect(evaluatePolicies([sev], [c], [finding({ suppressed: true })])).toEqual([]);
  });

  it('operator all needs one finding that satisfies every condition, plus the component conditions', () => {
    const rule = policy({ operator: 'all', conditions: [{ subject: 'severity', value: 'HIGH' }, { subject: 'kev' }] });
    const split = [finding({ osvId: 'CVE-1' }), finding({ osvId: 'CVE-2', severity: 'LOW', kevAddedAt: new Date() })];
    expect(evaluatePolicies([rule], [comp()], split)).toEqual([]);
    expect(evaluatePolicies([rule], [comp()], [finding({ kevAddedAt: new Date() })])).toHaveLength(1);
    const mixed = policy({ operator: 'all', conditions: [{ subject: 'license', value: 'gpl-3.0-only' }, { subject: 'severity', value: 'HIGH' }] });
    expect(evaluatePolicies([mixed], [comp({ licenses: ['GPL-3.0-only'] })], [finding()])).toHaveLength(1);
    expect(evaluatePolicies([mixed], [comp()], [finding()])).toEqual([]);
  });

  it('applies to the chosen products only, marks waived violations, ignores a rule without conditions', () => {
    const rule = policy({ conditions: [{ subject: 'license_missing' }], projectIds: ['p2'] });
    expect(evaluatePolicies([rule], [comp({ licenses: [] })], [])).toEqual([]);
    const all = policy({ conditions: [{ subject: 'license_missing' }] });
    expect(evaluatePolicies([all], [comp({ licenses: [] })], [], new Set(['pol|p1|pkg:npm/a@1'])).map((v) => v.waived)).toEqual([true]);
    expect(evaluatePolicies([policy({})], [comp()], [finding()])).toEqual([]);
  });
});

describe('validatePolicy', () => {
  const ok = { name: ' No GPL ', violation: 'fail', operator: 'any', conditions: [{ subject: 'license_group', value: 'strong-copyleft' }, { subject: 'kev', value: 'ignored' }] };
  it('cleans the input', () => {
    expect(validatePolicy(ok)).toEqual({ ok: true, value: { name: 'No GPL', violation: 'fail', operator: 'any', conditions: [{ subject: 'license_group', value: 'strong-copyleft' }, { subject: 'kev' }], projectIds: [] } });
  });
  it('rejects what cannot be evaluated', () => {
    for (const bad of [{ ...ok, name: ' ' }, { ...ok, conditions: [] }, { ...ok, conditions: [{ subject: 'license' }] }, { ...ok, conditions: [{ subject: 'license_group', value: 'x' }] }, { ...ok, conditions: [{ subject: 'severity', value: 'HUGE' }] }, { ...ok, conditions: [{ subject: 'epss', value: '2' }] }, { ...ok, conditions: [{ subject: 'nope' }] }]) {
      expect(validatePolicy(bad).ok).toBe(false);
    }
  });
});
