'use client';

import { ChevronRight, Map as MapIcon } from 'lucide-react';
import { useJourneyT } from '@/i18n/journey';
import { useJourneyStations } from '@/hooks/useJourneyStations';
import { useJourneyStore } from '@/store/journeyStore';
import { nextStepOf, type StationNext } from '@/utils/deriveJourney';
import { stationNextLabel } from '@/components/Tasks/JourneyView';

type Tab = 'design' | 'operations' | 'csaf';
type CurrentTab = Tab | 'documents';

/** Shown under the tab row outside the roadmap: the current roadmap station and a way to its next action or back to the roadmap. */
export function NextStepBar({ currentTab, onNavigate, onOpenRoadmap }: { currentTab: CurrentTab; onNavigate: (tab: Tab, step?: 'reporting') => void; onOpenRoadmap: () => void }) {
  const t = useJourneyT();
  const { stations } = useJourneyStations();
  const setFocus = useJourneyStore((s) => s.setFocus);
  if (stations.length === 0) return null;
  const current = nextStepOf(stations);
  const n = current ? stations.indexOf(current.station) + 1 : stations.length;

  const openRoadmap = () => { if (current) setFocus(current.station.id); onOpenRoadmap(); };
  const next: StationNext | null = current?.next ?? null;
  // Tab targets and the organisation open directly; panels and checklists live in the roadmap
  const direct = next && ((next.kind === 'tab' && next.target !== 'tasks' && (next.target !== currentTab || next.step)) || next.kind === 'settings');
  const go = () => {
    if (next?.kind === 'tab' && next.target !== 'tasks') onNavigate(next.target, next.step);
    else if (next?.kind === 'settings') window.open('/organisation', '_blank', 'noopener');
  };

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-[#e5e1d8] bg-[#faf9f7] px-4 py-1.5 text-xs">
      <MapIcon className="h-3.5 w-3.5 shrink-0 text-[#6b6460]" />
      {current ? (
        <span className="min-w-0 truncate text-[#3d3a36]">
          <span className="text-[#9b9590]">{t.bar.label(n, stations.length)}:</span>{' '}
          <span className="font-medium">{t.stations[current.station.id].title}</span>
          {next && <span className="text-[#6b6460]"> · {stationNextLabel(t, next)}</span>}
        </span>
      ) : (
        <span className="text-[#3d3a36]">{t.bar.allDone}</span>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {direct && (
          <button onClick={go} className="flex items-center gap-1 rounded-md bg-[#1a1714] px-2.5 py-1 font-medium text-white hover:bg-[#3d3a36]">
            {t.continue}<ChevronRight className="h-3 w-3" />
          </button>
        )}
        <button onClick={openRoadmap} className="rounded-md border border-[#e5e1d8] bg-white px-2.5 py-1 font-medium text-[#3d3a36] hover:bg-[#f4f1ec]">
          {t.bar.open}
        </button>
      </div>
    </div>
  );
}
