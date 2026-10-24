import type { Measure, Risk, RiskLevel, Threat } from '@/types';

/** Where a threat stands on its way from suggestion to implemented measure. */
export type FlowStep = 'confirm' | 'rate' | 'measure' | 'implement' | 'done';

export interface FlowCard {
  threat: Threat;
  risk: Risk | null;
  measures: Measure[];
  step: FlowStep;
}

const STEP_ORDER: FlowStep[] = ['confirm', 'rate', 'measure', 'implement', 'done'];
const LEVEL_ORDER: RiskLevel[] = ['critical', 'high', 'medium', 'low', 'negligible'];

/** Same rules as the task list (deriveTasks): a draft is confirmed first, a risk needs a measure unless it is mitigated or formally accepted. */
export function flowStep(threat: Threat, risk: Risk | null, measures: Measure[]): FlowStep {
  if (threat.draft) return 'confirm';
  if (!risk) return 'rate';
  if (measures.length === 0 && risk.status !== 'mitigated' && !risk.acceptedBy) return 'measure';
  if (measures.some((m) => m.status === 'open' || m.status === 'in-progress')) return 'implement';
  return 'done';
}

/** One card per threat, the ones that need a person first, then by risk level. Risks whose threat is gone are returned separately. */
export function buildFlow(threats: Threat[], risks: Risk[], measures: Measure[]): { cards: FlowCard[]; orphanRisks: Risk[] } {
  const cards = threats.map((threat): FlowCard => {
    const risk = risks.find((r) => r.threatId === threat.id) ?? null;
    const own = risk ? measures.filter((m) => m.riskId === risk.id) : [];
    return { threat, risk, measures: own, step: flowStep(threat, risk, own) };
  });
  cards.sort((a, b) =>
    STEP_ORDER.indexOf(a.step) - STEP_ORDER.indexOf(b.step) ||
    LEVEL_ORDER.indexOf(a.risk?.level ?? 'negligible') - LEVEL_ORDER.indexOf(b.risk?.level ?? 'negligible'));
  return { cards, orphanRisks: risks.filter((r) => !threats.some((t) => t.id === r.threatId)) };
}
