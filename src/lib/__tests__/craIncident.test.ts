import { describe, expect, it } from 'vitest';
import { deadlines, nextIncidentDue, nextStep, sanitizeIncidentInput, type IncidentTimes } from '../craIncident';

const aware = new Date('2026-10-01T10:00:00Z');
const base: IncidentTimes = { kind: 'vulnerability', awareAt: aware, measureAvailableAt: null, earlyWarningAt: null, notificationAt: null, finalReportAt: null };
const at = (h: number) => new Date(aware.getTime() + h * 3600_000);
const byStep = (c: IncidentTimes, now: Date) => Object.fromEntries(deadlines(c, now).map((s) => [s.step, s]));

describe('deadlines (Art. 14)', () => {
  it('early warning after 24 h, notification after 72 h from awareness', () => {
    const d = byStep(base, at(1));
    expect(d.early.due?.toISOString()).toBe('2026-10-02T10:00:00.000Z');
    expect(d.notification.due?.toISOString()).toBe('2026-10-04T10:00:00.000Z');
    expect(d.early.state).toBe('pending');
  });

  it('vulnerability: the final report waits for a corrective measure, then is due 14 days after it', () => {
    expect(byStep(base, at(5)).final).toMatchObject({ due: null, state: 'waiting' });
    const withFix = { ...base, measureAvailableAt: new Date('2026-10-10T00:00:00Z') };
    expect(byStep(withFix, at(5)).final.due?.toISOString()).toBe('2026-10-24T00:00:00.000Z');
  });

  it('incident: final report one month after the notification, estimated until it was submitted', () => {
    const inc: IncidentTimes = { ...base, kind: 'incident' };
    expect(byStep(inc, at(5)).final).toMatchObject({ estimated: true });
    expect(byStep(inc, at(5)).final.due?.toISOString()).toBe('2026-11-04T10:00:00.000Z');
    const notified = { ...inc, notificationAt: new Date('2026-10-03T08:00:00Z') };
    const f = byStep(notified, at(80)).final;
    expect(f.estimated).toBe(false);
    expect(f.due?.toISOString()).toBe('2026-11-03T08:00:00.000Z');
  });

  it('marks due soon (<= 6 h), overdue, and submitted steps', () => {
    expect(byStep(base, at(19)).early.state).toBe('due_soon');
    expect(byStep(base, at(25)).early.state).toBe('overdue');
    expect(byStep({ ...base, earlyWarningAt: at(10) }, at(25)).early.state).toBe('submitted');
  });

  it('nextStep returns the most urgent open step', () => {
    expect(nextStep(base, at(25))?.step).toBe('early');
    expect(nextStep({ ...base, earlyWarningAt: at(2) }, at(25))?.step).toBe('notification');
    expect(nextStep({ ...base, earlyWarningAt: at(2), notificationAt: at(30), measureAvailableAt: null }, at(31))).toBeNull(); // final waits for the measure
  });
});

describe('sanitizeIncidentInput', () => {
  const ok = { kind: 'vulnerability', title: ' Log4Shell ', cveId: 'cve-2021-44228', awareAt: '2026-10-01T10:00:00Z', memberStates: ' DE, FR ' };
  it('normalises valid input', () => {
    expect(sanitizeIncidentInput(ok)).toMatchObject({ kind: 'vulnerability', title: 'Log4Shell', cveId: 'CVE-2021-44228', memberStates: 'DE, FR' });
  });
  it('rejects bad kind, empty title, invalid or future dates; drops malformed CVE ids', () => {
    expect(sanitizeIncidentInput({ ...ok, kind: 'x' })).toBeNull();
    expect(sanitizeIncidentInput({ ...ok, title: '  ' })).toBeNull();
    expect(sanitizeIncidentInput({ ...ok, awareAt: 'nope' })).toBeNull();
    expect(sanitizeIncidentInput({ ...ok, awareAt: '2999-01-01T00:00:00Z' })).toBeNull();
    expect(sanitizeIncidentInput({ ...ok, cveId: 'GHSA-xxxx' })?.cveId).toBeNull();
  });
});

describe('nextIncidentDue', () => {
  it('is empty without cases', () => {
    expect(nextIncidentDue([], at(1))).toEqual({ open: 0, overdue: 0, next: null });
  });
  it('picks the most urgent step across cases', () => {
    const later: IncidentTimes = { ...base, awareAt: at(10) };
    const r = nextIncidentDue([later, base], at(1));
    expect(r.open).toBe(2);
    expect(r.next?.step).toBe('early');
    expect(r.next?.caseIndex).toBe(1);
  });
  it('counts cases with an overdue step', () => {
    const r = nextIncidentDue([base, { ...base, earlyWarningAt: at(2) }], at(30));
    expect(r.overdue).toBe(1);
  });
  it('has no next step when everything is submitted or waiting', () => {
    const done: IncidentTimes = { ...base, earlyWarningAt: at(1), notificationAt: at(2) };
    expect(nextIncidentDue([done], at(3)).next).toBeNull();
  });
});
