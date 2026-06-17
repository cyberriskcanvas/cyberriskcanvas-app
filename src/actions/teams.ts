'use server';

import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { revalidatePath } from 'next/cache';

export async function createTeam(name: string, type: 'product' | 'review') {
  const session = await requireAdmin();
  if (!name.trim()) throw new Error('Team name is required');

  const team = await prisma.team.create({
    data: { name: name.trim(), type },
  });

  audit({
    action: 'team.create',
    actorId: session.user.id,
    actorEmail: session.user.email,
    targetType: 'team',
    targetId: team.id,
    details: { name: team.name, type: team.type },
  });

  revalidatePath('/admin');
  return team;
}

export async function deleteTeam(teamId: string) {
  const session = await requireAdmin();
  const team = await prisma.team.delete({ where: { id: teamId } });

  audit({
    action: 'team.delete',
    actorId: session.user.id,
    actorEmail: session.user.email,
    targetType: 'team',
    targetId: teamId,
    details: { name: team.name, type: team.type },
  });

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
  const session = await requireAdmin();
  const member = await prisma.teamMember.create({
    data: { teamId, userId, role },
    include: { user: { select: { email: true } }, team: { select: { name: true } } },
  });

  audit({
    action: 'team.member_add',
    actorId: session.user.id,
    actorEmail: session.user.email,
    targetType: 'team',
    targetId: teamId,
    details: { team: member.team.name, member: member.user.email, role },
  });

  revalidatePath('/admin');
  return member;
}

export async function removeTeamMember(memberId: string) {
  const session = await requireAdmin();
  const member = await prisma.teamMember.delete({
    where: { id: memberId },
    include: { user: { select: { email: true } }, team: { select: { name: true } } },
  });

  audit({
    action: 'team.member_remove',
    actorId: session.user.id,
    actorEmail: session.user.email,
    targetType: 'team',
    targetId: member.teamId,
    details: { team: member.team.name, member: member.user.email },
  });

  revalidatePath('/admin');
}

export async function updateTeamMemberRole(memberId: string, role: 'lead' | 'member') {
  const session = await requireAdmin();
  const member = await prisma.teamMember.update({
    where: { id: memberId },
    data: { role },
    include: { user: { select: { email: true } }, team: { select: { name: true } } },
  });

  audit({
    action: 'team.member_role_change',
    actorId: session.user.id,
    actorEmail: session.user.email,
    targetType: 'team',
    targetId: member.teamId,
    details: { team: member.team.name, member: member.user.email, role },
  });

  revalidatePath('/admin');
}
