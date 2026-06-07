'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertProjectAccess, assertProjectWriteAccess } from '@/lib/access';
import type { Threat } from '@/types';

// ─── Team Library ─────────────────────────────────────────────────────────────

export interface TeamLibraryEntry {
  id: string;
  teamId: string;
  name: string;
  stride: Threat['stride'];
  cweId: string | null;
  description: string | null;
  componentTypeHint: string | null;
  createdAt: Date;
}

/** Returns the teamId for a project the user can access, or null for personal projects. */
async function resolveProjectTeamId(projectId: string, userId: string): Promise<string | null> {
  await assertProjectAccess(projectId, userId);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { teamId: true },
  });
  return project?.teamId ?? null;
}

export async function getTeamLibraryEntries(projectId: string): Promise<TeamLibraryEntry[]> {
  const session = await requireSession();
  const teamId = await resolveProjectTeamId(projectId, session.user.id);
  if (!teamId) return [];
  return prisma.teamThreatLibraryEntry.findMany({
    where: { teamId },
    orderBy: { createdAt: 'asc' },
  }) as Promise<TeamLibraryEntry[]>;
}

export async function saveToTeamLibrary(
  projectId: string,
  threat: Pick<Threat, 'name' | 'stride' | 'cweId' | 'description'>,
  componentTypeHint?: string,
): Promise<TeamLibraryEntry> {
  const session = await requireSession();
  await assertProjectWriteAccess(projectId, session.user.id);
  const teamId = await resolveProjectTeamId(projectId, session.user.id);
  if (!teamId) throw new Error('This project has no team. Assign it to a team first.');

  return prisma.teamThreatLibraryEntry.create({
    data: {
      teamId,
      name: threat.name,
      stride: threat.stride,
      cweId: threat.cweId ?? null,
      description: threat.description ?? null,
      componentTypeHint: componentTypeHint ?? null,
    },
  }) as Promise<TeamLibraryEntry>;
}

export async function deleteTeamLibraryEntry(id: string): Promise<void> {
  const session = await requireSession();
  const entry = await prisma.teamThreatLibraryEntry.findUnique({
    where: { id },
    select: { teamId: true },
  });
  if (!entry) return;
  const isMember = await prisma.teamMember.findFirst({
    where: { teamId: entry.teamId, userId: session.user.id },
  });
  if (!isMember) throw new Error('Access denied');
  await prisma.teamThreatLibraryEntry.delete({ where: { id } });
}

export interface LibraryEntry {
  id: string;
  projectId: string;
  name: string;
  stride: Threat['stride'];
  cweId: string | null;
  description: string | null;
  componentTypeHint: string | null;
  createdAt: Date;
}

export async function getLibraryEntries(projectId: string): Promise<LibraryEntry[]> {
  const session = await requireSession();
  await assertProjectAccess(projectId, session.user.id);
  return prisma.threatLibraryEntry.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  }) as Promise<LibraryEntry[]>;
}

export async function saveToLibrary(
  projectId: string,
  threat: Pick<Threat, 'name' | 'stride' | 'cweId' | 'description'>,
  componentTypeHint?: string,
): Promise<LibraryEntry> {
  const session = await requireSession();
  await assertProjectWriteAccess(projectId, session.user.id);
  return prisma.threatLibraryEntry.create({
    data: {
      projectId,
      name: threat.name,
      stride: threat.stride,
      cweId: threat.cweId ?? null,
      description: threat.description ?? null,
      componentTypeHint: componentTypeHint ?? null,
    },
  }) as Promise<LibraryEntry>;
}

export async function deleteLibraryEntry(id: string): Promise<void> {
  const session = await requireSession();
  const entry = await prisma.threatLibraryEntry.findUnique({ where: { id } });
  if (!entry) return;
  await assertProjectWriteAccess(entry.projectId, session.user.id);
  await prisma.threatLibraryEntry.delete({ where: { id } });
}
