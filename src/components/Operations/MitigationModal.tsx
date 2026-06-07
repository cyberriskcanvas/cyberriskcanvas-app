'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Vulnerability, VulnStatus } from './types';

const STATUS_LABELS: Record<VulnStatus, string> = {
  open:         'Offen',
  in_triage:    'In Prüfung',
  not_affected: 'Nicht betroffen',
  fixed:        'Behoben',
};

const STATUS_COLORS: Record<VulnStatus, string> = {
  open:         'bg-red-100 text-red-700',
  in_triage:    'bg-yellow-100 text-yellow-700',
  not_affected: 'bg-green-100 text-green-700',
  fixed:        'bg-blue-100 text-blue-700',
};

interface Props {
  projectId: string;
  vuln: Vulnerability;
  onClose: () => void;
  onSaved: (updated: Pick<Vulnerability, 'id' | 'status' | 'justification' | 'updatedAt'>) => void;
}

export function MitigationModal({ projectId, vuln, onClose, onSaved }: Props) {
  const [status, setStatus] = useState<VulnStatus>(vuln.status as VulnStatus);
  const [justification, setJustification] = useState(vuln.justification ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/vulnerabilities/${vuln.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, justification }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Fehler beim Speichern.'); return; }
      onSaved(data);
      onClose();
    } catch {
      setError('Netzwerkfehler.');
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
            <label className="text-xs font-medium text-[#6b6460] uppercase tracking-wide">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_LABELS) as VulnStatus[]).map((s) => (
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
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#6b6460] uppercase tracking-wide">
              Begründung / Justification
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
              placeholder="Erläuterung zum Status…"
              maxLength={2000}
              className="w-full resize-none rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] placeholder-[#c0bab4] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
            />
            <p className="text-right text-xs text-[#9b9590]">{justification.length}/2000</p>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[#e5e1d8] px-5 py-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-[#6b6460] hover:bg-[#f4f1ec]">
            Abbrechen
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-[#1a1714] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d3a36] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
