import { READINESS_QUESTIONS } from '@/data/readinessQuestions';

export const READINESS_ANSWERS = ['yes', 'partly', 'no', 'unknown'] as const;
export type ReadinessAnswer = (typeof READINESS_ANSWERS)[number];
export type ReadinessAnswers = Record<string, ReadinessAnswer>;

const VALID_IDS = new Set(READINESS_QUESTIONS.map((q) => q.id));

/** Keeps only known question ids with a valid answer. */
export function sanitizeReadiness(raw: unknown): ReadinessAnswers {
  const out: ReadinessAnswers = {};
  if (typeof raw !== 'object' || raw === null) return out;
  for (const [id, a] of Object.entries(raw)) {
    if (VALID_IDS.has(id) && (READINESS_ANSWERS as readonly unknown[]).includes(a)) out[id] = a as ReadinessAnswer;
  }
  return out;
}

export function isReadinessAnswer(v: unknown): v is ReadinessAnswer {
  return (READINESS_ANSWERS as readonly unknown[]).includes(v);
}
