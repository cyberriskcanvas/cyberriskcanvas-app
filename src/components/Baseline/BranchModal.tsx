'use client';

import { useState } from 'react';
import { GitBranch, X } from 'lucide-react';
import { branchProject } from '@/actions/baselines';
import { isTierBlock } from '@/lib/tierBlock';
import { usePaywallStore } from '@/store/paywallStore';
import { useRouter } from 'next/navigation';

interface Props {
  projectId: string;
  suggestedName: string;
  lockedLabel: string;
  onClose: () => void;
}

export function BranchModal({ projectId, suggestedName, lockedLabel, onClose }: Props) {
  const [name, setName] = useState(suggestedName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const showPaywall = usePaywallStore((s) => s.showPaywall);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await branchProject(projectId, name);
      if (isTierBlock(result)) {
        showPaywall(result.requiredTier);
        onClose();
        return;
      }
      if (result.firstDiagramId) {
        router.push(`/diagram/${result.firstDiagramId}`);
      } else {
        router.push('/dashboard');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen der Arbeitskopie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">Neue Arbeitskopie erstellen</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <p className="text-sm text-gray-600">
            Es wird eine vollständige Kopie von Version <strong>{lockedLabel}</strong> erstellt.
            Das Original bleibt eingefroren und unverändert.
          </p>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Name der neuen Arbeitskopie</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
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
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              <GitBranch size={14} />
              {loading ? 'Wird erstellt...' : 'Arbeitskopie erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
