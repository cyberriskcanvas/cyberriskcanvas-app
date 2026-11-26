'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Vulnerability, VulnStatus, VulnUpdate } from './types';
import { useOperationsT } from '@/i18n/operations';
import { RemediationFields, type RemediationValue } from './RemediationFields';

const STATUS_COLORS: Record<VulnStatus, string> = {
  open:         'bg-red-100 text-red-700',
  in_triage:    'bg-yellow-100 text-yellow-700',
  affected:     'bg-orange-100 text-orange-700',
  not_affected: 'bg-green-100 text-green-700',
  fixed:        'bg-blue-100 text-blue-700',
};

interface HistoryEvent { at: string; actorName: string; change: Record<string, [unknown, unknown]>; comment: string | null }

interface Props {
  projectId: string;
  vuln: Vulnerability;
  onClose: () => void;
  onSaved: (updated: VulnUpdate) => void;
}

export function MitigationModal({ projectId, vuln, onClose, onSaved }: Props) {
  const { t } = useOperationsT();
  const [status, setStatus] = useState<VulnStatus>(vuln.status as VulnStatus);
  const [justification, setJustification] = useState(vuln.justification ?? '');
  const [remediation, setRemediation] = useState<RemediationValue>({ category: vuln.remediationCategory ?? '', details: vuln.remediationDetails ?? '', url: vuln.remediationUrl ?? '' });
  const [comment, setComment] = useState('');
  const [suppressed, setSuppressed] = useState(vuln.suppressed ?? false);
  const [history, setHistory] = useState<HistoryEvent[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/vulnerabilities/${vuln.id}/history`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [projectId, vuln.id]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/vulnerabilities/${vuln.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, justification, suppressed, comment, remediation: status === 'affected' || status === 'fixed' ? remediation : null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t.modal.saveFailed); return; }
      onSaved(data);
      onClose();
    } catch {
      setError(t.modal.network);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-[#e5e1d8] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#e5e1d8] px-5 py-4">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-[#1a1714]">{vuln.cveId ?? vuln.osvId}</h2>
            <p className="text-xs text-[#6b6460]">{vuln.componentName}{vuln.componentVersion ? `@${vuln.componentVersion}` : ''}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-[#9b9590] hover:bg-[#f4f1ec]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-4">
          {vuln.summary && (
            <p className="text-sm text-[#3d3a36] leading-relaxed">{vuln.summary}</p>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#6b6460] uppercase tracking-wide">{t.modal.status}</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_COLORS) as VulnStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={[
                    'rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors',
                    status === s
                      ? `${STATUS_COLORS[s]} border-current`
                      : 'border-[#e5e1d8] text-[#3d3a36] hover:bg-[#f4f1ec]',
                  ].join(' ')}
                >
                  {t.status[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#6b6460] uppercase tracking-wide">
              {t.modal.justification}
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
              placeholder={t.modal.placeholder}
              maxLength={2000}
              className="w-full resize-none rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] placeholder-[#c0bab4] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
            />
            <p className="text-right text-xs text-[#9b9590]">{justification.length}/2000</p>
          </div>

          {(status === 'affected' || status === 'fixed') && (
            <RemediationFields value={remediation} onChange={setRemediation} warnIfMissing={status === 'affected'} />
          )}

          <label className="flex items-start gap-2 text-xs text-[#3d3a36]">
            <input type="checkbox" checked={suppressed} onChange={(e) => setSuppressed(e.target.checked)} className="mt-0.5" />
            {t.modal.suppress}
          </label>

          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            placeholder={t.modal.comment}
            className="w-full rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] placeholder-[#c0bab4] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
          />

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#6b6460]">{t.modal.history}</p>
            {history && history.length === 0 && <p className="text-xs text-[#9b9590]">{t.modal.noHistory}</p>}
            <ul className="max-h-32 space-y-1.5 overflow-y-auto text-xs text-[#3d3a36]">
              {history?.map((e) => (
                <li key={e.at} className="rounded border border-[#f4f1ec] px-2 py-1">
                  <span className="text-[#9b9590]">{new Date(e.at).toLocaleString()} · {e.actorName}</span>
                  {Object.entries(e.change).map(([field, [from, to]]) => (
                    <span key={field} className="block">{t.modal.changed(field, String(from ?? '–'), String(to ?? '–'))}</span>
                  ))}
                  {e.comment && <span className="block italic">{e.comment}</span>}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[#e5e1d8] px-5 py-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-[#6b6460] hover:bg-[#f4f1ec]">
            {t.modal.cancel}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-[#1a1714] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d3a36] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t.modal.save}
          </button>
        </div>
      </div>
    </div>
  );
}
