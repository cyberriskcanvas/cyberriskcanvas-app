import { CRA_REQUIREMENTS, type ComplianceStatus } from '@/data/cra';

/** Project-level CRA checklist: one decision per requirement for the whole product. */
export const COMPLIANCE_STATUSES: readonly ComplianceStatus[] = ['compliant', 'partial', 'non-compliant', 'not-applicable'];

export interface CraChecklistEntry {
  status: ComplianceStatus;
  note?: string;
}
export type CraChecklist = Record<string, CraChecklistEntry>;

const VALID_IDS = new Set(CRA_REQUIREMENTS.map((r) => r.id));
const MAX_NOTE = 2000;

/** One entry from untrusted input; null when it is not a valid decision. */
export function sanitizeCraChecklistEntry(raw: unknown): CraChecklistEntry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!(COMPLIANCE_STATUSES as readonly unknown[]).includes(r.status)) return null;
  const note = typeof r.note === 'string' ? r.note.trim().slice(0, MAX_NOTE) : '';
  return { status: r.status as ComplianceStatus, ...(note ? { note } : {}) };
}

/** Keeps only known requirement ids with a valid entry. */
export function sanitizeCraChecklist(raw: unknown): CraChecklist {
  const out: CraChecklist = {};
  if (typeof raw !== 'object' || raw === null) return out;
  for (const [id, entry] of Object.entries(raw)) {
    const clean = VALID_IDS.has(id) ? sanitizeCraChecklistEntry(entry) : null;
    if (clean) out[id] = clean;
  }
  return out;
}

/** Checklist as SoA mappings; put them in front of node mappings so the product-level decision wins. */
export function checklistMappings(checklist: CraChecklist): Array<{ requirementId: string; status: ComplianceStatus; notes?: string }> {
  return Object.entries(checklist).map(([requirementId, e]) => ({ requirementId, status: e.status, ...(e.note ? { notes: e.note } : {}) }));
}
