import { prisma } from './db';
import { loadFindings } from './findings';
import { evaluatePolicies, VIOLATION_LEVELS, type Policy, type PolicyCondition, type Violation } from './policy';

export function toPolicy(row: { id: string; name: string; violation: string; operator: string; conditions: unknown; projectIds: string[] }): Policy {
  return {
    id: row.id, name: row.name, projectIds: row.projectIds,
    violation: (VIOLATION_LEVELS as readonly string[]).includes(row.violation) ? (row.violation as Policy['violation']) : 'fail',
    operator: row.operator === 'all' ? 'all' : 'any',
    conditions: Array.isArray(row.conditions) ? (row.conditions as PolicyCondition[]) : [],
  };
}

/** Violations of the given versions. Without any policy nothing is loaded. */
export async function loadViolations(versionIds: string[]): Promise<Violation[]> {
  if (versionIds.length === 0) return [];
  const policies = await prisma.policy.findMany();
  if (policies.length === 0) return [];
  const [components, findings, waivers] = await Promise.all([
    prisma.projectSbomComponent.findMany({
      where: { versionId: { in: versionIds } },
      distinct: ['versionId', 'key'],
      select: { projectId: true, versionId: true, key: true, name: true, version: true, purl: true, licenses: true },
    }),
    loadFindings({ versionIds }),
    prisma.policyWaiver.findMany({ select: { policyId: true, projectId: true, componentKey: true } }),
  ]);
  return evaluatePolicies(policies.map(toPolicy), components, findings, new Set(waivers.map((w) => `${w.policyId}|${w.projectId}|${w.componentKey}`)));
}

/** Findings and policy violations of one version: what the release gate judges besides the CI runs. */
export async function loadGateFindings(versionId: string) {
  const [vulns, policyViolations] = await Promise.all([loadFindings({ versionIds: [versionId] }), loadViolations([versionId])]);
  return { vulns, policyViolations };
}
