'use client';

import { useEffect, useState } from 'react';
import { getViolations, waiveViolation } from '@/actions/policies';
import type { Violation } from '@/lib/policy';
import { useOperationsT } from '@/i18n/operations';

const LEVEL_BADGE = { fail: 'bg-red-50 text-red-600', warn: 'bg-yellow-50 text-yellow-700', info: 'bg-blue-50 text-blue-700' } as const;

interface Props {
  projectId: string;
  /** Version number; null = the active version. */
  version: number | null;
  /** Changes when the data changed, so the list reloads. */
  refreshKey: string;
}

/** Violations of the organisation's policies in this version, with the option to waive one for a component. */
export function PolicyViolations({ projectId, version, refreshKey }: Props) {
  const { t } = useOperationsT();
  const [rows, setRows] = useState<Violation[]>([]);
  const [waiving, setWaiving] = useState<Violation | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => getViolations(projectId, version).then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, [projectId, version, refreshKey]);

  if (rows.length === 0) return null;

  async function waive() {
    if (!waiving) return;
    try {
      await waiveViolation(waiving.policyId, waiving.projectId, waiving.componentKey, reason);
      setWaiving(null);
      setReason('');
      setError(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.policy.failed);
    }
  }

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9b9590]">{t.policy.title(rows.filter((v) => !v.waived).length)}</h3>
      <div className="divide-y divide-[#f4f1ec] rounded-lg border border-[#e5e1d8] bg-white text-xs">
        {rows.map((v) => (
          <div key={`${v.policyId}-${v.componentKey}-${v.versionId}`} className={`flex items-start justify-between gap-3 px-3 py-2 ${v.waived ? 'opacity-50' : ''}`}>
            <div className="min-w-0">
              <p className="text-[#3d3a36]">
                <span className={`mr-1.5 rounded-full px-2 py-0.5 font-medium ${LEVEL_BADGE[v.level]}`}>{t.policy.levels[v.level]}</span>
                <span className="font-semibold">{v.policyName}</span> · {v.componentName}{v.componentVersion && <span className="text-[#9b9590]">@{v.componentVersion}</span>}
                {v.waived && <span className="ml-1.5 text-[#9b9590]">({t.policy.waived})</span>}
              </p>
              <p className="text-[#6b6460]">{v.reasons.join('; ')}</p>
            </div>
            {!v.waived && <button onClick={() => { setWaiving(v); setReason(''); }} className="shrink-0 text-[#1e293b] hover:underline">{t.policy.waive}</button>}
          </div>
        ))}
      </div>
      {waiving && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder={t.policy.reason(waiving.componentName)} className="min-w-0 flex-1 rounded-lg border border-[#d4cfc8] bg-white px-3 py-1.5" />
          <button onClick={waive} disabled={!reason.trim()} className="rounded-lg bg-[#1a1714] px-3 py-1.5 font-medium text-white disabled:opacity-40">{t.policy.confirm}</button>
          <button onClick={() => setWaiving(null)} className="text-[#6b6460]">{t.modal.cancel}</button>
          {error && <span className="text-red-600">{error}</span>}
        </div>
      )}
    </section>
  );
}
