'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, X } from 'lucide-react';
import { useOperationsT } from '@/i18n/operations';
import { FINDING_SEVERITIES, type FindingSeverity, type SarifFinding } from '@/lib/ciEval';

const SEVERITY_STYLE: Record<FindingSeverity, string> = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-green-50 text-green-800 border-green-200',
  info: 'bg-[#f4f1ec] text-[#6b6460] border-[#e5e1d8]',
};

/** The findings of one SARIF run with their severity; the ones that block at the current threshold stand out. */
export function CiFindings({ projectId, runId, source, failOn, onClose }: { projectId: string; runId: string; source: string; failOn: string; onClose: () => void }) {
  const { t: all } = useOperationsT();
  const t = all.ci;
  const [data, setData] = useState<{ total: number; findings: SarifFinding[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/projects/${projectId}/ci/runs/${runId}/findings`)
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; })
      .then((j) => live && setData(j))
      .catch((e) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => { live = false; };
  }, [projectId, runId]);

  // secrets block on any finding, the other sources from the threshold on
  const blocks = (s: FindingSeverity) => source === 'secrets' || FINDING_SEVERITIES.indexOf(s) <= FINDING_SEVERITIES.indexOf(failOn as FindingSeverity);
  const counts = data ? FINDING_SEVERITIES.map((s) => [s, data.findings.filter((f) => f.severity === s).length] as const).filter(([, n]) => n > 0) : [];

  return (
    <div className="space-y-2 rounded-lg border border-[#e5e1d8] bg-[#faf9f7] p-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-[#1a1714]">{t.findingsTitle(t.sources[source] ?? source, data?.total ?? 0)}</p>
        <div className="flex flex-wrap gap-1">
          {counts.map(([s, n]) => <span key={s} className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${SEVERITY_STYLE[s]}`}>{n} {t.severities[s]}</span>)}
        </div>
        <button onClick={onClose} title={t.hideFindings} className="ml-auto text-[#9b9590] hover:text-[#1a1714]"><X className="h-4 w-4" /></button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      {!data && !error && <p className="flex items-center gap-2 text-xs text-[#9b9590]"><Loader2 className="h-3.5 w-3.5 animate-spin" />{all.loading}</p>}
      {data && data.findings.length === 0 && <p className="text-xs text-[#6b6460]">{t.noFindings}</p>}
      {data && data.findings.length > 0 && (
        <div className="max-h-[28rem] overflow-auto">
          <table className="w-full text-left text-xs text-[#3d3a36]">
            <thead className="sticky top-0 bg-[#faf9f7] text-[#9b9590]">
              <tr><th className="py-1 pr-3">{t.findingsCols.severity}</th><th className="pr-3">{t.findingsCols.finding}</th><th className="pr-3">{t.findingsCols.location}</th></tr>
            </thead>
            <tbody>
              {data.findings.map((f, i) => (
                <tr key={`${f.ruleId}-${i}`} className={`border-t border-[#f0ede6] align-top ${blocks(f.severity) ? '' : 'opacity-60'}`}>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${SEVERITY_STYLE[f.severity]}`}>{t.severities[f.severity]}</span>
                  </td>
                  <td className="pr-3">
                    <p className="font-medium text-[#1a1714]">
                      {f.title}
                      {f.helpUri && <a href={f.helpUri} target="_blank" rel="noreferrer" className="ml-1 inline-block align-middle text-indigo-600"><ExternalLink className="h-3 w-3" /></a>}
                    </p>
                    <p className="text-[#6b6460] line-clamp-2" title={f.message}>{f.message}</p>
                    {!blocks(f.severity) && <p className="text-[10px] text-[#9b9590]">{t.belowThreshold}</p>}
                  </td>
                  <td className="pr-3 font-mono text-[11px] break-all text-[#6b6460]">{f.location ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.total > data.findings.length && <p className="pt-2 text-[11px] text-[#9b9590]">{t.truncated(data.findings.length, data.total)}</p>}
        </div>
      )}
    </div>
  );
}
