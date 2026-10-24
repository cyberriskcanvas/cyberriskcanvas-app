'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { ChevronDown, ChevronRight, Pencil, Trash2, Bookmark, BookMarked, Globe, Plus } from 'lucide-react';
import { useDiagramStore } from '@/store/diagramStore';
import { useProjectStore } from '@/store/projectStore';
import { usePanelsT } from '@/i18n/panels';
import { buildFlow, type FlowCard, type FlowStep } from '@/utils/riskFlow';
import type { Measure, NodeData, Risk, Threat } from '@/types';
import { saveToLibrary, saveToTeamLibrary } from '@/actions/threatLibrary';
import { cn } from '@/utils/cn';
import { ThreatsTab, STRIDE_COLORS, STRIDE_LABELS, STRIDE_RISK_DEFAULTS } from './ThreatsTab';
import { RisksTab, LEVEL_COLORS } from './RisksTab';
import { MeasuresTab } from './MeasuresTab';

const STEP_STYLE: Record<FlowStep, string> = {
  confirm: 'bg-amber-100 text-amber-800 border-amber-300',
  rate: 'bg-blue-100 text-blue-800 border-blue-300',
  measure: 'bg-orange-100 text-orange-800 border-orange-300',
  implement: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  done: 'bg-green-100 text-green-800 border-green-300',
};

const inputClass = 'w-full rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none';

interface Props {
  nodeId: string;
  nodeType: string;
  data: NodeData;
  readOnly?: boolean;
}

/**
 * One card per threat, the whole way from suggestion to implemented measure:
 * confirm, rate, treat. The card that needs a person first starts open.
 */
export function RiskFlowTab({ nodeId, nodeType, data, readOnly = false }: Props) {
  const { t } = usePanelsT();
  const f = t.flow;
  const { updateNodeData } = useDiagramStore();
  const threats = (data.threats ?? []) as Threat[];
  const risks = (data.risks ?? []) as Risk[];
  const measures = (data.measures ?? []) as Measure[];
  const flow = useMemo(() => buildFlow(threats, risks, measures), [threats, risks, measures]);
  const { orphanRisks } = flow;
  const looseMeasures = measures.filter((m) => !m.riskId || !risks.some((r) => r.id === m.riskId));

  // The cards that need a person come first and the first of them starts open. The order is fixed while
  // the tab is open, so the card being worked on does not jump when its step changes.
  const [order, setOrder] = useState<string[]>(() => flow.cards.map((c) => c.threat.id));
  const [open, setOpenId] = useState<string | null>(() => flow.cards.find((c) => c.step !== 'done')?.threat.id ?? null);
  const knownIds = useRef(order);
  const idKey = flow.cards.map((c) => c.threat.id).join('|');
  useEffect(() => {
    const now = flow.cards.map((c) => c.threat.id);
    const added = now.filter((id) => !knownIds.current.includes(id));
    knownIds.current = now;
    setOrder((o) => [...added, ...o.filter((id) => now.includes(id))]);
    if (added.length > 0) setOpenId(added[0]);
  }, [idKey]);
  const cards = order.map((id) => flow.cards.find((c) => c.threat.id === id)).filter((c): c is FlowCard => !!c);
  const [showAdd, setShowAdd] = useState(false);
  const drafts = threats.filter((th) => th.draft);

  const saveThreats = (next: Threat[]) => updateNodeData(nodeId, { threats: next });
  const confirmAll = () => saveThreats(threats.map((th) => (th.draft ? { ...th, draft: undefined } : th)));

  return (
    <div className="flex flex-col gap-3 p-4">
      {drafts.length > 1 && !readOnly && (
        <button onClick={confirmAll} className="self-start rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100">
          {f.confirmAll(drafts.length)}
        </button>
      )}

      {cards.map((card) => (
        <ThreatCard
          key={card.threat.id}
          card={card}
          nodeId={nodeId}
          data={data}
          readOnly={readOnly}
          open={open === card.threat.id}
          onToggle={() => setOpenId(open === card.threat.id ? null : card.threat.id)}
        />
      ))}

      {orphanRisks.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#6b6460]">{f.orphanRisks}</p>
          {orphanRisks.map((r) => (
            <div key={r.id} className="space-y-2 rounded-lg border border-[#e5e1d8] bg-white p-3">
              <div className="flex items-center gap-2 text-xs">
                <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-bold', LEVEL_COLORS[r.level])}>{r.level.toUpperCase()}</span>
                <span className="text-[#6b6460]">L={r.likelihood} × I={r.impact}</span>
                <button onClick={() => updateNodeData(nodeId, { risks: risks.filter((x) => x.id !== r.id) })} className="ml-auto text-[#c8c0b0] hover:text-red-600"><Trash2 size={13} /></button>
              </div>
              <MeasuresTab nodeId={nodeId} data={data} readOnly={readOnly} riskId={r.id} />
            </div>
          ))}
        </section>
      )}

      {looseMeasures.length > 0 && (
        <section className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#6b6460]">{f.otherMeasures}</p>
          <MeasuresTab nodeId={nodeId} data={data} readOnly={readOnly} riskId={null} />
        </section>
      )}

      {threats.length === 0 ? (
        <ThreatsTab nodeId={nodeId} nodeType={nodeType} data={data} addOnly />
      ) : !readOnly && (
        <div>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-1.5 rounded border border-[#e5e1d8] px-2.5 py-1.5 text-xs font-medium text-[#6b6460] hover:border-[#1e293b] hover:text-[#1e293b]"
          >
            <Plus size={12} />{f.addThreat}
          </button>
          {showAdd && <div className="-mx-4 mt-2 border-t border-[#e5e1d8]"><ThreatsTab nodeId={nodeId} nodeType={nodeType} data={data} addOnly /></div>}
        </div>
      )}
      {threats.length === 0 && <p className="text-center text-xs text-[#9b9590]">{f.noThreats}</p>}
    </div>
  );
}

