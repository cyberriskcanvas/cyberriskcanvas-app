'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronRight, Circle, CircleDashed, Map as MapIcon, XCircle } from 'lucide-react';
import { useJourneyStore } from '@/store/journeyStore';
import { useJourneyStations } from '@/hooks/useJourneyStations';
import { daysUntilSupportEnd, type Station, type StationNext } from '@/utils/deriveJourney';
import type { CraChecklist as Checklist } from '@/lib/craChecklist';
import { useJourneyT, type JourneyT } from '@/i18n/journey';
import { TaskList } from './TaskView';
import { ProductInfoPanel } from './ProductInfoPanel';
import { ReadinessPanel } from './ReadinessPanel';
import { AssessmentPanel } from '@/pro/ui';
import { DocumentsWizard, type DocsSection } from './DocumentsWizard';
import { useAssessmentT } from '@/i18n/assessment';
import { useReadinessT } from '@/i18n/readiness';
import { CraChecklist, type ChecklistGroup } from './CraChecklist';

type Tab = 'design' | 'operations' | 'csaf';

export function stationNextLabel(t: JourneyT, next: StationNext): string {
  if (next.kind === 'panel') return next.target === 'product' ? t.next.product : t.next.docs[next.target];
  if (next.kind === 'checklist') return t.next.checklist(t.checklist.groups[next.group]);
  if (next.kind === 'dashboard') return t.next.dashboard;
  if (next.kind === 'settings') return t.next.organisation;
  if (next.step === 'reporting') return t.next.reporting;
  return t.next[next.target];
}

interface Props {
  projectId: string;
  diagramId: string;
  productName: string;
  onNavigate: (tab: Tab, step?: 'reporting') => void;
  onOpenModelCheck: () => void;
  userId: string;
  onStartTour: () => void;
}

const STATUS_ICON = {
  done: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  progress: <CircleDashed className="h-4 w-4 text-amber-500" />,
  open: <Circle className="h-4 w-4 text-[#c8c0b0]" />,
};

