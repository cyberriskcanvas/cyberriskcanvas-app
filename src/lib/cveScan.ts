import { prisma } from './db';
import { matchComponents } from './osv';
import { isAnalysable } from './sbomParse';
import { dispatchNewFindingAlerts, type AlertFinding } from './alerting';
import { flagExploitedFindings } from './exploited';
import { monitoredVersionIds } from './findings';
import { refreshEpss } from './epss';
import { writeSnapshots } from './metrics';

// Matches every component on record in a monitored project version (see monitoredVersionIds) against OSV.dev
// again, so advisories published after the upload show up, and refreshes the EPSS scores. Triage decisions (analyses) are never touched. Runs from the
// in-process scheduler (src/lib/scheduler.ts) or via POST /api/internal/cve-scan.

const STALE_RUN_MINUTES = 60;

interface ScanResult {
  scannedCount: number;
  newCount: number;
}

async function performScan(): Promise<ScanResult> {
  const components = await prisma.projectSbomComponent.findMany({
    where: { versionId: { in: await monitoredVersionIds() } },
    select: { projectId: true, key: true, name: true, version: true, purl: true },
  });
  // a library shared by many products is looked up once
  const purls = [...new Set(components.map((c) => c.purl).filter(isAnalysable))];
  if (purls.length === 0) return { scannedCount: 0, newCount: 0 };

  const { added } = await matchComponents(purls);
  if (added.length === 0) return { scannedCount: purls.length, newCount: 0 };

  const [vulns, projects] = await Promise.all([
    prisma.vulnerability.findMany({ where: { id: { in: [...new Set(added.map((m) => m.vulnerabilityId))] } }, select: { id: true, cveId: true, severity: true, cvssScore: true } }),
    prisma.project.findMany({ where: { id: { in: [...new Set(components.map((c) => c.projectId))] } }, select: { id: true, name: true } }),
  ]);
  const vulnById = new Map(vulns.map((v) => [v.id, v]));
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));
  const byKey = new Map<string, typeof components>();
  for (const c of components) byKey.set(c.key, [...(byKey.get(c.key) ?? []), c]);

  // one alert per product, component and advisory, however many versions or parts list the component
  const alerts = new Map<string, AlertFinding>();
  for (const m of added) {
    const v = vulnById.get(m.vulnerabilityId);
    if (!v) continue;
    for (const c of byKey.get(m.componentKey) ?? []) {
      alerts.set(`${c.projectId}\u0000${c.key}\u0000${v.id}`, {
        projectName: projectNames.get(c.projectId) ?? 'Unknown project',
        componentName: c.name,
        componentVersion: c.version,
        cveId: v.cveId,
        osvId: v.id,
        severity: v.severity,
        cvssScore: v.cvssScore,
      });
    }
  }
  await dispatchNewFindingAlerts([...alerts.values()]);
  return { scannedCount: purls.length, newCount: alerts.size };
}

export type CveScanOutcome =
  | { status: 'completed'; runId: string; scannedCount: number; newCount: number }
  | { status: 'skipped'; runId: string }
  | { status: 'failed'; runId: string };

/** One scan run with a lock in the database, so several instances or triggers never overlap. */
export async function runCveScan(): Promise<CveScanOutcome> {
  const staleThreshold = new Date(Date.now() - STALE_RUN_MINUTES * 60_000);
  const activeRun = await prisma.cveScanRun.findFirst({
    where: { status: 'running', startedAt: { gt: staleThreshold } },
    orderBy: { startedAt: 'desc' },
    select: { id: true },
  });
  if (activeRun) return { status: 'skipped', runId: activeRun.id };

  const run = await prisma.cveScanRun.create({ data: {} });
  try {
    const result = await performScan();
    await refreshEpss().catch((e) => console.error('[epss] refresh failed:', e instanceof Error ? e.message : e));
    // new findings may be known to be exploited: start the Art. 14 clock without waiting for the next run
    await flagExploitedFindings().catch((e) => console.error('[exploited] check failed:', e instanceof Error ? e.message : e));
    await writeSnapshots().catch((e) => console.error('[metrics] snapshot failed:', e instanceof Error ? e.message : e));
    await prisma.cveScanRun.update({
      where: { id: run.id },
      data: { status: 'completed', finishedAt: new Date(), scannedCount: result.scannedCount, newCount: result.newCount },
    });
    return { status: 'completed', runId: run.id, ...result };
  } catch (err) {
    await prisma.cveScanRun.update({
      where: { id: run.id },
      data: { status: 'failed', finishedAt: new Date(), errorMessage: err instanceof Error ? err.message.slice(0, 1000) : 'Unknown error' },
    });
    return { status: 'failed', runId: run.id };
  }
}
