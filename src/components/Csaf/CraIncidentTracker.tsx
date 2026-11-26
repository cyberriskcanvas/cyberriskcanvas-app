'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Download, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { createIncident, deleteIncident, listIncidents, updateIncident, type IncidentDto, type IncidentPatch } from '@/actions/incidents';
import { deadlines, type IncidentKind, type Step, type StepState } from '@/lib/craIncident';
import { useIncidentsT } from '@/i18n/incidents';

const STATE_STYLE: Record<string, string> = {
  submitted: 'bg-green-100 text-green-800', pending: 'bg-slate-100 text-slate-700', due_soon: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800', waiting: 'bg-slate-100 text-slate-500',
};
const field = 'w-full rounded border border-[#d4cfc8] bg-[#faf9f7] px-2 py-1.5 text-sm focus:border-[#4f46e5] focus:outline-none';
const ENISA_PLATFORM = 'https://www.enisa.europa.eu/topics/cyber-resilience-act';

const toInput = (iso: string | null) => (iso ? iso.slice(0, 16) : '');

function earlyWarningJson(i: IncidentDto, projectName: string) {
  const payload = {
    notification_type: i.kind === 'vulnerability' ? 'CRA_ARTICLE_14_EARLY_WARNING_VULNERABILITY' : 'CRA_ARTICLE_14_EARLY_WARNING_INCIDENT',
    regulatory_reference: i.kind === 'vulnerability' ? 'EU CRA (2024/2847) Art. 14(2)(a)' : 'EU CRA (2024/2847) Art. 14(4)(a)',
    time_of_awareness: i.awareAt,
    product: { name: projectName },
    ...(i.cveId ? { vulnerability: { id: i.cveId, title: i.title } } : { incident: { title: i.title } }),
    affected_eu_member_states: i.memberStates.split(',').map((s) => s.trim()).filter(Boolean),
    recipients: ['CSIRT designated as coordinator', 'ENISA'],
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = `cra-art14-early-warning-${(i.cveId ?? i.id).toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Art. 14 reporting cases of a project: one per actively exploited vulnerability or severe incident. */
export function CraIncidentTracker({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { t, lang } = useIncidentsT();
  const [items, setItems] = useState<IncidentDto[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ kind: 'vulnerability' as IncidentKind, title: '', cveId: '', awareAt: new Date().toISOString().slice(0, 16), memberStates: '' });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => listIncidents(projectId).then(setItems).catch(() => setItems([])), [projectId]);
  useEffect(() => { load(); }, [load]);

  const run = async (p: Promise<IncidentDto[]>) => {
    setError(null);
    try { setItems(await p); } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
  };
  const patch = (id: string, p: IncidentPatch) => run(updateIncident(id, p));
  const fmt = (d: Date | string) => new Date(d).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  const stepLine = (i: IncidentDto, s: StepState) => {
    if (s.state === 'submitted') return t.submittedAt(fmt(s.submittedAt!));
    if (s.state === 'waiting') return t.waiting;
    const due = s.estimated ? t.estimated(fmt(s.due!)) : t.due(fmt(s.due!));
    const left = s.hoursLeft === null ? '' : s.hoursLeft < 0 ? ` · ${t.overdueBy(s.hoursLeft)}` : ` · ${t.hoursLeft(s.hoursLeft)}`;
    return `${due}${left}`;
  };

  if (!items) return null;
  const open = items.filter((i) => !i.closedAt);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1a1714]"><ClipboardList className="h-4 w-4" />{t.title}<span className="rounded-full bg-[#f4f1ec] px-2 py-0.5 text-[11px] font-normal text-[#6b6460]">{t.openCases(open.length)}</span></h3>
          <p className="mt-0.5 max-w-3xl text-xs text-[#6b6460]">{t.intro}</p>
        </div>
        <button onClick={() => setCreating((v) => !v)} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#e5e1d8] px-3 py-1.5 text-xs font-medium text-[#3d3a36] hover:bg-[#f4f1ec]"><Plus className="h-3.5 w-3.5" />{t.newCase}</button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}

      {creating && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-[#e5e1d8] bg-[#faf9f7] p-3 md:grid-cols-2">
          <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as IncidentKind })} className={field}>
            {(['vulnerability', 'incident'] as const).map((k) => <option key={k} value={k}>{t.kind[k]}</option>)}
          </select>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={t.fields.title} maxLength={256} className={field} />
          <input value={draft.cveId} onChange={(e) => setDraft({ ...draft, cveId: e.target.value })} placeholder={t.fields.cve} className={field} />
          <label className="flex items-center gap-2 text-xs text-[#6b6460]">{t.fields.aware}<input type="datetime-local" value={draft.awareAt} onChange={(e) => setDraft({ ...draft, awareAt: e.target.value })} className={field} /></label>
          <input value={draft.memberStates} onChange={(e) => setDraft({ ...draft, memberStates: e.target.value })} placeholder={t.fields.states} maxLength={128} className={`${field} md:col-span-2`} />
          <div className="flex gap-2 md:col-span-2">
            <button disabled={!draft.title.trim()} onClick={async () => { await run(createIncident(projectId, { ...draft, awareAt: new Date(draft.awareAt).toISOString() })); setCreating(false); setDraft({ ...draft, title: '', cveId: '' }); }} className="rounded-lg bg-[#1a1714] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">{t.fields.save}</button>
            <button onClick={() => setCreating(false)} className="text-xs text-[#6b6460] underline">{t.fields.cancel}</button>
          </div>
        </div>
      )}

      {items.length === 0 && <p className="rounded-lg border border-[#e5e1d8] bg-white px-4 py-3 text-sm text-[#6b6460]">{t.none}</p>}

      {items.map((i) => {
        const steps = deadlines({ kind: i.kind, awareAt: new Date(i.awareAt), measureAvailableAt: i.measureAvailableAt ? new Date(i.measureAvailableAt) : null, earlyWarningAt: i.earlyWarningAt ? new Date(i.earlyWarningAt) : null, notificationAt: i.notificationAt ? new Date(i.notificationAt) : null, finalReportAt: i.finalReportAt ? new Date(i.finalReportAt) : null });
        return (
          <div key={i.id} className={`space-y-3 rounded-xl border bg-white p-4 ${i.closedAt ? 'border-[#f0ede6] opacity-70' : 'border-[#e5e1d8]'}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[#1a1714]">{i.title}</p>
                <p className="text-xs text-[#9b9590]">{t.kind[i.kind]} · {t.source[i.source as 'kev' | 'manual'] ?? i.source} · {t.fields.aware} {fmt(i.awareAt)}{i.closedAt ? ` · ${t.closed}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => earlyWarningJson(i, projectName)} className="flex items-center gap-1 rounded border border-[#e5e1d8] px-2 py-1 text-[11px] text-[#3d3a36] hover:bg-[#f4f1ec]"><Download className="h-3 w-3" />{t.earlyJson}</button>
                <button onClick={() => patch(i.id, { type: 'close', closed: !i.closedAt })} className="rounded border border-[#e5e1d8] px-2 py-1 text-[11px] text-[#3d3a36] hover:bg-[#f4f1ec]">{i.closedAt ? t.reopen : t.closeCase}</button>
                <button title={t.remove} onClick={() => window.confirm(t.confirmDelete) && run(deleteIncident(i.id))} className="text-[#c8c0b0] hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            <ul className="space-y-1.5">
              {steps.map((s) => (
                <li key={s.step} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`w-24 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-semibold ${STATE_STYLE[s.state]}`}>{t.state[s.state]}</span>
                  <span className="w-44 shrink-0 font-medium text-[#1a1714]">{t.steps[s.step]}</span>
                  <span className="flex-1 text-xs text-[#6b6460]">{stepLine(i, s)}</span>
                  {s.state === 'submitted'
                    ? <button onClick={() => patch(i.id, { type: 'unsubmit', step: s.step as Step })} className="text-[11px] text-[#9b9590] underline">{t.undo}</button>
                    : s.state !== 'waiting' && <button onClick={() => patch(i.id, { type: 'submit', step: s.step as Step })} className="rounded border border-[#e5e1d8] px-2 py-0.5 text-[11px] font-medium text-[#3d3a36] hover:bg-[#f4f1ec]">{t.submit}</button>}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-[#9b9590]">{t.finalHint[i.kind]}</p>

            {i.kind === 'vulnerability' && (
              <label className="flex flex-wrap items-center gap-2 text-xs text-[#6b6460]">{t.measure}
                <input type="datetime-local" defaultValue={toInput(i.measureAvailableAt)} onBlur={(e) => patch(i.id, { type: 'measure', at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="rounded border border-[#d4cfc8] px-2 py-1 text-xs" />
              </label>
            )}
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input defaultValue={i.memberStates} placeholder={t.fields.states} maxLength={128} onBlur={(e) => e.target.value !== i.memberStates && patch(i.id, { type: 'details', memberStates: e.target.value })} className={field} />
              <input defaultValue={i.notes ?? ''} placeholder={t.notes} maxLength={500} onBlur={(e) => e.target.value !== (i.notes ?? '') && patch(i.id, { type: 'details', notes: e.target.value })} className={field} />
            </div>
            <a href={ENISA_PLATFORM} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">{t.platform}<ExternalLink className="h-3 w-3" /></a>
          </div>
        );
      })}
    </div>
  );
}
