'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { CRA_REQUIREMENTS, resolveCRARequirement } from '@/data/cra';
import { saveCraChecklistEntry } from '@/actions/productInfo';
import { COMPLIANCE_STATUSES, type CraChecklist as Checklist } from '@/lib/craChecklist';
import { isOrgRequirement } from '@/lib/organisation';
import { CraGuidanceDetails } from '@/components/Compliance/CraGuidanceDetails';
import { useDiagramStore } from '@/store/diagramStore';
import { useJourneyT } from '@/i18n/journey';
import type { CRAMapping } from '@/types';

export type ChecklistGroup = 'ER' | 'VH' | 'UT' | 'TD';
const GROUPS: ChecklistGroup[] = ['ER', 'VH', 'UT', 'TD'];

const STATUS_COLOR: Record<string, string> = {
  compliant: 'bg-green-100 text-green-800 border-green-300',
  partial: 'bg-amber-100 text-amber-800 border-amber-300',
  'non-compliant': 'bg-red-100 text-red-800 border-red-300',
  'not-applicable': 'bg-slate-100 text-slate-700 border-slate-300',
};

interface Props {
  projectId: string;
  initial: Checklist;
  /** The organisation's own decisions on the organisation-wide requirements. */
  orgChecklist: Checklist;
  group: ChecklistGroup;
  onChanged: (checklist: Checklist) => void;
  onClose: () => void;
}

/** Product-level CRA checklist: one decision per requirement, with the implementation guidance inline. */
export function CraChecklist({ projectId, initial, orgChecklist, group: initialGroup, onChanged, onClose }: Props) {
  const t = useJourneyT().checklist;
  const nodes = useDiagramStore((s) => s.nodes);
  const [checklist, setChecklist] = useState<Checklist>(initial);
  const [group, setGroup] = useState<ChecklistGroup>(initialGroup);

  // How many components already carry a mapping per requirement (older projects)
  const componentMappings = useMemo(() => {
    const count = new Map<string, number>();
    for (const n of nodes) {
      for (const m of (n.data?.cra ?? []) as CRAMapping[]) {
        const id = resolveCRARequirement(m.requirementId)?.id;
        if (id) count.set(id, (count.get(id) ?? 0) + 1);
      }
    }
    return count;
  }, [nodes]);

  async function update(requirementId: string, entry: { status: string; note?: string } | null) {
    const next = await saveCraChecklistEntry(projectId, requirementId, entry);
    setChecklist(next);
    onChanged(next);
  }

  const requirements = CRA_REQUIREMENTS.filter((r) => r.id.startsWith(`${group}.`));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2 border-b border-[#e5e1d8] px-5 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#1a1714]">{t.title}</h3>
            <button onClick={onClose} className="text-[#9b9590] hover:text-[#1a1714]"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-xs text-[#6b6460]">{t.intro}</p>
          <div className="flex flex-wrap gap-1.5">
            {GROUPS.map((g) => {
              const ids = CRA_REQUIREMENTS.filter((r) => r.id.startsWith(`${g}.`)).map((r) => r.id);
              const done = ids.filter((id) => checklist[id]).length;
              return (
                <button key={g} onClick={() => setGroup(g)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${group === g ? 'border-[#1a1714] bg-[#1a1714] text-white' : 'border-[#e5e1d8] text-[#6b6460] hover:bg-[#f4f1ec]'}`}>
                  {t.groups[g]} · {done}/{ids.length}
                </button>
              );
            })}
          </div>
        </div>

        <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {requirements.map((req) => {
            const entry = checklist[req.id];
            const mapped = componentMappings.get(req.id) ?? 0;
            // an organisation-wide requirement either shows the organisation's decision or the product's own override
            const org = isOrgRequirement(req.id) ? orgChecklist[req.id] : undefined;
            const inherited = !!org && !!entry && entry.status === org.status && (entry.note ?? '') === (org.note ?? '');
            const differs = !!org && !!entry && !inherited;
            return (
              <li key={req.id} className="rounded-lg border border-[#e5e1d8] p-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-[11px] text-[#9b9590]">{req.id}</span>
                  <span className="text-sm font-semibold text-[#1a1714]">{req.title}</span>
                  <span className="text-[10px] text-[#9b9590]">{req.craRef}</span>
                  {mapped > 0 && <span className="rounded bg-[#f4f1ec] px-1.5 py-0.5 text-[10px] text-[#6b6460]">{t.componentHint(mapped)}</span>}
                  {inherited && <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">{t.org.inherited}</span>}
                  {differs && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">{t.org.differs}</span>}
                </div>
                <p className="mt-1 text-xs text-[#6b6460]">{req.description}</p>
                <CraGuidanceDetails requirementId={req.id} />
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {COMPLIANCE_STATUSES.map((s) => (
                    <button key={s} onClick={() => update(req.id, { status: s, note: entry?.note })}
                      className={`rounded border px-2.5 py-1 text-[11px] font-medium ${entry?.status === s ? STATUS_COLOR[s] : 'border-transparent bg-[#f4f1ec] text-[#6b6460] hover:bg-[#e5e1d8]'}`}>
                      {t.status[s]}
                    </button>
                  ))}
                  {entry && !inherited && <button onClick={() => update(req.id, null)} className="ml-1 text-[11px] text-[#9b9590] underline">{differs ? t.org.reset : t.clear}</button>}
                  {inherited && <a href="/organisation" target="_blank" rel="noopener noreferrer" className="ml-1 text-[11px] text-[#4f46e5] underline">{t.org.change}</a>}
                </div>
                {entry && (
                  <textarea
                    key={`${req.id}-${entry.status}`}
                    defaultValue={entry.note ?? ''}
                    placeholder={t.note}
                    rows={2}
                    maxLength={2000}
                    onBlur={(e) => e.target.value !== (entry.note ?? '') && update(req.id, { status: entry.status, note: e.target.value })}
                    className="mt-2 w-full rounded border border-[#e5e1d8] bg-[#faf9f7] px-2 py-1.5 text-xs focus:border-[#4f46e5] focus:outline-none"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
