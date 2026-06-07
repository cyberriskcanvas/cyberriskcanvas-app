'use server';

import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createTeam(name: string, type: 'product' | 'review') {
  await requireAdmin();
  if (!name.trim()) throw new Error('Team name is required');

  const team = await prisma.team.create({
    data: { name: name.trim(), type },
  });
  revalidatePath('/admin');
  return team;
}

export async function deleteTeam(teamId: string) {
  await requireAdmin();
  await prisma.team.delete({ where: { id: teamId } });
  revalidatePath('/admin');
}

export async function getTeamMembers(teamId: string) {
  await requireAdmin();
  return prisma.teamMember.findMany({
    where: { teamId },
    include: {
      user: { select: { name: true, email: true, color: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function addTeamMember(
  teamId: string,
  userId: string,
  role: 'lead' | 'member' = 'member',
) {
  await requireAdmin();
  const member = await prisma.teamMember.create({
    data: { teamId, userId, role },
  });
  revalidatePath('/admin');
  return member;
}

export async function removeTeamMember(memberId: string) {
  await requireAdmin();
  await prisma.teamMember.delete({ where: { id: memberId } });
  revalidatePath('/admin');
}

export async function updateTeamMemberRole(memberId: string, role: 'lead' | 'member') {
  await requireAdmin();
  await prisma.teamMember.update({ where: { id: memberId }, data: { role } });
  revalidatePath('/admin');
}
