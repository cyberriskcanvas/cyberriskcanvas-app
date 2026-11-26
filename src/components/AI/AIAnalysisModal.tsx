import { useState } from 'react';
import { X, Sparkles, Loader2, AlertCircle, Plus, CheckCircle2, Brain } from 'lucide-react';
import { analyzeThreats } from '@/actions/ai';
import type { ThreatScenario } from '@/types/ai';
import { useDiagramStore } from '@/store/diagramStore';
import type { NodeData, Threat, Risk } from '@/types';
import { cn } from '@/utils/cn';

function calcLevel(l: number, i: number): Risk['level'] {
  const s = l * i;
  if (s >= 20) return 'critical';
  if (s >= 12) return 'high';
  if (s >= 6) return 'medium';
  if (s >= 2) return 'low';
  return 'negligible';
}

const STRIDE_COLORS: Record<string, string> = {
  S: 'bg-red-900/60 text-red-300', T: 'bg-orange-900/60 text-orange-300',
  R: 'bg-yellow-900/60 text-yellow-300', I: 'bg-blue-900/60 text-blue-300',
  D: 'bg-purple-900/60 text-purple-300', E: 'bg-pink-900/60 text-pink-300',
};

const LEVEL_COLORS: Record<string, string> = {
  critical: 'bg-red-900/70 text-red-300', high: 'bg-orange-900/70 text-orange-300',
  medium: 'bg-yellow-900/70 text-yellow-300', low: 'bg-green-900/70 text-green-300',
  negligible: 'bg-gray-800 text-gray-500',
};

interface Props { diagramName: string; onClose: () => void }

export function AIAnalysisModal({ diagramName, onClose }: Props) {
  const { nodes, updateNodeData } = useDiagramStore();
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState<ThreatScenario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<number>>(new Set());

  const nonBoundaryNodes = nodes.filter((n) => n.type !== 'boundary');

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setScenarios([]);
    setApplied(new Set());

    try {
      const components = nonBoundaryNodes.map((n) => {
        const data = n.data as NodeData;
        return {
          label: String(data.label ?? n.id),
          type: n.type ?? 'hardware',
          componentType: data.componentType ? String(data.componentType) : undefined,
          assets: (data.assets as { name: string; category: string }[] | undefined) ?? [],
          existingThreats: (data.threats as Threat[] | undefined)?.map((t) => ({ name: t.name, stride: t.stride })) ?? [],
        };
      });

      const result = await analyzeThreats(diagramName, components) as ThreatScenario[];
      setScenarios(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      setError(
        msg.includes('503') || msg.includes('AI not configured')
          ? 'Set ANTHROPIC_API_KEY in backend/.env to enable AI features.'
          : `Analysis failed: ${msg}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const applyScenario = (scenario: ThreatScenario, idx: number) => {
    // Find the first matching component node
    for (const componentLabel of scenario.affectedComponents) {
      const node = nonBoundaryNodes.find(
        (n) => String((n.data as NodeData).label ?? '').toLowerCase() === componentLabel.toLowerCase(),
      ) ?? nonBoundaryNodes[0]; // fallback to first node

      if (!node) continue;
      const data = node.data as NodeData;

      const newThreat: Threat = {
        id: crypto.randomUUID(),
        name: scenario.name,
        stride: scenario.stride as Threat['stride'],
        cweId: scenario.cweIds?.[0],
        description: scenario.description,
      };

      const newRisk: Risk = {
        id: crypto.randomUUID(),
        threatId: newThreat.id,
        likelihood: scenario.likelihood,
        impact: scenario.impact,
        level: calcLevel(scenario.likelihood, scenario.impact),
        status: 'open',
      };

      updateNodeData(node.id, {
        threats: [...((data.threats ?? []) as Threat[]), newThreat],
        risks: [...((data.risks ?? []) as Risk[]), newRisk],
      });
    }

    setApplied((prev) => new Set(prev).add(idx));
  };

  const applyAll = () => {
    scenarios.forEach((s, i) => {
      if (!applied.has(i)) applyScenario(s, i);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-indigo-900/50 bg-gray-950 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Brain size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">AI Threat Analysis</h2>
              <p className="text-[11px] text-gray-500">Powered by Claude - {nonBoundaryNodes.length} components</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Start button */}
          {!loading && scenarios.length === 0 && !error && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-900/40 border border-indigo-800">
                <Sparkles size={28} className="text-indigo-400" />
              </div>
              <div>
                <p className="font-medium text-white">Analyze your architecture for threats</p>
                <p className="mt-1 text-sm text-gray-500 max-w-sm">
                  Claude will analyze all {nonBoundaryNodes.length} components and suggest complex, cross-component attack scenarios not yet in your assessment.
                </p>
              </div>
              <button
                onClick={analyze}
                disabled={nonBoundaryNodes.length === 0}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
              >
                <Sparkles size={16} />
                Start Analysis
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 size={36} className="animate-spin text-indigo-400" />
              <p className="text-sm text-gray-400">Claude is analyzing your system architecture…</p>
              <p className="text-xs text-gray-600">Identifying cross-component attack paths and complex threat scenarios</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-800/50 bg-red-900/20 p-4">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-300">Analysis failed</p>
                <p className="mt-1 text-xs text-red-500">{error}</p>
              </div>
            </div>
          )}

          {/* Results */}
          {scenarios.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">
                  {scenarios.length} additional threat{scenarios.length !== 1 ? 's' : ''} identified
                </p>
                <button
                  onClick={applyAll}
                  disabled={applied.size === scenarios.length}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-600 disabled:opacity-40"
                >
                  <Plus size={12} /> Apply All
                </button>
              </div>

              <div className="space-y-3">
                {scenarios.map((s, idx) => {
                  const level = calcLevel(s.likelihood, s.impact);
                  const isApplied = applied.has(idx);
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'rounded-xl border p-4 transition-all',
                        isApplied ? 'border-green-800/50 bg-green-950/20' : 'border-gray-800 bg-gray-900',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', STRIDE_COLORS[s.stride] ?? 'bg-gray-700 text-gray-300')}>
                              {s.stride}
                            </span>
                            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', LEVEL_COLORS[level])}>
                              {level.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-gray-500">L={s.likelihood} × I={s.impact}</span>
                          </div>

                          <p className="text-sm font-semibold text-white">{s.name}</p>

                          <p className="mt-1 text-xs text-gray-400 leading-relaxed">{s.description}</p>

                          <div className="mt-2 flex items-center gap-3 flex-wrap text-[11px]">
                            <span className="text-gray-600">
                              Affects: <span className="text-gray-400">{s.affectedComponents.join(', ')}</span>
                            </span>
                            {s.cweIds?.length > 0 && (
                              <span className="text-gray-600">
                                CWEs: {s.cweIds.map((c) => (
                                  <span key={c} className="ml-1 rounded bg-gray-800 px-1 py-0.5 font-mono text-gray-400">{c}</span>
                                ))}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => applyScenario(s, idx)}
                          disabled={isApplied}
                          className={cn(
                            'shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                            isApplied
                              ? 'bg-green-900/40 text-green-400 cursor-default'
                              : 'bg-indigo-700 text-white hover:bg-indigo-600',
                          )}
                        >
                          {isApplied ? <><CheckCircle2 size={12} /> Applied</> : <><Plus size={12} /> Apply</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={analyze}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-800 py-2 text-xs text-gray-500 hover:bg-gray-900 hover:text-gray-300"
              >
                <Sparkles size={12} /> Run analysis again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
