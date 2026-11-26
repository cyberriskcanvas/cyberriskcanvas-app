'use client';

import { useEffect, useMemo, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { saveDiagram } from '@/actions/diagrams';
import { setIec62443 } from '@/actions/projects';
import { useT } from '@/hooks/useT';
import { useDiagramStore } from '@/store/diagramStore';
import { useLanguageStore } from '@/store/languageStore';
import { useProjectStore } from '@/store/projectStore';
import { parseCanvasJson } from '@/utils/canvasJsonImport';
import { mergeImportedDiagram } from '@/utils/mergeImportedDiagram';

interface Props {
  diagramId: string;
  /** content of the selected .crc.json file */
  text: string;
  onClose: () => void;
}

/** Preview and merge of a Digital Fabric export; saves first, so a rejected save (e.g. node limit) changes nothing. */
export function CanvasImportDialog({ diagramId, text, onClose }: Props) {
  const t = useT().canvasImport;
  const lang = useLanguageStore((s) => s.lang);
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const projectId = useProjectStore((s) => s.projectId);
  const iec62443 = useProjectStore((s) => s.iec62443);
  const setIecStore = useProjectStore((s) => s.setIec62443);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseCanvasJson(text), [text]);
  const preview = useMemo(() => (parsed.ok ? mergeImportedDiagram({ nodes, edges }, parsed).stats : null), [parsed, nodes, edges]);
  const turnsIecOn = parsed.ok && !iec62443 && parsed.nodes.some((n) => n.data.securityLevel);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  async function apply() {
    if (!parsed.ok) return;
    setBusy(true);
    setError(null);
    const { nodes: current, edges: currentEdges, viewport, setNodes, setEdges } = useDiagramStore.getState();
    const merged = mergeImportedDiagram({ nodes: current, edges: currentEdges }, parsed);
    try {
      await saveDiagram(diagramId, { nodes: merged.nodes, edges: merged.edges, viewport });
    } catch (e) {
      setError(t.saveFailed(e instanceof Error ? e.message : String(e)));
      setBusy(false);
      return;
    }
    setNodes(merged.nodes);
    setEdges(merged.edges);
    if (turnsIecOn && projectId) {
      setIecStore(true);
      await setIec62443(projectId, true).catch(() => setIecStore(false));
    }
    onClose();
  }

  const source = parsed.ok ? parsed.source : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="canvas-import-title" className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <h2 id="canvas-import-title" className="flex items-center gap-2 text-sm font-bold text-white">
            <Upload size={14} /> {t.title}
          </h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label={t.cancel} className="text-gray-500 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5 text-sm text-gray-300">
          {!parsed.ok ? (
            <p role="alert" className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-red-300">{t.invalid(parsed.error)}</p>
          ) : (
            <>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">{t.source}</p>
                {source ? (
                  <>
                    <p className="font-semibold text-white">{source.projectName}</p>
                    <p className="text-xs text-gray-400">
                      {source.release ? `${t.release}: ${source.release}` : t.unreleased}
                      {source.scope && ` · ${t.scope[source.scope]}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(source.exportedAt).toLocaleString(lang)}
                      {source.hash && <> · <span className="font-mono">{source.hash.slice(0, 12)}</span></>}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-400">{t.unknownSource}</p>
                )}
              </div>

              {preview && (
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">{t.elements}</p>
                  <ul className="space-y-0.5">
                    <li>{t.added(preview.added)}</li>
                    <li>{t.updated(preview.updated)}</li>
                    {preview.orphans > 0 && <li className="text-amber-400">{t.orphans(preview.orphans)}</li>}
                  </ul>
                </div>
              )}

              <p className="text-xs text-gray-400">{t.keeps}</p>
              {turnsIecOn && <p className="text-xs text-gray-400">{t.iecOn}</p>}
              {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-red-300">{error}</p>}
            </>
          )}
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 rounded-xl border border-gray-700 py-2.5 text-sm text-gray-400 hover:bg-gray-800">
            {t.cancel}
          </button>
          {parsed.ok && (
            <button type="button" onClick={() => void apply()} disabled={busy} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
              {busy ? t.applying : t.apply}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
