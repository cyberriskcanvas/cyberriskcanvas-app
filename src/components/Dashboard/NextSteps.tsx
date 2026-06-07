import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import type { DiagramSummary } from '@/utils/aggregateDiagram';

interface ActionItem {
  level: 'critical' | 'warning' | 'info';
  text: string;
}

function deriveActions(summary: DiagramSummary): ActionItem[] {
  const actions: ActionItem[] = [];

  const critHigh = (summary.riskCounts['critical'] ?? 0) + (summary.riskCounts['high'] ?? 0);
  if (critHigh > 0) {
    actions.push({
      level: 'critical',
      text: `${critHigh} ${critHigh === 1 ? 'risk is' : 'risks are'} rated critical or high - immediate action required.`,
    });
  }

  const risksWithoutMeasure = summary.risks.filter(
    (r) => !summary.measures.some((m) => m.riskId === r.id),
  );
  if (risksWithoutMeasure.length > 0) {
    actions.push({
      level: 'warning',
      text: `${risksWithoutMeasure.length} ${risksWithoutMeasure.length === 1 ? 'risk has' : 'risks have'} no mitigation measure assigned yet.`,
    });
  }

  const openMeasures = summary.measureCounts['open'] ?? 0;
  if (openMeasures > 0) {
    actions.push({
      level: 'warning',
      text: `${openMeasures} ${openMeasures === 1 ? 'measure is' : 'measures are'} still open and not implemented.`,
    });
  }

  const threatsWithoutRisk = summary.threats.filter(
    (t) => !summary.risks.some((r) => r.threatId === t.id),
  );
  if (threatsWithoutRisk.length > 0) {
    actions.push({
      level: 'info',
      text: `${threatsWithoutRisk.length} ${threatsWithoutRisk.length === 1 ? 'threat has' : 'threats have'} not yet been assessed as a risk.`,
    });
  }

  if (summary.compliance.length === 0 && summary.components.length > 0) {
    actions.push({
      level: 'info',
      text: 'No Security Level (SL) set for any component - IEC 62443 assessment not yet possible.',
    });
  } else if (summary.globalScore !== null && summary.globalScore < 50) {
    const openReqs = summary.compliance.reduce((acc, c) => acc + c.nonCompliant + c.partial, 0);
    actions.push({
      level: 'warning',
      text: `Standard coverage is at ${summary.globalScore}% - ${openReqs} IEC 62443 requirements still open or incomplete.`,
    });
  }

  return actions;
}

const LEVEL_CONFIG = {
  critical: {
    icon: AlertTriangle,
    border: 'border-red-200',
    bg: 'bg-red-50',
    text: 'text-red-800',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: AlertCircle,
    border: 'border-yellow-200',
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    iconColor: 'text-yellow-500',
  },
  info: {
    icon: Info,
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    iconColor: 'text-blue-500',
  },
} as const;

export function NextSteps({ summary }: { summary: DiagramSummary }) {
  const actions = deriveActions(summary);

  if (actions.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle size={16} className="shrink-0 text-green-600" />
        <p className="text-sm text-green-800">
          Everything captured and assessed - no open items.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#e5e1d8] bg-white">
      <div className="border-b border-[#e5e1d8] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#1a1917]">What to do next?</h2>
        <p className="text-[11px] text-[#6b6460] mt-0.5">Open items in this diagram, prioritized by urgency</p>
      </div>
      <ul className="divide-y divide-[#e5e1d8]/60">
        {actions.map((action, i) => {
          const cfg = LEVEL_CONFIG[action.level];
          const Icon = cfg.icon;
          return (
            <li key={i} className={`flex items-start gap-3 px-4 py-3 ${cfg.bg}`}>
              <Icon size={15} className={`mt-0.5 shrink-0 ${cfg.iconColor}`} />
              <p className={`text-sm leading-snug ${cfg.text}`}>{action.text}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
