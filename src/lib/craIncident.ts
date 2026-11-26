// Art. 14 CRA: deadlines of a reporting case. Pure and in src/lib so the server-side scheduler can use it too.
//
//  vulnerability (actively exploited):  early warning  <= 24 h after awareness
//                                       notification   <= 72 h after awareness
//                                       final report   <= 14 days after a corrective/mitigating measure is available
//  incident (severe):                   early warning  <= 24 h, notification <= 72 h after awareness,
//                                       final report   <= one month after the incident notification was submitted

export const INCIDENT_KINDS = ['vulnerability', 'incident'] as const;
export type IncidentKind = (typeof INCIDENT_KINDS)[number];
export const isIncidentKind = (v: unknown): v is IncidentKind => (INCIDENT_KINDS as readonly unknown[]).includes(v);

export type Step = 'early' | 'notification' | 'final';

export interface IncidentTimes {
  kind: IncidentKind;
  awareAt: Date;
  measureAvailableAt: Date | null;
  earlyWarningAt: Date | null;
  notificationAt: Date | null;
  finalReportAt: Date | null;
}

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export interface StepState {
  step: Step;
  /** null while the due date cannot be computed yet (final report before the trigger happened). */
  due: Date | null;
  /** True when `due` is a worst-case estimate (incident final report before the notification was submitted). */
  estimated: boolean;
  submittedAt: Date | null;
  state: 'submitted' | 'pending' | 'due_soon' | 'overdue' | 'waiting';
  hoursLeft: number | null;
}

function addMonth(d: Date): Date {
  const out = new Date(d.getTime());
  out.setUTCMonth(out.getUTCMonth() + 1);
  return out;
}

export const DUE_SOON_HOURS = 6;

export function deadlines(c: IncidentTimes, now = new Date()): StepState[] {
  const early = new Date(c.awareAt.getTime() + 24 * HOUR);
  const notification = new Date(c.awareAt.getTime() + 72 * HOUR);
  let final: Date | null;
  let estimated = false;
  if (c.kind === 'vulnerability') {
    final = c.measureAvailableAt ? new Date(c.measureAvailableAt.getTime() + 14 * DAY) : null;
  } else if (c.notificationAt) {
    final = addMonth(c.notificationAt);
  } else {
    final = addMonth(notification); // latest case: the notification is submitted at its deadline
    estimated = true;
  }

  const mk = (step: Step, due: Date | null, submittedAt: Date | null, est = false): StepState => {
    if (submittedAt) return { step, due, estimated: est, submittedAt, state: 'submitted', hoursLeft: null };
    if (!due) return { step, due, estimated: est, submittedAt: null, state: 'waiting', hoursLeft: null };
    const hoursLeft = (due.getTime() - now.getTime()) / HOUR;
    return { step, due, estimated: est, submittedAt: null, state: hoursLeft < 0 ? 'overdue' : hoursLeft <= DUE_SOON_HOURS ? 'due_soon' : 'pending', hoursLeft };
  };
  return [mk('early', early, c.earlyWarningAt), mk('notification', notification, c.notificationAt), mk('final', final, c.finalReportAt, estimated)];
}

/** The most urgent open step (overdue first, then the earliest due date), or null when everything is submitted/waiting. */
export function nextStep(c: IncidentTimes, now = new Date()): StepState | null {
  const open = deadlines(c, now).filter((s) => s.state !== 'submitted' && s.state !== 'waiting' && s.due);
  open.sort((a, b) => a.due!.getTime() - b.due!.getTime());
  return open[0] ?? null;
}

/** Across all open cases of a product: how many are open, how many have an overdue step, and the most urgent step. */
export function nextIncidentDue(cases: IncidentTimes[], now = new Date()): { open: number; overdue: number; next: (StepState & { caseIndex: number }) | null } {
  let next: (StepState & { caseIndex: number }) | null = null;
  let overdue = 0;
  cases.forEach((c, caseIndex) => {
    const steps = deadlines(c, now);
    if (steps.some((s) => s.state === 'overdue')) overdue += 1;
    const n = nextStep(c, now);
    if (n && (!next || n.due!.getTime() < next.due!.getTime())) next = { ...n, caseIndex };
  });
  return { open: cases.length, overdue, next };
}

// ── Untrusted input ───────────────────────────────────────────────────────────

export interface IncidentInput {
  kind: IncidentKind;
  title: string;
  cveId: string | null;
  awareAt: Date;
  memberStates: string;
}

const CVE_RE = /^CVE-\d{4}-\d{4,}$/;

export function sanitizeIncidentInput(raw: unknown): IncidentInput | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isIncidentKind(r.kind)) return null;
  const title = typeof r.title === 'string' ? r.title.trim().slice(0, 256) : '';
  if (!title) return null;
  const awareAt = typeof r.awareAt === 'string' ? new Date(r.awareAt) : null;
  if (!awareAt || isNaN(awareAt.getTime()) || awareAt.getTime() > Date.now() + DAY) return null; // not in the future
  const cve = typeof r.cveId === 'string' ? r.cveId.trim().toUpperCase() : '';
  return {
    kind: r.kind,
    title,
    cveId: CVE_RE.test(cve) ? cve : null,
    awareAt,
    memberStates: typeof r.memberStates === 'string' ? r.memberStates.trim().slice(0, 128) : '',
  };
}
