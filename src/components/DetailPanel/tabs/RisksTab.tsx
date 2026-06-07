import { useState } from 'react';
import { Plus, Trash2, Activity, Sparkles } from 'lucide-react';
import { useDiagramStore } from '@/store/diagramStore';
import type { NodeData, Risk, RiskLevel, Threat } from '@/types';
import { useT } from '@/hooks/useT';
import { cn } from '@/utils/cn';

type ExampleEntry = { threat: Omit<Threat, 'id'>; risk: Omit<Risk, 'id' | 'threatId' | 'level'> };

const EXAMPLE_ENTRIES: ExampleEntry[] = [
  {
    threat: { name: 'Unauthorized Firmware Update', stride: 'T', cweId: 'CWE-494' },
    risk: { likelihood: 4, impact: 5, status: 'open', mitigation: 'Enforce secure boot with hardware-rooted signature verification' },
  },
  {
    threat: { name: 'ECU Identity Spoofing', stride: 'S', cweId: 'CWE-290' },
    risk: { likelihood: 3, impact: 4, status: 'open', mitigation: 'Implement message authentication (MAC) on CAN bus frames' },
  },
  {
    threat: { name: 'Diagnostic Data Exfiltration', stride: 'I', cweId: 'CWE-200' },
    risk: { likelihood: 3, impact: 3, status: 'in-progress', mitigation: 'Restrict OBD-II access; require authenticated sessions' },
  },
];

function calcRiskLevel(likelihood: number, impact: number): RiskLevel {
  const score = likelihood * impact;
  if (score >= 20) return 'critical';
  if (score >= 12) return 'high';
  if (score >= 6) return 'medium';
  if (score >= 2) return 'low';
  return 'negligible';
}

const LEVEL_COLORS: Record<RiskLevel, string> = {
  critical: 'bg-red-100 text-red-700 border-red-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  low: 'bg-green-100 text-green-700 border-green-300',
  negligible: 'bg-[#f4f1ec] text-[#6b6460] border-[#e5e1d8]',
};

const STATUS_COLORS = {
  open: 'bg-red-100 text-red-700',
  'in-progress': 'bg-yellow-100 text-yellow-700',
  mitigated: 'bg-green-100 text-green-700',
};

const inputClass = 'w-full rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none';
const inactiveBtn = 'bg-[#f4f1ec] text-[#6b6460] hover:bg-[#e5e1d8]';

