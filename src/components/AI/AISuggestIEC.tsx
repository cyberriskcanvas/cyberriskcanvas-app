import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { suggestIec62443 } from '@/actions/ai';
import type { IECSuggestion } from '@/types/ai';
import type { NodeData } from '@/types';
import { cn } from '@/utils/cn';

const PRIORITY_COLORS = {
  critical: 'bg-red-900/60 text-red-300',
  high: 'bg-orange-900/60 text-orange-300',
  medium: 'bg-yellow-900/60 text-yellow-300',
};

interface Props { nodeType: string; data: NodeData }

export function AISuggestIEC({ nodeType, data }: Props) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<IECSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      const result = await suggestIec62443(nodeType, data) as IECSuggestion[];
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

  return (
    <div className="rounded-lg border border-indigo-900/50 bg-indigo-950/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-300">AI: Top IEC 62443 Priorities</span>
        </div>
        <button
          onClick={fetch}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          {loading ? 'Analyzing…' : 'Suggest'}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded bg-red-900/30 px-2.5 py-2 text-xs text-red-400">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-2 space-y-2">
          {suggestions.map((s, i) => (
            <div key={i} className="rounded border border-gray-800 bg-gray-900 p-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-[10px] text-gray-300">{s.requirementId}</span>
                <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold uppercase', PRIORITY_COLORS[s.priority] ?? PRIORITY_COLORS.medium)}>
                  {s.priority}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-gray-400 line-clamp-3">{s.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
