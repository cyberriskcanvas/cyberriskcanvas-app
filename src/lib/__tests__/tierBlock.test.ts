import { describe, it, expect } from 'vitest';
import { tierBlock, isTierBlock, type TierBlock } from '../tierBlock';

describe('tierBlock', () => {
  it('returns an object with __tierBlocked: true', () => {
    const result = tierBlock('pro', 'Upgrade required');
    expect(result.__tierBlocked).toBe(true);
  });

  it('includes the requiredTier', () => {
    expect(tierBlock('pro', 'msg').requiredTier).toBe('pro');
    expect(tierBlock('free', 'msg').requiredTier).toBe('free');
  });

  it('includes the message', () => {
    const msg = 'You need a Pro subscription';
    expect(tierBlock('pro', msg).message).toBe(msg);
  });

  it('returns a plain object (not a class instance)', () => {
    const result = tierBlock('pro', 'test');
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  });
});

describe('isTierBlock', () => {
  it('returns true for a TierBlock object', () => {
    const block = tierBlock('pro', 'msg');
    expect(isTierBlock(block)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isTierBlock(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isTierBlock(undefined)).toBe(false);
  });

  it('returns false for plain string', () => {
    expect(isTierBlock('some string')).toBe(false);
  });

  it('returns false for plain number', () => {
    expect(isTierBlock(42)).toBe(false);
  });

  it('returns false for object without __tierBlocked', () => {
    expect(isTierBlock({ requiredTier: 'pro', message: 'x' })).toBe(false);
  });

  it('returns false for object with __tierBlocked: false', () => {
    expect(isTierBlock({ __tierBlocked: false })).toBe(false);
  });

  it('returns false for object with __tierBlocked: "true" (string)', () => {
    expect(isTierBlock({ __tierBlocked: 'true' })).toBe(false);
  });

  it('acts as type guard - narrowed value has TierBlock shape', () => {
    const value: unknown = tierBlock('pro', 'needs upgrade');
    if (isTierBlock(value)) {
      // TypeScript narrows to TierBlock here
      const typed: TierBlock = value;
      expect(typed.requiredTier).toBe('pro');
      expect(typed.message).toBe('needs upgrade');
    } else {
      throw new Error('isTierBlock should have returned true');
    }
  });
});
