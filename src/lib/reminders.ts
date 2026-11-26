import { prisma } from './db';
import { dispatchNotice } from './alerting';
import { deadlines, type IncidentKind, type IncidentTimes, type Step } from './craIncident';

// Reminders for Art. 14 deadlines and the end of the support period. Planning is pure (and tested);
// runReminders applies it and remembers what was sent so nothing is sent twice.

export const SUPPORT_THRESHOLDS_DAYS = [90, 30, 7, 0] as const;
const DAY = 86_400_000;

export interface IncidentReminder { incidentId: string; key: string; step: Step; state: 'due_soon' | 'overdue'; due: Date }

/** Which deadline reminders are new: one per step and state ("early:due_soon", "early:overdue", ...). */
export function planIncidentReminders(
  incidents: Array<IncidentTimes & { id: string; closedAt: Date | null; remindersSent: Record<string, unknown> }>,
  now: Date,
): IncidentReminder[] {
  const out: IncidentReminder[] = [];
  for (const i of incidents) {
    if (i.closedAt) continue;
    for (const s of deadlines(i, now)) {
      if ((s.state !== 'due_soon' && s.state !== 'overdue') || !s.due) continue;
      const key = `${s.step}:${s.state}`;
      if (i.remindersSent[key]) continue;
      out.push({ incidentId: i.id, key, step: s.step, state: s.state, due: s.due });
    }
  }
  return out;
}

export interface SupportReminder { projectId: string; key: string; daysLeft: number }

/** Reminders at 90, 30, 7 days before and on the end of support; only the most urgent unsent threshold per project. */
export function planSupportReminders(
  projects: Array<{ id: string; supportPeriodEnd: Date | null; supportReminders: Record<string, unknown> }>,
  now: Date,
): SupportReminder[] {
  const out: SupportReminder[] = [];
  for (const p of projects) {
    if (!p.supportPeriodEnd) continue;
    const daysLeft = Math.ceil((p.supportPeriodEnd.getTime() - now.getTime()) / DAY);
    const reached = SUPPORT_THRESHOLDS_DAYS.filter((t) => daysLeft <= t);
    if (reached.length === 0) continue;
    const mostUrgent = Math.min(...reached);
    if (p.supportReminders[String(mostUrgent)]) continue;
    out.push({ projectId: p.id, key: String(mostUrgent), daysLeft });
  }
  return out;
}

const STEP_NAME: Record<Step, string> = { early: 'early warning (24 h)', notification: 'notification (72 h)', final: 'final report' };

export async function runReminders(now = new Date()): Promise<{ incidents: number; support: number }> {
  // ── Art. 14 deadlines ──
  const open = await prisma.craIncident.findMany({ where: { closedAt: null }, include: { project: { select: { name: true } } } });
  const plan = planIncidentReminders(
    open.map((i) => ({
      id: i.id, kind: i.kind as IncidentKind, awareAt: i.awareAt, measureAvailableAt: i.measureAvailableAt, earlyWarningAt: i.earlyWarningAt,
      notificationAt: i.notificationAt, finalReportAt: i.finalReportAt, closedAt: i.closedAt, remindersSent: (i.remindersSent ?? {}) as Record<string, unknown>,
    })),
    now,
  );
  for (const r of plan) {
    const incident = open.find((i) => i.id === r.incidentId)!;
    const when = r.state === 'overdue' ? 'is OVERDUE' : `is due ${r.due.toISOString().replace('T', ' ').slice(0, 16)} UTC`;
    await dispatchNotice(
      `Art. 14: ${STEP_NAME[r.step]} ${when}`,
      [`${incident.title} (${incident.project.name})`, 'Submit on the ENISA single reporting platform and tick the step in CyberRisk Canvas.'],
      '/',
    );
    await prisma.craIncident.update({ where: { id: incident.id }, data: { remindersSent: { ...((incident.remindersSent ?? {}) as object), [r.key]: now.toISOString() } } });
  }

  // ── End of support ──
  const projects = await prisma.project.findMany({ where: { supportPeriodEnd: { not: null } }, select: { id: true, name: true, supportPeriodEnd: true, supportReminders: true } });
  const support = planSupportReminders(projects.map((p) => ({ id: p.id, supportPeriodEnd: p.supportPeriodEnd, supportReminders: (p.supportReminders ?? {}) as Record<string, unknown> })), now);
  for (const r of support) {
    const p = projects.find((x) => x.id === r.projectId)!;
    await dispatchNotice(
      r.daysLeft <= 0 ? `Support period ended: ${p.name}` : `Support period of ${p.name} ends in ${r.daysLeft} days`,
      ['Until the end date you have to handle vulnerabilities and provide security updates (CRA Art. 13(8)).', 'Extend the period in the product data, or inform your users about the end of support.'],
      '/',
    );
    await prisma.project.update({ where: { id: p.id }, data: { supportReminders: { ...((p.supportReminders ?? {}) as object), [r.key]: now.toISOString() } } });
  }

  return { incidents: plan.length, support: support.length };
}
