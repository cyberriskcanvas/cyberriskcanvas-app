import { describe, it, expect } from 'vitest';
import {
  BSI_ASSET_CATALOG,
  findBsiAsset,
  calculateEffectiveImpact,
} from '../bsiAssets';

describe('BSI Asset Catalog (BSI TR-03183-1)', () => {
  it('should have standard data, functional, and security assets', () => {
    expect(BSI_ASSET_CATALOG.length).toBeGreaterThan(10);
    const dataAssets = BSI_ASSET_CATALOG.filter((a) => a.category === 'data');
    const funcAssets = BSI_ASSET_CATALOG.filter((a) => a.category === 'functional');
    const secAssets = BSI_ASSET_CATALOG.filter((a) => a.category === 'security');

    expect(dataAssets.length).toBeGreaterThan(0);
    expect(funcAssets.length).toBeGreaterThan(0);
    expect(secAssets.length).toBeGreaterThan(0);
  });

  it('should find BSI asset by code', () => {
    const asset = findBsiAsset('PII.Important');
    expect(asset).toBeDefined();
    expect(asset?.code).toBe('PII.Important');
    expect(asset?.defaultC).toBe(4);
    expect(asset?.defaultI).toBe(3);
    expect(asset?.defaultA).toBe(3);
  });

  it('should calculate effective impact with amplifier', () => {
    const base = { c: 3, i: 2, a: 3 };
    const standard = calculateEffectiveImpact(base, 1.0);
    expect(standard).toEqual({ c: 3, i: 2, a: 3, maxImpact: 3 });

    const amplified = calculateEffectiveImpact(base, 1.5);
    expect(amplified.c).toBe(5); // 3 * 1.5 = 4.5 -> 5
    expect(amplified.i).toBe(3); // 2 * 1.5 = 3
    expect(amplified.a).toBe(5); // 3 * 1.5 = 4.5 -> 5
    expect(amplified.maxImpact).toBe(5);
  });
});
