import { useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
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
  compliant: 'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  'non-compliant': 'bg-red-100 text-red-700',
  'not-applicable': 'bg-[#f4f1ec] text-[#6b6460]',
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

  const getStatus = (reqId: string): ComplianceStatus =>
    mappings.find((m) => m.requirementId === reqId)?.status ?? 'non-compliant';

  const getNotes = (reqId: string): string =>
    mappings.find((m) => m.requirementId === reqId)?.notes ?? '';

  const setStatus = (reqId: string, status: ComplianceStatus) => {
    const next = mappings.filter((m) => m.requirementId !== reqId);
    if (status !== 'non-compliant') {
      next.push({ requirementId: reqId, status, notes: getNotes(reqId) || undefined });
    }
    updateNodeData(nodeId, { cra: next });
  };

  const setNotes = (reqId: string, notes: string) => {
    const existing = mappings.find((m) => m.requirementId === reqId);
    const next = mappings.filter((m) => m.requirementId !== reqId);
    next.push({ requirementId: reqId, status: existing?.status ?? 'non-compliant', notes: notes || undefined });
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
      <div className="rounded-xl border border-[#e5e1d8] bg-[#faf9f7] p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className={scoreColor} />
            <span className="text-sm font-semibold text-[#1a1917]">CRA Compliance</span>
            <span className="rounded bg-[#e8f0fe] px-1.5 py-0.5 text-[9px] font-bold text-[#3b5bdb] uppercase tracking-wide">
              EU 2024/2847
            </span>
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

        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px]">
          <div>
            <span className="font-bold text-green-600">{compliance.compliant}</span>
            <br />
            <span className="text-[#6b6460]">Compliant</span>
          </div>
          <div>
            <span className="font-bold text-yellow-600">{compliance.partial}</span>
            <br />
            <span className="text-[#6b6460]">Partial</span>
          </div>
          <div>
            <span className="font-bold text-red-600">{compliance.nonCompliant}</span>
            <br />
            <span className="text-[#6b6460]">Non-compliant</span>
          </div>
        </div>
      </div>

      {/* Requirements by domain */}
      {(Object.keys(DOMAIN_LABELS) as (keyof typeof DOMAIN_LABELS)[]).map((domain) => {
        const reqs = byDomain[domain];
        if (!reqs?.length) return null;
        return (
          <div key={domain}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#6b6460]">
              {DOMAIN_LABELS[domain]}
            </p>
            <div className="space-y-2">
              {reqs.map((req) => {
                const status = getStatus(req.id);
                const notes = getNotes(req.id);
                return (
                  <div key={req.id} className="rounded-lg border border-[#e5e1d8] bg-white p-3">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 rounded bg-[#f4f1ec] px-1.5 py-0.5 font-mono text-[10px] text-[#6b6460] mt-0.5">
                        {req.craRef.split(',')[0].trim()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-[#1a1917]">{req.title}</p>
                          {req.critical && (
                            <span className="shrink-0 rounded bg-red-50 px-1 py-0.5 text-[9px] font-bold text-red-600 uppercase tracking-wide">
                              critical
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#6b6460] line-clamp-2">
                          {req.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {STATUS_OPTS.map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(req.id, s)}
                          className={cn(
                            'rounded px-2 py-0.5 text-[10px] font-medium transition-all',
                            status === s
                              ? STATUS_COLORS[s]
                              : 'bg-[#f4f1ec] text-[#6b6460] hover:bg-[#e5e1d8]',
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {status !== 'non-compliant' && (
                      <input
                        value={notes}
                        onChange={(e) => setNotes(req.id, e.target.value)}
                        placeholder="Notes (optional)"
                        className="mt-2 w-full rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none"
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
