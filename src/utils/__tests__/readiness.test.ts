import { describe, expect, it } from 'vitest';
import { scoreReadiness } from '../readiness';
import { READINESS_AREAS, READINESS_QUESTIONS } from '@/data/readinessQuestions';
import { sanitizeReadiness } from '@/lib/readiness';

describe('readiness questions', () => {
  it('have unique ids, both languages, and every area is asked', () => {
    expect(new Set(READINESS_QUESTIONS.map((q) => q.id)).size).toBe(READINESS_QUESTIONS.length);
    for (const q of READINESS_QUESTIONS) {
      expect(q.q.de.length, q.id).toBeGreaterThan(10);
      expect(q.q.en.length, q.id).toBeGreaterThan(10);
      expect(q.hint.de && q.hint.en, q.id).toBeTruthy();
    }
    for (const a of READINESS_AREAS) expect(READINESS_QUESTIONS.some((q) => q.area === a), a).toBe(true);
  });
});

describe('scoreReadiness', () => {
  const all = (a: 'yes' | 'partly' | 'no' | 'unknown') => Object.fromEntries(READINESS_QUESTIONS.map((q) => [q.id, a]));

  it('scores nothing answered as 0 and everything yes as 100', () => {
    expect(scoreReadiness({}, {}).overall).toBe(0);
    const full = scoreReadiness(all('yes'), all('yes'));
    expect(full.overall).toBe(100);
    expect(full.gaps).toEqual([]);
    expect(full.areas.every((a) => a.score === 100 && a.answered === a.total)).toBe(true);
  });

  it('counts partly as half and unknown as zero (conservative)', () => {
    expect(scoreReadiness(all('partly'), all('partly')).overall).toBe(50);
    expect(scoreReadiness(all('unknown'), all('unknown')).overall).toBe(0);
  });

  it('uses org answers for org questions and product answers for product questions', () => {
    const org = Object.fromEntries(READINESS_QUESTIONS.filter((q) => q.scope === 'org').map((q) => [q.id, 'yes' as const]));
    const r = scoreReadiness(org, {});
    expect(r.gaps.every((g) => g.question.scope === 'product')).toBe(true);
    expect(r.overall).toBeGreaterThan(0);
    expect(r.overall).toBeLessThan(100);
  });

  it('lists gaps worst first: no, unknown, unanswered, partly', () => {
    const [q0, q1] = READINESS_QUESTIONS; // both organisation questions
    const ans = (q: typeof q0, v: 'no' | 'unknown' | 'partly') => ({ [q.id]: v });
    const org = { ...ans(q0, 'partly'), ...ans(q1, 'no') };
    const r = scoreReadiness(org, {});
    const order = r.gaps.map((g) => String(g.answer));
    expect(order.indexOf('no')).toBeLessThan(order.indexOf('null'));
    expect(order.indexOf('null')).toBeLessThan(order.indexOf('partly'));
  });

  it('sanitizes stored answers', () => {
    expect(sanitizeReadiness({ R01: 'yes', R02: 'maybe', XX: 'yes', R03: 5 })).toEqual({ R01: 'yes' });
  });
});
