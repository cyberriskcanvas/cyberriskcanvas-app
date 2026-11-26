import { describe, expect, it } from 'vitest';
import { isAnalysable, vulnerabilityRow } from '../osv';

describe('isAnalysable', () => {
  it('needs a purl with a version', () => {
    expect(isAnalysable('pkg:npm/lodash@4.17.20')).toBe(true);
    expect(isAnalysable('pkg:npm/%40scope/name@1.0.0')).toBe(true);
    expect(isAnalysable('pkg:npm/lodash')).toBe(false);
    expect(isAnalysable('pkg:npm/%40scope/name')).toBe(false);
    expect(isAnalysable(null)).toBe(false);
  });
});

describe('vulnerabilityRow', () => {
  it('uses the CVE as id and keeps the OSV record, severity, CWEs and fix versions', () => {
    const row = vulnerabilityRow({
      id: 'GHSA-test-0001',
      aliases: ['CVE-2099-1', 'PYSEC-1'],
      summary: 's',
      database_specific: { severity: 'CRITICAL', cwe_ids: ['CWE-79'] },
      affected: [{ ranges: [{ events: [{ fixed: '1.2.3' }, { fixed: '1.2.3' }, {}] }] }, { ranges: [{ events: [{ fixed: '2.0.1' }] }] }],
    });
    expect(row).toMatchObject({ id: 'CVE-2099-1', osvId: 'GHSA-test-0001', cveId: 'CVE-2099-1', severity: 'CRITICAL', cwes: ['CWE-79'], fixed: ['1.2.3', '2.0.1'] });
  });

  it('falls back to the GHSA id, then the OSV id, and MEDIUM without severity data', () => {
    expect(vulnerabilityRow({ id: 'PYSEC-1', aliases: ['GHSA-aaaa'] })).toMatchObject({ id: 'GHSA-aaaa', cveId: null, severity: 'MEDIUM' });
    expect(vulnerabilityRow({ id: 'OSV-9' })).toMatchObject({ id: 'OSV-9', aliases: [], fixed: [] });
    expect(vulnerabilityRow({ id: 'CVE-2000-1' }).cveId).toBe('CVE-2000-1');
  });
});
