import { describe, expect, it } from 'vitest';
import { sanitizeSdlChecklist } from '../sdlChecklist';

describe('sanitizeSdlChecklist', () => {
  const ids = new Set(['A.1', 'B.2']);
  it('keeps only known ids that are checked', () => {
    expect(sanitizeSdlChecklist({ 'A.1': true, 'B.2': false, 'X.9': true, 'A.2': 'yes' }, ids)).toEqual({ 'A.1': true });
  });
  it('returns an empty object for junk input', () => {
    expect(sanitizeSdlChecklist(null, ids)).toEqual({});
    expect(sanitizeSdlChecklist('x', ids)).toEqual({});
  });
});
