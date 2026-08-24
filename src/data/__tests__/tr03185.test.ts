import { describe, it, expect } from 'vitest';
import {
  TR03185_REQUIREMENTS,
  TR03185_CATEGORY_LABELS,
} from '../tr03185';

describe('BSI TR-03185 Secure Software Lifecycle Catalog', () => {
  it('should cover producer, open-source, and AI requirements', () => {
    expect(TR03185_REQUIREMENTS.length).toBeGreaterThan(15);

    const producerReqs = TR03185_REQUIREMENTS.filter((r) => r.target === 'producer');
    const ossReqs = TR03185_REQUIREMENTS.filter((r) => r.target === 'oss');
    const aiReqs = TR03185_REQUIREMENTS.filter((r) => r.target === 'ai');

    expect(producerReqs.length).toBeGreaterThan(5);
    expect(ossReqs.length).toBeGreaterThan(4);
    expect(aiReqs.length).toBeGreaterThan(0);
  });

  it('should verify critical SDL controls', () => {
    expect(TR03185_REQUIREMENTS.some((r) => r.id === 'PROD.DEV.C.1')).toBe(true); // STRIDE threat modelling
    expect(TR03185_REQUIREMENTS.some((r) => r.id === 'PROD.DEV.L.2')).toBe(true); // SBOM
    expect(TR03185_REQUIREMENTS.some((r) => r.id === 'AI.GOV.01')).toBe(true);    // AI Code assistant governance
  });

  it('should have labels for all categories', () => {
    for (const req of TR03185_REQUIREMENTS) {
      expect(TR03185_CATEGORY_LABELS[req.category]).toBeDefined();
    }
  });
});
