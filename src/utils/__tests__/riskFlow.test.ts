import { describe, expect, it } from 'vitest';
import { buildFlow, flowStep } from '../riskFlow';
import type { Measure, Risk, Threat } from '@/types';

const threat = (id: string, extra: Partial<Threat> = {}): Threat => ({ id, name: id, stride: 'T', ...extra });
const risk = (id: string, threatId: string, level: Risk['level'] = 'high', extra: Partial<Risk> = {}): Risk => ({ id, threatId, likelihood: 3, impact: 4, level, status: 'open', ...extra });
const measure = (id: string, riskId: string, status: Measure['status'] = 'open'): Measure => ({ id, title: id, riskId, status });

describe('flowStep', () => {
  it('walks confirm, rate, measure, implement, done', () => {
    expect(flowStep(threat('a', { draft: true }), null, [])).toBe('confirm');
    expect(flowStep(threat('a'), null, [])).toBe('rate');
    expect(flowStep(threat('a'), risk('r', 'a'), [])).toBe('measure');
    expect(flowStep(threat('a'), risk('r', 'a'), [measure('m', 'r', 'in-progress')])).toBe('implement');
    expect(flowStep(threat('a'), risk('r', 'a'), [measure('m', 'r', 'mitigated')])).toBe('done');
  });
  it('does not ask for a measure on a mitigated or accepted risk', () => {
    expect(flowStep(threat('a'), risk('r', 'a', 'high', { status: 'mitigated' }), [])).toBe('done');
    expect(flowStep(threat('a'), risk('r', 'a', 'high', { acceptedBy: 'CISO' }), [])).toBe('done');
  });
});

describe('buildFlow', () => {
  it('puts work first, by risk level, and finished threats last', () => {
    const threats = [threat('done'), threat('rate'), threat('draft', { draft: true }), threat('measureHigh'), threat('measureLow')];
    const risks = [risk('r1', 'done'), risk('r2', 'measureHigh', 'critical'), risk('r3', 'measureLow', 'low')];
    const { cards } = buildFlow(threats, risks, [measure('m', 'r1', 'mitigated')]);
    expect(cards.map((c) => c.threat.id)).toEqual(['draft', 'rate', 'measureHigh', 'measureLow', 'done']);
  });
  it('returns risks without a threat separately', () => {
    const { cards, orphanRisks } = buildFlow([threat('a')], [risk('r1', 'a'), risk('r2', 'gone')], []);
    expect(cards).toHaveLength(1);
    expect(orphanRisks.map((r) => r.id)).toEqual(['r2']);
  });
  it('gives a card only the measures of its risk', () => {
    const { cards } = buildFlow([threat('a')], [risk('r1', 'a')], [measure('m1', 'r1'), measure('m2', 'other')]);
    expect(cards[0].measures.map((m) => m.id)).toEqual(['m1']);
  });
});
