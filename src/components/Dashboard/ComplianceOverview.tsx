import { cn } from '@/utils/cn';
import type { ComponentCompliance } from '@/utils/aggregateDiagram';

interface Props { compliance: ComponentCompliance[] }

export function ComplianceOverview({ compliance }: Props) {
  if (compliance.length === 0) {
    return (
      <div className="rounded-xl border border-[#e5e1d8] bg-white p-5">
        <h3 className="mb-2 text-sm font-semibold text-[#1a1917]">IEC 62443 Compliance</h3>
        <p className="text-sm text-[#c8c0b0] text-center py-6">
          Assign a Security Level in the component detail panel to see compliance data.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#e5e1d8] bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#1a1917]">IEC 62443 Compliance per Component</h3>
      <div className="space-y-3">
        {compliance.map((c) => {
          const scoreColor = c.score >= 80 ? 'text-green-600' : c.score >= 50 ? 'text-yellow-600' : 'text-red-600';
          const barColor = c.score >= 80 ? 'bg-green-500' : c.score >= 50 ? 'bg-yellow-500' : 'bg-red-500';
          return (
            <div key={c.componentId}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold',
                    c.componentType === 'hardware' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700',
                  )}>
                    {c.componentType.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="truncate text-xs text-[#1a1917]">{c.componentLabel}</span>
                  <span className="shrink-0 rounded bg-[#f4f1ec] px-1.5 py-0.5 text-[9px] font-mono text-[#6b6460]">
                    SL-{c.sl} · {c.part}
                  </span>
                </div>
                <span className={cn('ml-2 shrink-0 text-xs font-bold', scoreColor)}>{c.score}%</span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#f4f1ec]">
                <div className={cn('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${c.score}%` }} />
              </div>
              <div className="mt-0.5 flex gap-3 text-[10px] text-[#c8c0b0]">
                <span className="text-green-600">{c.compliant} ✓</span>
                <span className="text-yellow-600">{c.partial} ~</span>
                <span className="text-red-600">{c.nonCompliant} ✗</span>
                <span className="ml-auto">{c.total} req.</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
