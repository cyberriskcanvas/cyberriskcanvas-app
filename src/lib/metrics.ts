import { prisma } from './db';
import { isAnalysable } from './sbomParse';
import { UNRESOLVED } from './findingStatus';
import { loadFindings, monitoredVersionIds, type Finding } from './findings';
import { loadViolations } from './policyRun';

export interface Counts {
  critical: number; high: number; medium: number; low: number;
  findings: number; audited: number; suppressed: number; exploited: number;
  policyFail: number; policyWarn: number;
  components: number; unanalysable: number; vulnerableComponents: number;
  riskScore: number;
}

/** Pure: the numbers of one version from its findings, components and policy violations. */
export function summarize(
  findings: Array<Pick<Finding, 'severity' | 'status' | 'suppressed' | 'kevAddedAt' | 'componentKey'>>,
  components: Array<{ purl: string | null }>,
  violations: Array<{ level: string; waived: boolean }>,
): Counts {
  const open = findings.filter((f) => !f.suppressed && UNRESOLVED.includes(f.status));
  const n = (s: string) => open.filter((f) => f.severity === s).length;
  const c = { critical: n('CRITICAL'), high: n('HIGH'), medium: n('MEDIUM'), low: n('LOW') };
  const active = violations.filter((v) => !v.waived);
  return {
    ...c,
    findings: open.length,
    audited: findings.filter((f) => !f.suppressed && f.status !== 'open').length,
    suppressed: findings.filter((f) => f.suppressed).length,
    exploited: open.filter((f) => f.kevAddedAt).length,
    policyFail: active.filter((v) => v.level === 'fail').length,
    policyWarn: active.filter((v) => v.level === 'warn').length,
    components: components.length,
    unanalysable: components.filter((x) => !isAnalysable(x.purl)).length,
    vulnerableComponents: new Set(open.map((f) => f.componentKey)).size,
    // weighted like Dependency-Track's inherited risk score
    riskScore: 10 * c.critical + 5 * c.high + 3 * c.medium + c.low,
  };
}

const today = () => new Date(new Date().toISOString().slice(0, 10)); // UTC midnight

/** Writes today's snapshot for the given versions (default: every monitored version). Rewrites the day on repeated calls. */
export async function writeSnapshots(versionIds?: string[]): Promise<number> {
  const ids = versionIds ?? await monitoredVersionIds();
  if (ids.length === 0) return 0;
  const [findings, components, violations, versions] = await Promise.all([
    loadFindings({ versionIds: ids }),
    prisma.projectSbomComponent.findMany({ where: { versionId: { in: ids } }, distinct: ['versionId', 'key'], select: { versionId: true, purl: true } }),
    loadViolations(ids),
    prisma.projectVersion.findMany({ where: { id: { in: ids } }, select: { id: true, projectId: true } }),
  ]);
  const day = today();
  for (const v of versions) {
    const data = summarize(findings.filter((f) => f.versionId === v.id), components.filter((c) => c.versionId === v.id), violations.filter((x) => x.versionId === v.id));
    await prisma.metricSnapshot.upsert({
      where: { day_versionId: { day, versionId: v.id } },
      create: { day, versionId: v.id, projectId: v.projectId, ...data },
      update: data,
    });
  }
  return versions.length;
}

export interface TrendPoint extends Pick<Counts, 'critical' | 'high' | 'medium' | 'low' | 'findings' | 'riskScore'> { day: string }

/** Daily totals over the given products' versions (null = all) for the last `days` days. */
export async function trend(projectIds: string[] | null, days = 90): Promise<TrendPoint[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.metricSnapshot.groupBy({
    by: ['day'],
    where: { day: { gte: since }, ...(projectIds ? { projectId: { in: projectIds } } : {}) },
    _sum: { critical: true, high: true, medium: true, low: true, findings: true, riskScore: true },
    orderBy: { day: 'asc' },
  });
  return rows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    critical: r._sum.critical ?? 0, high: r._sum.high ?? 0, medium: r._sum.medium ?? 0, low: r._sum.low ?? 0,
    findings: r._sum.findings ?? 0, riskScore: r._sum.riskScore ?? 0,
  }));
}
