import { describe, it, expect } from 'vitest';
import {
  MODULE_H_CONTROLS,
  generateStatementOfApplicability,
} from '../tr03183h';
import { CRA_REQUIREMENTS } from '../cra';

describe('BSI TR-03183-H Module H & SoA Engine', () => {
  it('should include extended ISO 27002 and ISO 9001 controls', () => {
    expect(MODULE_H_CONTROLS.length).toBeGreaterThanOrEqual(6);
    expect(MODULE_H_CONTROLS.some((c) => c.id === 'CRA 8.25')).toBe(true); // SDLC
    expect(MODULE_H_CONTROLS.some((c) => c.id === 'CRA 8.8')).toBe(true);  // Tech vuln mgmt
    expect(MODULE_H_CONTROLS.some((c) => c.id === 'ISO 9001 8.3')).toBe(true); // Design & dev
  });

  it('should generate comprehensive Statement of Applicability (SoA)', () => {
    const mappings = [
      { requirementId: 'ER.1', status: 'compliant' as const, notes: 'Automated vulnerability scanning in CI' },
      { requirementId: 'ER.4a', status: 'not-applicable' as const, notes: 'Standalone device without internet connection' },
    ];

    const soa = generateStatementOfApplicability(mappings, CRA_REQUIREMENTS);

    expect(soa.length).toBe(CRA_REQUIREMENTS.length);

    const er1 = soa.find((r) => r.requirementId === 'ER.1');
    expect(er1).toBeDefined();
    expect(er1?.applicable).toBe(true);
    expect(er1?.status).toBe('compliant');
    expect(er1?.evidence).toBe('Automated vulnerability scanning in CI');

    const er4a = soa.find((r) => r.requirementId === 'ER.4a');
    expect(er4a).toBeDefined();
    expect(er4a?.applicable).toBe(false);
    expect(er4a?.status).toBe('not-applicable');
    expect(er4a?.justification).toBe('Standalone device without internet connection');
  });
});
