import { describe, expect, it } from 'vitest';
import { buildVex } from '../vex';
import type { Finding } from '../findings';

const finding = (over: Partial<Finding> = {}): Finding => ({
  id: 'x', versionId: 'v1', projectId: 'p', componentKey: 'pkg:npm/lodash@4.17.20', componentName: 'lodash', componentVersion: '4.17.20',
  componentPurl: 'pkg:npm/lodash@4.17.20', osvId: 'CVE-2021-23337', cveId: 'CVE-2021-23337', summary: 's', severity: 'HIGH', cvssScore: 7.2,
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H', cwes: [], epss: null, kevAddedAt: null, fixed: ['4.17.21'], status: 'open', justification: null,
  remediationCategory: null, remediationDetails: null, remediationUrl: null, suppressed: false, updatedAt: null, firstSeenAt: new Date(), ...over,
});

describe('buildVex', () => {
  it('maps the status, keeps one entry per component and advisory, and drops suppressed findings', () => {
    const vex = buildVex('Gateway', [
      finding({ status: 'not_affected', justification: 'not reachable' }),
      finding({ versionId: 'v2' }),
      finding({ osvId: 'CVE-2', suppressed: true }),
    ]);
    expect(vex.specVersion).toBe('1.6');
    expect(vex.vulnerabilities).toHaveLength(1);
    expect(vex.vulnerabilities[0]).toMatchObject({
      id: 'CVE-2021-23337',
      analysis: { state: 'not_affected', detail: 'not reachable' },
      affects: [{ ref: 'pkg:npm/lodash@4.17.20', versions: [{ version: '4.17.20', status: 'unaffected' }] }],
      recommendation: 'Update lodash to 4.17.21',
    });
  });

  it('adds the response of an affected finding with a remediation', () => {
    const [v] = buildVex('Gateway', [finding({ status: 'affected', remediationCategory: 'vendor_fix' })]).vulnerabilities;
    expect(v.analysis).toMatchObject({ state: 'exploitable', response: ['update'] });
  });
});
