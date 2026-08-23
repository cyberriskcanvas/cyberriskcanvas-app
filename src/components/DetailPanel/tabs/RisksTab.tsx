'use client';

import { useState } from 'react';
import { Plus, Trash2, Activity, Sparkles, Calculator, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useDiagramStore } from '@/store/diagramStore';
import type { NodeData, Risk, RiskLevel, Threat, Asset } from '@/types';
import {
  BSI_INTERFACE_OPTIONS,
  BSI_ACCESS_OPTIONS,
  BSI_USER_OPTIONS,
  type BSIInterfaceRestriction,
  type BSIAccessRestriction,
  type BSIUserCapability,
  calculateBSILikelihood,
} from '@/data/bsiEnvironment';
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

export function calcRiskLevel(likelihood: number, impact: number): RiskLevel {
  const score = likelihood * impact;
  if (score >= 20) return 'critical';
  if (score >= 12) return 'high';
  if (score >= 6) return 'medium';
  if (score >= 2) return 'low';
  return 'negligible';
}

const LEVEL_COLORS: Record<RiskLevel, string> = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-green-100 text-green-800 border-green-300',
  negligible: 'bg-[#f4f1ec] text-[#6b6460] border-[#e5e1d8]',
};

const STATUS_COLORS = {
  open: 'bg-red-100 text-red-700',
  'in-progress': 'bg-yellow-100 text-yellow-700',
  mitigated: 'bg-green-100 text-green-700',
};

