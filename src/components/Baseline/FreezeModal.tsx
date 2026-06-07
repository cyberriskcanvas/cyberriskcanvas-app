'use client';

import { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { freezeVersion } from '@/actions/baselines';
import { isTierBlock } from '@/lib/tierBlock';
import { usePaywallStore } from '@/store/paywallStore';

interface Props {
  projectId: string;
  onSuccess: (newVersionId: string, newVersionNumber: number) => void;
  onClose: () => void;
}

export function FreezeModal({ projectId, onSuccess, onClose }: Props) {
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const showPaywall = usePaywallStore((s) => s.showPaywall);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Bitte eine Versionsbezeichnung eingeben.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await freezeVersion(projectId, label);
      if (isTierBlock(result)) {
        showPaywall(result.requiredTier);
        onClose();
        return;
      }
      onSuccess(result.newVersionId, result.newVersionNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Einfrieren.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-amber-600" />
            <h2 className="text-base font-semibold text-gray-900">Version einfrieren</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <p className="text-sm text-gray-600">
            Die aktuelle Version wird eingefroren. Risikoanalyse und SBOM werden als fester Stand gespeichert.
            Anschließend startet automatisch eine neue aktive Version.
          </p>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Versionsbezeichnung <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="z.B. 1.0 oder CRA-Audit-2026-Q2"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Abbrechen
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
              <Lock size={14} />
              {loading ? 'Wird eingefroren…' : 'Version einfrieren'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
