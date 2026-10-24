'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, X } from 'lucide-react';
import { getReadiness, saveReadinessAnswer, type ReadinessData } from '@/actions/readiness';
import { AREA_LABEL, READINESS_AREAS, READINESS_QUESTIONS } from '@/data/readinessQuestions';
import { READINESS_ANSWERS, type ReadinessAnswer } from '@/lib/readiness';
import { scoreReadiness } from '@/utils/readiness';
import { exportReadinessPdf } from '@/utils/readinessPdf';
import { useReadinessT } from '@/i18n/readiness';
import { useJourneyT } from '@/i18n/journey';
import type { StationId } from '@/utils/deriveJourney';

interface Props {
  projectId: string;
  productName: string;
  onClose: () => void;
  onGoToStation: (id: StationId) => void;
}

const ANSWER_COLOR: Record<ReadinessAnswer, string> = {
  yes: 'border-green-300 bg-green-100 text-green-800',
  partly: 'border-amber-300 bg-amber-100 text-amber-800',
  no: 'border-red-300 bg-red-100 text-red-800',
  unknown: 'border-slate-300 bg-slate-100 text-slate-700',
};

export function ReadinessPanel({ projectId, productName, onClose, onGoToStation }: Props) {
  const { t, lang } = useReadinessT();
  const stationT = useJourneyT().stations;
  const [data, setData] = useState<ReadinessData | null>(null);
  const [tab, setTab] = useState<'questions' | 'result'>('questions');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getReadiness(projectId).then(setData).catch(() => {}); }, [projectId]);

  const result = useMemo(() => (data ? scoreReadiness(data.org, data.product) : null), [data]);

  async function answer(questionId: string, value: ReadinessAnswer | null) {
    setError(null);
    try {
      setData(await saveReadinessAnswer(projectId, questionId, value));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }

  if (!data || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2 border-b border-[#e5e1d8] px-5 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#1a1714]">{t.title}</h3>
            <button onClick={onClose} title={t.close} className="text-[#9b9590] hover:text-[#1a1714]"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-xs text-[#6b6460]">{t.intro}</p>
          <div className="flex items-center gap-2">
            {(['questions', 'result'] as const).map((k) => (
              <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-3 py-1 text-xs font-medium ${tab === k ? 'border-[#1a1714] bg-[#1a1714] text-white' : 'border-[#e5e1d8] text-[#6b6460] hover:bg-[#f4f1ec]'}`}>
                {k === 'questions' ? t.tabQuestions : `${t.tabResult} · ${result.overall}%`}
              </button>
            ))}
            <span className="ml-auto text-xs text-[#9b9590]">{t.answered(result.answered, result.total)}</span>
          </div>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'questions' ? (
            <div className="space-y-5">
              {READINESS_AREAS.map((area) => (
                <section key={area} className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[#9b9590]">{AREA_LABEL[area][lang]}</h4>
                  {READINESS_QUESTIONS.filter((q) => q.area === area).map((q) => {
                    const current = (q.scope === 'org' ? data.org : data.product)[q.id];
                    const locked = q.scope === 'org' && !data.canEditOrg;
                    return (
                      <div key={q.id} className="rounded-lg border border-[#e5e1d8] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm text-[#1a1714]">{q.q[lang]}</p>
                          <span className="shrink-0 rounded bg-[#f4f1ec] px-1.5 py-0.5 text-[10px] text-[#6b6460]">{q.scope === 'org' ? t.scopeOrg : t.scopeProduct}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#9b9590]">{q.hint[lang]}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {READINESS_ANSWERS.map((a) => (
                            <button key={a} disabled={locked} onClick={() => answer(q.id, current === a ? null : a)}
                              className={`rounded border px-2.5 py-1 text-[11px] font-medium disabled:opacity-50 ${current === a ? ANSWER_COLOR[a] : 'border-transparent bg-[#f4f1ec] text-[#6b6460] hover:bg-[#e5e1d8]'}`}>
                              {t.answers[a]}
                            </button>
                          ))}
                          {locked && <span className="ml-2 text-[10px] text-[#9b9590]">{t.orgAdminOnly}</span>}
                        </div>
                      </div>
                    );
                  })}
                </section>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#9b9590]">{t.overall}</p>
                <p className="text-3xl font-bold text-[#1a1714]">{result.overall}%</p>
              </div>
              <ul className="space-y-1.5">
                {result.areas.map((a) => (
                  <li key={a.area} className="flex items-center gap-3 text-sm">
                    <span className="w-56 text-[#3d3a36]">{AREA_LABEL[a.area][lang]}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#f0ede6]">
                      <span className={`block h-full ${a.score >= 75 ? 'bg-green-500' : a.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${a.score}%` }} />
                    </span>
                    <span className="w-10 text-right text-xs text-[#6b6460]">{a.score}%</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-[#1a1714]">{t.gaps}</h4>
                {result.gaps.length === 0 && <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">{t.noGaps}</p>}
                {result.gaps.map(({ question, answer: a }) => (
                  <div key={question.id} className="flex items-start gap-3 rounded-lg border border-[#e5e1d8] p-3">
                    <div className="flex-1">
                      <p className="text-sm text-[#1a1714]">{question.q[lang]}</p>
                      <p className="text-xs text-[#9b9590]">{t.gapAnswer[a ?? 'unanswered']} · {AREA_LABEL[question.area][lang]}</p>
                    </div>
                    <button onClick={() => { onGoToStation(question.station); onClose(); }} className="shrink-0 rounded border border-[#e5e1d8] px-2.5 py-1 text-[11px] font-medium text-[#3d3a36] hover:bg-[#f4f1ec]">
                      {t.goToStation}: {stationT[question.station].title}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-[#f0ede6] pt-3">
                <p className="text-[11px] italic text-[#9b9590]">{t.disclaimer}</p>
                <button onClick={() => exportReadinessPdf(productName, result, lang)} className="flex items-center gap-1.5 rounded-lg bg-[#1a1714] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3d3a36]">
                  <Download className="h-3.5 w-3.5" />{t.report}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
