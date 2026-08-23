import { describe, it, expect } from 'vitest';
import {
  calculateBSILikelihood,
  isBSIRiskAcceptableByDefault,
  BSI_INTERFACE_OPTIONS,
  BSI_ACCESS_OPTIONS,
  BSI_USER_OPTIONS,
} from '../bsiEnvironment';

describe('BSI Environment & Likelihood (BSI TR-03183-1 Annex D)', () => {
  it('should have predefined options for interface, access, and user capability', () => {
    expect(BSI_INTERFACE_OPTIONS.length).toBe(5);
    expect(BSI_ACCESS_OPTIONS.length).toBe(4);
    expect(BSI_USER_OPTIONS.length).toBe(4);
  });

  it('should calculate lowest likelihood for strictly restricted physical environment', () => {
    // Physical (0.38) * Restricted (0.42) * Skilled (0.58) = 0.0925 -> 1 + 0.0925*4 = 1.37 -> 1
    const l = calculateBSILikelihood('physical', 'restricted', 'skilled');
    expect(l).toBe(1);
  });

  it('should calculate highest likelihood for open external network with layman user', () => {
    // External (1.0) * Non-restricted (1.0) * Layman (1.0) = 1.0 -> 1 + 1.0*4 = 5
    const l = calculateBSILikelihood('external_network', 'non_restricted', 'layman');
    expect(l).toBe(5);
  });

  it('should correctly evaluate BSI risk acceptance thresholds', () => {
    expect(isBSIRiskAcceptableByDefault(2)).toBe(true);  // Low / Negligible
    expect(isBSIRiskAcceptableByDefault(4)).toBe(true);  // Low
    expect(isBSIRiskAcceptableByDefault(6)).toBe(false); // Moderate -> Must be treated
    expect(isBSIRiskAcceptableByDefault(15)).toBe(false); // High -> Must be treated
  });
});
