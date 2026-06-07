import { prisma } from './db';

/** Returns true if the user is a member of any review team. */
export async function isReviewTeamMember(userId: string): Promise<boolean> {
  const membership = await prisma.teamMember.findFirst({
    where: { userId, team: { type: 'review' } },
    select: { id: true },
  });
  return !!membership;
}

/**
 * Returns true if the user has cross-project visibility: admins and
 * review-team members. Used to gate aggregate views (Security Overview,
 * dashboard widgets, …) that span every project regardless of ownership.
 */
export async function isReviewerOrAdmin(userId: string, role: string): Promise<boolean> {
  if (role === 'admin') return true;
  return isReviewTeamMember(userId);
}

/** Returns true if the user can see the given project (team visibility or review team). */
export async function canAccessProject(projectId: string, userId: string): Promise<boolean> {
  if (await isReviewTeamMember(userId)) return true;

  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });
  const teamIds = memberships.map((m) => m.teamId);

  const p = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ teamId: { in: teamIds } }, { ownerId: userId, teamId: null }],
    },
    select: { id: true },
  });
  return !!p;
}

/** Throws if the user cannot access the project. */
export async function assertProjectAccess(projectId: string, userId: string): Promise<void> {
  const ok = await canAccessProject(projectId, userId);
  if (!ok) throw new Error('Project not found');
}

/**
 * Throws if the user cannot *write* to the project.
 * Review-team members have read-only cross-project visibility and are explicitly excluded.
 */
export async function assertProjectWriteAccess(projectId: string, userId: string): Promise<void> {
  const memberships = await prisma.teamMember.findMany({
    where: { userId, team: { type: { not: 'review' } } },
    select: { teamId: true },
  });
  const teamIds = memberships.map((m) => m.teamId);

  const p = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ teamId: { in: teamIds } }, { ownerId: userId, teamId: null }],
    },
    select: { id: true },
  });
  if (!p) throw new Error('Project not found');
}

/** Throws if the user cannot access the diagram's project. */
export async function assertDiagramAccess(diagramId: string, userId: string): Promise<void> {
  const diagram = await prisma.diagram.findUnique({
    where: { id: diagramId },
    select: { projectId: true },
  });
  if (!diagram) throw new Error('Diagram not found');
  await assertProjectAccess(diagram.projectId, userId);
}

/** Throws if the user cannot *write* to the diagram's project (review-team excluded). */
export async function assertDiagramWriteAccess(diagramId: string, userId: string): Promise<void> {
  const diagram = await prisma.diagram.findUnique({
    where: { id: diagramId },
    select: { projectId: true },
  });
  if (!diagram) throw new Error('Diagram not found');
  await assertProjectWriteAccess(diagram.projectId, userId);
}
