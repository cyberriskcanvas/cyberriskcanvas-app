import { AREA_LABEL, READINESS_AREAS, READINESS_QUESTIONS, type ReadinessArea, type ReadinessQuestion } from '@/data/readinessQuestions';
import type { ReadinessAnswers } from '@/lib/readiness';

const POINTS = { yes: 1, partly: 0.5, no: 0, unknown: 0 } as const;

export interface AreaScore {
  area: ReadinessArea;
  /** 0-100 over all questions of the area; unanswered and "unknown" count as 0 (conservative). */
  score: number;
  answered: number;
  total: number;
}

export interface ReadinessResult {
  /** org answers apply to every product, product answers override nothing (separate questions). */
  areas: AreaScore[];
  overall: number;
  answered: number;
  total: number;
  /** Questions that are not answered "yes", worst first: no, unknown, unanswered, partly. */
  gaps: Array<{ question: ReadinessQuestion; answer: 'partly' | 'no' | 'unknown' | null }>;
}

const GAP_ORDER = { no: 0, unknown: 1, null: 2, partly: 3 } as const;

export function scoreReadiness(org: ReadinessAnswers, product: ReadinessAnswers): ReadinessResult {
  const answerOf = (q: ReadinessQuestion) => (q.scope === 'org' ? org : product)[q.id];

  const areas = READINESS_AREAS.map((area): AreaScore => {
    const qs = READINESS_QUESTIONS.filter((q) => q.area === area);
    const points = qs.reduce((sum, q) => sum + (POINTS[answerOf(q) ?? 'unknown'] ?? 0), 0);
    return { area, score: Math.round((points / qs.length) * 100), answered: qs.filter((q) => answerOf(q)).length, total: qs.length };
  });

  const total = READINESS_QUESTIONS.length;
  const overall = Math.round(areas.reduce((s, a) => s + a.score * a.total, 0) / total);
  const gaps = READINESS_QUESTIONS.flatMap((question) => {
    const a = answerOf(question) ?? null;
    return a === 'yes' ? [] : [{ question, answer: a }];
  }).sort((x, y) => GAP_ORDER[String(x.answer) as keyof typeof GAP_ORDER] - GAP_ORDER[String(y.answer) as keyof typeof GAP_ORDER]);

  return { areas, overall, answered: areas.reduce((s, a) => s + a.answered, 0), total, gaps };
}

export { AREA_LABEL };
