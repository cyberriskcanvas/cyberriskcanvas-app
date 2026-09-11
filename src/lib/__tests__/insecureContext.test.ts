import { describe, it, expect } from 'vitest';
import { polyfillRandomUUID } from '../insecureContext';

describe('polyfillRandomUUID', () => {
  it('installs a v4 UUID generator when the platform has none', () => {
    const target = { getRandomValues: crypto.getRandomValues.bind(crypto) } as unknown as Crypto;
    polyfillRandomUUID(target);

    const ids = new Set(Array.from({ length: 100 }, () => target.randomUUID()));
    expect(ids.size).toBe(100);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });

  it('keeps a native implementation', () => {
    const native = () => '11111111-1111-4111-8111-111111111111' as const;
    const target = { randomUUID: native } as unknown as Crypto;
    polyfillRandomUUID(target);
    expect(target.randomUUID).toBe(native);
  });
});
