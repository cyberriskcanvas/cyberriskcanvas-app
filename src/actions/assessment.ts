'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { assertProjectWriteAccess, canAccessProject, isReviewerOrAdmin } from '@/lib/access';
import { sanitizeCraChecklist, type CraChecklist } from '@/lib/craChecklist';
import { mergeChecklist } from '@/lib/organisation';
import { getOrg } from '@/lib/organisationStore';
import { canApprove, isAssessedRequirement, isVerdict, type ApprovalCheck, type Verdict } from '@/lib/assessment';

export interface AssessmentSummary { id: string; status: string; assessorName: string; decidedAt: string | null }
export interface VersionAssessment { versionId: string; number: number; label: string; assessment: AssessmentSummary | null }
export interface AssessmentOverview { versions: VersionAssessment[]; canAssess: boolean }

export interface AssessmentItemDto { requirementId: string; verdict: Verdict; comment: string | null; dueDate: string | null; response: string | null; resolved: boolean }
export interface AssessmentDetail {
  id: string; projectId: string; versionNumber: number; versionLabel: string; status: string; assessorName: string;
  summary: string | null; decidedAt: string | null; checklist: CraChecklist; items: AssessmentItemDto[];
  canAssess: boolean; canRespond: boolean; approval: ApprovalCheck;
}

async function roleOf(userId: string): Promise<{ assessor: boolean; admin: boolean }> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return { assessor: await isReviewerOrAdmin(userId, u?.role ?? 'user'), admin: u?.role === 'admin' };
}

/** Read access: project members, review team members and admins. */
async function assertCanRead(projectId: string, userId: string, admin: boolean) {
  if (admin || (await canAccessProject(projectId, userId))) return;
  throw new Error('Project not found');
}

export async function getAssessmentOverview(projectId: string): Promise<AssessmentOverview> {
  const session = await requireSession();
  const { assessor, admin } = await roleOf(session.user.id);
  await assertCanRead(projectId, session.user.id, admin);
  const versions = await prisma.projectVersion.findMany({
    where: { projectId, status: 'frozen' },
    orderBy: { number: 'desc' },
    select: { id: true, number: true, label: true, assessment: { select: { id: true, status: true, assessorName: true, decidedAt: true } } },
  });
  return {
    canAssess: assessor,
    versions: versions.map((v) => ({
      versionId: v.id, number: v.number, label: v.label,
      assessment: v.assessment ? { ...v.assessment, decidedAt: v.assessment.decidedAt?.toISOString() ?? null } : null,
    })),
  };
}

export async function startAssessment(projectId: string, versionId: string): Promise<string> {
  const session = await requireSession();
  const userId = session.user.id;
  const { assessor, admin } = await roleOf(userId);
  if (!assessor) throw new Error('Only members of a review team or administrators can start an assessment');
  await assertCanRead(projectId, userId, admin);

  const version = await prisma.projectVersion.findFirst({ where: { id: versionId, projectId, status: 'frozen' }, select: { id: true } });
  if (!version) throw new Error('Only frozen versions can be assessed');
  const [project, org] = await Promise.all([prisma.project.findUnique({ where: { id: projectId }, select: { craChecklist: true } }), getOrg()]);

  const a = await prisma.assessment.create({
    data: { projectId, versionId, assessorId: userId, assessorName: session.user.name ?? session.user.email ?? 'Assessor', checklistSnapshot: mergeChecklist(org.craChecklist, project?.craChecklist) as object },
  });
  audit({ action: 'assessment.start', actorId: userId, actorEmail: session.user.email, targetType: 'assessment', targetId: a.id, details: { projectId, versionId } });
  return a.id;
}

export async function getAssessment(assessmentId: string): Promise<AssessmentDetail> {
  const session = await requireSession();
  const { assessor, admin } = await roleOf(session.user.id);
  const a = await prisma.assessment.findUnique({ where: { id: assessmentId }, include: { items: true, version: { select: { number: true, label: true } } } });
  if (!a) throw new Error('Assessment not found');
  await assertCanRead(a.projectId, session.user.id, admin);

  let canRespond = false;
  try { await assertProjectWriteAccess(a.projectId, session.user.id); canRespond = true; } catch { /* read only */ }

  const items: AssessmentItemDto[] = a.items.map((i) => ({
    requirementId: i.requirementId, verdict: i.verdict as Verdict, comment: i.comment, dueDate: i.dueDate?.toISOString() ?? null, response: i.response, resolved: i.resolved,
  }));
  return {
    id: a.id, projectId: a.projectId, versionNumber: a.version.number, versionLabel: a.version.label, status: a.status, assessorName: a.assessorName,
    summary: a.summary, decidedAt: a.decidedAt?.toISOString() ?? null, checklist: sanitizeCraChecklist(a.checklistSnapshot), items,
    canAssess: assessor && a.status !== 'approved', canRespond: canRespond && a.status !== 'approved',
    approval: canApprove(items.map((i) => ({ requirementId: i.requirementId, verdict: i.verdict, resolved: i.resolved }))),
  };
}

