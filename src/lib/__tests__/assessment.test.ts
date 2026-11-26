import { describe, expect, it } from 'vitest';
import { ASSESSED_REQUIREMENTS, canApprove, isAssessedRequirement, type ItemState } from '../assessment';

const all = (verdict: ItemState['verdict'] = 'accepted', resolved = false): ItemState[] =>
  ASSESSED_REQUIREMENTS.map((r) => ({ requirementId: r.id, verdict, resolved }));

describe('canApprove', () => {
  it('needs a verdict for every assessed requirement', () => {
    expect(canApprove(all()).ok).toBe(true);
    const partial = canApprove(all().slice(1));
    expect(partial.ok).toBe(false);
    expect(partial.missing).toEqual([ASSESSED_REQUIREMENTS[0].id]);
    expect(canApprove([]).missing).toHaveLength(ASSESSED_REQUIREMENTS.length);
  });

  it('blocks on unresolved findings and allows resolved ones', () => {
    const items = all();
    items[0] = { ...items[0], verdict: 'finding' };
    expect(canApprove(items)).toMatchObject({ ok: false, openFindings: [items[0].requirementId] });
    items[0] = { ...items[0], resolved: true };
    expect(canApprove(items).ok).toBe(true);
  });

  it('treats not applicable as a decision', () => {
    expect(canApprove(all('not_applicable')).ok).toBe(true);
  });

  it('limits assessed requirements to Annex I, II/V and VII groups', () => {
    expect(isAssessedRequirement('ER.1')).toBe(true);
    expect(isAssessedRequirement('SC.1')).toBe(false);
    expect(isAssessedRequirement('CL.1')).toBe(false);
  });
});
