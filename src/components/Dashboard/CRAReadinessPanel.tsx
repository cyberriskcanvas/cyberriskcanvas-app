'use client';

import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import type { DiagramSummary } from '@/utils/aggregateDiagram';

interface Check {
  label: string;
  sublabel: string;
  craRef: string;
  status: 'done' | 'partial' | 'open';
}

function computeChecks(summary: DiagramSummary, isLocked: boolean): Check[] {
  const risksWithMeasure = summary.risks.filter((r) =>
    summary.measures.some((m) => m.riskId === r.id),
  );
  const risksFullyTreated =
    summary.risks.length > 0 &&
    summary.risks.every((r) => summary.measures.some((m) => m.riskId === r.id));

  const openMeasures = summary.measures.filter((m) => m.status === 'open').length;
  const allClosed = summary.measures.length > 0 && openMeasures === 0;

  return [
    {
      label: 'Architecture documented',
      sublabel:
        summary.components.length > 0
          ? `${summary.components.length} component${summary.components.length > 1 ? 's' : ''} on canvas`
          : 'No components on canvas yet',
      craRef: 'Annex VII §2(2)',
      status: summary.components.length > 0 ? 'done' : 'open',
    },
    {
      label: 'Threat model performed',
      sublabel:
        summary.threats.length > 0
          ? `${summary.threats.length} threat${summary.threats.length > 1 ? 's' : ''} identified`
          : 'No threats identified yet',
      craRef: 'Art. 13(2), Annex I §1',
      status:
        summary.threats.length > 0
          ? 'done'
          : summary.components.length > 0
            ? 'partial'
            : 'open',
    },
    {
      label: 'Risks assessed',
      sublabel:
        summary.risks.length > 0
          ? `${summary.risks.length} risk${summary.risks.length > 1 ? 's' : ''} rated`
          : 'No risks assessed yet',
      craRef: 'Art. 13(2)',
      status:
        summary.risks.length > 0
          ? 'done'
          : summary.threats.length > 0
            ? 'partial'
            : 'open',
    },
    {
      label: 'All risks treated',
      sublabel:
        summary.risks.length === 0
          ? 'No risks to treat yet'
          : risksFullyTreated
            ? 'All risks have a measure or formal acceptance'
            : `${summary.risks.length - risksWithMeasure.length} risk${summary.risks.length - risksWithMeasure.length !== 1 ? 's' : ''} without a measure`,
      craRef: 'Art. 13(2), Annex I §1',
      status:
        summary.risks.length === 0
          ? 'open'
          : risksFullyTreated
            ? 'done'
            : summary.measures.length > 0
              ? 'partial'
              : 'open',
    },
    {
      label: 'Measures implemented',
      sublabel:
        summary.measures.length === 0
          ? 'No measures defined yet'
          : allClosed
            ? 'All measures closed or risk-accepted'
            : `${openMeasures} measure${openMeasures !== 1 ? 's' : ''} still open`,
      craRef: 'Annex I Part I §1',
      status:
        summary.measures.length === 0
          ? 'open'
          : allClosed
            ? 'done'
            : 'partial',
    },
    {
      label: 'EU CRA requirements mapped',
      sublabel:
        summary.craCompliance.length > 0 && summary.craGlobalScore !== null
          ? `${summary.craGlobalScore}% of mapped requirements compliant`
          : 'No CRA mappings defined yet',
      craRef: 'Annex I, Art. 13',
      status:
        summary.craCompliance.length > 0 && (summary.craGlobalScore ?? 0) >= 70
          ? 'done'
          : summary.craCompliance.length > 0
            ? 'partial'
            : 'open',
    },
    {
      label: 'Assessment frozen as audit artifact',
      sublabel: isLocked
        ? 'Current version locked and immutable'
        : 'Version not yet frozen - use "Freeze version" when ready',
      craRef: 'Annex VII',
      status: isLocked ? 'done' : 'open',
    },
  ];
}

const STATUS_CONFIG = {
  done: {
    Icon: CheckCircle2,
    iconColor: 'text-green-500',
    labelColor: 'text-[#1a1917]',
  },
  partial: {
    Icon: AlertCircle,
    iconColor: 'text-yellow-500',
    labelColor: 'text-[#1a1917]',
  },
  open: {
    Icon: Circle,
    iconColor: 'text-[#c8c0b0]',
    labelColor: 'text-[#6b6460]',
  },
} as const;

export function CRAReadinessPanel({
  summary,
  isLocked,
}: {
  summary: DiagramSummary;
  isLocked: boolean;
}) {
  const checks = computeChecks(summary, isLocked);
  const done = checks.filter((c) => c.status === 'done').length;
  const total = checks.length;
  const pct = Math.round((done / total) * 100);

  const scoreColor =
    pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-500';

  return (
    <div className="rounded-xl border border-[#e5e1d8] bg-white overflow-hidden">
      <div className="border-b border-[#e5e1d8] px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#1a1917]">EU CRA Readiness</h2>
          <p className="text-[11px] text-[#6b6460] mt-0.5">
            Auto-detected from project state - {done}/{total} completed
          </p>
        </div>
        <span className={`text-lg font-bold tabular-nums ${scoreColor}`}>{pct}%</span>
      </div>

      <ul className="divide-y divide-[#e5e1d8]/60">
        {checks.map((check) => {
          const { Icon, iconColor, labelColor } = STATUS_CONFIG[check.status];
          return (
            <li key={check.label} className="flex items-start gap-3 px-4 py-3">
              <Icon size={15} className={`mt-0.5 shrink-0 ${iconColor}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${labelColor}`}>{check.label}</p>
                <p className="text-[11px] text-[#9b9590] mt-0.5">{check.sublabel}</p>
              </div>
              <span className="shrink-0 text-[10px] text-[#c8c0b0] font-mono pt-0.5">
                {check.craRef}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
