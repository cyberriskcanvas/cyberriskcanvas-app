'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isReviewerOrAdmin } from '@/lib/access';
import { activeVersionIds, loadFindings } from '@/lib/findings';
import { severityRank } from '@/lib/cvss';
import { visibleProjectIds } from './projects';

// "Active" = still needs attention from the security team (not yet triaged away).
const ACTIVE_STATUSES = ['open', 'in_triage', 'affected'] as const;

export interface SecurityOverviewProject {
  projectId: string;
  projectName: string;
  diagramId: string | null;
  teamName: string | null;
  activeCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  lastScanAt: string | null;
}

export interface SecurityOverviewFindingProject {
  vulnId: string;
  projectId: string;
  projectName: string;
  componentVersion: string | null;
  status: string;
  firstSeenAt: string;
}

export interface SecurityOverviewFinding {
  key: string;
  osvId: string;
  cveId: string | null;
  summary: string | null;
  severity: string | null;
  cvssScore: number | null;
  componentName: string;
  componentPurl: string | null;
  affected: SecurityOverviewFindingProject[];
}

export interface SecurityOverviewLastScan {
  startedAt: string;
  finishedAt: string | null;
  status: string;
  scannedCount: number;
  newCount: number;
}

export interface SecurityOverview {
  totals: {
    projectCount: number;
    activeCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  lastScan: SecurityOverviewLastScan | null;
  projects: SecurityOverviewProject[];
  findings: SecurityOverviewFinding[];
}

export async function getSecurityOverview(): Promise<SecurityOverview> {
  const session = await requireSession();
  if (!(await isReviewerOrAdmin(session.user.id, session.user.role))) throw new Error('Access denied');

  const ids = await visibleProjectIds(session.user.id);
  const projectFilter = ids !== null ? { id: { in: ids } } : {};

  const [projects, versionIds, lastScan, lastScans] = await Promise.all([
    prisma.project.findMany({
      where: projectFilter,
      select: {
        id: true, name: true,
        team: { select: { name: true } },
        diagrams: { where: { deletedAt: null }, select: { id: true }, orderBy: { createdAt: 'asc' }, take: 1 },
      },
      orderBy: { name: 'asc' },
    }),
    activeVersionIds(ids ?? undefined),
    prisma.cveScanRun.findFirst({ orderBy: { startedAt: 'desc' } }),
    prisma.projectSbom.groupBy({
      by: ['projectId'],
      where: ids !== null ? { projectId: { in: ids } } : undefined,
      _max: { uploadedAt: true },
    }),
  ]);

  const vulns = (await loadFindings({ versionIds, statuses: ACTIVE_STATUSES })).filter((f) => !f.suppressed);
  const lastScanByProject = new Map(lastScans.map((s) => [s.projectId, s._max.uploadedAt]));
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));

  const byProject = new Map<string, SecurityOverviewProject>();
  for (const p of projects) {
    byProject.set(p.id, {
      projectId: p.id,
      projectName: p.name,
      diagramId: p.diagrams[0]?.id ?? null,
      teamName: p.team?.name ?? null,
      activeCount: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      lastScanAt: lastScanByProject.get(p.id)?.toISOString() ?? null,
    });
  }

  const findingGroups = new Map<string, SecurityOverviewFinding>();

  for (const v of vulns) {
    const proj = byProject.get(v.projectId);
    if (proj) {
      proj.activeCount += 1;
      if (v.severity === 'CRITICAL') proj.criticalCount += 1;
      else if (v.severity === 'HIGH') proj.highCount += 1;
      else if (v.severity === 'MEDIUM') proj.mediumCount += 1;
      else if (v.severity === 'LOW') proj.lowCount += 1;
    }

    const groupKey = `${v.osvId}::${v.componentPurl ?? v.componentName}`;
    let group = findingGroups.get(groupKey);
    if (!group) {
      group = {
        key: groupKey,
        osvId: v.osvId,
        cveId: v.cveId,
        summary: v.summary,
        severity: v.severity,
        cvssScore: v.cvssScore,
        componentName: v.componentName,
        componentPurl: v.componentPurl,
        affected: [],
      };
      findingGroups.set(groupKey, group);
    }
    group.affected.push({
      vulnId: v.id,
      projectId: v.projectId,
      projectName: projectNames.get(v.projectId) ?? 'Unknown project',
      componentVersion: v.componentVersion,
      status: v.status,
      firstSeenAt: v.firstSeenAt.toISOString(),
    });
  }

  const findings = [...findingGroups.values()].sort((a, b) => {
    const byAffected = b.affected.length - a.affected.length;
    if (byAffected !== 0) return byAffected;
    return severityRank(b.severity) - severityRank(a.severity);
  });

  const totals = {
    projectCount: projects.length,
    activeCount: vulns.length,
    criticalCount: vulns.filter((v) => v.severity === 'CRITICAL').length,
    highCount: vulns.filter((v) => v.severity === 'HIGH').length,
    mediumCount: vulns.filter((v) => v.severity === 'MEDIUM').length,
    lowCount: vulns.filter((v) => v.severity === 'LOW').length,
  };

  return {
    totals,
    lastScan: lastScan ? {
      startedAt: lastScan.startedAt.toISOString(),
      finishedAt: lastScan.finishedAt?.toISOString() ?? null,
      status: lastScan.status,
      scannedCount: lastScan.scannedCount,
      newCount: lastScan.newCount,
    } : null,
    projects: [...byProject.values()].sort((a, b) => b.activeCount - a.activeCount),
    findings,
  };
}
