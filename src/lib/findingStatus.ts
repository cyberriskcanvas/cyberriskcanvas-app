// Pure, so client components can use it without pulling in the database.
export const FINDING_STATUSES = ['open', 'in_triage', 'affected', 'not_affected', 'fixed'] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];
/** Still needs attention (an affected finding without a remediation is judged by the gate). */
export const UNRESOLVED: readonly FindingStatus[] = ['open', 'in_triage', 'affected'];
