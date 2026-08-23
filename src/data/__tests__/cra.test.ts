import { describe, it, expect } from 'vitest';
import {
  CRA_REQUIREMENTS,
  resolveCRARequirement,
  getRequirementsByDomain,
  calculateCRACompliance,
} from '../cra';

describe('CRA Requirements Catalog (BSI TR-03183-1 Annex B)', () => {
  it('should include official Part I properties and Part II vulnerability handling requirements', () => {
    const part1 = CRA_REQUIREMENTS.filter((r) => r.domain === 'cra_part1_properties');
    const part2 = CRA_REQUIREMENTS.filter((r) => r.domain === 'cra_part2_vulnerability');

    expect(part1.length).toBeGreaterThanOrEqual(20);
    expect(part2.length).toBeGreaterThanOrEqual(10);

    expect(CRA_REQUIREMENTS.some((r) => r.id === 'ER.1')).toBe(true);
    expect(CRA_REQUIREMENTS.some((r) => r.id === 'ER.6')).toBe(true);
    expect(CRA_REQUIREMENTS.some((r) => r.id === 'VH.1a')).toBe(true);
    expect(CRA_REQUIREMENTS.some((r) => r.id === 'VH.5')).toBe(true);
  });

  it('should resolve legacy requirement IDs smoothly', () => {
    const fromOfficial = resolveCRARequirement('ER.0');
    expect(fromOfficial).toBeDefined();
    expect(fromOfficial?.id).toBe('ER.0');

    const fromLegacy = resolveCRARequirement('sd_01');
    expect(fromLegacy).toBeDefined();
    expect(fromLegacy?.id).toBe('ER.0');
  });

  it('should group requirements by domain', () => {
    const grouped = getRequirementsByDomain();
    expect(grouped.cra_part1_properties.length).toBeGreaterThan(0);
    expect(grouped.cra_part2_vulnerability.length).toBeGreaterThan(0);
    expect(grouped.technical_documentation.length).toBeGreaterThan(0);
  });

  it('should correctly calculate CRA compliance score with both official and legacy IDs', () => {
    const mappings = [
      { requirementId: 'ER.0', status: 'compliant' as const },
      { requirementId: 'ER.1', status: 'compliant' as const },
      { requirementId: 'ER.2', status: 'partial' as const },
    ];

    const result = calculateCRACompliance(mappings);
    expect(result.compliant).toBe(2);
    expect(result.partial).toBe(1);
    expect(result.score).toBeGreaterThan(0);
  });
});
