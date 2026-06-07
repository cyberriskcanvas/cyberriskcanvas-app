'use client';

import { useState } from 'react';
import { X, Layers, Car, Wifi, Cloud, HelpCircle, AlertTriangle, Database, Activity, ShieldCheck, ChevronDown, ChevronUp, Factory } from 'lucide-react';
import { TEMPLATES, type Template } from '@/data/templates';
import { useDiagramStore } from '@/store/diagramStore';
import { cn } from '@/utils/cn';
import type { Threat, Asset, Risk } from '@/types';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  automotive: Car,
  industrial: Factory,
  iot: Wifi,
  cloud: Cloud,
};

const CATEGORY_COLORS: Record<string, string> = {
  automotive: 'text-blue-600 bg-blue-50',
  industrial: 'text-orange-600 bg-orange-50',
  iot: 'text-green-600 bg-green-50',
  cloud: 'text-cyan-600 bg-cyan-50',
};

const CATEGORY_LABELS: Record<string, string> = {
  industrial: 'OT / Industrial',
  iot: 'IoT / Embedded',
  automotive: 'Automotive',
  cloud: 'Cloud / Software',
};

const CATEGORY_ORDER = ['industrial', 'iot', 'automotive', 'cloud'] as const;

const STRIDE_META: Array<{ key: Threat['stride']; label: string; color: string; example: string }> = [
  { key: 'S', label: 'Spoofing', color: 'bg-red-100 text-red-700', example: 'ECU impersonates another node and sends forged CAN frames' },
  { key: 'T', label: 'Tampering', color: 'bg-orange-100 text-orange-700', example: 'Firmware replaced with malware without signature verification' },
  { key: 'R', label: 'Repudiation', color: 'bg-yellow-100 text-yellow-700', example: 'Admin actions are not logged - evidence is missing' },
  { key: 'I', label: 'Info Disclosure', color: 'bg-blue-100 text-blue-700', example: 'Sensor telemetry transmitted unencrypted over radio' },
  { key: 'D', label: 'Denial of Service', color: 'bg-purple-100 text-purple-700', example: 'Packet flood on CAN bus crashes a safety-critical ECU' },
  { key: 'E', label: 'Elevation of Privilege', color: 'bg-pink-100 text-pink-700', example: 'Buffer overflow in firmware parser allows root access' },
];

const ASSET_CATEGORY_COLORS: Record<Asset['category'], string> = {
  financial: 'bg-yellow-50 text-yellow-700',
  operational: 'bg-blue-50 text-blue-700',
  privacy: 'bg-purple-50 text-purple-700',
  safety: 'bg-red-50 text-red-700',
  other: 'bg-gray-100 text-gray-600',
};

const RISK_LEVEL_COLORS: Record<string, string> = {
  critical: 'text-red-600',
  high: 'text-orange-600',
  medium: 'text-yellow-600',
  low: 'text-green-600',
  negligible: 'text-gray-400',
};

function getTemplateCounts(t: Template) {
  let threats = 0, assets = 0, risks = 0;
  for (const n of t.nodes) {
    threats += (n.data.threats as Threat[] | undefined)?.length ?? 0;
    assets += (n.data.assets as Asset[] | undefined)?.length ?? 0;
    risks += (n.data.risks as Risk[] | undefined)?.length ?? 0;
  }
  return { threats, assets, risks };
}

// ─── Help Popover ─────────────────────────────────────────────────────────────

