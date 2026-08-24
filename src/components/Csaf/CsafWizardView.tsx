'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { CsafStepGate } from './CsafStepGate';
import { CsafStepMetadata } from './CsafStepMetadata';
import { CsafStepPreview } from './CsafStepPreview';
import { CraReportingTracker } from './CraReportingTracker';
import type { CsafDraft, TriageInfo, WizardStep } from './types';

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'gate',      label: 'Triage' },
  { id: 'metadata',  label: 'Dokument' },
  { id: 'preview',   label: 'Vorschau & Export' },
  { id: 'reporting', label: 'CRA Art. 14 Meldung' },
];

const DEFAULT_DRAFT: CsafDraft = {
  title: '',
  trackingId: '',
  version: '1',
  revision: 'Initial release',
  docStatus: 'DRAFT',
  aggregateSeverity: 'MEDIUM',
  initialReleaseDate: new Date().toISOString(),
  currentReleaseDate: new Date().toISOString(),
  tlp: 'WHITE',
  summary: '',
  details: '',
  publisherName: '',
  publisherNamespace: '',
  publisherCategory: 'vendor',
};

interface Props {
  projectId: string;
  projectName: string;
  companyName?: string;
}

export function CsafWizardView({ projectId, projectName, companyName }: Props) {
  const [step, setStep] = useState<WizardStep>('gate');
  const [draft, setDraft] = useState<CsafDraft>(DEFAULT_DRAFT);
  const [triage, setTriage] = useState<TriageInfo>({ total: 0, open: 0, derivedSeverity: 'MEDIUM' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load draft + triage on mount
  useEffect(() => {
    setLoading(true);
    fetch(`/api/projects/${projectId}/csaf-draft`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || !data.triage) return; // error response - keep defaults

        const triage = data.triage as TriageInfo;
        setTriage(triage);

        if (data.draft) {
          setDraft(data.draft as CsafDraft);
        } else {
          const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const year = new Date().getFullYear();
          const pp = (data.publisherProfile ?? {}) as { name?: string; namespace?: string; category?: string };
          setDraft((prev) => ({
            ...prev,
            title: `Security Advisory – ${projectName}`,
            trackingId: `${slug}-${year}-001`,
            aggregateSeverity: (triage.derivedSeverity as CsafDraft['aggregateSeverity']) ?? 'MEDIUM',
            publisherName: pp.name || companyName || '',
            publisherNamespace: pp.namespace ?? '',
            publisherCategory: (pp.category as CsafDraft['publisherCategory']) || 'vendor',
          }));
        }
      })
      .catch(() => {/* keep defaults */})
      .finally(() => setLoading(false));
  }, [projectId, projectName, companyName]);

  // Debounced auto-save whenever draft changes
  const saveDraft = useCallback((patch: Partial<CsafDraft>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch(`/api/projects/${projectId}/csaf-draft`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [projectId]);

  function handleChange(patch: Partial<CsafDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
    saveDraft(patch);
  }

  const currentIdx = STEPS.findIndex((s) => s.id === step);
  const canGoBack = currentIdx > 0;
  const canGoForward = currentIdx < STEPS.length - 1 && step !== 'gate';
  const isLastStep = currentIdx === STEPS.length - 1;

  if (loading) {
    return (
      <div className="flex items-center gap-2 justify-center py-20 text-sm text-[#9b9590]">
        <Loader2 className="h-4 w-4 animate-spin" /> Lade…
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* ── Progress stepper ── */}
      <div className="shrink-0 border-b border-[#e5e1d8] bg-white px-6 py-3">
        <div className="flex items-center gap-0">
          {STEPS.map(({ id, label }, idx) => {
            const isActive = step === id;
            const isDone = STEPS.findIndex((s) => s.id === step) > idx;
            return (
              <div key={id} className="flex items-center">
                <button
                  onClick={() => idx <= currentIdx && setStep(id)}
                  disabled={idx > currentIdx}
                  className={[
                    'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors',
                    isActive ? 'text-[#1a1714]' : isDone ? 'text-[#4f46e5] cursor-pointer' : 'text-[#c0bab4] cursor-default',
                  ].join(' ')}
                >
                  <span className={[
                    'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                    isActive ? 'bg-[#1a1714] text-white' : isDone ? 'bg-[#4f46e5] text-white' : 'bg-[#e8e4de] text-[#9b9590]',
                  ].join(' ')}>
                    {isDone ? <CheckCircle2 className="h-3 w-3" /> : idx + 1}
                  </span>
                  {label}
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`mx-1 h-px w-8 ${isDone ? 'bg-[#4f46e5]' : 'bg-[#e8e4de]'}`} />
                )}
              </div>
            );
          })}

          {saving && (
            <span className="ml-auto flex items-center gap-1 text-xs text-[#9b9590]">
              <Loader2 className="h-3 w-3 animate-spin" /> Speichert…
            </span>
          )}
        </div>
      </div>

      {/* ── Step content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 w-full">
        {step === 'gate' && (
          <CsafStepGate triage={triage} onNext={() => setStep('metadata')} />
        )}
        {step === 'metadata' && (
          <CsafStepMetadata draft={draft} onChange={handleChange} />
        )}
        {step === 'preview' && (
          <CsafStepPreview projectId={projectId} />
        )}
        {step === 'reporting' && (
          <CraReportingTracker
            projectId={projectId}
            projectName={projectName}
            cvssScore={triage.derivedSeverity === 'CRITICAL' ? 9.8 : triage.derivedSeverity === 'HIGH' ? 8.2 : 5.5}
          />
        )}
      </div>

      {/* ── Navigation ── */}
      {step !== 'gate' && (
        <div className="shrink-0 flex items-center justify-between border-t border-[#e5e1d8] bg-white px-6 py-3">
          <button
            onClick={() => setStep(STEPS[currentIdx - 1].id)}
            disabled={!canGoBack}
            className="flex items-center gap-1.5 rounded-lg border border-[#d4cfc8] px-4 py-2 text-sm text-[#6b6460] hover:bg-[#f4f1ec] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Zurück
          </button>

          {!isLastStep && (
            <button
              onClick={() => setStep(STEPS[currentIdx + 1].id)}
              disabled={!canGoForward}
              className="flex items-center gap-1.5 rounded-lg bg-[#1a1714] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3d3a36] disabled:opacity-40"
            >
              Weiter <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
