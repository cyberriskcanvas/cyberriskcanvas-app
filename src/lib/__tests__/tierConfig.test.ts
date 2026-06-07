import { describe, it, expect } from 'vitest';
import { TIER_CONFIG } from '../tierConfig';

describe('TIER_CONFIG - free tier', () => {
  const free = TIER_CONFIG.free;

  it('has maxProjects of 3', () => {
    expect(free.maxProjects).toBe(3);
  });

  it('has maxNodes of 30', () => {
    expect(free.maxNodes).toBe(30);
  });

  it('allows realtime collaboration', () => {
    expect(free.realtimeCollab).toBe(true);
  });

  it('allows IEC 62443', () => {
    expect(free.iec62443).toBe(true);
  });

  it('does not allow export', () => {
    expect(free.export).toBe(false);
  });

  it('does not allow audit PDF', () => {
    expect(free.auditPdf).toBe(false);
  });

  it('does not allow version freeze', () => {
    expect(free.versionFreeze).toBe(false);
  });

  it('does not allow SBOM', () => {
    expect(free.sbom).toBe(false);
  });

  it('does not allow attack paths', () => {
    expect(free.attackPaths).toBe(false);
  });

  it('does not allow AI features', () => {
    expect(free.ai).toBe(false);
  });

  it('does not allow API access', () => {
    expect(free.api).toBe(false);
  });
});

describe('TIER_CONFIG - pro tier', () => {
  const pro = TIER_CONFIG.pro;

  it('has unlimited projects (null)', () => {
    expect(pro.maxProjects).toBeNull();
  });

  it('has unlimited nodes (null)', () => {
    expect(pro.maxNodes).toBeNull();
  });

  it('allows all boolean features', () => {
    const booleanFeatures = Object.entries(pro)
      .filter(([, v]) => typeof v === 'boolean')
      .map(([k]) => k);
    for (const feature of booleanFeatures) {
      expect((pro as unknown as Record<string, unknown>)[feature], `feature "${feature}" should be true`).toBe(true);
    }
  });
});

describe('TIER_CONFIG - free is a strict subset of pro', () => {
  it('every feature enabled in free is also enabled in pro', () => {
    const free = TIER_CONFIG.free;
    const pro = TIER_CONFIG.pro;
    for (const [key, value] of Object.entries(free)) {
      if (typeof value === 'boolean' && value === true) {
        expect((pro as unknown as Record<string, unknown>)[key], `pro should also have "${key}"`).toBe(true);
      }
    }
  });

  it('pro has no tighter numeric limits than free', () => {
    const free = TIER_CONFIG.free;
    const pro = TIER_CONFIG.pro;
    if (free.maxProjects !== null && pro.maxProjects !== null) {
      expect(pro.maxProjects).toBeGreaterThanOrEqual(free.maxProjects);
    } else {
      // pro being null (unlimited) is always >= any finite free limit
      expect(pro.maxProjects).toBeNull();
    }
  });
});
