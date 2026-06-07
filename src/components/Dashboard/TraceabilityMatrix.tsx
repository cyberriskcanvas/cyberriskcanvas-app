'use client';

import { Link, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { TraceabilityRow } from '@/utils/aggregateDiagram';
import { useT } from '@/hooks/useT';

const RISK_LEVEL_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
  negligible: 'bg-gray-100 text-gray-500',
  '-': 'bg-gray-100 text-gray-400',
};

export function TraceabilityMatrix({ rows }: { rows: TraceabilityRow[] }) {
  const t = useT();
  const tm = t.traceability;

  const complete = rows.filter((r) => r.complete).length;
  const total = rows.length;
  const pct = total > 0 ? Math.round((complete / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-[#e5e1d8] bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-[#1e293b]" />
          <h3 className="text-sm font-semibold text-[#1a1917]">{tm.title}</h3>
        </div>
        {total > 0 && (
          <span className={cn('text-xs font-bold', pct === 100 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600')}>
            {pct}% {tm.complete.toLowerCase()}
          </span>
        )}
      </div>

      {total === 0 ? (
        <p className="text-sm text-[#c8c0b0] text-center py-4">{tm.noData}</p>
      ) : (
        <>
          {/* Progress bar */}
          <div className="mb-5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f4f1ec] flex">
              <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[#c8c0b0]">
              <span className="text-green-600">{complete} {tm.complete.toLowerCase()}</span>
              <span className="text-red-600">{total - complete} {tm.incomplete.toLowerCase()}</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e5e1d8]">
                  <th className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#6b6460] whitespace-nowrap">{tm.component}</th>
                  <th className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#6b6460] whitespace-nowrap">{tm.threat}</th>
                  <th className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#6b6460] whitespace-nowrap">{tm.riskLevel}</th>
                  <th className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#6b6460] whitespace-nowrap">{tm.measure}</th>
                  <th className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#6b6460] whitespace-nowrap">{tm.resolution}</th>
                  <th className="text-center py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#6b6460] whitespace-nowrap">{tm.status}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.measureId}
                    className={cn(
                      'border-b border-[#e5e1d8]/60 transition-colors hover:bg-[#f4f1ec]/50',
                      row.complete ? 'bg-green-50/40' : 'bg-red-50/20',
                    )}
                  >
                    {/* Component */}
                    <td className="py-2.5 px-2 text-[#1a1917] font-medium whitespace-nowrap max-w-[120px] truncate">
                      {row.componentLabel}
                    </td>

                    {/* Threat */}
                    <td className="py-2.5 px-2 text-[#6b6460] max-w-[140px]">
                      <span className="line-clamp-2">{row.threatName}</span>
                    </td>

                    {/* Risk level */}
                    <td className="py-2.5 px-2">
                      {row.riskLevel !== '-' ? (
                        <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold uppercase', RISK_LEVEL_COLORS[row.riskLevel] ?? RISK_LEVEL_COLORS['-'])}>
                          {row.riskLevel}
                        </span>
                      ) : (
                        <span className="text-[#c8c0b0]">-</span>
                      )}
                    </td>

                    {/* Measure title */}
                    <td className="py-2.5 px-2 max-w-[160px]">
                      <span className="text-[#1a1917] line-clamp-2">{row.measureTitle}</span>
                      {!row.riskAccepted && row.evidenceLink && (
                        <a
                          href={row.evidenceLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-0.5 text-[#1e293b] hover:underline mt-0.5 text-[10px]"
                        >
                          <Link size={9} />{tm.evidenceLink}
                        </a>
                      )}
                    </td>

                    {/* Resolution type */}
                    <td className="py-2.5 px-2">
                      {row.riskAccepted ? (
                        <div>
                          <span className="flex items-center gap-1 rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold text-orange-700 w-fit">
                            <AlertTriangle size={8} />{tm.resolutionAccepted}
                          </span>
                          {row.acceptedBy && (
                            <p className="mt-0.5 text-[9px] text-[#6b6460]">{tm.acceptedBy}: {row.acceptedBy}</p>
                          )}
                          {row.acceptanceReason && (
                            <p className="mt-0.5 text-[9px] text-[#c8c0b0] italic line-clamp-1">{row.acceptanceReason}</p>
                          )}
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 w-fit">
                          <ShieldCheck size={8} />{tm.resolutionMeasure}
                        </span>
                      )}
                    </td>

                    {/* Ampel status */}
                    <td className="py-2.5 px-2 text-center">
                      {row.complete ? (
                        <CheckCircle2 size={16} className="mx-auto text-green-600" />
                      ) : (
                        <XCircle size={16} className="mx-auto text-red-500" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
