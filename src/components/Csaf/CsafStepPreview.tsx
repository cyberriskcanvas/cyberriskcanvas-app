'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2, AlertCircle, FileJson, CheckCircle2, History, ChevronDown, ChevronUp } from 'lucide-react';

interface AdvisoryMeta {
  id: string;
  createdAt: string;
}

interface Props {
  projectId: string;
}

export function CsafStepPreview({ projectId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [preview, setPreview] = useState<{ vex: object; csaf: object; projectName: string } | null>(null);
  const [tab, setTab] = useState<'csaf' | 'vex'>('csaf');

  const [history, setHistory] = useState<AdvisoryMeta[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    setHistoryLoading(true);
    fetch(`/api/projects/${projectId}/csaf/history`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: AdvisoryMeta[]) => setHistory(data))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [projectId, done]); // reload after a new export

  async function fetchAndPreview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/csaf`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Fehler beim Generieren.'); return; }
      setPreview(data);
    } catch {
      setError('Netzwerkfehler.');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/csaf`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Fehler beim Export.'); return; }

      const name = (data.projectName as string).replace(/[^a-z0-9]+/gi, '-');
      triggerDownload(JSON.stringify(data.vex, null, 2), `${name}-vex.json`);
      await new Promise((r) => setTimeout(r, 250));
      triggerDownload(JSON.stringify(data.csaf, null, 2), `${name}-csaf.json`);

      setPreview(data);
      setDone(true);
    } catch {
      setError('Netzwerkfehler.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadHistoric(advisoryId: string, filename: string) {
    setDownloadingId(advisoryId);
    try {
      const res = await fetch(`/api/projects/${projectId}/csaf/history/${advisoryId}`);
      if (!res.ok) return;
      const data = await res.json();
      triggerDownload(JSON.stringify(data.content, null, 2), `${filename}-csaf.json`);
    } catch {
      /* ignore */
    } finally {
      setDownloadingId(null);
    }
  }

  function triggerDownload(content: string, filename: string) {
    const blob = new Blob([content], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-[#1a1714]">Vorschau &amp; Export</h3>
        <p className="text-xs text-[#9b9590] mt-0.5">
          Generiere das finale CSAF 2.0 Advisory und den CycloneDX VEX-Report zum Download.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {done && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Export erfolgreich - beide Dateien wurden heruntergeladen.
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={fetchAndPreview}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-4 py-2 text-sm font-medium text-[#3d3a36] hover:bg-[#f4f1ec] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
          Vorschau laden
        </button>
        <button
          onClick={handleExport}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-[#1a1714] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3d3a36] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          VEX + CSAF herunterladen
        </button>
      </div>

      {/* ── JSON preview ── */}
      {preview && (
        <div className="rounded-lg border border-[#e5e1d8] overflow-hidden">
          <div className="flex border-b border-[#e5e1d8] bg-[#faf9f7]">
            {(['csaf', 'vex'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  'px-4 py-2 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors',
                  tab === t ? 'border-[#1a1714] text-[#1a1714]' : 'border-transparent text-[#9b9590] hover:text-[#3d3a36]',
                ].join(' ')}
              >
                {t === 'csaf' ? 'CSAF 2.0' : 'CycloneDX VEX'}
              </button>
            ))}
          </div>
          <pre className="max-h-96 overflow-auto p-4 text-xs bg-[#0f0e0c] text-green-300 leading-relaxed">
            {JSON.stringify(tab === 'csaf' ? preview.csaf : preview.vex, null, 2)}
          </pre>
        </div>
      )}

      {/* ── Export-Verlauf ── */}
      <div className="rounded-lg border border-[#e5e1d8] overflow-hidden">
        <button
          onClick={() => setHistoryOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#faf9f7] transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-[#3d3a36]">
            <History className="h-4 w-4 text-[#9b9590]" />
            Export-Verlauf
            {!historyLoading && history.length > 0 && (
              <span className="rounded-full bg-[#e8e4de] px-2 py-0.5 text-xs font-semibold text-[#6b6460]">
                {history.length}
              </span>
            )}
          </span>
          {historyOpen ? <ChevronUp className="h-4 w-4 text-[#9b9590]" /> : <ChevronDown className="h-4 w-4 text-[#9b9590]" />}
        </button>

        {historyOpen && (
          <div className="border-t border-[#e5e1d8]">
            {historyLoading ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-[#9b9590]">
                <Loader2 className="h-4 w-4 animate-spin" /> Lade…
              </div>
            ) : history.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[#9b9590]">
                Noch kein Advisory exportiert.
              </p>
            ) : (
              <ul className="divide-y divide-[#f4f1ec]">
                {history.map((a) => {
                  const date = new Date(a.createdAt);
                  const label = date.toLocaleString('de-DE', {
                    dateStyle: 'medium', timeStyle: 'short',
                  });
                  const filenameSlug = date.toISOString().slice(0, 16).replace(/[T:]/g, '-');
                  return (
                    <li key={a.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-[#faf9f7]">
                      <span className="text-sm text-[#3d3a36]">{label}</span>
                      <button
                        onClick={() => handleDownloadHistoric(a.id, filenameSlug)}
                        disabled={downloadingId === a.id}
                        className="flex items-center gap-1.5 rounded border border-[#d4cfc8] px-2.5 py-1 text-xs text-[#6b6460] hover:bg-[#f4f1ec] disabled:opacity-50"
                      >
                        {downloadingId === a.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Download className="h-3 w-3" />}
                        CSAF
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
