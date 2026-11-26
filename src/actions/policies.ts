'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertProjectAccess, assertProjectWriteAccess, isReviewerOrAdmin } from '@/lib/access';
import { requireTierFeature } from '@/lib/tierGuard';
import { audit } from '@/lib/audit';
import { validatePolicy, type Policy, type Violation } from '@/lib/policy';
import { loadViolations, toPolicy } from '@/lib/policyRun';

/** Policies are set by admins and the review team; everybody with a Pro licence sees them. */
async function requireManager() {
  const { userId } = await requireTierFeature('sbom');
  const session = await requireSession();
  if (!(await isReviewerOrAdmin(userId, session.user.role))) throw new Error('Only administrators and the review team can change policies.');
  return session;
}

export async function listPolicies(): Promise<{ policies: Policy[]; canEdit: boolean; projects: Array<{ id: string; name: string }> }> {
  const { userId } = await requireTierFeature('sbom');
  const session = await requireSession();
  const [rows, canEdit, projects] = await Promise.all([
    prisma.policy.findMany({ orderBy: { createdAt: 'asc' } }),
    isReviewerOrAdmin(userId, session.user.role),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);
  return { policies: rows.map(toPolicy), canEdit, projects: canEdit ? projects : [] };
}

/** Creates a policy, or changes it when an id is given. Returns the problem as a message instead of throwing. */
export async function savePolicy(raw: Record<string, unknown>, id?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireManager();
  const checked = validatePolicy(raw);
  if (!checked.ok) return checked;
  const data = { ...checked.value, conditions: checked.value.conditions as object[] };
  const row = id ? await prisma.policy.update({ where: { id }, data }) : await prisma.policy.create({ data });
  audit({ action: 'policy.save', actorId: session.user.id, actorEmail: session.user.email, targetType: 'policy', targetId: row.id, details: { name: row.name, violation: row.violation } });
  return { ok: true };
}

export async function deletePolicy(id: string): Promise<void> {
  const session = await requireManager();
  await prisma.policy.delete({ where: { id } });
  audit({ action: 'policy.delete', actorId: session.user.id, actorEmail: session.user.email, targetType: 'policy', targetId: id });
}

/** Violations of one version of a product (the active one by default). */
export async function getViolations(projectId: string, versionNumber: number | null): Promise<Violation[]> {
  const { userId } = await requireTierFeature('sbom');
  await assertProjectAccess(projectId, userId);
  const version = await prisma.projectVersion.findFirst({
    where: { projectId, ...(versionNumber === null ? { status: 'active' } : { number: versionNumber }) },
    select: { id: true },
  });
  return version ? loadViolations([version.id]) : [];
}

/** The product team accepts a violation for one component, with a reason. */
export async function waiveViolation(policyId: string, projectId: string, componentKey: string, reason: string): Promise<void> {
  const { userId } = await requireTierFeature('sbom');
  await assertProjectWriteAccess(projectId, userId);
  const why = reason.trim().slice(0, 1000);
  if (!why) throw new Error('A reason is required.');
  const session = await requireSession();
  const byName = session.user.name ?? session.user.email ?? 'unknown';
  const key = { policyId_projectId_componentKey: { policyId, projectId, componentKey } };
  await prisma.policyWaiver.upsert({ where: key, create: { policyId, projectId, componentKey, reason: why, byName }, update: { reason: why, byName } });
  audit({ action: 'policy.waive', actorId: session.user.id, actorEmail: session.user.email, targetType: 'project', targetId: projectId, details: { policyId, componentKey } });
}
