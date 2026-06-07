import { describe, it, expect } from 'vitest';
import {
  parseCvssV3,
  parseCvssV2,
  scoreToSeverityV3,
  scoreToSeverityV2,
  assessSeverity,
  hasSeverityData,
  filterToQualitySources,
  deduplicateVulns,
  type OsvVuln,
} from '../cvss';

// ─── parseCvssV3 ──────────────────────────────────────────────────────────────

describe('parseCvssV3', () => {
  it('scores Log4Shell (CVE-2021-44228) at 10.0', () => {
    // AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H - NVD reference score: 10.0
    expect(parseCvssV3('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H')).toBe(10.0);
  });

  it('strips CVSS:3.0 prefix the same as CVSS:3.1', () => {
    expect(parseCvssV3('CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H')).toBe(10.0);
  });

  it('accepts vectors without version prefix', () => {
    expect(parseCvssV3('AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H')).toBe(10.0);
  });

  it('scores Heartbleed (CVE-2014-0160) correctly - AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N → 7.5', () => {
    expect(parseCvssV3('AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N')).toBe(7.5);
  });

  it('scores a low-risk local vector - AV:L/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:N', () => {
    const score = parseCvssV3('AV:L/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:N');
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThan(0);
    expect(score!).toBeLessThan(4.0);
  });

  it('returns 0 when all CIA are N (no impact)', () => {
    expect(parseCvssV3('AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N')).toBe(0);
  });

  it('returns null for missing metric (AV omitted)', () => {
    expect(parseCvssV3('AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H')).toBeNull();
  });

  it('returns null for unknown metric value', () => {
    expect(parseCvssV3('AV:X/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseCvssV3('')).toBeNull();
  });

  it('caps score at 10.0 for changed scope max vector', () => {
    const score = parseCvssV3('AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H');
    expect(score).toBe(10.0);
  });

  it('uses PR_C table when S=C (lower PR:H value)', () => {
    // Same vector, only S differs - S:C should produce higher score than S:U with PR:H
    const changed = parseCvssV3('AV:N/AC:L/PR:H/UI:N/S:C/C:H/I:H/A:H')!;
    const unchanged = parseCvssV3('AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H')!;
    expect(changed).not.toBeNull();
    expect(unchanged).not.toBeNull();
    // With S:C the scope-changed formula applies - both are valid, just verify they differ
    expect(changed).not.toBe(unchanged);
  });
});

// ─── parseCvssV2 ──────────────────────────────────────────────────────────────

describe('parseCvssV2', () => {
  it('scores a critical network vector - AV:N/AC:L/Au:N/C:C/I:C/A:C → 10.0', () => {
    expect(parseCvssV2('AV:N/AC:L/Au:N/C:C/I:C/A:C')).toBe(10.0);
  });

  it('scores a medium vector - AV:N/AC:M/Au:N/C:P/I:N/A:N', () => {
    const score = parseCvssV2('AV:N/AC:M/Au:N/C:P/I:N/A:N');
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThanOrEqual(4.0);
    expect(score!).toBeLessThan(7.0);
  });

  it('returns 0 when all CIA are N', () => {
    expect(parseCvssV2('AV:N/AC:L/Au:N/C:N/I:N/A:N')).toBe(0);
  });

  it('returns null for missing metric (Au omitted)', () => {
    expect(parseCvssV2('AV:N/AC:L/C:C/I:C/A:C')).toBeNull();
  });

  it('returns null for unknown AV value', () => {
    expect(parseCvssV2('AV:X/AC:L/Au:N/C:C/I:C/A:C')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseCvssV2('')).toBeNull();
  });

  it('local high-auth low-impact vector scores below 4.0', () => {
    const score = parseCvssV2('AV:L/AC:H/Au:M/C:N/I:P/A:N');
    expect(score).not.toBeNull();
    expect(score!).toBeLessThan(4.0);
  });
});

// ─── scoreToSeverityV3 ────────────────────────────────────────────────────────

describe('scoreToSeverityV3', () => {
  it.each([
    [10.0, 'CRITICAL'],
    [9.0, 'CRITICAL'],
    [8.9, 'HIGH'],
    [7.0, 'HIGH'],
    [6.9, 'MEDIUM'],
    [4.0, 'MEDIUM'],
    [3.9, 'LOW'],
    [0.1, 'LOW'],
    [0.0, 'NONE'],
  ])('score %s → %s', (score, expected) => {
    expect(scoreToSeverityV3(score)).toBe(expected);
  });
});

// ─── scoreToSeverityV2 ────────────────────────────────────────────────────────

describe('scoreToSeverityV2', () => {
  it.each([
    [10.0, 'HIGH'],
    [7.0, 'HIGH'],
    [6.9, 'MEDIUM'],
    [4.0, 'MEDIUM'],
    [3.9, 'LOW'],
    [0.1, 'LOW'],
    [0.0, 'NONE'],
  ])('score %s → %s', (score, expected) => {
    expect(scoreToSeverityV2(score)).toBe(expected);
  });
});

// ─── hasSeverityData ──────────────────────────────────────────────────────────

describe('hasSeverityData', () => {
  it('returns true when database_specific.severity is set', () => {
    expect(hasSeverityData({ id: 'X', database_specific: { severity: 'HIGH' } })).toBe(true);
  });

  it('returns true when severity array is non-empty', () => {
    expect(hasSeverityData({ id: 'X', severity: [{ type: 'CVSS_V3', score: 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N' }] })).toBe(true);
  });

  it('returns false when both are absent', () => {
    expect(hasSeverityData({ id: 'X' })).toBe(false);
  });

  it('returns false when severity array is empty', () => {
    expect(hasSeverityData({ id: 'X', severity: [] })).toBe(false);
  });

  it('returns false when database_specific exists but has no severity key', () => {
    expect(hasSeverityData({ id: 'X', database_specific: { cvss_score: 7.5 } })).toBe(false);
  });
});

// ─── assessSeverity ───────────────────────────────────────────────────────────

describe('assessSeverity', () => {
  it('uses database_specific.severity when present (case-insensitive)', () => {
    const vuln: OsvVuln = { id: 'X', database_specific: { severity: 'critical' } };
    expect(assessSeverity(vuln).severity).toBe('CRITICAL');
  });

  it('uses database_specific.cvss_score directly when available', () => {
    const vuln: OsvVuln = { id: 'X', database_specific: { severity: 'HIGH', cvss_score: 8.1 } };
    const result = assessSeverity(vuln);
    expect(result.severity).toBe('HIGH');
    expect(result.cvssScore).toBe(8.1);
  });

  it('computes cvssScore from CVSS_V3 vector when db severity is present but no cvss_score', () => {
    const vuln: OsvVuln = {
      id: 'X',
      database_specific: { severity: 'HIGH' },
      severity: [{ type: 'CVSS_V3', score: 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N' }],
    };
    const result = assessSeverity(vuln);
    expect(result.severity).toBe('HIGH');
    expect(result.cvssScore).toBe(7.5);
  });

  it('derives severity from CVSS_V3 vector when no db severity', () => {
    const vuln: OsvVuln = {
      id: 'X',
      severity: [{ type: 'CVSS_V3', score: 'AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H' }],
    };
    const result = assessSeverity(vuln);
    expect(result.severity).toBe('CRITICAL');
    expect(result.cvssScore).toBe(10.0);
  });

  it('falls back to CVSS_V2 when V3 is absent', () => {
    const vuln: OsvVuln = {
      id: 'X',
      severity: [{ type: 'CVSS_V2', score: 'AV:N/AC:L/Au:N/C:C/I:C/A:C' }],
    };
    const result = assessSeverity(vuln);
    expect(result.severity).toBe('HIGH');
    expect(result.cvssScore).toBe(10.0);
  });

  it('prefers CVSS_V3 over CVSS_V2 when both are listed', () => {
    const vuln: OsvVuln = {
      id: 'X',
      severity: [
        { type: 'CVSS_V3', score: 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N' }, // 7.5
        { type: 'CVSS_V2', score: 'AV:N/AC:L/Au:N/C:C/I:C/A:C' },           // 10.0
      ],
    };
    const result = assessSeverity(vuln);
    expect(result.cvssScore).toBe(7.5);
  });

  it('defaults to MEDIUM with null score when no severity data at all', () => {
    const result = assessSeverity({ id: 'X' });
    expect(result.severity).toBe('MEDIUM');
    expect(result.cvssScore).toBeNull();
  });

  it('ignores unknown db_specific severity values and falls through to vector', () => {
    const vuln: OsvVuln = {
      id: 'X',
      database_specific: { severity: 'UNKNOWN' },
      severity: [{ type: 'CVSS_V3', score: 'AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H' }],
    };
    const result = assessSeverity(vuln);
    expect(result.severity).toBe('CRITICAL');
  });
});

// ─── filterToQualitySources ───────────────────────────────────────────────────

describe('filterToQualitySources', () => {
  const withData: OsvVuln = { id: 'A', database_specific: { severity: 'HIGH' } };
  const withoutData: OsvVuln = { id: 'B' };

  it('returns only vulns with severity data when at least one exists', () => {
    const result = filterToQualitySources([withoutData, withData]);
    expect(result).toEqual([withData]);
  });

  it('returns all vulns when none have severity data', () => {
    const noData = [{ id: 'C' }, { id: 'D' }];
    expect(filterToQualitySources(noData)).toEqual(noData);
  });

  it('returns empty array for empty input', () => {
    expect(filterToQualitySources([])).toEqual([]);
  });

  it('returns all when all have severity data', () => {
    const all = [withData, { id: 'E', severity: [{ type: 'CVSS_V3', score: 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N' }] }];
    expect(filterToQualitySources(all)).toEqual(all);
  });
});

// ─── deduplicateVulns ─────────────────────────────────────────────────────────

describe('deduplicateVulns', () => {
  it('returns single-element input unchanged', () => {
    const v: OsvVuln = { id: 'CVE-2021-44228' };
    expect(deduplicateVulns([v])).toEqual([v]);
  });

  it('returns empty array for empty input', () => {
    expect(deduplicateVulns([])).toEqual([]);
  });

  it('keeps two unrelated vulns as separate entries', () => {
    const a: OsvVuln = { id: 'CVE-A' };
    const b: OsvVuln = { id: 'CVE-B' };
    expect(deduplicateVulns([a, b])).toHaveLength(2);
  });

  it('merges two entries that share an alias', () => {
    const a: OsvVuln = { id: 'GHSA-abc', aliases: ['CVE-2021-1234'] };
    const b: OsvVuln = { id: 'CVE-2021-1234', aliases: ['GHSA-abc'] };
    const result = deduplicateVulns([a, b]);
    expect(result).toHaveLength(1);
  });

  it('merges via transitive alias chain (A→B, B→C)', () => {
    const a: OsvVuln = { id: 'A', aliases: ['B'] };
    const b: OsvVuln = { id: 'B', aliases: ['C'] };
    const c: OsvVuln = { id: 'C' };
    expect(deduplicateVulns([a, b, c])).toHaveLength(1);
  });

  it('winner has severity data over one without', () => {
    const withSev: OsvVuln = { id: 'GHSA-x', aliases: ['CVE-X'], database_specific: { severity: 'CRITICAL' } };
    const noSev: OsvVuln = { id: 'CVE-X', aliases: ['GHSA-x'] };
    const [winner] = deduplicateVulns([noSev, withSev]);
    expect(winner.id).toBe('GHSA-x');
  });

  it('winner has higher severity when both have data', () => {
    const low: OsvVuln = { id: 'A', aliases: ['B'], database_specific: { severity: 'LOW' } };
    const critical: OsvVuln = { id: 'B', aliases: ['A'], database_specific: { severity: 'CRITICAL' } };
    const [winner] = deduplicateVulns([low, critical]);
    expect(winner.id).toBe('B');
  });

  it("merged winner's aliases include the loser's id", () => {
    const a: OsvVuln = { id: 'GHSA-x', aliases: ['CVE-X'], database_specific: { severity: 'HIGH' } };
    const b: OsvVuln = { id: 'CVE-X' };
    const [winner] = deduplicateVulns([a, b]);
    expect(winner.aliases).toContain('CVE-X');
  });

  it("merged winner's aliases include the loser's aliases", () => {
    const a: OsvVuln = { id: 'GHSA-x', aliases: ['CVE-X'], database_specific: { severity: 'HIGH' } };
    const b: OsvVuln = { id: 'CVE-X', aliases: ['NVD-X'] };
    const [winner] = deduplicateVulns([a, b]);
    expect(winner.aliases).toContain('NVD-X');
  });

  it('does not merge entries with no shared aliases', () => {
    const a: OsvVuln = { id: 'A', aliases: ['X'] };
    const b: OsvVuln = { id: 'B', aliases: ['Y'] };
    expect(deduplicateVulns([a, b])).toHaveLength(2);
  });

  it('handles three-way merge where all reference each other', () => {
    const a: OsvVuln = { id: 'A', aliases: ['B', 'C'] };
    const b: OsvVuln = { id: 'B', aliases: ['A'] };
    const c: OsvVuln = { id: 'C', aliases: ['A'] };
    expect(deduplicateVulns([a, b, c])).toHaveLength(1);
  });
});
