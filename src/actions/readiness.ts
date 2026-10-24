'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertProjectAccess, assertProjectWriteAccess } from '@/lib/access';
import { isReadinessAnswer, sanitizeReadiness, type ReadinessAnswers } from '@/lib/readiness';
import { READINESS_QUESTIONS } from '@/data/readinessQuestions';

export interface ReadinessData {
  org: ReadinessAnswers;
  product: ReadinessAnswers;
  /** Only admins edit organisation-wide answers. */
  canEditOrg: boolean;
}

export async function getReadiness(projectId: string): Promise<ReadinessData> {
  const session = await requireSession();
  await assertProjectAccess(projectId, session.user.id);
  const [org, project] = await Promise.all([
    prisma.orgReadiness.findUnique({ where: { id: 'org' } }),
    prisma.project.findUnique({ where: { id: projectId }, select: { readiness: true } }),
  ]);
  return { org: sanitizeReadiness(org?.answers), product: sanitizeReadiness(project?.readiness), canEditOrg: session.user.role === 'admin' };
}

/** Sets or clears (answer = null) one answer. Organisation questions are saved for all products. */
export async function saveReadinessAnswer(projectId: string, questionId: string, answer: unknown): Promise<ReadinessData> {
  const session = await requireSession();
  await assertProjectWriteAccess(projectId, session.user.id);
  const question = READINESS_QUESTIONS.find((q) => q.id === questionId);
  if (!question) throw new Error('Unknown question');
  if (answer !== null && !isReadinessAnswer(answer)) throw new Error('Invalid answer');

  // ponytail: read-modify-write of a JSON column; concurrent edits in the same second can overwrite each other
  if (question.scope === 'org') {
    if (session.user.role !== 'admin') throw new Error('Only administrators can edit organisation-wide answers');
    const row = await prisma.orgReadiness.findUnique({ where: { id: 'org' } });
    const next = sanitizeReadiness(row?.answers);
    if (answer) next[questionId] = answer; else delete next[questionId];
    await prisma.orgReadiness.upsert({
      where: { id: 'org' },
      create: { id: 'org', answers: next, updatedByName: session.user.name ?? null },
      update: { answers: next, updatedByName: session.user.name ?? null },
    });
  } else {
    const p = await prisma.project.findUnique({ where: { id: projectId }, select: { readiness: true } });
    const next = sanitizeReadiness(p?.readiness);
    if (answer) next[questionId] = answer; else delete next[questionId];
    await prisma.project.update({ where: { id: projectId }, data: { readiness: next } });
  }
  return getReadiness(projectId);
}
