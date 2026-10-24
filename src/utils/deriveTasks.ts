import type { Asset, DiagramNode, Measure, Risk, SecurityTest, Threat } from '@/types';
import type { Finding } from './modelCheck';

export type TaskKind = 'confirm_draft' | 'assess_threat' | 'add_measure' | 'open_measure' | 'failed_test' | 'ci_gate' | 'model_finding';

export interface Task {
  id: string;
  kind: TaskKind;
  level: 'critical' | 'warning' | 'info';
  /** English fallback; the UI formats localised text from the structured fields below. */
  text: string;
  /** Component label (node tasks). */
  subject?: string;
  /** Threat, risk, measure or test name, or the gate reason. */
  detail?: string;
  riskLevel?: string;
  /** Architecture check finding (rule id and values for the localised text). */
  ruleId?: string;
  params?: Record<string, string>;
  draftCounts?: { threats: number; assets: number };
  /** Canvas node to open, with the detail-panel tab that fixes the task. */
  nodeId?: string;
  tab?: 'assets' | 'threats' | 'risks' | 'measures' | 'security-tests';
  /** Opens the Operations tab instead of a node. */
  target?: 'operations' | 'modelcheck';
}

const ORDER = { critical: 0, warning: 1, info: 2 } as const;

/**
 * Flat to-do list derived from the diagram (and the CI gate), one item per thing a person
 * has to do. Draft items from the guided TARA come first because nothing downstream
 * (risks, measures) is meaningful until they are confirmed.
 */
export function deriveTasks(input: { nodes: DiagramNode[]; gateReasons?: string[]; modelFindings?: Finding[] }): Task[] {
  const tasks: Task[] = [];

  for (const node of input.nodes) {
    if (node.type === 'boundary') continue;
    const label = String(node.data.label ?? node.id);
    const threats = (node.data.threats ?? []) as Threat[];
    const assets = (node.data.assets ?? []) as Asset[];
    const risks = (node.data.risks ?? []) as Risk[];
    const measures = (node.data.measures ?? []) as Measure[];
    const tests = (node.data.securityTests ?? []) as SecurityTest[];

    const draftThreats = threats.filter((t) => t.draft).length;
    const draftAssets = assets.filter((a) => a.draft).length;
    if (draftThreats + draftAssets > 0) {
      tasks.push({
        id: `${node.id}:draft`,
        kind: 'confirm_draft',
        level: 'warning',
        text: `${label}: review ${[
          draftThreats && `${draftThreats} suggested ${draftThreats === 1 ? 'threat' : 'threats'}`,
          draftAssets && `${draftAssets} suggested ${draftAssets === 1 ? 'asset' : 'assets'}`,
        ].filter(Boolean).join(' and ')}, then confirm or delete them.`,
        nodeId: node.id,
        tab: draftThreats > 0 ? 'threats' : 'assets',
        subject: label,
        draftCounts: { threats: draftThreats, assets: draftAssets },
      });
    }

    for (const t of threats) {
      if (t.draft || risks.some((r) => r.threatId === t.id)) continue;
      tasks.push({ id: `${node.id}:threat:${t.id}`, kind: 'assess_threat', level: 'info', text: `${label}: assess the risk of "${t.name}".`, nodeId: node.id, tab: 'risks', subject: label, detail: t.name });
    }

    for (const r of risks) {
      if (r.status === 'mitigated' || r.acceptedBy || measures.some((m) => m.riskId === r.id)) continue;
      const threat = threats.find((t) => t.id === r.threatId);
      tasks.push({
        id: `${node.id}:risk:${r.id}`,
        kind: 'add_measure',
        level: r.level === 'critical' || r.level === 'high' ? 'critical' : 'warning',
        text: `${label}: add a measure for the ${r.level} risk "${threat?.name ?? 'unknown threat'}" or accept it formally.`,
        nodeId: node.id,
        tab: 'measures',
        subject: label,
        detail: threat?.name ?? 'unknown threat',
        riskLevel: r.level,
      });
    }

    for (const m of measures) {
      if (m.status !== 'open' && m.status !== 'in-progress') continue;
      tasks.push({ id: `${node.id}:measure:${m.id}`, kind: 'open_measure', level: 'warning', text: `${label}: implement measure "${m.title}".`, nodeId: node.id, tab: 'measures', subject: label, detail: m.title });
    }

    for (const t of tests) {
      if (t.status !== 'failed' || t.ciSource) continue; // CI-linked tests are covered by the gate
      tasks.push({ id: `${node.id}:test:${t.id}`, kind: 'failed_test', level: 'critical', text: `${label}: security test "${t.title}" failed.`, nodeId: node.id, tab: 'security-tests', subject: label, detail: t.title });
    }
  }

  // Architecture check: only high and medium findings become tasks (low ones stay in the panel)
  for (const f of input.modelFindings ?? []) {
    if (f.severity === 'low') continue;
    tasks.push({
      id: `model:${f.id}`, kind: 'model_finding', level: f.severity === 'high' ? 'critical' : 'warning',
      text: `Architecture check ${f.ruleId}`, ruleId: f.ruleId, params: f.params, target: 'modelcheck',
    });
  }

  (input.gateReasons ?? []).forEach((reason, i) => {
    tasks.push({ id: `gate:${i}`, kind: 'ci_gate', level: 'critical', text: `Release gate: ${reason}`, target: 'operations', detail: reason });
  });

  return tasks.sort((a, b) => ORDER[a.level] - ORDER[b.level]);
}
