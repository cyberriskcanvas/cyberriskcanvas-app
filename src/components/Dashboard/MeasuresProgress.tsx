import { cn } from '@/utils/cn';
import type { FlatMeasure } from '@/utils/aggregateDiagram';
import type { Measure } from '@/types';
import { Calendar, User } from 'lucide-react';

const STATUS_STYLE: Record<Measure['status'], { dot: string; badge: string; label: string }> = {
  open: { dot: 'bg-red-500', badge: 'bg-red-100 text-red-700', label: 'Open' },
  'in-progress': { dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700', label: 'In Progress' },
  mitigated: { dot: 'bg-green-500', badge: 'bg-green-100 text-green-700', label: 'Mitigated' },
  'risk-accepted': { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', label: 'Risk Accepted' },
};

export function MeasuresProgress({ measures }: { measures: FlatMeasure[] }) {
  const total = measures.length;
  const mitigated = measures.filter((m) => m.status === 'mitigated').length;
  const riskAccepted = measures.filter((m) => m.status === 'risk-accepted').length;
  const inProgress = measures.filter((m) => m.status === 'in-progress').length;
  const open = measures.filter((m) => m.status === 'open').length;
  const resolved = mitigated + riskAccepted;
  const progress = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-[#e5e1d8] bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#1a1917]">Measures Tracker</h3>
        {total > 0 && (
          <span className="text-xs font-bold text-green-600">{progress}% resolved</span>
        )}
      </div>

      {total === 0 ? (
        <p className="text-sm text-[#c8c0b0] text-center py-4">No measures defined yet</p>
      ) : (
        <>
          {/* Progress bar */}
          <div className="mb-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#f4f1ec] flex">
              <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(mitigated / total) * 100}%` }} />
              <div className="h-full bg-orange-400 transition-all duration-500" style={{ width: `${(riskAccepted / total) * 100}%` }} />
              <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${(inProgress / total) * 100}%` }} />
              <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${(open / total) * 100}%` }} />
            </div>
            <div className="mt-1 flex gap-3 text-[10px] text-[#c8c0b0] flex-wrap">
              <span className="text-green-600">{mitigated} mitigated</span>
              <span className="text-orange-500">{riskAccepted} risk accepted</span>
              <span className="text-yellow-600">{inProgress} in progress</span>
              <span className="text-red-600">{open} open</span>
            </div>
          </div>

          {/* Measures list - show top open/in-progress */}
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {[...measures]
              .sort((a, b) => {
                const order: Record<Measure['status'], number> = { open: 0, 'in-progress': 1, mitigated: 2, 'risk-accepted': 3 };
                return order[a.status] - order[b.status];
              })
              .map((m) => {
                const style = STATUS_STYLE[m.status];
                return (
                  <div key={m.id} className="flex items-start gap-2 rounded-lg border border-[#e5e1d8] bg-[#faf9f7] p-2.5">
                    <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', style.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-[#1a1917] line-clamp-1">{m.title}</span>
                        <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold', style.badge)}>
                          {style.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#6b6460] mt-0.5">
                        {m.componentLabel}
                        {m.owner && <span className="ml-2 inline-flex items-center gap-0.5"><User size={9} />{m.owner}</span>}
                        {m.dueDate && <span className="ml-2 inline-flex items-center gap-0.5"><Calendar size={9} />{m.dueDate}</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}
