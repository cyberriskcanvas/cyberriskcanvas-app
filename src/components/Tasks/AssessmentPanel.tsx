'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import {
  decideAssessment, getAssessment, getAssessmentOverview, reopenAssessment, respondToFinding, saveAssessmentItem, setAssessmentItemResolved, startAssessment,
  type AssessmentDetail, type AssessmentOverview,
} from '@/actions/assessment';
import { ASSESSED_REQUIREMENTS, VERDICTS } from '@/lib/assessment';
import { useAssessmentT } from '@/i18n/assessment';
import { exportAssessmentPdf } from '@/utils/assessmentPdf';
import { CraGuidanceDetails } from '@/components/Compliance/CraGuidanceDetails';

interface Props { projectId: string; productName: string; onClose: () => void; onChanged: () => void }

const VERDICT_COLOR = {
  accepted: 'border-green-300 bg-green-100 text-green-800',
  finding: 'border-red-300 bg-red-100 text-red-800',
  not_applicable: 'border-slate-300 bg-slate-100 text-slate-700',
} as const;
const GROUPS = ['ER', 'VH', 'UT', 'TD'] as const;
const field = 'w-full rounded border border-[#e5e1d8] bg-[#faf9f7] px-2 py-1.5 text-xs focus:border-[#4f46e5] focus:outline-none';

