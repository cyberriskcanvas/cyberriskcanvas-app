import { describe, expect, it } from 'vitest';
import { summarize } from '../metrics';

const f = (severity: string, status = 'open', over: Record<string, unknown> = {}) => ({ severity, status, suppressed: false, kevAddedAt: null, componentKey: 'a', ...over }) as Parameters<typeof summarize>[0][number];

describe('summarize', () => {
  it('counts unresolved, unsuppressed findings per severity and weights the risk score', () => {
    const c = summarize(
      [f('CRITICAL'), f('HIGH', 'affected', { componentKey: 'b' }), f('HIGH', 'not_affected'), f('MEDIUM', 'in_triage'), f('LOW', 'open', { suppressed: true }), f('CRITICAL', 'fixed')],
      [{ purl: 'pkg:npm/a@1' }, { purl: null }, { purl: 'pkg:npm/b' }],
      [],
    );
    expect(c).toMatchObject({ critical: 1, high: 1, medium: 1, low: 0, findings: 3, audited: 4, suppressed: 1, vulnerableComponents: 2, riskScore: 10 + 5 + 3 });
    expect(c).toMatchObject({ components: 3, unanalysable: 2 });
  });

  it('counts exploited findings and unwaived policy violations by level', () => {
    const c = summarize([f('LOW', 'open', { kevAddedAt: new Date() }), f('LOW', 'fixed', { kevAddedAt: new Date() })], [], [{ level: 'fail', waived: false }, { level: 'fail', waived: true }, { level: 'warn', waived: false }, { level: 'info', waived: false }]);
    expect(c).toMatchObject({ exploited: 1, policyFail: 1, policyWarn: 1 });
  });
});