function ThreatCard({ card, nodeId, data, readOnly, open, onToggle }: { card: FlowCard; nodeId: string; data: NodeData; readOnly: boolean; open: boolean; onToggle: () => void }) {
  const { t } = usePanelsT();
  const f = t.flow;
  const { updateNodeData } = useDiagramStore();
  const projectId = useProjectStore((s) => s.projectId);
  const threats = (data.threats ?? []) as Threat[];
  const risks = (data.risks ?? []) as Risk[];
  const { threat, risk, measures, step } = card;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(threat.name);
  const [description, setDescription] = useState(threat.description ?? '');
  const [cweId, setCweId] = useState(threat.cweId ?? '');
  const [savedLib, setSavedLib] = useState(false);
  const [savedTeam, setSavedTeam] = useState(false);
  const [pending, startTransition] = useTransition();

  const patchThreat = (patch: Partial<Threat>) => updateNodeData(nodeId, { threats: threats.map((th) => (th.id === threat.id ? { ...th, ...patch } : th)) });
  const remove = () => updateNodeData(nodeId, { threats: threats.filter((th) => th.id !== threat.id), risks: risks.filter((r) => r.threatId !== threat.id) });
  const saveEdit = () => {
    if (!name.trim()) return;
    patchThreat({ name: name.trim(), description: description.trim() || undefined, cweId: cweId.trim() || undefined });
    setEditing(false);
  };
  const entry = { name: threat.name, stride: threat.stride, cweId: threat.cweId, description: threat.description };
  const bookmark = (team: boolean) => {
    if (!projectId) return;
    startTransition(async () => {
      try {
        if (team) { await saveToTeamLibrary(projectId, entry, data.componentType as string | undefined); setSavedTeam(true); }
        else { await saveToLibrary(projectId, entry, data.componentType as string | undefined); setSavedLib(true); }
      } catch { /* project has no team: nothing to save to */ }
    });
  };

  return (
    <div className={cn('rounded-lg border bg-white', open ? 'border-indigo-300' : 'border-[#e5e1d8]')}>
      <button onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
        {open ? <ChevronDown size={14} className="shrink-0 text-[#6b6460]" /> : <ChevronRight size={14} className="shrink-0 text-[#6b6460]" />}
        <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold', STRIDE_COLORS[threat.stride])}>{threat.stride}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#1a1917]">{threat.name}</span>
        {risk && <span className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold', LEVEL_COLORS[risk.level])}>{risk.level.toUpperCase()}</span>}
        <span className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold', STEP_STYLE[step])}>{f.steps[step]}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-[#f0ede6] px-3 pb-3 pt-2">
          <p className="text-xs text-[#6b6460]">{f.hint[step]}</p>

          {editing ? (
            <div className="space-y-2 rounded-lg border border-[#e5e1d8] bg-[#faf9f7] p-2.5">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={f.name} className={inputClass} />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={f.description} rows={2} className={cn(inputClass, 'resize-none')} />
              <input value={cweId} onChange={(e) => setCweId(e.target.value)} placeholder={f.cwe} className={inputClass} />
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={!name.trim()} className="rounded bg-[#1e293b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#374151] disabled:opacity-40">{f.save}</button>
                <button onClick={() => setEditing(false)} className="rounded px-3 py-1.5 text-xs text-[#6b6460] hover:bg-[#f4f1ec]">{f.cancel}</button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 text-xs text-[#6b6460]">
                <span>{STRIDE_LABELS[threat.stride]}</span>
                {threat.cweId && <span className="ml-2 rounded bg-[#f4f1ec] px-1.5 py-0.5 font-mono text-[10px]">{threat.cweId}</span>}
                {threat.description && <p className="mt-1">{threat.description}</p>}
              </div>
              {!readOnly && (
                <div className="flex shrink-0 items-center gap-1.5">
                  {projectId && (
                    <>
                      <button onClick={() => bookmark(false)} disabled={savedLib || pending} title="Save to project library" className={cn('transition-colors disabled:opacity-40', savedLib ? 'text-indigo-500' : 'text-[#c8c0b0] hover:text-indigo-500')}>
                        {savedLib ? <BookMarked size={13} /> : <Bookmark size={13} />}
                      </button>
                      <button onClick={() => bookmark(true)} disabled={savedTeam || pending} title="Save to team library" className={cn('transition-colors disabled:opacity-40', savedTeam ? 'text-emerald-500' : 'text-[#c8c0b0] hover:text-emerald-500')}>
                        <Globe size={13} />
                      </button>
                    </>
                  )}
                  <button onClick={() => setEditing(true)} title={f.edit} className="text-[#c8c0b0] hover:text-[#1e293b]"><Pencil size={13} /></button>
                  <button onClick={remove} title={f.delete} className="text-[#c8c0b0] hover:text-red-600"><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          )}

          {threat.draft ? (
            !readOnly && (
              <div className="flex gap-2">
                <button onClick={() => patchThreat({ draft: undefined })} className="rounded bg-[#1e293b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#374151]">{f.confirm}</button>
                <button onClick={remove} className="rounded border border-[#e5e1d8] px-3 py-1.5 text-xs text-[#6b6460] hover:border-red-300 hover:text-red-600">{f.delete}</button>
              </div>
            )
          ) : (
            <>
              {!readOnly || risk ? (
                <section>
                  <p className="-mb-3 text-[10px] font-bold uppercase tracking-wide text-[#6b6460]">{f.rating}</p>
                  <div className="-mx-4"><RisksTab nodeId={nodeId} data={data} threatId={threat.id} defaults={STRIDE_RISK_DEFAULTS[threat.stride]} /></div>
                </section>
              ) : null}
              {risk && (
                <section>
                  <p className="-mb-3 text-[10px] font-bold uppercase tracking-wide text-[#6b6460]">{f.measures}</p>
                  <div className="-mx-4"><MeasuresTab nodeId={nodeId} data={data} readOnly={readOnly} riskId={risk.id} /></div>
                </section>
              )}
            </>
          )}
        </div>
      )}
      {measures.length > 0 && !open && (
        <p className="border-t border-[#f0ede6] px-3 py-1 text-[10px] text-[#9b9590]">{measures.length} {f.measures.toLowerCase()}</p>
      )}
    </div>
  );
}
