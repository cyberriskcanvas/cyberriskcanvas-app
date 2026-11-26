import { prisma } from './db';
import { CI_SOURCES } from './ciEval';
import { loadGateFindings } from './policyRun';
import { blockingVulns, evaluateGate, GATE_SEVERITIES, latestRunsPerSourcePart, runFails, type GateSeverity } from './ciGate';
import { applyDismissals, checkModel } from '@/utils/modelCheck';
import { sanitizeDismissed } from './modelCheckDismissed';
import { mergeChecklist } from './organisation';
import { getOrg } from './organisationStore';
import type { DiagramEdge, DiagramNode } from '@/types';

/** failOn null = the project's setting. */
export interface GateParams { require: string[]; failOn: GateSeverity | null; checkModel: boolean }

/** ?require=sast,sbom,model&failOn=high: shared by the gate and the release endpoint. Without failOn the project's setting applies. */
export function parseGateParams(q: URLSearchParams): GateParams | { error: string } {
  const requested = (q.get('require') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  // "model" is not a CI source: it asks for the architecture check of the project model
  const require = requested.filter((s) => s !== 'model');
  const badSource = require.find((s) => !(CI_SOURCES as readonly string[]).includes(s));
  if (badSource) return { error: `Unknown source '${badSource}' in require` };
  const failOn = q.get('failOn')?.toLowerCase() || null;
  if (failOn !== null && !isGateSeverity(failOn)) {
    return { error: `failOn must be one of ${GATE_SEVERITIES.join(', ')}` };
  }
  return { require, failOn, checkModel: requested.includes('model') };
}

export const isGateSeverity = (v: unknown): v is GateSeverity => (GATE_SEVERITIES as readonly unknown[]).includes(v);

/** The project's gate threshold (default high). */
export async function projectFailOn(projectId: string): Promise<GateSeverity> {
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { gateFailOn: true } });
  return isGateSeverity(p?.gateFailOn) ? p.gateFailOn : 'high';
}

export async function computeGate(projectId: string, versionId: string, p: GateParams) {
  const failOn = p.failOn ?? (await projectFailOn(projectId));
  const [{ vulns, policyViolations }, runs] = await Promise.all([
    loadGateFindings(versionId),
    prisma.ciRun.findMany({
      where: { versionId },
      select: { source: true, part: true, result: true, summary: true, createdAt: true, metrics: true },
    }),
  ]);

  let modelHighFindings: number | undefined;
  if (p.checkModel) {
    const [project, diagram, org] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId }, select: { modelCheckDismissed: true, craChecklist: true } }),
      prisma.diagram.findFirst({ where: { projectId, deletedAt: null }, orderBy: { updatedAt: 'desc' }, select: { nodes: true, edges: true } }),
      getOrg(),
    ]);
    const findings = checkModel({
      nodes: (diagram?.nodes ?? []) as unknown as DiagramNode[],
      edges: (diagram?.edges ?? []) as unknown as DiagramEdge[],
      decidedRequirements: new Set(Object.keys(mergeChecklist(org.craChecklist, project?.craChecklist))),
    });
    modelHighFindings = applyDismissals(findings, sanitizeDismissed(project?.modelCheckDismissed)).open.filter((f) => f.severity === 'high').length;
  }

  return { ...evaluateGate({ vulns, policyViolations, runs, require: p.require, failOn, modelHighFindings }), failOn };
}

/** Gate state of one version for the product overview: latest run per source, reasons, verdict, blocking findings. */
export async function productGate(versionId: string, gateFailOn: string) {
  const [runs, { vulns, policyViolations }] = await Promise.all([
    prisma.ciRun.findMany({ where: { versionId }, select: { source: true, part: true, result: true, summary: true, createdAt: true, metrics: true } }),
    loadGateFindings(versionId),
  ]);
  const failOn = isGateSeverity(gateFailOn) ? gateFailOn : 'high';
  const gate = evaluateGate({ vulns, policyViolations, runs, failOn });
  return {
    ciLatest: latestRunsPerSourcePart(runs).map((r) => ({ source: r.source, result: runFails(r, failOn) ? 'findings' : 'ok' })),
    gateReasons: gate.reasons as Array<{ code: string }>,
    gatePass: runs.length === 0 && vulns.length === 0 && policyViolations.length === 0 ? null : gate.pass,
    openHigh: blockingVulns(vulns, failOn).length,
  };
}
