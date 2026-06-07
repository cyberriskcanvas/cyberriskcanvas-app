'use client';

import { useMemo, useState } from 'react';
import { X, ChevronRight, AlertTriangle, Zap, ShieldAlert, ArrowRight } from 'lucide-react';
import { useDiagramStore } from '@/store/diagramStore';
import { computeAttackPaths, type AttackPath } from '@/utils/attackPaths';
import { cn } from '@/utils/cn';
import { useT } from '@/hooks/useT';

interface Props {
  onClose: () => void;
  onHighlight: (path: AttackPath | null) => void;
  highlightedPathId: string | null;
}

const RISK_COLORS: Record<AttackPath['riskLevel'], string> = {
  critical: 'text-red-400 bg-red-950/60 border-red-800',
  high: 'text-orange-400 bg-orange-950/60 border-orange-800',
  medium: 'text-yellow-400 bg-yellow-950/60 border-yellow-800',
  low: 'text-green-400 bg-green-950/60 border-green-800',
};

const RISK_BADGE: Record<AttackPath['riskLevel'], string> = {
  critical: 'bg-red-900/80 text-red-300 border border-red-700',
  high: 'bg-orange-900/80 text-orange-300 border border-orange-700',
  medium: 'bg-yellow-900/80 text-yellow-300 border border-yellow-700',
  low: 'bg-green-900/80 text-green-300 border border-green-700',
};

const RISK_ICON: Record<AttackPath['riskLevel'], React.ReactNode> = {
  critical: <ShieldAlert size={13} />,
  high: <AlertTriangle size={13} />,
  medium: <Zap size={13} />,
  low: <ChevronRight size={13} />,
};

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-red-500' : score >= 50 ? 'bg-orange-500' : score >= 30 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="h-1 w-full rounded-full bg-gray-700 overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${score}%` }} />
    </div>
  );
}

export function AttackPathPanel({ onClose, onHighlight, highlightedPathId }: Props) {
  const { nodes, edges } = useDiagramStore();
  const [activeTab, setActiveTab] = useState<'paths' | 'info'>('paths');
  const t = useT();
  const ap = t.attackPaths;

  const paths = useMemo(() => computeAttackPaths(nodes, edges), [nodes, edges]);

  const criticalCount = paths.filter((p) => p.riskLevel === 'critical').length;
  const highCount = paths.filter((p) => p.riskLevel === 'high').length;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-gray-800 bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-red-400" />
          <span className="text-sm font-semibold text-white">{ap.title}</span>
          {paths.length > 0 && (
            <span className="rounded-full bg-gray-700 px-2 py-0.5 text-[11px] text-gray-300">
              {paths.length}
            </span>
          )}
        </div>
        <button
          onClick={() => { onHighlight(null); onClose(); }}
          className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-800 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      {/* Summary bar */}
      {paths.length > 0 && (
        <div className="flex gap-3 border-b border-gray-800 px-4 py-2.5 text-xs">
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <ShieldAlert size={12} /> {criticalCount} {ap.critical}
            </span>
          )}
          {highCount > 0 && (
            <span className="flex items-center gap-1 text-orange-400">
              <AlertTriangle size={12} /> {highCount} {ap.high}
            </span>
          )}
          <span className="ml-auto text-gray-500">{ap.topPaths(paths.length)}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {(['paths', 'info'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-2 text-xs font-medium transition-colors',
              activeTab === tab
                ? 'border-b-2 border-brand-500 text-white'
                : 'text-gray-500 hover:text-gray-300',
            )}
          >
            {tab === 'paths' ? ap.tabPaths : ap.tabMethodology}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'paths' && (
          <div className="space-y-2 p-3">
            {paths.length === 0 && (
              <div className="mt-8 flex flex-col items-center gap-3 text-center text-gray-500">
                <ShieldAlert size={32} className="opacity-30" />
                <p className="text-sm whitespace-pre-line">{ap.noPaths}</p>
              </div>
            )}

            {paths.map((path, idx) => {
              const isActive = highlightedPathId === path.id;
              return (
                <button
                  key={path.id}
                  onClick={() => onHighlight(isActive ? null : path)}
                  className={cn(
                    'w-full rounded-lg border p-3 text-left transition-all',
                    isActive
                      ? RISK_COLORS[path.riskLevel]
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-750',
                  )}
                >
                  {/* Top row */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold text-gray-500">#{idx + 1}</span>
                    <span
                      className={cn(
                        'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                        RISK_BADGE[path.riskLevel],
                      )}
                    >
                      {RISK_ICON[path.riskLevel]}
                      {path.riskLevel}
                    </span>
                    <span className="ml-auto text-[11px] font-mono text-gray-400">
                      {Math.round(path.score)}%
                    </span>
                  </div>

                  {/* Score bar */}
                  <ScoreBar score={path.score} />

                  {/* Path chain */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1">
                    {path.hops.map((hop, hi) => (
                      <span key={hop.nodeId} className="flex items-center gap-1">
                        <span
                          className={cn(
                            'max-w-[80px] truncate rounded px-1.5 py-0.5 text-[10px]',
                            hi === 0
                              ? 'bg-blue-900/60 text-blue-300'
                              : hi === path.hops.length - 1
                              ? 'bg-red-900/60 text-red-300'
                              : 'bg-gray-700 text-gray-300',
                          )}
                          title={hop.nodeLabel}
                        >
                          {hop.nodeLabel}
                        </span>
                        {hi < path.hops.length - 1 && (
                          <ArrowRight size={10} className="shrink-0 text-gray-600" />
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="mt-2 flex gap-3 text-[10px] text-gray-500">
                    <span>{path.hops.length} {ap.hops}</span>
                    {path.hops.some((h) => h.cweIds.length > 0) && (
                      <span className="text-orange-500">
                        {path.hops.reduce((s, h) => s + h.cweIds.length, 0)} CWEs
                      </span>
                    )}
                    {path.hops.some((h) => h.risks.length > 0) && (
                      <span className="text-red-500">
                        {path.hops.reduce((s, h) => s + h.risks.length, 0)} {ap.risksLabel}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'info' && (
          <div className="space-y-4 p-4 text-xs text-gray-400 leading-relaxed">
            <section>
              <h3 className="mb-1.5 font-semibold text-gray-200 text-sm">{ap.algorithm}</h3>
              <p>{ap.algorithmDesc}</p>
            </section>
            <section>
              <h3 className="mb-1.5 font-semibold text-gray-200 text-sm">{ap.scoringFormula}</h3>
              <p>{ap.scoringDesc}</p>
              <div className="mt-2 rounded bg-gray-800 p-2 font-mono text-[10px] text-green-400">
                score = avg(L×I/25 + CWE×0.04) × 100
              </div>
            </section>
            <section>
              <h3 className="mb-1.5 font-semibold text-gray-200 text-sm">{ap.entryPoints}</h3>
              <p>{ap.entryPointsDesc}</p>
            </section>
            <section>
              <h3 className="mb-1.5 font-semibold text-gray-200 text-sm">{ap.criticalTargets}</h3>
              <p>{ap.criticalTargetsDesc}</p>
            </section>
          </div>
        )}
      </div>
    </aside>
  );
}
