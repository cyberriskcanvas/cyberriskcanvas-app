import { describe, expect, it } from 'vitest';
import { CRA_GUIDANCE } from '../craGuidance';
import { CRA_REQUIREMENTS } from '../cra';

describe('CRA_GUIDANCE', () => {
  it('only references existing CRA requirement ids', () => {
    const ids = new Set(CRA_REQUIREMENTS.map((r) => r.id));
    expect(Object.keys(CRA_GUIDANCE).filter((id) => !ids.has(id))).toEqual([]);
  });
  it('covers every requirement of Annex I, Annex II (UT) and Annex VII (TD)', () => {
    const missing = CRA_REQUIREMENTS.filter((r) => /^(ER|VH|UT|TD)\./.test(r.id) && !CRA_GUIDANCE[r.id]).map((r) => r.id);
    expect(missing).toEqual([]);
  });
  it('has steps and evidence everywhere and no BSI control ids', () => {
    for (const [id, g] of Object.entries(CRA_GUIDANCE)) {
      expect(g.steps.length, id).toBeGreaterThan(0);
      expect(g.evidence.length, id).toBeGreaterThan(0);
      expect(JSON.stringify(g), id).not.toMatch(/\b(PV|PI_[A-Z]+|VH_[A-Z]+|IAC|SC_SMF|DC_[A-Z]+)\.\d/);
    }
  });
  it('points UT requirements to Annex II/V and TD requirements to Annex VII or articles', () => {
    for (const r of CRA_REQUIREMENTS) {
      if (r.id.startsWith('UT.')) expect(r.craRef, r.id).toMatch(/Annex (II|V)\b|^Art\./);
      if (r.id.startsWith('TD.')) expect(r.craRef, r.id).toMatch(/Annex VII\b|^Art\./);
    }
    // the old reference pointed the installation guide at Annex II points 1-3
    expect(CRA_REQUIREMENTS.find((r) => r.id === 'UT.1')?.craRef).toContain('(8)');
  });
});