export function AssessmentPanel({ projectId, productName, onClose, onChanged }: Props) {
  const { t, lang } = useAssessmentT();
  const [overview, setOverview] = useState<AssessmentOverview | null>(null);
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('ER');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(() => getAssessmentOverview(projectId).then(setOverview).catch(() => {}), [projectId]);
  useEffect(() => { loadOverview(); }, [loadOverview]);

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    setError(null);
    try { return await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Error'); return null; }
  }
  const apply = async (p: Promise<AssessmentDetail>) => {
    const d = await run(() => p);
    if (d) { setDetail(d); setSummary((s) => s || d.summary || ''); onChanged(); loadOverview(); }
  };

  if (!overview) return null;

  const itemOf = (id: string) => detail?.items.find((i) => i.requirementId === id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-1 border-b border-[#e5e1d8] px-5 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#1a1714]">{t.title}</h3>
            <button onClick={onClose} title={t.close} className="text-[#9b9590] hover:text-[#1a1714]"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-xs text-[#6b6460]">{t.intro}</p>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>

        {!detail ? (
          <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
            {overview.versions.length === 0 && <p className="text-sm text-[#6b6460]">{t.noFrozen}</p>}
            {overview.versions.map((v) => (
              <div key={v.versionId} className="flex items-center gap-3 rounded-lg border border-[#e5e1d8] p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1a1714]">{t.version(v.number, v.label)}</p>
                  <p className="text-xs text-[#6b6460]">
                    {v.assessment ? `${t.status[v.assessment.status as 'open' | 'approved' | 'rejected']} · ${v.assessment.assessorName}` : t.status.none}
                  </p>
                </div>
                {v.assessment ? (
                  <button onClick={() => apply(getAssessment(v.assessment!.id))} className="rounded-lg bg-[#1a1714] px-3 py-1.5 text-xs font-medium text-white">{t.open}</button>
                ) : overview.canAssess ? (
                  <button onClick={async () => { const id = await run(() => startAssessment(projectId, v.versionId)); if (id) apply(getAssessment(id)); }} className="rounded-lg bg-[#1a1714] px-3 py-1.5 text-xs font-medium text-white">{t.start}</button>
                ) : (
                  <span className="text-[11px] text-[#9b9590]">{t.onlyAssessors}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-2 border-b border-[#e5e1d8] px-5 py-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#6b6460]">
                <button onClick={() => { setDetail(null); loadOverview(); }} className="underline">{t.back}</button>
                <span>·</span><span>{t.version(detail.versionNumber, detail.versionLabel)}</span>
                <span>·</span><span className="font-semibold text-[#1a1714]">{t.status[detail.status as 'open' | 'approved' | 'rejected']}</span>
                <span>·</span><span>{t.progress(detail.items.length, ASSESSED_REQUIREMENTS.length)}</span>
                {detail.approval.openFindings.length > 0 && <span className="text-red-700">· {t.openFindings(detail.approval.openFindings.length)}</span>}
                <button onClick={() => exportAssessmentPdf(productName, detail, lang)} className="ml-auto flex items-center gap-1 rounded border border-[#e5e1d8] px-2 py-1 text-[11px] hover:bg-[#f4f1ec]"><Download className="h-3 w-3" />{t.report}</button>
              </div>
              <div className="flex gap-1.5">
                {GROUPS.map((g) => {
                  const ids = ASSESSED_REQUIREMENTS.filter((r) => r.id.startsWith(`${g}.`)).map((r) => r.id);
                  return (
                    <button key={g} onClick={() => setGroup(g)} className={`rounded-full border px-3 py-1 text-xs font-medium ${group === g ? 'border-[#1a1714] bg-[#1a1714] text-white' : 'border-[#e5e1d8] text-[#6b6460] hover:bg-[#f4f1ec]'}`}>
                      {t.groups[g]} · {ids.filter((id) => itemOf(id)).length}/{ids.length}
                    </button>
                  );
                })}
              </div>
            </div>

            <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {ASSESSED_REQUIREMENTS.filter((r) => r.id.startsWith(`${group}.`)).map((req) => {
                const item = itemOf(req.id);
                const team = detail.checklist[req.id];
                return (
                  <li key={req.id} className="rounded-lg border border-[#e5e1d8] p-3">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-mono text-[11px] text-[#9b9590]">{req.id}</span>
                      <span className="text-sm font-semibold text-[#1a1714]">{req.title}</span>
                      <span className="text-[10px] text-[#9b9590]">{req.craRef}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#6b6460]">{req.description}</p>
                    <p className="mt-1.5 rounded bg-[#faf9f7] px-2 py-1 text-[11px] text-[#3d3a36]">
                      <b>{t.checklist}:</b> {team ? `${team.status}${team.note ? ` · ${team.note}` : ''}` : t.notDecided}
                    </p>
                    <CraGuidanceDetails requirementId={req.id} />

                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {VERDICTS.map((v) => (
                        <button key={v} disabled={!detail.canAssess} onClick={() => apply(saveAssessmentItem(detail.id, req.id, { verdict: v, comment: item?.comment ?? '', dueDate: item?.dueDate ?? null }))}
                          className={`rounded border px-2.5 py-1 text-[11px] font-medium disabled:opacity-60 ${item?.verdict === v ? VERDICT_COLOR[v] : 'border-transparent bg-[#f4f1ec] text-[#6b6460] hover:bg-[#e5e1d8]'}`}>
                          {t.verdict[v]}
                        </button>
                      ))}
                      {item && detail.canAssess && <button onClick={() => apply(saveAssessmentItem(detail.id, req.id, null))} className="ml-1 text-[11px] text-[#9b9590] underline">{t.clear}</button>}
                    </div>

                    {item && (
                      <div className="mt-2 space-y-2">
                        <textarea key={`c-${req.id}-${item.verdict}`} defaultValue={item.comment ?? ''} disabled={!detail.canAssess} placeholder={t.comment} rows={2} maxLength={4000}
                          onBlur={(e) => e.target.value !== (item.comment ?? '') && apply(saveAssessmentItem(detail.id, req.id, { verdict: item.verdict, comment: e.target.value, dueDate: item.dueDate }))} className={field} />
                        {item.verdict === 'finding' && (
                          <>
                            <label className="flex items-center gap-2 text-[11px] text-[#6b6460]">{t.due}
                              <input type="date" disabled={!detail.canAssess} defaultValue={item.dueDate?.slice(0, 10) ?? ''}
                                onChange={(e) => apply(saveAssessmentItem(detail.id, req.id, { verdict: item.verdict, comment: item.comment ?? '', dueDate: e.target.value || null }))} className="rounded border border-[#e5e1d8] px-1.5 py-0.5 text-xs" />
                            </label>
                            <textarea key={`r-${req.id}`} defaultValue={item.response ?? ''} disabled={!detail.canRespond} placeholder={`${t.response}: ${t.responsePlaceholder}`} rows={2} maxLength={4000}
                              onBlur={(e) => detail.canRespond && e.target.value !== (item.response ?? '') && apply(respondToFinding(detail.id, req.id, e.target.value))} className={field} />
                            {detail.canAssess && (
                              <label className="flex items-center gap-2 text-[11px] text-[#3d3a36]">
                                <input type="checkbox" checked={item.resolved} onChange={(e) => apply(setAssessmentItemResolved(detail.id, req.id, e.target.checked))} />{t.resolved}
                              </label>
                            )}
                            {!detail.canAssess && item.resolved && <p className="text-[11px] text-green-700">{t.isResolved}</p>}
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="space-y-2 border-t border-[#e5e1d8] bg-[#faf9f7] px-5 py-3">
              {detail.status === 'approved' ? (
                <p className="text-xs text-green-800">{t.decided(t.status.approved, detail.assessorName, detail.decidedAt ? new Date(detail.decidedAt).toLocaleDateString(lang) : '')}. {t.locked}</p>
              ) : detail.canAssess ? (
                <>
                  <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={`${t.decision}: ${t.summary}`} rows={2} maxLength={4000} className={field} />
                  {!detail.approval.ok && <p className="text-[11px] text-amber-700">{t.blockers(detail.approval.missing.length, detail.approval.openFindings.length)}</p>}
                  <div className="flex gap-2">
                    <button disabled={!detail.approval.ok} onClick={() => apply(decideAssessment(detail.id, 'approved', summary))} className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">{t.approve}</button>
                    <button onClick={() => apply(decideAssessment(detail.id, 'rejected', summary))} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50">{t.reject}</button>
                    {detail.status === 'rejected' && <button onClick={() => apply(reopenAssessment(detail.id))} className="rounded-lg border border-[#e5e1d8] px-3 py-1.5 text-xs font-medium text-[#3d3a36]">{t.reopen}</button>}
                  </div>
                </>
              ) : (
                detail.summary && <p className="text-xs text-[#3d3a36]">{t.summary}: {detail.summary}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