/** CRA roadmap: ten stations with a computed status and a "continue" button to the right place. */
export function JourneyView({ projectId, diagramId, productName, onNavigate, onOpenModelCheck, userId, onStartTour }: Props) {
  const t = useJourneyT();
  const rt = useReadinessT().t;
  const [showReadiness, setShowReadiness] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [docsSection, setDocsSection] = useState<DocsSection | null>(null);
  const at = useAssessmentT().t;
  const { data, ci, modelOpen, stations } = useJourneyStations();
  const setData = useJourneyStore((s) => s.setData);
  const loadJourney = useJourneyStore((s) => s.load);
  const focus = useJourneyStore((s) => s.focus);
  const setFocus = useJourneyStore((s) => s.setFocus);
  const [selected, setSelected] = useState<string | null>(focus);
  const [panel, setPanel] = useState<'product' | null>(null);
  const [checklistGroup, setChecklistGroup] = useState<ChecklistGroup | null>(null);

  // the editor loads the journey data on every tab change; this reloads after an edit in a panel
  const load = useCallback(() => loadJourney(projectId), [loadJourney, projectId]);
  // a station requested from the next-step bar is shown once
  useEffect(() => { if (focus) { setSelected(focus); setFocus(null); } }, [focus, setFocus]);
  const current = stations.find((s) => s.id === selected) ?? stations.find((s) => s.status !== 'done') ?? stations[0];

  if (!data || !current) return <div className="p-6 text-sm text-[#9b9590]">…</div>;

  function go(next: StationNext) {
    if (next.kind === 'panel') {
      if (next.target === 'product') setPanel('product');
      else setDocsSection(next.target.replace('docs-', '') as DocsSection);
    }
    else if (next.kind === 'checklist') setChecklistGroup(next.group);
    else if (next.kind === 'settings') window.open('/organisation', '_blank', 'noopener');
    else if (next.kind === 'tab') {
      if (next.target === 'tasks') setSelected('risk');
      else onNavigate(next.target, next.step);
    }
  }

  const nextLabel = (next: StationNext) => stationNextLabel(t, next);

  const text = t.stations[current.id];
  const days = daysUntilSupportEnd(data.supportPeriodEnd);

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#faf9f7]">
      {/* Stations */}
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-[#e5e1d8] bg-white px-3 py-4">
        <h2 className="mb-1 flex items-center gap-2 px-2 text-sm font-semibold text-[#1a1714]"><MapIcon className="h-4 w-4" />{t.title}</h2>
        <p className="mb-2 px-2 text-xs text-[#9b9590]">{t.intro}</p>
        <button onClick={() => setShowReadiness(true)} className="mb-3 ml-2 rounded-lg border border-[#e5e1d8] px-2.5 py-1 text-xs font-medium text-[#3d3a36] hover:bg-[#f4f1ec]">{rt.open}</button>
        <ol className="space-y-0.5">
          {stations.map((s, i) => (
            <li key={s.id}>
              <button onClick={() => setSelected(s.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${s.id === current.id ? 'bg-[#f4f1ec] font-semibold text-[#1a1714]' : 'text-[#3d3a36] hover:bg-[#faf9f7]'}`}>
                {STATUS_ICON[s.status]}
                <span className="w-4 text-xs text-[#9b9590]">{i + 1}</span>
                <span className="flex-1">{t.stations[s.id].title}</span>
                {s.progress && <span className="text-[10px] text-[#9b9590]">{s.progress.done}/{s.progress.total}</span>}
              </button>
            </li>
          ))}
        </ol>
      </aside>

      {/* Selected station */}
      <section className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-3xl space-y-4">
          <IntroCard userId={userId} onStartTour={onStartTour} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9b9590]">{t.status[current.status]}</p>
            <h3 className="text-lg font-semibold text-[#1a1714]">{text.title}</h3>
            <p className="mt-1 text-sm text-[#6b6460]">{text.why}</p>
          </div>

          <StationChecks station={current} />

          {current.progress && <p className="text-xs text-[#6b6460]">{t.decided(current.progress.done, current.progress.total)}</p>}
          {current.id === 'secdev' && <p className="text-xs text-[#6b6460]">{t.sdlNote(data.sdl.done)}</p>}
          {(current.id === 'secdev' || current.id === 'sbom' || current.id === 'release') && ci === null && (
            <p className="text-xs text-amber-700">{t.proHint}</p>
          )}
          {current.id === 'postmarket' && (
            <div className="space-y-1 text-xs text-[#6b6460]">
              {days !== null && <p>{t.supportDays(days)}</p>}
              {!current.checks.find((c) => c.code === 'cve_monitoring')?.ok && <p className="text-amber-700">{t.monitoringHint}</p>}
            </div>
          )}

          {current.id === 'release' && (
            <button onClick={() => setShowAssessment(true)} className="rounded-lg border border-[#e5e1d8] bg-white px-3 py-1.5 text-sm font-medium text-[#3d3a36] hover:bg-[#f4f1ec]">{at.open}</button>
          )}

          <div className="flex flex-wrap gap-2">
            {current.next.map((n, i) =>
              n.kind === 'dashboard' ? (
                <Link key={i} href={`/diagram/${diagramId}/dashboard`} className="flex items-center gap-1 rounded-lg border border-[#e5e1d8] bg-white px-3 py-1.5 text-sm font-medium text-[#3d3a36] hover:bg-[#f4f1ec]">
                  {nextLabel(n)}<ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <button key={i} onClick={() => go(n)}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium ${i === 0 ? 'bg-[#1a1714] text-white hover:bg-[#3d3a36]' : 'border border-[#e5e1d8] bg-white text-[#3d3a36] hover:bg-[#f4f1ec]'}`}>
                  {i === 0 ? `${t.continue}: ` : ''}{nextLabel(n)}<ChevronRight className="h-3.5 w-3.5" />
                </button>
              ),
            )}
          </div>

          {current.id === 'risk' && (
            <div className="space-y-2 pt-2">
              <h4 className="text-sm font-semibold text-[#1a1714]">{t.tasks.title}</h4>
              <p className="text-xs text-[#6b6460]">{t.tasks.intro}</p>
              <TaskList gateReasons={[]} modelFindings={modelOpen} onOpenCanvas={() => onNavigate('design')} onOpenOperations={() => onNavigate('operations')} onOpenModelCheck={onOpenModelCheck} />
            </div>
          )}
          {current.id === 'sbom' && ci && ci.reasons.length > 0 && (
            <TaskList gateReasons={ci.reasons.map((r) => r.message)} modelFindings={[]} onOpenCanvas={() => onNavigate('design')} onOpenOperations={() => onNavigate('operations')} onOpenModelCheck={onOpenModelCheck} />
          )}
        </div>
      </section>

      {showReadiness && <ReadinessPanel projectId={projectId} productName={data.projectName || productName} onClose={() => setShowReadiness(false)} onGoToStation={(id) => setSelected(id)} />}
      {docsSection && <DocumentsWizard projectId={projectId} section={docsSection} onClose={() => setDocsSection(null)} onChanged={load} />}
      {showAssessment && <AssessmentPanel projectId={projectId} productName={data.projectName || productName} onClose={() => setShowAssessment(false)} onChanged={load} />}
      {panel === 'product' && (
        <ProductInfoPanel
          projectId={projectId}
          initial={{ craClass: data.craClass, intendedPurpose: data.intendedPurpose, supportPeriodEnd: data.supportPeriodEnd, supportPeriodRationale: data.supportPeriodRationale }}
          onSaved={(info) => setData((d) => (d ? { ...d, ...info } : d))}
          onClose={() => setPanel(null)}
        />
      )}
      {checklistGroup && (
        <CraChecklist
          projectId={projectId}
          initial={data.checklist}
          orgChecklist={data.orgChecklist}
          group={checklistGroup}
          onChanged={(checklist: Checklist) => setData((d) => (d ? { ...d, checklist } : d))}
          onClose={() => setChecklistGroup(null)}
        />
      )}
    </div>
  );
}

function StationChecks({ station }: { station: Station }) {
  const t = useJourneyT();
  if (station.status === 'done') {
    return <p className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" />{t.allDone}</p>;
  }
  return (
    <div className="rounded-lg border border-[#e5e1d8] bg-white p-3">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#9b9590]">{t.whatIsMissing}</p>
      <ul className="space-y-1">
        {station.checks.map((c) => (
          <li key={c.code} className="flex items-center gap-2 text-sm">
            {c.ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-[#c8c0b0]" />}
            <span className={c.ok ? 'text-[#9b9590] line-through' : 'text-[#1a1714]'}>{t.checks[c.code] ?? c.code}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shown once per user: how the roadmap, the tabs and the organisation fit together. */
function IntroCard({ userId, onStartTour }: { userId: string; onStartTour: () => void }) {
  const t = useJourneyT().introCard;
  const key = `crc-roadmap-intro_${userId}`;
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { setShow(!localStorage.getItem(key)); } catch { /* storage blocked: skip the card */ }
  }, [key]);
  if (!show) return null;
  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(key, '1'); } catch { /* storage blocked */ }
  };
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-sm text-[#3d3a36]">
      <p className="font-semibold text-[#1a1714]">{t.title}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        {t.points.map((p) => <li key={p}>{p}</li>)}
      </ol>
      <div className="mt-3 flex gap-2">
        <button onClick={dismiss} className="rounded-lg bg-[#1a1714] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3d3a36]">{t.ok}</button>
        <button onClick={() => { dismiss(); onStartTour(); }} className="rounded-lg border border-[#e5e1d8] bg-white px-3 py-1.5 text-xs font-medium text-[#3d3a36] hover:bg-[#f4f1ec]">{t.tour}</button>
      </div>
    </div>
  );
}
