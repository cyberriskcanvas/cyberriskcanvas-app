'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { listIncidents, type IncidentDto } from '@/actions/incidents';
import { nextIncidentDue } from '@/lib/craIncident';
import { useJourneyT } from '@/i18n/journey';
import { useIncidentsT } from '@/i18n/incidents';

const date = (s: string | null) => (s ? new Date(s) : null);

/** Open Art. 14 reporting cases, on every project tab: the most urgent deadline is never more than a glance away. */
export function Art14Banner({ projectId, refreshKey, onOpen }: { projectId: string; refreshKey: string; onOpen: () => void }) {
  const t = useJourneyT();
  const it = useIncidentsT().t;
  const [cases, setCases] = useState<IncidentDto[]>([]);
  useEffect(() => {
    listIncidents(projectId).then((all) => setCases(all.filter((c) => !c.closedAt))).catch(() => setCases([]));
  }, [projectId, refreshKey]);
  if (cases.length === 0) return null;

  const due = nextIncidentDue(cases.map((c) => ({
    kind: c.kind, awareAt: new Date(c.awareAt), measureAvailableAt: date(c.measureAvailableAt),
    earlyWarningAt: date(c.earlyWarningAt), notificationAt: date(c.notificationAt), finalReportAt: date(c.finalReportAt),
  })));
  const next = due.next;
  const red = due.overdue > 0;
  const step = next ? it.steps[next.step] : '';
  const detail = !next || next.hoursLeft === null ? t.art14.waiting : next.hoursLeft < 0 ? t.art14.overdue(step, next.hoursLeft) : t.art14.due(step, next.hoursLeft);

  return (
    <div role="alert" className={`flex shrink-0 items-center gap-3 border-b px-4 py-1.5 text-xs ${red ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 truncate"><span className="font-semibold">{t.art14.title(due.open)}</span> · {detail}</span>
      <button onClick={onOpen} className={`ml-auto shrink-0 rounded-md px-2.5 py-1 font-medium text-white ${red ? 'bg-red-700 hover:bg-red-800' : 'bg-amber-700 hover:bg-amber-800'}`}>
        {t.art14.open}
      </button>
    </div>
  );
}
