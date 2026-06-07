'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertProjectAccess, assertProjectWriteAccess, isReviewTeamMember } from '@/lib/access';
import { getTierLimit, TierError } from '@/lib/tierGuard';
import { revalidatePath } from 'next/cache';
import type { DiagramNode, DiagramEdge } from '@/types';

// ─── Starter diagram shown to new users on their first project ───────────────

const STARTER_NODES: DiagramNode[] = [
  {
    id: 'ex-boundary',
    type: 'boundary',
    position: { x: 40, y: 40 },
    style: { width: 540, height: 310 },
    zIndex: -1,
    data: {
      label: 'In-Vehicle Network (CAN Bus)',
      boundaryType: 'network-segment',
      description: 'Trusted internal vehicle network',
    },
  },
  {
    id: 'ex-gateway',
    type: 'hardware',
    position: { x: 100, y: 170 },
    data: {
      label: 'Gateway ECU',
      componentType: 'gateway',
      description: 'Central gateway connecting internal CAN bus to external networks. Click me to explore assessment fields.',
    },
  },
  {
    id: 'ex-ecu',
    type: 'hardware',
    position: { x: 360, y: 170 },
    data: {
      label: 'Engine ECU',
      componentType: 'ecu',
      description: 'Controls engine parameters and reports diagnostics.',
    },
  },
  {
    id: 'ex-telematics',
    type: 'hardware',
    position: { x: 700, y: 170 },
    data: {
      label: 'Telematics Unit',
      componentType: 'telematics',
      description: 'Connects the vehicle to external cloud services. Represents an attack surface across the trust boundary.',
    },
  },
];

const STARTER_EDGES: DiagramEdge[] = [
  { id: 'ex-edge-1', source: 'ex-gateway', target: 'ex-ecu' },
  { id: 'ex-edge-2', source: 'ex-gateway', target: 'ex-telematics' },
];

// ─── Visibility helper ────────────────────────────────────────────────────────

/** Returns the project IDs visible to this user, or null when all projects are visible (review-team members). */
export async function visibleProjectIds(userId: string): Promise<string[] | null> {
  // Review-team members see all projects
  if (await isReviewTeamMember(userId)) return null; // null = no filter = all projects

  // Product-team members see only projects belonging to their teams
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });
  const teamIds = memberships.map((m) => m.teamId);

  const projects = await prisma.project.findMany({
    where: { OR: [{ teamId: { in: teamIds } }, { ownerId: userId, teamId: null }] },
    select: { id: true },
  });
  return projects.map((p) => p.id);
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function getProjects() {
  const session = await requireSession();
  const ids = await visibleProjectIds(session.user.id);

  return prisma.project.findMany({
    where: ids !== null ? { id: { in: ids } } : undefined,
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { diagrams: true } },
      diagrams: { select: { id: true }, orderBy: { createdAt: 'asc' }, take: 1 },
      team: { select: { id: true, name: true } },
      versions: {
        orderBy: { number: 'desc' },
        select: { id: true, number: true, label: true, status: true, frozenAt: true },
      },
    },
  });
}

export async function getProject(id: string) {
  const session = await requireSession();
  const ids = await visibleProjectIds(session.user.id);

  const where = ids !== null
    ? { id, AND: [{ id: { in: ids } }] }
    : { id };

  const project = await prisma.project.findFirst({
    where,
    include: {
      diagrams: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, projectId: true, createdAt: true, updatedAt: true },
      },
    },
  });
  if (!project) throw new Error('Project not found');
  return project;
}

export async function createProject(
  name: string,
  description?: string,
  teamId?: string,
  initialNodes?: DiagramNode[],
  initialEdges?: DiagramEdge[],
) {
  const session = await requireSession();

  if (teamId) {
    const membership = await prisma.teamMember.findFirst({
      where: { userId: session.user.id, teamId },
      select: { id: true },
    });
    if (!membership) throw new Error('Team not found');
  }

  const maxProjects = await getTierLimit('maxProjects');
  const existingCount = await prisma.project.count({
    where: teamId ? { teamId } : { ownerId: session.user.id, teamId: null },
  });
  if (maxProjects !== null && existingCount >= maxProjects) {
    throw new TierError(
      `Your license is limited to ${maxProjects} project${maxProjects === 1 ? '' : 's'}. Upgrade to a Pro license to create more.`,
    );
  }
  const isFirstProject = existingCount === 0;
  const nodes = initialNodes ?? (isFirstProject ? STARTER_NODES : undefined);
  const edges = initialEdges ?? (isFirstProject ? STARTER_EDGES : undefined);

  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        teamId: teamId ?? null,
        ownerId: session.user.id,
        // Automatically create version 1 (active)
        versions: { create: { number: 1, label: '', status: 'active' } },
      },
    });

    await tx.diagram.create({
      data: {
        projectId: p.id,
        name: 'Main Architecture',
        ...(nodes && { nodes: nodes as object[] }),
        ...(edges && { edges: edges as object[] }),
      },
    });

    return p;
  });

  revalidatePath('/');
  return project;
}

export async function updateProject(id: string, name: string, description?: string) {
  const session = await requireSession();
  await assertProjectWriteAccess(id, session.user.id);

  await prisma.project.update({
    where: { id },
    data: { name: name.trim(), description: description?.trim() },
  });
  revalidatePath('/');
}

export async function updateProjectNotes(projectId: string, notes: string) {
  const session = await requireSession();
  await assertProjectWriteAccess(projectId, session.user.id);
  await prisma.project.update({
    where: { id: projectId },
    data: { notes, notesUpdatedByName: session.user.name, notesUpdatedAt: new Date() },
  });
}

export interface ProjectNotesData {
  notes: string;
  notesUpdatedByName: string | null;
  notesUpdatedAt: string | null;
}

export async function getProjectNotes(projectId: string): Promise<ProjectNotesData> {
  const session = await requireSession();
  await assertProjectAccess(projectId, session.user.id);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { notes: true, notesUpdatedByName: true, notesUpdatedAt: true },
  });
  return {
    notes: project?.notes ?? '',
    notesUpdatedByName: project?.notesUpdatedByName ?? null,
    notesUpdatedAt: project?.notesUpdatedAt?.toISOString() ?? null,
  };
}

export async function deleteProject(id: string) {
  const session = await requireSession();

  // Only owner or admin can delete
  const project = await prisma.project.findFirst({
    where: session.user.role === 'admin' ? { id } : { id, ownerId: session.user.id },
    select: { id: true },
  });
  if (!project) throw new Error('Project not found');

  await prisma.project.delete({ where: { id } });
  revalidatePath('/');
}