function HelpPopover({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-y-auto max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="font-semibold text-gray-900 text-sm">Assessment Fields Explained</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Assets */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Database size={14} className="text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-blue-600">Assets – What are we protecting?</h4>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Assets are values worth protecting within a component. Categories:
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {(['operational', 'safety', 'privacy', 'financial'] as Asset['category'][]).map((c) => (
                <div key={c} className={cn('rounded px-2 py-1', ASSET_CATEGORY_COLORS[c])}>
                  <span className="font-semibold capitalize">{c}</span>
                  <span className="ml-1 text-gray-500">
                    {c === 'operational' && '- Firmware, routing config'}
                    {c === 'safety' && '- Brake logic, safety interlocks'}
                    {c === 'privacy' && '- GPS data, telemetry'}
                    {c === 'financial' && '- Payment data, licenses'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Threats / STRIDE */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-orange-600" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-orange-600">Threats – STRIDE Categories</h4>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              STRIDE is a threat model. Each threat is assigned to one of 6 categories:
            </p>
            <div className="space-y-2">
              {STRIDE_META.map((s) => (
                <div key={s.key} className="flex items-start gap-2">
                  <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold', s.color)}>
                    {s.key}
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-gray-800">{s.label}</span>
                    <p className="text-[11px] text-gray-400 mt-0.5">{s.example}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Risks */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Activity size={14} className="text-yellow-600" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-yellow-600">Risks – How severe is it?</h4>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Each risk links a threat to a rating of <strong className="text-gray-800">Likelihood (1–5)</strong> × <strong className="text-gray-800">Impact (1–5)</strong>:
            </p>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              {[['critical', '≥ 20 (e.g. 4×5)'], ['high', '12–19 (e.g. 3×5)'], ['medium', '6–11 (e.g. 2×4)'], ['low', '2–5 (e.g. 1×3)']].map(([l, ex]) => (
                <div key={l} className={cn('font-semibold', RISK_LEVEL_COLORS[l])}>
                  {l} <span className="font-normal text-gray-400">{ex}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Security Level */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={14} className="text-indigo-600" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-600">Security Level (IEC 62443)</h4>
            </div>
            <div className="space-y-1 text-[11px]">
              {[
                ['SL-1', 'Protection against unintentional errors (e.g. misuse)'],
                ['SL-2', 'Protection against intentional attacks with simple means'],
                ['SL-3', 'Protection against attacks with advanced resources'],
                ['SL-4', 'Protection against state-sponsored / highly specialized attackers'],
              ].map(([sl, desc]) => (
                <div key={sl} className="flex items-start gap-2">
                  <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-indigo-600">{sl}</span>
                  <span className="text-gray-500">{desc}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── TARA Preview (when template selected) ───────────────────────────────────

function TaraPreview({ template }: { template: Template }) {
  const [open, setOpen] = useState(true);

  const allThreats: Array<Threat & { nodeLabel: string }> = [];
  const allAssets: Array<Asset & { nodeLabel: string }> = [];

  for (const n of template.nodes) {
    if (n.type === 'boundary') continue;
    const label = String(n.data.label);
    for (const t of (n.data.threats as Threat[] | undefined) ?? []) {
      allThreats.push({ ...t, nodeLabel: label });
    }
    for (const a of (n.data.assets as Asset[] | undefined) ?? []) {
      allAssets.push({ ...a, nodeLabel: label });
    }
  }

  if (allThreats.length === 0 && allAssets.length === 0) return null;

  return (
    <div className="border-t border-gray-100 bg-gray-50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-700"
      >
        <span>Preview of pre-filled assessment data</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-4 px-5 pb-4">
          {/* Sample Assets */}
          {allAssets.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-blue-600">
                <Database size={10} /> Assets ({allAssets.length})
              </p>
              <div className="space-y-1">
                {allAssets.slice(0, 4).map((a) => (
                  <div key={a.id} className="rounded border border-gray-200 bg-white px-2 py-1.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={cn('rounded px-1 py-0.5 text-[9px] font-bold', ASSET_CATEGORY_COLORS[a.category])}>
                        {a.category}
                      </span>
                      <span className="text-[10px] font-medium text-gray-800">{a.name}</span>
                    </div>
                    <p className="mt-0.5 text-[9px] text-gray-400">{a.nodeLabel}</p>
                  </div>
                ))}
                {allAssets.length > 4 && (
                  <p className="text-[10px] text-gray-400">+ {allAssets.length - 4} weitere …</p>
                )}
              </div>
            </div>
          )}

          {/* Sample Threats */}
          {allThreats.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-orange-600">
                <AlertTriangle size={10} /> Threats ({allThreats.length})
              </p>
              <div className="space-y-1">
                {allThreats.slice(0, 5).map((t) => (
                  <div key={t.id} className="rounded border border-gray-200 bg-white px-2 py-1.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={cn('rounded px-1 py-0.5 text-[9px] font-bold',
                        STRIDE_META.find((s) => s.key === t.stride)?.color ?? ''
                      )}>
                        {t.stride}
                      </span>
                      <span className="text-[10px] font-medium text-gray-800 line-clamp-1">{t.name}</span>
                    </div>
                    <p className="mt-0.5 text-[9px] text-gray-400">{t.nodeLabel}{t.cweId ? ` · ${t.cweId}` : ''}</p>
                  </div>
                ))}
                {allThreats.length > 5 && (
                  <p className="text-[10px] text-gray-400">+ {allThreats.length - 5} weitere …</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

function assignParentsFromPosition(
  nodes: import('@/types').DiagramNode[],
  idMap?: Map<string, string>,
): import('@/types').DiagramNode[] {
  const boundaries = nodes.filter((n) => n.type === 'boundary');
  return nodes.map((n) => {
    if (n.type === 'boundary') return n;
    const parent = boundaries
      .filter((b) => {
        const bw = (b.style?.width as number) ?? 300;
        const bh = (b.style?.height as number) ?? 200;
        return (
          n.position.x >= b.position.x &&
          n.position.x <= b.position.x + bw &&
          n.position.y >= b.position.y &&
          n.position.y <= b.position.y + bh
        );
      })
      .reduce<import('@/types').DiagramNode | null>((smallest, b) => {
        if (!smallest) return b;
        const bArea = ((b.style?.width as number) ?? 300) * ((b.style?.height as number) ?? 200);
        const sArea =
          ((smallest.style?.width as number) ?? 300) * ((smallest.style?.height as number) ?? 200);
        return bArea < sArea ? b : smallest;
      }, null);
    if (!parent) return n;
    const parentId = idMap ? (idMap.get(parent.id) ?? parent.id) : parent.id;
    return {
      ...n,
      parentId,
      extent: 'parent' as const,
      position: {
        x: n.position.x - parent.position.x,
        y: n.position.y - parent.position.y,
      },
    };
  });
}

export function TemplateModal({ onClose }: Props) {
  const { nodes, edges, setNodes, setEdges } = useDiagramStore();
  const [selected, setSelected] = useState<Template | null>(null);
  const [mode, setMode] = useState<'replace' | 'append'>('append');
  const [showHelp, setShowHelp] = useState(false);

  const apply = () => {
    if (!selected) return;

    if (mode === 'replace') {
      setNodes(assignParentsFromPosition(selected.nodes));
      setEdges(selected.edges);
    } else {
      const offsetX = nodes.length > 0 ? 600 : 0;
      const offsetNodes = selected.nodes.map((n) => ({
        ...n,
        id: `tpl-${n.id}-${Date.now()}`,
        position: { x: n.position.x + offsetX, y: n.position.y },
      }));
      const idMap = new Map(selected.nodes.map((n, i) => [n.id, offsetNodes[i].id]));
      const offsetEdges = selected.edges.map((e) => ({
        ...e,
        id: `tpl-${e.id}-${Date.now()}`,
        source: idMap.get(e.source) ?? e.source,
        target: idMap.get(e.target) ?? e.target,
      }));
      const reparentedNodes = assignParentsFromPosition(offsetNodes, idMap);
      setNodes([...nodes, ...reparentedNodes]);
      setEdges([...edges, ...offsetEdges]);
    }
    onClose();
  };

  return (
    <>
      {showHelp && <HelpPopover onClose={() => setShowHelp(false)} />}

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl flex flex-col max-h-[88vh]">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-indigo-600" />
              <h2 className="font-semibold text-gray-900">Template laden</h2>
              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-600 font-medium">
                inkl. Beispieldaten
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHelp(true)}
                title="Felder erklären"
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                <HelpCircle size={13} />
                <span>Felder erklären</span>
              </button>
              <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Info banner */}
          <div className="border-b border-gray-100 bg-indigo-50 px-5 py-2.5 text-[11px] text-indigo-600">
            Jedes Template enthält vorausgefüllte Beispiel-Assets, STRIDE-Bedrohungen und Risiken.
            Klicke ein Template an, um eine Vorschau zu sehen – und passe die Daten danach in der Detail-Ansicht an.
          </div>

          {/* Templates - grouped by category */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {CATEGORY_ORDER.map((cat) => {
              const group = TEMPLATES.filter((t) => t.category === cat);
              if (group.length === 0) return null;
              const CatIcon = CATEGORY_ICONS[cat] ?? Layers;
              const catColor = CATEGORY_COLORS[cat];
              return (
                <div key={cat}>
                  {/* Group header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn('flex h-6 w-6 items-center justify-center rounded', catColor)}>
                      <CatIcon size={13} />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[10px] text-gray-400">{group.length} Templates</span>
                  </div>

                  {/* Cards grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {group.map((t) => {
                      const isSelected = selected?.id === t.id;
                      const counts = getTemplateCounts(t);
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelected(isSelected ? null : t)}
                          className={cn(
                            'flex flex-col items-start rounded-xl border p-4 text-left transition-all',
                            isSelected
                              ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
                          )}
                        >
                          <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                          <p className="mt-1 text-xs text-gray-500 line-clamp-2">{t.description}</p>
                          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-gray-400">
                              {t.nodes.length} Knoten · {t.edges.length} Kanten
                            </span>
                            {counts.assets > 0 && (
                              <span className="flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                                <Database size={8} /> {counts.assets}
                              </span>
                            )}
                            {counts.threats > 0 && (
                              <span className="flex items-center gap-0.5 rounded bg-orange-50 px-1.5 py-0.5 text-[10px] text-orange-600">
                                <AlertTriangle size={8} /> {counts.threats}
                              </span>
                            )}
                            {counts.risks > 0 && (
                              <span className="flex items-center gap-0.5 rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600">
                                <Activity size={8} /> {counts.risks}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* TARA preview for selected template */}
          {selected && <TaraPreview template={selected} />}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Modus:</span>
              {(['append', 'replace'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                    mode === m ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                  title={m === 'replace' ? 'Löscht alle vorhandenen Elemente auf der Canvas' : 'Fügt das Template neben vorhandenen Elementen ein'}
                >
                  {m === 'append' ? 'Zur Canvas hinzufügen' : 'Canvas ersetzen'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Abbrechen
              </button>
              <button
                onClick={apply}
                disabled={!selected}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                Template laden
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
