'use client';

import { CheckCircle2, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import type { TriageInfo } from './types';

interface Props {
  triage: TriageInfo;
  onNext: () => void;
}

export function CsafStepGate({ triage, onNext }: Props) {
  const done = triage.total > 0 && triage.open === 0;
  const pct = triage.total > 0 ? Math.round(((triage.total - triage.open) / triage.total) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 px-6 text-center max-w-md mx-auto">
      {triage.total === 0 ? (
        <>
          <AlertTriangle className="h-12 w-12 text-[#c0bab4]" />
          <div>
            <h2 className="text-base font-semibold text-[#1a1714] mb-1">Noch keine Schwachstellen</h2>
            <p className="text-sm text-[#6b6460]">
              Lade erst eine SBOM im Tab <strong>Operations &amp; Vulnerabilities</strong> hoch, damit Schwachstellen analysiert werden.
            </p>
          </div>
        </>
      ) : done ? (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#1a1714] mb-1">Alle Schwachstellen bearbeitet</h2>
            <p className="text-sm text-[#6b6460]">
              {triage.total} Schwachstellen triagiert · Höchste Severity: <span className="font-semibold">{triage.derivedSeverity}</span>
            </p>
          </div>
          <button
            onClick={onNext}
            className="flex items-center gap-2 rounded-lg bg-[#1a1714] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3d3a36]"
          >
            CSAF Advisory erstellen <ChevronRight className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <div className="w-full">
            <h2 className="text-base font-semibold text-[#1a1714] mb-1">Triage noch nicht abgeschlossen</h2>
            <p className="text-sm text-[#6b6460] mb-4">
              <strong>{triage.open}</strong> von <strong>{triage.total}</strong> Schwachstellen noch im Status <em>Offen</em>.
              Setze den Status jeder Schwachstelle im Tab <strong>Operations</strong>, bevor du das CSAF Advisory generierst.
            </p>

            {/* Progress bar */}
            <div className="w-full rounded-full bg-[#e8e4de] h-2">
              <div
                className="h-2 rounded-full bg-[#1a1714] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-[#9b9590]">{pct}% abgeschlossen</p>
          </div>

          <button
            onClick={onNext}
            className="text-sm text-[#9b9590] underline underline-offset-2 hover:text-[#3d3a36]"
          >
            Trotzdem fortfahren (unvollständig)
          </button>
        </>
      )}
    </div>
  );
}