const inputClass =
  'w-full rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none';
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
              'h-5 w-5 rounded-xs opacity-60',
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
        <span>L=1</span>
        <span>Likelihood →</span>
        <span>L=5</span>
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
  const assets = (data.assets ?? []) as Asset[];
  const t = useT();

  const [threatId, setThreatId] = useState('');
  const [likelihood, setLikelihood] = useState<Risk['likelihood']>(3);
  const [impact, setImpact] = useState<Risk['impact']>(3);
  const [mitigation, setMitigation] = useState('');
  const [acceptanceReason, setAcceptanceReason] = useState('');

  // BSI Environment Calculator State
  const [showBsiCalc, setShowBsiCalc] = useState(false);
  const [iface, setIface] = useState<BSIInterfaceRestriction>('external_network');
  const [access, setAccess] = useState<BSIAccessRestriction>('non_restricted');
  const [userCap, setUserCap] = useState<BSIUserCapability>('layman');

  // Compute highest impact from assets if available
  const maxAssetImpact = assets.reduce((max, a) => {
    const c = a.confidentiality ?? 1;
    const i = a.integrity ?? 1;
    const av = a.availability ?? 1;
    const amp = a.amplifier ?? 1;
    const effective = Math.min(5, Math.max(1, Math.round(Math.max(c, i, av) * amp)));
    return Math.max(max, effective);
  }, 1);

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

  const applyBsiCalculator = () => {
    const calculatedL = calculateBSILikelihood(iface, access, userCap);
    setLikelihood(calculatedL);
    if (assets.length > 0) {
      setImpact((Math.min(5, Math.max(1, maxAssetImpact))) as Risk['impact']);
    }
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
        bsiEnvironment: showBsiCalc
          ? {
              interface: iface,
              access,
              userCapability: userCap,
              calculatedLikelihood: likelihood,
            }
          : undefined,
        acceptanceReason: acceptanceReason.trim() || undefined,
      },
    ]);
    setMitigation('');
    setThreatId('');
    setAcceptanceReason('');
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
            const score = r.likelihood * r.impact;
            const requiresTreatment = score >= 6;

            return (
              <div key={r.id} className={cn('rounded-lg border p-3 shadow-xs', LEVEL_COLORS[r.level])}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold border', LEVEL_COLORS[r.level])}>
                        {r.level.toUpperCase()}
                      </span>
                      {threat && <span className="text-xs font-semibold text-[#1a1917]">{threat.name}</span>}
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-[11px] text-[#6b6460]">
                      <span>
                        L={r.likelihood} × I={r.impact} = <strong>{score}</strong>
                      </span>
                      {requiresTreatment ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                          BSI: Behandlungspflichtig
                        </span>
                      ) : (
                        <span className="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-800">
                          BSI: Akzeptabel
                        </span>
                      )}
                    </div>

                    {r.bsiEnvironment && (
                      <p className="mt-1 text-[10px] text-[#6b6460] font-mono bg-white/60 rounded px-1.5 py-0.5 inline-block">
                        Umgebung: {r.bsiEnvironment.interface} / {r.bsiEnvironment.access} / {r.bsiEnvironment.userCapability}
                      </p>
                    )}

                    {r.mitigation && <p className="mt-1 text-xs text-[#6b6460] line-clamp-2">{r.mitigation}</p>}
                    {r.acceptanceReason && (
                      <p className="mt-1 text-xs text-amber-800 italic bg-amber-50 rounded p-1.5 border border-amber-200">
                        Begründung für Akzeptanz: {r.acceptanceReason}
                      </p>
                    )}

                    <div className="mt-2 flex gap-1">
                      {(['open', 'in-progress', 'mitigated'] as Risk['status'][]).map((s) => (
                        <button
                          key={s}
                          onClick={() => updateStatus(r.id, s)}
                          className={cn(
                            'rounded px-2 py-0.5 text-[10px] font-medium transition-all',
                            r.status === s ? STATUS_COLORS[s] : inactiveBtn,
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => remove(r.id)}
                    className="text-[#6b6460] hover:text-red-600 shrink-0 p-1"
                    title="Löschen"
                  >
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
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#1a1917] uppercase tracking-wide">{t.risks.addRiskEntry}</p>
          <button
            type="button"
            onClick={() => setShowBsiCalc(!showBsiCalc)}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-1 rounded border border-indigo-200"
          >
            <Calculator size={12} />
            BSI Umgebungs-Rechner
            {showBsiCalc ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {/* BSI Environment Calculator Panel (TR-03183-1 Annex D) */}
        {showBsiCalc && (
          <div className="rounded-lg border border-indigo-200 bg-white p-3 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
              <ShieldCheck size={14} className="text-indigo-600" />
              <span>BSI TR-03183-1 Umgebungsszenario (Likelihood &amp; Impact)</span>
            </div>
            <p className="text-[10px] text-[#6b6460]">
              Berechnet die Eintrittswahrscheinlichkeit objektiv anhand der Schnittstellen-, Zugangs- und Nutzerparameter.
            </p>

            <div>
              <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-0.5">Schnittstellenbeschränkung:</label>
              <select
                value={iface}
                onChange={(e) => setIface(e.target.value as BSIInterfaceRestriction)}
                className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1917]"
              >
                {BSI_INTERFACE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} (Faktor {opt.factor})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-0.5">Zugangsbeschränkung:</label>
              <select
                value={access}
                onChange={(e) => setAccess(e.target.value as BSIAccessRestriction)}
                className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1917]"
              >
                {BSI_ACCESS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} (Faktor {opt.factor})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-0.5">Nutzerfähigkeiten:</label>
              <select
                value={userCap}
                onChange={(e) => setUserCap(e.target.value as BSIUserCapability)}
                className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1917]"
              >
                {BSI_USER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} (Faktor {opt.factor})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={applyBsiCalculator}
              className="w-full rounded bg-indigo-600 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Werte berechnen &amp; übernehmen (L={calculateBSILikelihood(iface, access, userCap)}
              {assets.length > 0 ? `, I=${maxAssetImpact}` : ''})
            </button>
          </div>
        )}

        {threats.length > 0 && (
          <div>
            <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-1">{t.risks.linkToThreat}:</label>
            <select value={threatId} onChange={(e) => setThreatId(e.target.value)} className={inputClass}>
              <option value="">{t.risks.linkToThreat}</option>
              {threats.map((th) => (
                <option key={th.id} value={th.id}>
                  [{th.stride}] {th.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-[#6b6460] uppercase">{t.risks.likelihood}:</label>
              <span className="text-xs font-bold text-[#1a1917]">{likelihood} / 5</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={likelihood}
              onChange={(e) => setLikelihood(Number(e.target.value) as Risk['likelihood'])}
              className="w-full accent-[#1e293b]"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-[#6b6460] uppercase">{t.risks.impact}:</label>
              <span className="text-xs font-bold text-[#1a1917]">{impact} / 5</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={impact}
              onChange={(e) => setImpact(Number(e.target.value) as Risk['impact'])}
              className="w-full accent-[#1e293b]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-[#e5e1d8]">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#6b6460] uppercase font-bold">Risikobewertung:</span>
            <span className={cn('rounded px-2 py-0.5 text-xs font-bold border mt-1 w-fit', LEVEL_COLORS[preview])}>
              {preview.toUpperCase()} (Score: {likelihood * impact})
            </span>
          </div>
          <RiskMatrix level={preview} />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-1">Minderungsmaßnahme (Mitigation):</label>
          <input
            value={mitigation}
            onChange={(e) => setMitigation(e.target.value)}
            placeholder={t.risks.mitigationPlaceholder}
            className={inputClass}
          />
        </div>

        {preview !== 'low' && preview !== 'negligible' && (
          <div>
            <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1">
              Begründung falls Restrisiko akzeptiert wird (BSI TR-03183-1 §5.14.3):
            </label>
            <input
              value={acceptanceReason}
              onChange={(e) => setAcceptanceReason(e.target.value)}
              placeholder="z.B. Kompensierende Maßnahme im Netzwerk des Betreibers vorhanden"
              className={inputClass}
            />
          </div>
        )}

        <button
          onClick={addRisk}
          className="flex items-center gap-1.5 rounded bg-[#1e293b] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#374151] transition-colors"
        >
          <Plus size={12} /> {t.risks.addRisk}
        </button>
      </div>
    </div>
  );
}
