import { describe, expect, it } from 'vitest';
import { conformityPath, isCraClass } from '../conformity';

describe('conformityPath (Art. 32)', () => {
  it('allows self-assessment only for default and, with full standards, class I', () => {
    expect(conformityPath('default')).toMatchObject({ notifiedBody: 'no' });
    expect(conformityPath('default').procedures).toContain('A');
    expect(conformityPath('class-i')).toMatchObject({ notifiedBody: 'unless-standards' });
    expect(conformityPath('class-ii').procedures).not.toContain('A');
    expect(conformityPath('critical').procedures[0]).toBe('EUCS');
  });
  it('validates class values', () => {
    expect(isCraClass('class-ii')).toBe(true);
    expect(isCraClass('class-3')).toBe(false);
  });
});
