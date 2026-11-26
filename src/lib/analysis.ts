import { prisma } from './db';
import { FINDING_STATUSES } from './findings';
import { sanitizeRemediation } from './remediation';

export interface AnalysisPatch {
  status?: string;
  justification?: string;
  /** null clears it; an object replaces all three fields */
  remediation?: { category?: string; details?: string; url?: string } | null;
  suppressed?: boolean;
}

export class InvalidAnalysis extends Error {}

/**
 * Writes the decision about one vulnerability in one component and records what changed.
 * Only the fields in the patch change, everything else stays.
 */
export async function updateAnalysis(input: { projectId: string; componentKey: string; vulnerabilityId: string; patch: AnalysisPatch; actorName: string; comment?: string }) {
  const { projectId, componentKey, vulnerabilityId, patch, actorName } = input;
  if (patch.status !== undefined && !(FINDING_STATUSES as readonly string[]).includes(patch.status)) {
    throw new InvalidAnalysis(`Invalid status. Allowed: ${FINDING_STATUSES.join(', ')}`);
  }
  const rem = patch.remediation === undefined ? undefined : sanitizeRemediation(patch.remediation);
  const data = {
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.justification !== undefined ? { justification: patch.justification.slice(0, 2000) } : {}),
    ...(rem ? { remediationCategory: rem.category, remediationDetails: rem.details, remediationUrl: rem.url } : {}),
    ...(patch.suppressed !== undefined ? { suppressed: patch.suppressed } : {}),
  };

  return prisma.$transaction(async (tx) => {
    // only a component of this product that matches this advisory can be analysed
    const exists = await tx.vulnerabilityMatch.findUnique({ where: { componentKey_vulnerabilityId: { componentKey, vulnerabilityId } }, select: { componentKey: true } });
    const inProject = exists && await tx.projectSbomComponent.findFirst({ where: { projectId, key: componentKey }, select: { id: true } });
    if (!inProject) return null;

    const key = { projectId_componentKey_vulnerabilityId: { projectId, componentKey, vulnerabilityId } };
    const before = await tx.analysis.findUnique({ where: key });
    const change: Record<string, [unknown, unknown]> = {};
    for (const [field, value] of Object.entries(data)) {
      const old = before ? (before as Record<string, unknown>)[field] : field === 'status' ? 'open' : field === 'suppressed' ? false : null;
      if (old !== value) change[field] = [old, value];
    }
    const after = await tx.analysis.upsert({
      where: key,
      create: { projectId, componentKey, vulnerabilityId, updatedByName: actorName, ...data },
      update: { ...data, updatedByName: actorName },
    });
    if (Object.keys(change).length > 0 || input.comment) {
      await tx.analysisEvent.create({ data: { analysisId: after.id, actorName, change: change as object, comment: input.comment?.slice(0, 2000) || null } });
    }
    return after;
  });
}
