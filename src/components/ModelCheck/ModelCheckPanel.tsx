'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ListChecks, X } from 'lucide-react';
import { useDiagramStore } from '@/store/diagramStore';
import { getModelCheckDismissed, setModelCheckDismissal } from '@/actions/modelCheck';
import { getJourneyData } from '@/actions/productInfo';
import { applyDismissals, checkModel, type Finding } from '@/utils/modelCheck';
import { findingText, useModelCheckT } from '@/i18n/modelCheck';
import type { AttackPath } from '@/utils/attackPaths';
import type { Threat } from '@/types';

interface Props {
  projectId: string;
  onClose: () => void;
  onHighlight: (path: AttackPath | null) => void;
}

const SEVERITY_STYLE = { high: 'bg-red-100 text-red-800', medium: 'bg-amber-100 text-amber-800', low: 'bg-slate-100 text-slate-700' } as const;

/** Highlights the elements of a finding with the attack-path mechanism of the canvas. */
function asPath(f: Finding): AttackPath {
  return {
    id: f.id, nodeIds: f.nodeIds, edgeIds: f.edgeIds, entryNodeId: f.nodeIds[0] ?? '', targetNodeId: f.nodeIds.at(-1) ?? '',
    score: f.severity === 'high' ? 85 : f.severity === 'medium' ? 60 : 30,
    riskLevel: f.severity === 'high' ? 'critical' : f.severity === 'medium' ? 'high' : 'low',
    hops: [],
  };
}

export function ModelCheckPanel({ projectId, onClose, onHighlight }: Props) {
  const t = useModelCheckT();
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const updateNodeData = useDiagramStore((s) => s.updateNodeData);
  const [dismissedMap, setDismissedMap] = useState<Record<string, string>>({});
  const [decided, setDecided] = useState<Set<string>>(new Set());
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    getModelCheckDismissed(projectId).then(setDismissedMap).catch(() => {});
    getJourneyData(projectId).then((d) => setDecided(new Set(Object.keys(d.checklist)))).catch(() => {});
    return () => onHighlight(null);
  }, [projectId]);

  const findings = useMemo(() => checkModel({ nodes, edges, decidedRequirements: decided }), [nodes, edges, decided]);
  const { open, dismissed } = useMemo(() => applyDismissals(findings, dismissedMap), [findings, dismissedMap]);

  function show(f: Finding) {
    setSelected(f.id);
    onHighlight(asPath(f));
  }

  function adopt(f: Finding) {
    const node = nodes.find((n) => n.id === f.nodeIds[0]);
    if (!node || !f.suggestedThreat) return;
    const threats = (node.data.threats ?? []) as Threat[];
    if (threats.some((x) => x.id === `rule-${f.id}`)) return;
    updateNodeData(node.id, { threats: [...threats, { id: `rule-${f.id}`, source: 'rule', ...f.suggestedThreat }] });
  }

  const adoptedIds = new Set(nodes.flatMap((n) => ((n.data.threats ?? []) as Threat[]).map((x) => x.id)));

  async function confirmDismiss(f: Finding) {
    if (!reason.trim()) return;
    setDismissedMap(await setModelCheckDismissal(projectId, f.id, reason.trim()));
    setReasonFor(null);
    setReason('');
  }

  return (
    <div className="flex h-full w-[360px] shrink-0 flex-col border-l border-[#e5e1d8] bg-white">
      <div className="flex items-center justify-between border-b border-[#e5e1d8] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#1a1917]">
          <ListChecks size={15} className="text-[#6b6460]" />{t.panel.title}
          <span className="rounded-full bg-[#f4f1ec] px-2 py-0.5 text-[11px] font-normal text-[#6b6460]">{t.panel.open(open.length)}</span>
        </div>
        <button onClick={onClose} title={t.panel.close} className="text-[#9b9590] hover:text-[#1a1917]"><X size={14} /></button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <p className="text-xs text-[#6b6460]">{t.panel.intro}</p>
        <p className="text-[11px] text-[#9b9590]">{t.panel.howto}</p>

        {open.length === 0 && <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">{t.panel.clean}</p>}

        {open.map((f) => {
          const text = findingText(t, f);
          const isAdopted = adoptedIds.has(`rule-${f.id}`);
          return (
            <div key={f.id} className={`space-y-1.5 rounded-lg border p-3 ${selected === f.id ? 'border-[#1a1917]' : 'border-[#e5e1d8]'}`}>
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${SEVERITY_STYLE[f.severity]}`}>{t.panel.severity[f.severity]}</span>
                <p className="text-xs font-semibold text-[#1a1917]">{text.title}</p>
              </div>
              <p className="text-[11px] leading-relaxed text-[#6b6460]">{text.why}</p>
              <p className="text-[11px] leading-relaxed text-[#3d3a36]">{text.fix}</p>
              <p className="text-[10px] text-[#9b9590]">{t.panel.refs}: {[...f.craRefs, ...f.iecRefs].join(', ')}</p>

              {reasonFor === f.id ? (
                <div className="space-y-1.5">
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.panel.reasonPlaceholder} rows={2} maxLength={1000}
                    className="w-full rounded border border-[#e5e1d8] bg-[#faf9f7] px-2 py-1.5 text-xs focus:border-[#4f46e5] focus:outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => confirmDismiss(f)} disabled={!reason.trim()} className="rounded bg-[#1a1917] px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-40">{t.panel.confirmDismiss}</button>
                    <button onClick={() => { setReasonFor(null); setReason(''); }} className="text-[11px] text-[#6b6460] underline">{t.panel.cancel}</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <button onClick={() => show(f)} className="rounded border border-[#e5e1d8] px-2 py-1 text-[11px] text-[#3d3a36] hover:bg-[#f4f1ec]">{t.panel.show}</button>
                  {f.suggestedThreat && (
                    <button onClick={() => adopt(f)} disabled={isAdopted} className="rounded border border-[#e5e1d8] px-2 py-1 text-[11px] text-[#3d3a36] hover:bg-[#f4f1ec] disabled:opacity-50">
                      {isAdopted ? t.panel.adopted : t.panel.adopt}
                    </button>
                  )}
                  <button onClick={() => setReasonFor(f.id)} className="rounded border border-[#e5e1d8] px-2 py-1 text-[11px] text-[#6b6460] hover:bg-[#f4f1ec]">{t.panel.dismiss}</button>
                </div>
              )}
            </div>
          );
        })}

        {dismissed.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#9b9590]"><AlertTriangle size={12} />{t.panel.dismissed(dismissed.length)}</p>
            {dismissed.map(({ finding, reason: why }) => (
              <div key={finding.id} className="rounded-lg border border-dashed border-[#e5e1d8] p-2.5">
                <p className="text-[11px] font-medium text-[#6b6460]">{findingText(t, finding).title}</p>
                <p className="text-[11px] italic text-[#9b9590]">{why}</p>
                <button onClick={async () => setDismissedMap(await setModelCheckDismissal(projectId, finding.id, null))} className="text-[11px] text-indigo-600 underline">{t.panel.restore}</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
