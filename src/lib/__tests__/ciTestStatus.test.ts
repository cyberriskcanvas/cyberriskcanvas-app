import { describe, expect, it } from 'vitest';
import { effectiveTestStatus } from '../ciTestStatus';

describe('effectiveTestStatus', () => {
  it('keeps the manual status for unlinked tests', () => {
    expect(effectiveTestStatus({ status: 'passed' }, [])).toBe('passed');
  });
  it('derives the status of linked tests from the newest runs', () => {
    const t = { status: 'untested' as const, ciSource: 'sast' as const };
    expect(effectiveTestStatus(t, [])).toBe('untested');
    expect(effectiveTestStatus(t, [{ source: 'sast', result: 'ok' }, { source: 'secrets', result: 'findings' }])).toBe('passed');
    expect(effectiveTestStatus(t, [{ source: 'sast', result: 'ok' }, { source: 'sast', result: 'findings' }])).toBe('failed');
  });
});