function RiskMatrix({ level }: { level: RiskLevel }) {
  const t = useT();
  const cells = Array.from({ length: 25 }, (_, i) => {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const l = col + 1;
    const imp = 5 - row;
    const lv = calcRiskLevel(l, imp);
    return { l, imp, lv };
  });

  return (
    <div>
      <p className="mb-1 text-[10px] text-[#6b6460] text-center">{t.risks.riskMatrix}</p>
      <div className="grid grid-cols-5 gap-px w-fit mx-auto">
        {cells.map((c, i) => (
          <div
            key={i}
            title={`L=${c.l} I=${c.imp} → ${c.lv}`}
            className={cn(
              'h-5 w-5 rounded-sm opacity-60',
              c.lv === 'critical' && 'bg-red-500',
              c.lv === 'high' && 'bg-orange-500',
              c.lv === 'medium' && 'bg-yellow-400',
              c.lv === 'low' && 'bg-green-500',
              c.lv === 'negligible' && 'bg-[#c8c0b0]',
              level === c.lv && 'opacity-100 ring-1 ring-[#1e293b] scale-110',
            )}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-[#c8c0b0]">
        <span>L=1</span><span>Likelihood →</span><span>L=5</span>
      </div>
    </div>
  );
}

interface Props {
  nodeId: string;
  data: NodeData;
}

export function RisksTab({ nodeId, data }: Props) {
  const { updateNodeData } = useDiagramStore();
  const risks = (data.risks ?? []) as Risk[];
  const threats = (data.threats ?? []) as Threat[];
  const t = useT();

  const [threatId, setThreatId] = useState('');
  const [likelihood, setLikelihood] = useState<Risk['likelihood']>(3);
  const [impact, setImpact] = useState<Risk['impact']>(3);
  const [mitigation, setMitigation] = useState('');
  const preview = calcRiskLevel(likelihood, impact);

  const save = (updated: Risk[]) => updateNodeData(nodeId, { risks: updated });

  const loadExamples = () => {
    const newThreats: Threat[] = EXAMPLE_ENTRIES.map((e) => ({ ...e.threat, id: crypto.randomUUID() }));
    const newRisks: Risk[] = EXAMPLE_ENTRIES.map((e, i) => ({
      ...e.risk,
      id: crypto.randomUUID(),
      threatId: newThreats[i].id,
      level: calcRiskLevel(e.risk.likelihood, e.risk.impact),
    }));
    updateNodeData(nodeId, {
      threats: [...threats, ...newThreats],
      risks: [...risks, ...newRisks],
    });
  };

  const addRisk = () => {
    save([
      ...risks,
      {
        id: crypto.randomUUID(),
        threatId,
        likelihood,
        impact,
        level: calcRiskLevel(likelihood, impact),
        mitigation: mitigation.trim() || undefined,
        status: 'open',
      },
    ]);
    setMitigation('');
    setThreatId('');
  };

  const updateStatus = (id: string, status: Risk['status']) =>
    save(risks.map((r) => (r.id === id ? { ...r, status } : r)));

  const remove = (id: string) => save(risks.filter((r) => r.id !== id));

  return (
    <div className="flex flex-col gap-4 p-4">
      {risks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center text-[#c8c0b0]">
          <Activity size={28} />
          <p className="text-sm">{t.risks.noRisks}</p>
          <button
            onClick={loadExamples}
            className="flex items-center gap-1.5 rounded border border-[#e5e1d8] px-3 py-1.5 text-xs font-medium text-[#6b6460] hover:border-[#1e293b] hover:text-[#1e293b] transition-colors"
          >
            <Sparkles size={12} />
            {t.risks.loadExamples}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {risks.map((r) => {
            const threat = threats.find((th) => th.id === r.threatId);
            return (
              <div key={r.id} className={cn('rounded-lg border p-3', LEVEL_COLORS[r.level])}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold border', LEVEL_COLORS[r.level])}>
                        {r.level.toUpperCase()}
                      </span>
                      {threat && <span className="text-xs text-[#1a1917]">{threat.name}</span>}
                    </div>
                    <p className="mt-1 text-[11px] text-[#6b6460]">L={r.likelihood} × I={r.impact} = {r.likelihood * r.impact}</p>
                    {r.mitigation && <p className="mt-1 text-xs text-[#6b6460] line-clamp-2">{r.mitigation}</p>}
                    <div className="mt-2 flex gap-1">
                      {(['open', 'in-progress', 'mitigated'] as Risk['status'][]).map((s) => (
                        <button
                          key={s}
                          onClick={() => updateStatus(r.id, s)}
                          className={cn('rounded px-2 py-0.5 text-[10px] font-medium transition-all', r.status === s ? STATUS_COLORS[s] : inactiveBtn)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => remove(r.id)} className="text-[#c8c0b0] hover:text-red-600 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add form */}
      <div className="rounded-lg border border-[#e5e1d8] bg-[#faf9f7] p-3 space-y-3">
        <p className="text-xs font-semibold text-[#6b6460] uppercase tracking-wide">{t.risks.addRiskEntry}</p>

        {threats.length > 0 && (
          <select value={threatId} onChange={(e) => setThreatId(e.target.value)} className={inputClass}>
            <option value="">{t.risks.linkToThreat}</option>
            {threats.map((th) => <option key={th.id} value={th.id}>{th.name}</option>)}
          </select>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-[#6b6460]">{t.risks.likelihood}</label>
            <input
              type="range" min={1} max={5} value={likelihood}
              onChange={(e) => setLikelihood(Number(e.target.value) as Risk['likelihood'])}
              className="w-full accent-[#1e293b]"
            />
            <p className="text-center text-xs font-bold text-[#1a1917]">{likelihood}</p>
          </div>
          <div>
            <label className="text-[10px] text-[#6b6460]">{t.risks.impact}</label>
            <input
              type="range" min={1} max={5} value={impact}
              onChange={(e) => setImpact(Number(e.target.value) as Risk['impact'])}
              className="w-full accent-[#1e293b]"
            />
            <p className="text-center text-xs font-bold text-[#1a1917]">{impact}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={cn('rounded-lg px-2 py-1 text-xs font-bold border', LEVEL_COLORS[preview])}>
            {preview.toUpperCase()}
          </span>
          <RiskMatrix level={preview} />
        </div>

        <input
          value={mitigation}
          onChange={(e) => setMitigation(e.target.value)}
          placeholder={t.risks.mitigationPlaceholder}
          className={inputClass}
        />

        <button
          onClick={addRisk}
          className="flex items-center gap-1.5 rounded bg-[#1e293b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#374151]"
        >
          <Plus size={12} /> {t.risks.addRisk}
        </button>
      </div>
    </div>
  );
}
