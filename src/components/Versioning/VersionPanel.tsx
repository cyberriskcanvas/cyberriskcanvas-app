import { useEffect, useState } from 'react';
import { X, History, RotateCcw, Clock, User, MessageSquare, Plus, Loader2 } from 'lucide-react';
import { listVersions, createVersion, getVersion, restoreVersion } from '@/actions/versions';
import { isTierBlock } from '@/lib/tierBlock';
import { usePaywallStore } from '@/store/paywallStore';
import { useDiagramStore } from '@/store/diagramStore';
import type { DiagramNode, DiagramEdge } from '@/types';
import { cn } from '@/utils/cn';
import { relativeTime } from '@/utils/format';

interface DiagramVersionMeta {
  id: string;
  message: string | null;
  createdAt: Date;
  user: { id: string; name: string; color: string } | null;
}

interface Props {
  diagramId: string;
  onClose: () => void;
  userName?: string;
}

export function VersionPanel({ diagramId, onClose, userName }: Props) {
  const { nodes, edges, viewport, setNodes, setEdges, setViewport } = useDiagramStore();

  const [versions, setVersions] = useState<DiagramVersionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => {
    listVersions(diagramId)
      .then(setVersions)
      .finally(() => setLoading(false));
  }, [diagramId]);

  const saveVersion = async () => {
    setSaving(true);
    try {
      const result = await createVersion(diagramId, nodes, edges, viewport, message.trim() || undefined);
      if (isTierBlock(result)) {
        setShowSaveForm(false);
        usePaywallStore.getState().showPaywall(result.requiredTier);
        return;
      }
      const v = result as DiagramVersionMeta;
      setVersions((prev) => [v, ...prev]);
      setMessage('');
      setShowSaveForm(false);
    } finally {
      setSaving(false);
    }
  };

  const restore = async (version: DiagramVersionMeta) => {
    if (!window.confirm(`Restore to version from ${new Date(version.createdAt).toLocaleString()}?\n\nThe current state will be auto-saved first.`)) return;
    setRestoring(version.id);
    try {
      const full = await getVersion(diagramId, version.id);
      if (!full) return;
      await restoreVersion(diagramId, version.id);
      setNodes((full.nodes as unknown as DiagramNode[]) ?? []);
      setEdges((full.edges as unknown as DiagramEdge[]) ?? []);
      if (full.viewport) setViewport(full.viewport as { x: number; y: number; zoom: number });
      const updated = await listVersions(diagramId);
      setVersions(updated as DiagramVersionMeta[]);
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l border-gray-800 bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <History size={15} className="text-indigo-400" />
          <span className="text-sm font-semibold text-white">Version History</span>
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-white">
          <X size={15} />
        </button>
      </div>

      {/* Save button */}
      <div className="border-b border-gray-800 p-3 space-y-2">
        {showSaveForm ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveVersion(); if (e.key === 'Escape') setShowSaveForm(false); }}
              placeholder="Save message (optional)"
              className="w-full rounded border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={saveVersion}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-1.5 rounded bg-indigo-600 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : null}
                Save Version
              </button>
              <button onClick={() => setShowSaveForm(false)} className="rounded border border-gray-700 px-3 text-xs text-gray-400 hover:bg-gray-800">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowSaveForm(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-700 py-2 text-xs font-medium text-gray-500 hover:border-indigo-700 hover:text-indigo-400 transition-colors"
          >
            <Plus size={13} /> Save current version
          </button>
        )}
      </div>

      {/* Version list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-gray-600" />
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-gray-600">
            <History size={28} />
            <p className="text-sm">No versions saved yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {versions.map((v, idx) => (
              <div
                key={v.id}
                className={cn('group px-4 py-3 hover:bg-gray-900/60 transition-colors', idx === 0 && 'border-l-2 border-indigo-500')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* User badge */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                        style={{ backgroundColor: v.user?.color ?? '#6366f1' }}
                      >
                        {(v.user?.name ?? 'A').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-400 truncate">{v.user?.name ?? 'Anonymous'}</span>
                      {idx === 0 && (
                        <span className="rounded bg-indigo-900/60 px-1.5 py-0.5 text-[9px] font-bold text-indigo-400">
                          latest
                        </span>
                      )}
                    </div>

                    {/* Message */}
                    {v.message ? (
                      <p className="flex items-start gap-1 text-xs text-gray-300 line-clamp-2">
                        <MessageSquare size={11} className="mt-0.5 shrink-0 text-gray-600" />
                        {v.message}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600 italic">No message</p>
                    )}

                    {/* Time */}
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-600">
                      <Clock size={10} />
                      {relativeTime(v.createdAt)} · {new Date(v.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Restore button */}
                  {idx > 0 && (
                    <button
                      onClick={() => restore(v)}
                      disabled={restoring === v.id}
                      title="Restore this version"
                      className="shrink-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 rounded-lg border border-gray-700 px-2 py-1 text-[11px] text-gray-400 hover:border-indigo-600 hover:text-indigo-400 disabled:opacity-40 transition-all"
                    >
                      {restoring === v.id ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 px-4 py-2 flex items-center gap-1.5 text-[11px] text-gray-600">
        <User size={11} />
        Logged in as <span className="text-gray-400">{userName ?? "Anonymous"}</span>
      </div>
    </div>
  );
}
