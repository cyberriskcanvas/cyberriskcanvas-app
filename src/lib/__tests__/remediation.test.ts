import { describe, expect, it } from 'vitest';
import { hasActionableRemediation, sanitizeRemediation, vexResponse } from '../remediation';

describe('sanitizeRemediation', () => {
  it('keeps valid input and trims it', () => {
    expect(sanitizeRemediation({ category: 'vendor_fix', details: '  Update to 2.1  ', url: 'https://acme.example/sa-1' }))
      .toEqual({ category: 'vendor_fix', details: 'Update to 2.1', url: 'https://acme.example/sa-1' });
  });
  it('drops unknown categories, empty text and non-http URLs', () => {
    expect(sanitizeRemediation({ category: 'magic', details: '   ', url: 'javascript:alert(1)' })).toEqual({ category: null, details: null, url: null });
    expect(sanitizeRemediation({ url: 'not a url' }).url).toBeNull();
    expect(sanitizeRemediation(null)).toEqual({ category: null, details: null, url: null });
  });
  it('caps the details length', () => {
    expect(sanitizeRemediation({ details: 'x'.repeat(5000) }).details).toHaveLength(2000);
  });
});

describe('remediation helpers', () => {
  it('counts only fix, workaround and mitigation as actionable', () => {
    expect(['vendor_fix', 'workaround', 'mitigation'].every(hasActionableRemediation)).toBe(true);
    expect(['none_available', 'no_fix_planned', null, undefined].some(hasActionableRemediation)).toBe(false);
  });
  it('maps to the CycloneDX VEX response', () => {
    expect(vexResponse('vendor_fix')).toEqual(['update']);
    expect(vexResponse('workaround')).toEqual(['workaround_available']);
    expect(vexResponse('none_available')).toEqual(['can_not_fix']);
    expect(vexResponse('no_fix_planned')).toEqual(['will_not_fix']);
    expect(vexResponse(null)).toBeUndefined();
  });
});
