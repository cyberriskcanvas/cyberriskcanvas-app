import { CRA_REQUIREMENTS } from '@/data/cra';

export const VERDICTS = ['accepted', 'finding', 'not_applicable'] as const;
export type Verdict = (typeof VERDICTS)[number];
export const isVerdict = (v: unknown): v is Verdict => (VERDICTS as readonly unknown[]).includes(v);

/** Requirements an assessor decides on: Annex I Part I/II, Annex II/V (user information), Annex VII. */
export const ASSESSED_REQUIREMENTS = CRA_REQUIREMENTS.filter((r) => /^(ER|VH|UT|TD)\./.test(r.id));
const ASSESSED_IDS = new Set(ASSESSED_REQUIREMENTS.map((r) => r.id));
export const isAssessedRequirement = (id: string) => ASSESSED_IDS.has(id);

export interface ItemState {
  requirementId: string;
  verdict: Verdict;
  resolved: boolean;
}

export interface ApprovalCheck {
  ok: boolean;
  /** Requirements without a verdict. */
  missing: string[];
  /** Findings the assessor has not marked as resolved. */
  openFindings: string[];
}

/** Approval needs a verdict for every assessed requirement and no unresolved finding. */
export function canApprove(items: ItemState[]): ApprovalCheck {
  const byId = new Map(items.map((i) => [i.requirementId, i]));
  const missing = ASSESSED_REQUIREMENTS.filter((r) => !byId.has(r.id)).map((r) => r.id);
  const openFindings = items.filter((i) => i.verdict === 'finding' && !i.resolved).map((i) => i.requirementId);
  return { ok: missing.length === 0 && openFindings.length === 0, missing, openFindings };
}
