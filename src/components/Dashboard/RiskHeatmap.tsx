import { useState } from 'react';
import { cn } from '@/utils/cn';
import type { FlatRisk } from '@/utils/aggregateDiagram';
import type { RiskLevel } from '@/types';

function calcLevel(l: number, i: number): RiskLevel {
  const s = l * i;
  if (s >= 20) return 'critical';
  if (s >= 12) return 'high';
  if (s >= 6) return 'medium';
  if (s >= 2) return 'low';
  return 'negligible';
}

const CELL_BG: Record<RiskLevel, string> = {
  critical: 'bg-red-100 hover:bg-red-200',
  high: 'bg-orange-100 hover:bg-orange-200',
  medium: 'bg-yellow-100 hover:bg-yellow-200',
  low: 'bg-green-100 hover:bg-green-200',
  negligible: 'bg-gray-100 hover:bg-gray-200',
};

const RISK_DOT: Record<RiskLevel, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
  negligible: 'bg-gray-400',
};

const LEVEL_LABEL: Record<RiskLevel, string> = {
  critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW', negligible: 'NEGLIGIBLE',
};

interface Props { risks: FlatRisk[] }

export function RiskHeatmap({ risks }: Props) {
  const [selected, setSelected] = useState<{ l: number; i: number } | null>(null);

  const getRisksAt = (l: number, impact: number) =>
    risks.filter((r) => r.likelihood === l && r.impact === impact);

  const selectedRisks = selected ? getRisksAt(selected.l, selected.i) : [];
  const selectedLevel = selected ? calcLevel(selected.l, selected.i) : null;

  return (
    <div className="rounded-xl border border-[#e5e1d8] bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#1a1917]">Risk Heatmap</h3>

      <div className="flex gap-6 flex-wrap">
        {/* Matrix */}
        <div>
          {/* Y-axis label */}
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 text-[10px] text-[#6b6460] text-right">↑ Impact</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((l) => (
                <div key={l} className="w-14 text-center text-[10px] text-[#c8c0b0]">{l}</div>
              ))}
            </div>
          </div>

          {/* Rows: impact 5→1 */}
          {[5, 4, 3, 2, 1].map((impact) => (
            <div key={impact} className="flex items-center gap-3 mb-1">
              <div className="w-8 text-right text-[10px] font-bold text-[#6b6460]">{impact}</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((likelihood) => {
                  const level = calcLevel(likelihood, impact);
                  const cellRisks = getRisksAt(likelihood, impact);
                  const isSelected = selected?.l === likelihood && selected?.i === impact;

                  return (
                    <button
                      key={likelihood}
                      onClick={() => setSelected(isSelected ? null : { l: likelihood, i: impact })}
                      className={cn(
                        'relative flex h-14 w-14 flex-col items-center justify-center rounded-lg transition-all duration-150',
                        CELL_BG[level],
                        isSelected && 'ring-2 ring-[#1e293b] ring-offset-1 ring-offset-white',
                      )}
                    >
                      {cellRisks.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-0.5 p-1">
                          {cellRisks.slice(0, 6).map((r) => (
                            <span
                              key={r.id}
                              title={r.componentLabel + (r.threatName ? ` - ${r.threatName}` : '')}
                              className={cn('h-2.5 w-2.5 rounded-full', RISK_DOT[r.level])}
                            />
                          ))}
                          {cellRisks.length > 6 && (
                            <span className="text-[9px] text-[#1a1917] font-bold">+{cellRisks.length - 6}</span>
                          )}
                        </div>
                      )}
                      {cellRisks.length === 0 && (
                        <span className="text-[9px] text-[#c8c0b0] font-mono">{likelihood * impact}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* X-axis label */}
          <div className="flex items-center gap-3 mt-1">
            <div className="w-8" />
            <div className="w-[304px] text-center text-[10px] text-[#6b6460]">Likelihood →</div>
          </div>
        </div>

        {/* Legend + selected cell detail */}
        <div className="flex flex-col gap-4 min-w-[180px]">
          {/* Legend */}
          <div>
            <p className="text-xs font-medium text-[#6b6460] mb-2">Risk Level</p>
            {(['critical', 'high', 'medium', 'low', 'negligible'] as RiskLevel[]).map((level) => (
              <div key={level} className="flex items-center gap-2 mb-1">
                <span className={cn('h-3 w-3 rounded', RISK_DOT[level])} />
                <span className="text-xs text-[#6b6460]">{LEVEL_LABEL[level]}</span>
                <span className="ml-auto text-xs font-bold text-[#1a1917]">
                  {risks.filter((r) => r.level === level).length}
                </span>
              </div>
            ))}
          </div>

          {/* Selected cell risks */}
          {selected && (
            <div className="rounded-lg border border-[#e5e1d8] bg-[#f4f1ec] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#6b6460] mb-2">
                L={selected.l} × I={selected.i} - {selectedLevel && LEVEL_LABEL[selectedLevel]}
              </p>
              {selectedRisks.length === 0 ? (
                <p className="text-xs text-[#c8c0b0]">No risks here</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedRisks.map((r) => (
                    <div key={r.id} className="rounded border border-[#e5e1d8] bg-white px-2 py-1">
                      <p className="text-xs font-medium text-[#1a1917] line-clamp-1">{r.componentLabel}</p>
                      {r.threatName && <p className="text-[10px] text-[#6b6460] line-clamp-1">{r.threatName}</p>}
                      <span className={cn(
                        'inline-block rounded px-1 py-0.5 text-[9px] font-bold mt-0.5',
                        r.status === 'mitigated' ? 'bg-green-100 text-green-700' :
                        r.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      )}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
