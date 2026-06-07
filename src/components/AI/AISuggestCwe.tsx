import { useState } from 'react';
import { Sparkles, Loader2, Plus, AlertCircle } from 'lucide-react';
import { suggestCwe } from '@/actions/ai';
import type { CweSuggestion } from '@/types/ai';
import { useDiagramStore } from '@/store/diagramStore';
import type { NodeData, Threat } from '@/types';
import { cn } from '@/utils/cn';
import { useTierGuard } from '@/hooks/useTierGuard';
import { PaywallModal } from '@/components/Paywall/PaywallModal';

const STRIDE_COLORS: Record<Threat['stride'], string> = {
  S: 'bg-red-900/60 text-red-300', T: 'bg-orange-900/60 text-orange-300',
  R: 'bg-yellow-900/60 text-yellow-300', I: 'bg-blue-900/60 text-blue-300',
  D: 'bg-purple-900/60 text-purple-300', E: 'bg-pink-900/60 text-pink-300',
};

interface Props { nodeId: string; nodeType: string; data: NodeData }

export function AISuggestCwe({ nodeId, nodeType, data }: Props) {
  const { updateNodeData } = useDiagramStore();
  const guard = useTierGuard('ai.suggest');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<CweSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const fetch = async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      const result = await suggestCwe(nodeType, data) as CweSuggestion[];
      setSuggestions(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      setError(msg.includes('503') || msg.includes('AI not configured')
        ? 'Set ANTHROPIC_API_KEY in backend/.env to enable AI features.'
        : msg);
    } finally {
      setLoading(false);
    }
  };

  const addAsThreat = (s: CweSuggestion) => {
    const existing = (data.threats ?? []) as Threat[];
    const newThreat: Threat = {
      id: crypto.randomUUID(),
      name: s.name,
      stride: s.stride as Threat['stride'],
      cweId: s.id,
      description: s.relevance,
    };
    updateNodeData(nodeId, { threats: [...existing, newThreat] });
    setAdded((prev) => new Set(prev).add(s.id));
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-300">AI: CWE Suggestions</span>
        </div>
        <button
          onClick={() => guard.allowed ? fetch() : guard.showPaywall()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          {loading ? 'Analyzing…' : 'Suggest CWEs'}
        </button>
        {guard.paywallVisible && (
          <PaywallModal currentTier={guard.tier} requiredTier={guard.requiredTier} onClose={guard.hidePaywall} />
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded bg-red-900/30 px-2.5 py-2 text-xs text-red-400">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-2 space-y-2">
          {suggestions.map((s) => (
            <div key={s.id} className="rounded border border-gray-800 bg-gray-900 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="rounded bg-gray-700 px-1.5 py-0.5 font-mono text-[10px] text-gray-300">{s.id}</span>
                    {s.stride && (
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', STRIDE_COLORS[s.stride as Threat['stride']] ?? 'bg-gray-700 text-gray-300')}>
                        {s.stride}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-medium text-white line-clamp-1">{s.name}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500 line-clamp-2">{s.relevance}</p>
                </div>
                <button
                  onClick={() => addAsThreat(s)}
                  disabled={added.has(s.id)}
                  title="Add as threat"
                  className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-900/60 text-indigo-400 hover:bg-indigo-700 disabled:opacity-40"
                >
                  {added.has(s.id) ? '✓' : <Plus size={12} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
