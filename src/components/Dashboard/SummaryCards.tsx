import { AlertTriangle, Activity, Database, CheckSquare, Cpu, ShieldCheck, HelpCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { DiagramSummary } from '@/utils/aggregateDiagram';

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative ml-1 inline-flex cursor-help align-middle">
      <HelpCircle size={11} className="text-[#c8c0b0] group-hover:text-[#6b6460] transition-colors" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-lg border border-[#e5e1d8] bg-white px-2.5 py-2 text-[11px] leading-snug text-[#6b6460] opacity-0 transition-opacity group-hover:opacity-100 z-50 text-left shadow-lg">
        {text}
      </span>
    </span>
  );
}

interface CardProps { label: string; tooltip: string; value: number | string; sub?: string; icon: React.ElementType; color: string }

function Card({ label, tooltip, value, sub, icon: Icon, color }: CardProps) {
  return (
    <div className="rounded-xl border border-[#e5e1d8] bg-white p-4 flex items-center gap-4">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', color)}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#1a1917]">{value}</p>
        <p className="text-xs text-[#6b6460] flex items-center">
          {label}
          <InfoTooltip text={tooltip} />
        </p>
        {sub && <p className="text-[11px] text-[#c8c0b0] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function SummaryCards({ summary }: { summary: DiagramSummary }) {
  const openMeasures = summary.measureCounts['open'] ?? 0;
  const critHigh = (summary.riskCounts['critical'] ?? 0) + (summary.riskCounts['high'] ?? 0);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <Card label="Components" tooltip="All hardware and software elements you have added to your system." value={summary.components.length} icon={Cpu} color="bg-blue-600" />
      <Card label="Assets" tooltip="What you want to protect: e.g. data, control functions, or availability." value={summary.assets.length} icon={Database} color="bg-indigo-600" />
      <Card label="Threats" tooltip="Potential attacks or failures that could compromise your system (e.g. eavesdropping, tampering)." value={summary.threats.length} icon={AlertTriangle} color="bg-orange-600" />
      <Card label="Risks" tooltip="Assessed combinations of threat and potential impact - shows how serious a vulnerability is." value={summary.risks.length} sub={critHigh > 0 ? `${critHigh} critical/high` : undefined} icon={Activity} color={critHigh > 0 ? 'bg-red-600' : 'bg-yellow-600'} />
      <Card label="Measures" tooltip="Security measures that reduce or eliminate identified risks." value={summary.measures.length} sub={openMeasures > 0 ? `${openMeasures} open` : 'all captured'} icon={CheckSquare} color="bg-green-600" />
      <Card
        label="Standard Coverage"
        tooltip="How many IEC 62443 requirements you have marked as fulfilled for your system."
        value={summary.globalScore !== null ? `${summary.globalScore}%` : '-'}
        sub={summary.compliance.length > 0 ? `across ${summary.compliance.length} components` : 'No SL set'}
        icon={ShieldCheck}
        color={summary.globalScore === null ? 'bg-gray-400' : summary.globalScore >= 80 ? 'bg-green-600' : summary.globalScore >= 50 ? 'bg-yellow-600' : 'bg-red-600'}
      />
    </div>
  );
}
