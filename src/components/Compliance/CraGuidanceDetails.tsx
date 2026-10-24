'use client';

import { CRA_GUIDANCE, GUIDANCE_REVIEWED } from '@/data/craGuidance';
import { useJourneyT } from '@/i18n/journey';

/** Expandable implementation guidance for one CRA requirement (CRA tab and project checklist). */
export function CraGuidanceDetails({ requirementId }: { requirementId: string }) {
  const t = useJourneyT().checklist;
  const g = CRA_GUIDANCE[requirementId];
  if (!g) return null;
  return (
    <details className="mt-1.5 text-[11px] text-[#6b6460]">
      <summary className="cursor-pointer font-medium text-[#1e293b]">{t.howTo}</summary>
      <div className="mt-1.5 space-y-1.5 rounded border border-[#e5e1d8] bg-[#faf9f7] p-2 leading-relaxed">
        <p><b>{t.why}:</b> {g.why}</p>
        <ol className="list-decimal space-y-0.5 pl-4">{g.steps.map((st) => <li key={st}>{st}</li>)}</ol>
        <p><b>{t.evidence}:</b> {g.evidence.join('; ')}</p>
        {g.ciSource && <p>{t.ci(g.ciSource)}</p>}
        {!GUIDANCE_REVIEWED && <p className="text-[10px] italic text-amber-700">{t.unreviewed}</p>}
      </div>
    </details>
  );
}
