'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertProjectAccess, assertProjectWriteAccess } from '@/lib/access';
import { sanitizeIncidentInput, type IncidentKind, type Step } from '@/lib/craIncident';

export interface IncidentDto {
  id: string; kind: IncidentKind; title: string; cveId: string | null; source: string; awareAt: string; memberStates: string;
  measureAvailableAt: string | null; earlyWarningAt: string | null; notificationAt: string | null; finalReportAt: string | null;
  closedAt: string | null; notes: string | null;
}

const iso = (d: Date | null) => d?.toISOString() ?? null;

function toDto(i: {
  id: string; kind: string; title: string; cveId: string | null; source: string; awareAt: Date; memberStates: string; measureAvailableAt: Date | null;
  earlyWarningAt: Date | null; notificationAt: Date | null; finalReportAt: Date | null; closedAt: Date | null; notes: string | null;
}): IncidentDto {
  return {
    id: i.id, kind: i.kind as IncidentKind, title: i.title, cveId: i.cveId, source: i.source, awareAt: i.awareAt.toISOString(), memberStates: i.memberStates,
    measureAvailableAt: iso(i.measureAvailableAt), earlyWarningAt: iso(i.earlyWarningAt), notificationAt: iso(i.notificationAt), finalReportAt: iso(i.finalReportAt),
    closedAt: iso(i.closedAt), notes: i.notes,
  };
}

export async function listIncidents(projectId: string): Promise<IncidentDto[]> {
  const session = await requireSession();
  await assertProjectAccess(projectId, session.user.id);
  const rows = await prisma.craIncident.findMany({ where: { projectId }, orderBy: { awareAt: 'desc' } });
  return rows.map(toDto);
}

export async function createIncident(projectId: string, input: unknown): Promise<IncidentDto[]> {
  const session = await requireSession();
  await assertProjectWriteAccess(projectId, session.user.id);
  const clean = sanitizeIncidentInput(input);
  if (!clean) throw new Error('Invalid incident data');
  await prisma.craIncident.create({ data: { projectId, kind: clean.kind, title: clean.title, cveId: clean.cveId, awareAt: clean.awareAt, memberStates: clean.memberStates, source: 'manual' } });
  return listIncidents(projectId);
}

export type IncidentPatch =
  | { type: 'submit'; step: Step; at?: string }
  | { type: 'unsubmit'; step: Step }
  | { type: 'measure'; at: string | null }
  | { type: 'details'; memberStates?: string; notes?: string; awareAt?: string }
  | { type: 'close'; closed: boolean };

const FIELD: Record<Step, 'earlyWarningAt' | 'notificationAt' | 'finalReportAt'> = { early: 'earlyWarningAt', notification: 'notificationAt', final: 'finalReportAt' };

function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export async function updateIncident(incidentId: string, patch: IncidentPatch): Promise<IncidentDto[]> {
  const session = await requireSession();
  const i = await prisma.craIncident.findUnique({ where: { id: incidentId }, select: { id: true, projectId: true, kind: true } });
  if (!i) throw new Error('Incident not found');
  await assertProjectWriteAccess(i.projectId, session.user.id);

  const data: Record<string, unknown> = {};
  if (patch.type === 'submit') {
    if (!FIELD[patch.step]) throw new Error('Invalid step');
    data[FIELD[patch.step]] = parseDate(patch.at) ?? new Date();
  } else if (patch.type === 'unsubmit') {
    if (!FIELD[patch.step]) throw new Error('Invalid step');
    data[FIELD[patch.step]] = null;
  } else if (patch.type === 'measure') {
    if (i.kind !== 'vulnerability') throw new Error('Only vulnerabilities have a corrective measure date');
    data.measureAvailableAt = parseDate(patch.at);
  } else if (patch.type === 'details') {
    if (typeof patch.memberStates === 'string') data.memberStates = patch.memberStates.trim().slice(0, 128);
    if (typeof patch.notes === 'string') data.notes = patch.notes.trim().slice(0, 4000) || null;
    const aware = parseDate(patch.awareAt);
    if (patch.awareAt !== undefined) {
      if (!aware || aware.getTime() > Date.now() + 24 * 3600_000) throw new Error('Invalid awareness date');
      data.awareAt = aware;
      data.remindersSent = {}; // new clock, new reminders
    }
  } else if (patch.type === 'close') {
    data.closedAt = patch.closed ? new Date() : null;
  } else {
    throw new Error('Invalid change');
  }
  await prisma.craIncident.update({ where: { id: incidentId }, data });
  return listIncidents(i.projectId);
}

export async function deleteIncident(incidentId: string): Promise<IncidentDto[]> {
  const session = await requireSession();
  const i = await prisma.craIncident.findUnique({ where: { id: incidentId }, select: { projectId: true } });
  if (!i) throw new Error('Incident not found');
  await assertProjectWriteAccess(i.projectId, session.user.id);
  await prisma.craIncident.delete({ where: { id: incidentId } });
  return listIncidents(i.projectId);
}
