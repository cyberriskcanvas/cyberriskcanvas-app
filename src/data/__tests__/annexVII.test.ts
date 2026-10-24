import { describe, expect, it } from 'vitest';
import { ANNEX_VII_POINTS } from '../annexVII';

describe('ANNEX_VII_POINTS', () => {
  it('lists every point of CRA Annex VII once, in order', () => {
    expect(ANNEX_VII_POINTS.map((p) => p.point)).toEqual(['1(a)', '1(b)', '1(c)', '1(d)', '2(a)', '2(b)', '2(c)', '3', '4', '5', '6', '7', '8']);
  });
  it('says where to find or supply each point', () => {
    expect(ANNEX_VII_POINTS.every((p) => p.where.length > 0)).toBe(true);
  });
});