async function loadForAssessor(assessmentId: string) {
  const session = await requireSession();
  const { assessor } = await roleOf(session.user.id);
  if (!assessor) throw new Error('Only assessors can do this');
  const a = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!a) throw new Error('Assessment not found');
  if (a.status === 'approved') throw new Error('The assessment is approved and locked');
  return { session, a };
}

/** Sets the verdict (and comment/due date) of one requirement, or clears it (verdict = null). */
export async function saveAssessmentItem(assessmentId: string, requirementId: string, input: { verdict: unknown; comment?: string; dueDate?: string | null } | null): Promise<AssessmentDetail> {
  const { a } = await loadForAssessor(assessmentId);
  if (!isAssessedRequirement(requirementId)) throw new Error('Unknown requirement');
  if (input === null) {
    await prisma.assessmentItem.deleteMany({ where: { assessmentId, requirementId } });
  } else {
    if (!isVerdict(input.verdict)) throw new Error('Invalid verdict');
    const due = input.dueDate ? new Date(input.dueDate) : null;
    const data = {
      verdict: input.verdict,
      comment: input.comment?.trim().slice(0, 4000) || null,
      dueDate: due && !isNaN(due.getTime()) ? due : null,
      // a changed verdict starts over: an earlier "resolved" no longer applies
      ...(input.verdict !== 'finding' ? { resolved: false } : {}),
    };
    await prisma.assessmentItem.upsert({
      where: { assessmentId_requirementId: { assessmentId, requirementId } },
      create: { assessmentId, requirementId, ...data },
      update: data,
    });
  }
  return getAssessment(a.id);
}

export async function setAssessmentItemResolved(assessmentId: string, requirementId: string, resolved: boolean): Promise<AssessmentDetail> {
  const { a } = await loadForAssessor(assessmentId);
  await prisma.assessmentItem.updateMany({ where: { assessmentId, requirementId, verdict: 'finding' }, data: { resolved } });
  return getAssessment(a.id);
}

/** The product team answers a finding. */
export async function respondToFinding(assessmentId: string, requirementId: string, response: string): Promise<AssessmentDetail> {
  const session = await requireSession();
  const a = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { projectId: true, status: true } });
  if (!a) throw new Error('Assessment not found');
  await assertProjectWriteAccess(a.projectId, session.user.id);
  if (a.status === 'approved') throw new Error('The assessment is approved and locked');
  await prisma.assessmentItem.updateMany({ where: { assessmentId, requirementId, verdict: 'finding' }, data: { response: response.trim().slice(0, 4000) || null } });
  return getAssessment(assessmentId);
}

export async function decideAssessment(assessmentId: string, decision: 'approved' | 'rejected', summary: string): Promise<AssessmentDetail> {
  const { session, a } = await loadForAssessor(assessmentId);
  if (decision !== 'approved' && decision !== 'rejected') throw new Error('Invalid decision');
  if (decision === 'approved') {
    const items = await prisma.assessmentItem.findMany({ where: { assessmentId }, select: { requirementId: true, verdict: true, resolved: true } });
    const check = canApprove(items.map((i) => ({ requirementId: i.requirementId, verdict: i.verdict as Verdict, resolved: i.resolved })));
    if (!check.ok) throw new Error('Approval needs a verdict for every requirement and no unresolved finding');
  }
  await prisma.assessment.update({ where: { id: a.id }, data: { status: decision, summary: summary.trim().slice(0, 4000) || null, decidedAt: new Date() } });
  audit({ action: 'assessment.decision', actorId: session.user.id, actorEmail: session.user.email, targetType: 'assessment', targetId: a.id, details: { projectId: a.projectId, decision } });
  return getAssessment(a.id);
}

/** Rejected assessments can be worked on again; approved ones are final. */
export async function reopenAssessment(assessmentId: string): Promise<AssessmentDetail> {
  const { a } = await loadForAssessor(assessmentId);
  await prisma.assessment.update({ where: { id: a.id }, data: { status: 'open', decidedAt: null } });
  return getAssessment(a.id);
}

/** Latest assessment state of a project for the roadmap. */
export async function getAssessmentStatus(projectId: string): Promise<'none' | 'open' | 'approved' | 'rejected'> {
  const session = await requireSession();
  const { admin } = await roleOf(session.user.id);
  await assertCanRead(projectId, session.user.id, admin);
  const a = await prisma.assessment.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' }, select: { status: true } });
  return (a?.status as 'open' | 'approved' | 'rejected' | undefined) ?? 'none';
}
