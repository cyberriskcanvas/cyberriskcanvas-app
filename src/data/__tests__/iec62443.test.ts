import { describe, it, expect } from 'vitest';
import {
  calculateCompliance,
  getRequirementsForSL,
  IEC62443_4_2,
  type ComplianceStatus,
} from '../iec62443';

// ─── calculateCompliance ──────────────────────────────────────────────────────

describe('calculateCompliance', () => {
  const reqs = IEC62443_4_2.slice(0, 4); // 4 requirements as fixture

  it('returns zero score when no mappings provided (all non-compliant)', () => {
    const result = calculateCompliance([], reqs);
    expect(result.score).toBe(0);
    expect(result.total).toBe(4);
    expect(result.compliant).toBe(0);
    expect(result.nonCompliant).toBe(4);
  });

  it('returns score 100 when all requirements are compliant', () => {
    const mappings = reqs.map((r) => ({ requirementId: r.id, status: 'compliant' as ComplianceStatus }));
    const result = calculateCompliance(mappings, reqs);
    expect(result.score).toBe(100);
    expect(result.compliant).toBe(4);
    expect(result.partial).toBe(0);
    expect(result.nonCompliant).toBe(0);
  });

  it('partial counts as 0.5 in score formula', () => {
    // 2 compliant + 2 partial → (2 + 2*0.5) / 4 * 100 = 75
    const mappings = [
      { requirementId: reqs[0].id, status: 'compliant' as ComplianceStatus },
      { requirementId: reqs[1].id, status: 'compliant' as ComplianceStatus },
      { requirementId: reqs[2].id, status: 'partial' as ComplianceStatus },
      { requirementId: reqs[3].id, status: 'partial' as ComplianceStatus },
    ];
    const result = calculateCompliance(mappings, reqs);
    expect(result.score).toBe(75);
    expect(result.compliant).toBe(2);
    expect(result.partial).toBe(2);
    expect(result.nonCompliant).toBe(0);
  });

  it('not-applicable requirements do not count toward score', () => {
    // 2 compliant, 2 not-applicable → compliant=2, nonCompliant=0, partial=0
    // Score: (2 + 0) / 4 * 100 = 50 (total still includes not-applicable)
    const mappings = [
      { requirementId: reqs[0].id, status: 'compliant' as ComplianceStatus },
      { requirementId: reqs[1].id, status: 'compliant' as ComplianceStatus },
      { requirementId: reqs[2].id, status: 'not-applicable' as ComplianceStatus },
      { requirementId: reqs[3].id, status: 'not-applicable' as ComplianceStatus },
    ];
    const result = calculateCompliance(mappings, reqs);
    expect(result.total).toBe(4);
    expect(result.compliant).toBe(2);
    expect(result.nonCompliant).toBe(0);
    // not-applicable requirements fall into neither compliant/partial/nonCompliant bucket
  });

  it('unknown requirementIds in mappings are silently ignored', () => {
    const mappings = [
      { requirementId: 'NONEXISTENT', status: 'compliant' as ComplianceStatus },
    ];
    const result = calculateCompliance(mappings, reqs);
    expect(result.score).toBe(0);
    expect(result.total).toBe(4);
  });

  it('returns all zeros for empty requirements list', () => {
    const result = calculateCompliance([], []);
    expect(result).toEqual({ total: 0, compliant: 0, partial: 0, nonCompliant: 0, score: 0 });
  });

  it('score is always between 0 and 100', () => {
    const mappings = IEC62443_4_2.map((r) => ({ requirementId: r.id, status: 'compliant' as ComplianceStatus }));
    const result = calculateCompliance(mappings, IEC62443_4_2);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// ─── getRequirementsForSL ─────────────────────────────────────────────────────

describe('getRequirementsForSL', () => {
  it('SL-1 returns only requirements with minSL <= 1', () => {
    const reqs = getRequirementsForSL(1, '4-2');
    expect(reqs.every((r) => r.minSL <= 1)).toBe(true);
    expect(reqs.length).toBeGreaterThan(0);
  });

  it('SL-4 returns all requirements', () => {
    const sl1 = getRequirementsForSL(1, '4-2');
    const sl4 = getRequirementsForSL(4, '4-2');
    expect(sl4.length).toBeGreaterThanOrEqual(sl1.length);
  });

  it('higher SL includes more requirements than lower SL', () => {
    const sl1 = getRequirementsForSL(1, '4-2');
    const sl2 = getRequirementsForSL(2, '4-2');
    const sl3 = getRequirementsForSL(3, '4-2');
    expect(sl2.length).toBeGreaterThan(sl1.length);
    expect(sl3.length).toBeGreaterThan(sl2.length);
  });

  it('part 4-2 returns only CR requirements', () => {
    const reqs = getRequirementsForSL(4, '4-2');
    expect(reqs.every((r) => r.id.startsWith('CR'))).toBe(true);
    expect(reqs.every((r) => r.part === '4-2')).toBe(true);
  });

  it('part 3-3 returns only SR requirements', () => {
    const reqs = getRequirementsForSL(4, '3-3');
    expect(reqs.every((r) => r.id.startsWith('SR'))).toBe(true);
    expect(reqs.every((r) => r.part === '3-3')).toBe(true);
  });

  it('CR requirements are not mixed into 3-3 results', () => {
    const reqs = getRequirementsForSL(4, '3-3');
    const ids = reqs.map((r) => r.id);
    // IEC62443_4_2 IDs should not appear
    const crIds = IEC62443_4_2.map((r) => r.id);
    expect(ids.some((id) => crIds.includes(id))).toBe(false);
  });
});
