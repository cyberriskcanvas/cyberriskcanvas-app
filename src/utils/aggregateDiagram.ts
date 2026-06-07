import type { DiagramNode, NodeData, Asset, Threat, Risk, Measure, IEC62443Mapping, CRAMapping } from '@/types';
import { getRequirementsForSL, calculateCompliance, type SLLevel, type IECPart } from '@/data/iec62443';
import { CRA_REQUIREMENTS, calculateCRACompliance } from '@/data/cra';

// ─── Flat record types enriched with component context ───────────────────────

export interface FlatAsset extends Asset { componentId: string; componentLabel: string; componentType: string }
export interface FlatThreat extends Threat { componentId: string; componentLabel: string; componentType: string }
export interface FlatRisk extends Risk {
  componentId: string; componentLabel: string; componentType: string;
  threatName?: string; threatStride?: Threat['stride'];
}
export interface FlatMeasure extends Measure { componentId: string; componentLabel: string }
export interface ComponentCompliance {
  componentId: string; componentLabel: string; componentType: string;
  sl: SLLevel; part: IECPart; score: number;
  compliant: number; partial: number; nonCompliant: number; total: number;
}

export interface ComponentCRACompliance {
  componentId: string; componentLabel: string; componentType: string;
  score: number; compliant: number; partial: number; nonCompliant: number;
}

export interface TraceabilityRow {
  measureId: string;
  componentLabel: string;
  threatName: string;
  riskLevel: string;
  measureTitle: string;
  evidenceLink?: string;
  riskAccepted: boolean;
  acceptanceReason?: string;
  acceptedBy?: string;
  complete: boolean;
}

export interface DiagramSummary {
  components: { id: string; label: string; type: string; data: NodeData }[];
  assets: FlatAsset[];
  threats: FlatThreat[];
  risks: FlatRisk[];
  measures: FlatMeasure[];
  traceabilityRows: TraceabilityRow[];
  compliance: ComponentCompliance[];
  globalScore: number | null;
  craCompliance: ComponentCRACompliance[];
  craGlobalScore: number | null;
  riskCounts: Record<string, number>;
  measureCounts: Record<string, number>;
}

export function aggregateDiagram(nodes: DiagramNode[]): DiagramSummary {
  const assets: FlatAsset[] = [];
  const threats: FlatThreat[] = [];
  const risks: FlatRisk[] = [];
  const measures: FlatMeasure[] = [];
  const compliance: ComponentCompliance[] = [];
  const craCompliance: ComponentCRACompliance[] = [];
  const components: DiagramSummary['components'] = [];

  for (const node of nodes) {
    if (node.type === 'boundary') continue;
    const data = node.data as NodeData;
    const label = String(data.label ?? node.id);
    const type = node.type ?? 'hardware';

    components.push({ id: node.id, label, type, data });

    for (const a of (data.assets ?? []) as Asset[]) {
      assets.push({ ...a, componentId: node.id, componentLabel: label, componentType: type });
    }
    for (const t of (data.threats ?? []) as Threat[]) {
      threats.push({ ...t, componentId: node.id, componentLabel: label, componentType: type });
    }
    for (const r of (data.risks ?? []) as Risk[]) {
      const threat = ((data.threats ?? []) as Threat[]).find((t) => t.id === r.threatId);
      risks.push({ ...r, componentId: node.id, componentLabel: label, componentType: type, threatName: threat?.name, threatStride: threat?.stride });
    }
    for (const m of (data.measures ?? []) as Measure[]) {
      measures.push({ ...m, componentId: node.id, componentLabel: label });
    }

    if (data.securityLevel) {
      const sl = (Number(String(data.securityLevel).replace('SL-', '')) || 1) as SLLevel;
      const part = (data.iecPart ?? '4-2') as IECPart;
      const reqs = getRequirementsForSL(sl, part);
      const mappings = (data.iec62443 ?? []) as IEC62443Mapping[];
      const result = calculateCompliance(
        mappings.map((m) => ({ requirementId: m.requirementId, status: m.status })),
        reqs,
      );
      compliance.push({ componentId: node.id, componentLabel: label, componentType: type, sl, part, ...result });
    }

    const craMappings = (data.cra ?? []) as CRAMapping[];
    if (craMappings.length > 0) {
      const result = calculateCRACompliance(
        craMappings.map((m) => ({ requirementId: m.requirementId, status: m.status })),
        CRA_REQUIREMENTS,
      );
      craCompliance.push({ componentId: node.id, componentLabel: label, componentType: type, ...result });
    }
  }

  // Global compliance score
  const globalScore = compliance.length > 0
    ? Math.round(compliance.reduce((acc, c) => acc + c.score, 0) / compliance.length)
    : null;

  const craGlobalScore = craCompliance.length > 0
    ? Math.round(craCompliance.reduce((acc, c) => acc + c.score, 0) / craCompliance.length)
    : null;

  const riskCounts = { critical: 0, high: 0, medium: 0, low: 0, negligible: 0 };
  for (const r of risks) riskCounts[r.level] = (riskCounts[r.level] ?? 0) + 1;

  const measureCounts = { open: 0, 'in-progress': 0, mitigated: 0, 'risk-accepted': 0 };
  for (const m of measures) measureCounts[m.status] = (measureCounts[m.status] ?? 0) + 1;

  const traceabilityRows: TraceabilityRow[] = measures.map((m) => {
    const linkedRisk = risks.find((r) => r.id === m.riskId);
    const linkedThreat = linkedRisk ? threats.find((t) => t.id === linkedRisk.threatId) : undefined;
    const complete = m.riskAccepted
      ? !!(m.acceptanceReason?.trim() && m.acceptedBy?.trim())
      : !!(m.title.trim() && m.evidenceLink?.trim());
    return {
      measureId: m.id,
      componentLabel: m.componentLabel,
      threatName: linkedThreat?.name ?? '-',
      riskLevel: linkedRisk?.level ?? '-',
      measureTitle: m.title,
      evidenceLink: m.evidenceLink,
      riskAccepted: m.riskAccepted ?? false,
      acceptanceReason: m.acceptanceReason,
      acceptedBy: m.acceptedBy,
      complete,
    };
  });

  return { components, assets, threats, risks, measures, traceabilityRows, compliance, globalScore, craCompliance, craGlobalScore, riskCounts, measureCounts };
}
