'use client';

import { useMemo } from 'react';
import { ShieldCheck, BookOpen } from 'lucide-react';
import { useDiagramStore } from '@/store/diagramStore';
import type { NodeData, CRAMapping } from '@/types';
import {
  CRA_REQUIREMENTS,
  DOMAIN_LABELS,
  getRequirementsByDomain,
  calculateCRACompliance,
  type ComplianceStatus,
} from '@/data/cra';
import { cn } from '@/utils/cn';

const STATUS_OPTS: ComplianceStatus[] = ['compliant', 'partial', 'non-compliant', 'not-applicable'];

const STATUS_COLORS: Record<ComplianceStatus, string> = {
  compliant: 'bg-green-100 text-green-800 border-green-300 font-semibold',
  partial: 'bg-yellow-100 text-yellow-800 border-yellow-300 font-semibold',
  'non-compliant': 'bg-red-100 text-red-800 border-red-300 font-semibold',
  'not-applicable': 'bg-[#f4f1ec] text-[#6b6460] border-[#e5e1d8]',
};

interface Props {
  nodeId: string;
  data: NodeData;
}

export function CRATab({ nodeId, data }: Props) {
  const { updateNodeData } = useDiagramStore();
  const mappings = (data.cra ?? []) as CRAMapping[];

  const compliance = useMemo(
    () =>
      calculateCRACompliance(
        mappings.map((m) => ({ requirementId: m.requirementId, status: m.status })),
        CRA_REQUIREMENTS,
      ),
    [mappings],
  );

  const byDomain = useMemo(() => getRequirementsByDomain(), []);

  const getStatus = (reqId: string, legacyId?: string): ComplianceStatus => {
    const direct = mappings.find((m) => m.requirementId === reqId);
    if (direct) return direct.status;
    if (legacyId) {
      const legacy = mappings.find((m) => m.requirementId === legacyId);
      if (legacy) return legacy.status;
    }
    return 'non-compliant';
  };

  const getNotes = (reqId: string, legacyId?: string): string => {
    const direct = mappings.find((m) => m.requirementId === reqId);
    if (direct?.notes) return direct.notes;
    if (legacyId) {
      const legacy = mappings.find((m) => m.requirementId === legacyId);
      if (legacy?.notes) return legacy.notes;
    }
    return '';
  };

  const setStatus = (reqId: string, legacyId: string | undefined, status: ComplianceStatus) => {
    const next = mappings.filter((m) => m.requirementId !== reqId && m.requirementId !== legacyId);
    if (status !== 'non-compliant') {
      next.push({ requirementId: reqId, status, notes: getNotes(reqId, legacyId) || undefined });
    }
    updateNodeData(nodeId, { cra: next });
  };

  const setNotes = (reqId: string, legacyId: string | undefined, notes: string) => {
    const existingStatus = getStatus(reqId, legacyId);
    const next = mappings.filter((m) => m.requirementId !== reqId && m.requirementId !== legacyId);
    next.push({ requirementId: reqId, status: existingStatus, notes: notes || undefined });
    updateNodeData(nodeId, { cra: next });
  };

  const scoreColor =
    compliance.score >= 80
      ? 'text-green-600'
      : compliance.score >= 50
        ? 'text-yellow-600'
        : 'text-red-600';

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Score banner */}
      <div className="rounded-xl border border-[#e5e1d8] bg-[#faf9f7] p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className={scoreColor} />
            <div>
              <span className="text-sm font-bold text-[#1a1917]">CRA / BSI TR-03183 Konformität</span>
              <p className="text-[10px] text-[#6b6460]">EU 2024/2847 &amp; BSI TR-03183-1 Anhang B</p>
            </div>
          </div>
          <span className={cn('text-2xl font-bold', scoreColor)}>{compliance.score}%</span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-[#e5e1d8]">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              compliance.score >= 80
                ? 'bg-green-500'
                : compliance.score >= 50
                  ? 'bg-yellow-500'
                  : 'bg-red-500',
            )}
            style={{ width: `${compliance.score}%` }}
          />
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-[10px]">
          <div className="rounded bg-green-50 p-1 border border-green-200">
            <span className="font-bold text-green-700 text-xs">{compliance.compliant}</span>
            <br />
            <span className="text-green-800 font-medium">Konform</span>
          </div>
          <div className="rounded bg-yellow-50 p-1 border border-yellow-200">
            <span className="font-bold text-yellow-700 text-xs">{compliance.partial}</span>
            <br />
            <span className="text-yellow-800 font-medium">Teilweise</span>
          </div>
          <div className="rounded bg-red-50 p-1 border border-red-200">
            <span className="font-bold text-red-700 text-xs">{compliance.nonCompliant}</span>
            <br />
            <span className="text-red-800 font-medium">Offen</span>
          </div>
        </div>
      </div>

      {/* Requirements by domain */}
      {(Object.keys(DOMAIN_LABELS) as (keyof typeof DOMAIN_LABELS)[]).map((domain) => {
        const reqs = byDomain[domain];
        if (!reqs?.length) return null;
        return (
          <div key={domain} className="space-y-2">
            <div className="flex items-center gap-1.5 border-b border-[#e5e1d8] pb-1">
              <BookOpen size={13} className="text-[#3b5bdb]" />
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#1a1917]">
                {DOMAIN_LABELS[domain]}
              </p>
            </div>

            <div className="space-y-2">
              {reqs.map((req) => {
                const status = getStatus(req.id, req.legacyId);
                const notes = getNotes(req.id, req.legacyId);
                return (
                  <div key={req.id} className="rounded-lg border border-[#e5e1d8] bg-white p-3 shadow-xs">
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col items-center shrink-0">
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-900 border border-indigo-200">
                          {req.id}
                        </span>
                        <span className="text-[8px] text-[#6b6460] font-mono mt-0.5">
                          {req.craRef.split(',')[0].trim()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-semibold text-[#1a1917]">{req.title}</p>
                          {req.critical && (
                            <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700 uppercase tracking-wide border border-red-200">
                              Kritisch
                            </span>
                          )}
                          {req.bsiStandard && (
                            <span className="shrink-0 rounded bg-[#f4f1ec] px-1.5 py-0.5 text-[9px] text-[#6b6460] font-mono">
                              {req.bsiStandard.split('/')[0].trim()}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-[#6b6460] leading-relaxed">
                          {req.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {STATUS_OPTS.map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(req.id, req.legacyId, s)}
                          className={cn(
                            'rounded px-2.5 py-1 text-[10px] font-medium border transition-all cursor-pointer',
                            status === s
                              ? STATUS_COLORS[s]
                              : 'bg-[#f4f1ec] text-[#6b6460] border-transparent hover:bg-[#e5e1d8]',
                          )}
                        >
                          {s === 'compliant'
                            ? 'Konform'
                            : s === 'partial'
                              ? 'Teilweise'
                              : s === 'non-compliant'
                                ? 'Nicht erfüllt'
                                : 'Nicht anwendbar'}
                        </button>
                      ))}
                    </div>

                    {status !== 'non-compliant' && (
                      <input
                        value={notes}
                        onChange={(e) => setNotes(req.id, req.legacyId, e.target.value)}
                        placeholder="Begründung / Nachweisdokument (Annex VII)..."
                        className="mt-2 w-full rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-xs text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
