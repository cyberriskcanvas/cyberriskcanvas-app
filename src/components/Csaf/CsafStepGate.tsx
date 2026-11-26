'use client';

import { useState } from 'react';
import { useCsafT } from '@/i18n/csaf';
import { OwnVulnerabilities } from './OwnVulnerabilities';

import { CheckCircle2, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import type { TriageInfo } from './types';

interface Props {
  projectId: string;
  triage: TriageInfo;
  onNext: () => void;
}

export function CsafStepGate({ projectId, triage, onNext }: Props) {
  const { t } = useCsafT();
  const [ownCount, setOwnCount] = useState(0);
  const done = triage.total > 0 && triage.open === 0;
  const pct = triage.total > 0 ? Math.round(((triage.total - triage.open) / triage.total) * 100) : 0;

  return (
    <>
    <div className="flex flex-col items-center justify-center gap-6 pt-12 pb-4 px-6 text-center max-w-md mx-auto">
      {triage.total === 0 ? (
        <>
          <AlertTriangle className="h-12 w-12 text-[#c0bab4]" />
          <div>
            <h2 className="text-base font-semibold text-[#1a1714] mb-1">{t.gate.noneTitle}</h2>
            <p className="text-sm text-[#6b6460]">
              {t.gate.noneBody}
            </p>
          </div>
          {ownCount > 0 && (
            <button onClick={onNext} className="flex items-center gap-2 rounded-lg bg-[#1a1714] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3d3a36]">
              {t.own.continue} <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </>
      ) : done ? (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#1a1714] mb-1">{t.gate.allTitle}</h2>
            <p className="text-sm text-[#6b6460]">
              {t.gate.allBody(triage.total)}<span className="font-semibold">{triage.derivedSeverity}</span>
            </p>
          </div>
          <button
            onClick={onNext}
            className="flex items-center gap-2 rounded-lg bg-[#1a1714] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3d3a36]"
          >
            {t.gate.create} <ChevronRight className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <div className="w-full">
            <h2 className="text-base font-semibold text-[#1a1714] mb-1">{t.gate.pendingTitle}</h2>
            <p className="text-sm text-[#6b6460] mb-4">
              {t.gate.pendingBody(triage.open, triage.total)}
            </p>

            {/* Progress bar */}
            <div className="w-full rounded-full bg-[#e8e4de] h-2">
              <div
                className="h-2 rounded-full bg-[#1a1714] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-[#9b9590]">{t.gate.pct(pct)}</p>
          </div>

          <button
            onClick={onNext}
            className="text-sm text-[#9b9590] underline underline-offset-2 hover:text-[#3d3a36]"
          >
            {t.gate.anyway}
          </button>
        </>
      )}
    </div>
    <div className="mx-auto max-w-2xl px-6 pb-10">
      <OwnVulnerabilities projectId={projectId} onCount={setOwnCount} />
    </div>
    </>
  );
}
