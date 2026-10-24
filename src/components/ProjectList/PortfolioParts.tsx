'use client';

import Link from 'next/link';
import { Building2, CheckCircle2, Circle, CircleDot, ChevronRight } from 'lucide-react';
import type { Portfolio, PortfolioRow } from '@/actions/portfolio';
import { usePortfolioT } from '@/i18n/portfolio';
import { useOrganisationT } from '@/i18n/organisation';
import { useJourneyT } from '@/i18n/journey';
import { cn } from '@/utils/cn';

const CLASS_LABEL: Record<string, string> = { default: 'Default', 'class-i': 'I', 'class-ii': 'II', critical: 'Critical' };

function Chip({ tone, children }: { tone: 'ok' | 'bad' | 'warn' | 'muted'; children: React.ReactNode }) {
  const style = { ok: 'bg-green-50 text-green-700', bad: 'bg-red-50 text-red-700', warn: 'bg-amber-50 text-amber-700', muted: 'bg-[#f4f1ec] text-[#6b6460]' }[tone];
  return <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', style)}>{children}</span>;
}

function gateChip(row: PortfolioRow, pro: boolean, t: ReturnType<typeof usePortfolioT>['t']) {
  if (!pro) return <Chip tone="muted">{t.gate.pro}</Chip>;
  const g = row.summary.gate;
  return <Chip tone={g === 'pass' ? 'ok' : g === 'fail' ? 'bad' : 'muted'}>{t.gate[g]}</Chip>;
}

/** The organisation next to the products: its own five stations, one click to the area. */
export function OrganisationStrip({ stations }: { stations: Portfolio['org'] }) {
  const { t } = usePortfolioT();
  const ot = useOrganisationT().t;
  return (
    <section className="mb-6 rounded-xl border border-[#e5e1d8] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e293b]"><Building2 size={16} className="text-white" /></div>
          <div>
            <h2 className="text-sm font-semibold text-[#1a1917]">{t.orgTitle}</h2>
            <p className="text-[11px] text-[#6b6460]">{t.orgHint}</p>
          </div>
        </div>
        <Link href="/organisation" className="flex items-center gap-1 rounded-lg border border-[#e5e1d8] px-3 py-1.5 text-xs font-medium text-[#3d3a36] hover:bg-[#f4f1ec]">
          {t.orgOpen} <ChevronRight size={13} />
        </Link>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {stations.map((s) => (
          <li key={s.id}>
            <Link href="/organisation" className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium', s.status === 'done' ? 'border-green-200 bg-green-50 text-green-800' : s.status === 'progress' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-[#e5e1d8] text-[#6b6460]')}>
              {s.status === 'done' ? <CheckCircle2 size={12} /> : s.status === 'progress' ? <CircleDot size={12} /> : <Circle size={12} />}
              {ot.stations[s.id].title}
              <span className="opacity-70">{ot.progress(s.done, s.total)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Status block of a product card: roadmap progress and the chips that matter. */
export function ProductStatus({ row, pro }: { row: PortfolioRow; pro: boolean }) {
  const { t } = usePortfolioT();
  const stationT = useJourneyT().stations;
  const s = row.summary;
  const pct = s.stationsTotal ? Math.round((s.stationsDone / s.stationsTotal) * 100) : 0;
  return (
    <div className="mt-3 space-y-2">
      <div>
        <div className="mb-1 flex items-center justify-between text-[11px] text-[#6b6460]">
          <span className="font-medium">{t.roadmap(s.stationsDone, s.stationsTotal)}</span>
          <span className="truncate pl-2">{s.currentStation ? stationT[s.currentStation].title : t.allDone}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#f0ede6]"><div className="h-full rounded-full bg-[#1e293b]" style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {gateChip(row, pro, t)}
        {pro && s.openHigh !== null && s.openHigh > 0 && <Chip tone="bad">{t.high(s.openHigh)}</Chip>}
        {(s.art14.open > 0 || s.art14.overdue > 0) && <Chip tone={s.art14.overdue > 0 ? 'bad' : 'warn'}>{t.art14(s.art14.open, s.art14.overdue)}</Chip>}
        {s.supportDays !== null && <Chip tone={s.supportDays < 0 ? 'bad' : s.supportDays < 180 ? 'warn' : 'muted'}>{t.support(s.supportDays)}</Chip>}
        {s.assessment !== 'none' && <Chip tone={s.assessment === 'approved' ? 'ok' : s.assessment === 'rejected' ? 'bad' : 'muted'}>{t.assessment[s.assessment]}</Chip>}
      </div>
    </div>
  );
}

export function ProductTable({ rows, pro, onOpen }: { rows: PortfolioRow[]; pro: boolean; onOpen: (row: PortfolioRow) => void }) {
  const { t } = usePortfolioT();
  const stationT = useJourneyT().stations;
  const c = t.cols;
  return (
    <div className="overflow-x-auto rounded-xl border border-[#e5e1d8] bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[#e5e1d8] bg-[#faf9f7] text-[11px] font-semibold uppercase tracking-wide text-[#9b9590]">
          <tr>{[c.product, c.cls, c.version, c.roadmap, c.gate, c.high, c.art14, c.support, c.assessment].map((h) => <th key={h} className="px-3 py-2.5">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const s = r.summary;
            return (
              <tr key={r.projectId} onClick={() => onOpen(r)} className="cursor-pointer border-b border-[#f4f1ec] last:border-0 hover:bg-[#faf9f7]">
                <td className="px-3 py-2.5"><span className="font-medium text-[#1a1917]">{r.name}</span>{r.teamName && <span className="ml-2 text-[11px] text-[#9b9590]">{r.teamName}</span>}</td>
                <td className="px-3 py-2.5 text-xs text-[#6b6460]">{r.craClass ? CLASS_LABEL[r.craClass] ?? r.craClass : t.none}</td>
                <td className="px-3 py-2.5 text-xs text-[#6b6460]">{r.versionNumber ? `v${r.versionNumber}` : t.none}{r.lastRelease ? ` · ${r.lastRelease}` : ''}</td>
                <td className="min-w-40 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#f0ede6]"><div className="h-full bg-[#1e293b]" style={{ width: `${s.stationsTotal ? (s.stationsDone / s.stationsTotal) * 100 : 0}%` }} /></div>
                    <span className="text-[11px] text-[#6b6460]">{s.stationsDone}/{s.stationsTotal}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-[#9b9590]">{s.currentStation ? stationT[s.currentStation].title : t.allDone}</p>
                </td>
                <td className="px-3 py-2.5">{gateChip(r, pro, t)}</td>
                <td className="px-3 py-2.5 text-xs">{pro ? (s.openHigh === null ? t.none : <span className={s.openHigh > 0 ? 'font-semibold text-red-700' : 'text-[#6b6460]'}>{s.openHigh}</span>) : <Chip tone="muted">{t.pro}</Chip>}</td>
                <td className="px-3 py-2.5 text-xs">{s.art14.open + s.art14.overdue === 0 ? t.none : <Chip tone={s.art14.overdue > 0 ? 'bad' : 'warn'}>{t.art14(s.art14.open, s.art14.overdue)}</Chip>}</td>
                <td className="px-3 py-2.5 text-xs text-[#6b6460]">{s.supportDays === null ? t.none : t.support(s.supportDays)}</td>
                <td className="px-3 py-2.5 text-xs text-[#6b6460]">{t.assessment[s.assessment] || t.none}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
