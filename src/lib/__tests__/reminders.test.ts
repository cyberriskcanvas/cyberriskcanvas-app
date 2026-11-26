import { describe, expect, it } from 'vitest';
import { planIncidentReminders, planSupportReminders } from '../reminders';
import { pickRecipients } from '../mailer';

const aware = new Date('2026-10-01T10:00:00Z');
const h = (n: number) => new Date(aware.getTime() + n * 3600_000);
const incident = (over = {}) => ({ id: 'i1', kind: 'vulnerability' as const, awareAt: aware, measureAvailableAt: null, earlyWarningAt: null, notificationAt: null, finalReportAt: null, closedAt: null, remindersSent: {}, ...over });

describe('planIncidentReminders', () => {
  it('reminds when a step is due soon, and again when it is overdue, once each', () => {
    expect(planIncidentReminders([incident()], h(2))).toEqual([]);
    const soon = planIncidentReminders([incident()], h(19));
    expect(soon.map((r) => r.key)).toEqual(['early:due_soon']);
    const sent = incident({ remindersSent: { 'early:due_soon': 'x' } });
    expect(planIncidentReminders([sent], h(20))).toEqual([]);
    expect(planIncidentReminders([sent], h(25)).map((r) => r.key)).toEqual(['early:overdue']);
  });
  it('skips submitted steps and closed cases', () => {
    expect(planIncidentReminders([incident({ earlyWarningAt: h(3) })], h(25)).map((r) => r.key)).toEqual([]);
    expect(planIncidentReminders([incident({ closedAt: h(5) })], h(25))).toEqual([]);
  });
  it('does not remind for a final report that is not due yet', () => {
    const all = incident({ earlyWarningAt: h(2), notificationAt: h(30) });
    expect(planIncidentReminders([all], h(200))).toEqual([]);
  });
});

describe('planSupportReminders', () => {
  const now = new Date('2026-10-17T12:00:00Z');
  const proj = (days: number, sent = {}) => ({ id: 'p', supportPeriodEnd: new Date(now.getTime() + days * 86_400_000), supportReminders: sent });
  it('reminds at 90, 30, 7 days and at the end, one threshold at a time', () => {
    expect(planSupportReminders([proj(200)], now)).toEqual([]);
    expect(planSupportReminders([proj(60)], now)).toEqual([{ projectId: 'p', key: '90', daysLeft: 60 }]);
    expect(planSupportReminders([proj(60, { 90: 'x' })], now)).toEqual([]);
    expect(planSupportReminders([proj(20, { 90: 'x' })], now)[0].key).toBe('30');
    // jumped over thresholds (server was down): only the most urgent one is sent
    expect(planSupportReminders([proj(5)], now)).toEqual([{ projectId: 'p', key: '7', daysLeft: 5 }]);
    expect(planSupportReminders([proj(-3)], now)[0].key).toBe('0');
  });
  it('ignores projects without an end date', () => {
    expect(planSupportReminders([{ id: 'p', supportPeriodEnd: null, supportReminders: {} }], now)).toEqual([]);
  });
});

describe('pickRecipients', () => {
  it('uses ALERT_EMAIL_TO when valid, else the admins; removes duplicates and junk', () => {
    expect(pickRecipients('a@x.com, b@x.com, nope', ['admin@x.com'])).toEqual(['a@x.com', 'b@x.com']);
    expect(pickRecipients('', ['admin@x.com', 'admin@x.com'])).toEqual(['admin@x.com']);
    expect(pickRecipients(undefined, [])).toEqual([]);
  });
});
