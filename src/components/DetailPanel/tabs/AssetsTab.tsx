'use client';

import { useState } from 'react';
import { Plus, Trash2, Database, Pencil, X, Shield, BookmarkCheck } from 'lucide-react';
import { useDiagramStore } from '@/store/diagramStore';
import type { NodeData, Asset, AssetCategory } from '@/types';
import { BSI_ASSET_CATALOG, findBsiAsset } from '@/data/bsiAssets';
import { useT } from '@/hooks/useT';
import { cn } from '@/utils/cn';

const CATEGORIES: AssetCategory[] = [
  'privacy',
  'operational',
  'safety',
  'financial',
  'data',
  'functional',
  'security',
  'other',
];

const CATEGORY_COLORS: Record<AssetCategory, string> = {
  financial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  operational: 'bg-blue-100 text-blue-800 border-blue-200',
  privacy: 'bg-purple-100 text-purple-800 border-purple-200',
  safety: 'bg-red-100 text-red-800 border-red-200',
  data: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  functional: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  security: 'bg-amber-100 text-amber-800 border-amber-200',
  other: 'bg-[#f4f1ec] text-[#6b6460] border-[#e5e1d8]',
};

const inputClass =
  'w-full rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none';

interface Props {
  nodeId: string;
  data: NodeData;
}

export function AssetsTab({ nodeId, data }: Props) {
  const { updateNodeData } = useDiagramStore();
  const assets = (data.assets ?? []) as Asset[];
  const t = useT();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedBsiCode, setSelectedBsiCode] = useState<string>('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('operational');
  const [description, setDescription] = useState('');
  const [cVal, setCVal] = useState<number>(1);
  const [iVal, setIVal] = useState<number>(1);
  const [aVal, setAVal] = useState<number>(1);
  const [amplifier, setAmplifier] = useState<number>(1.0);

  const save = (updated: Asset[]) => updateNodeData(nodeId, { assets: updated });

  const resetForm = () => {
    setEditingId(null);
    setSelectedBsiCode('');
    setName('');
    setCategory('operational');
    setDescription('');
    setCVal(1);
    setIVal(1);
    setAVal(1);
    setAmplifier(1.0);
  };

  const handleSelectBsiTemplate = (code: string) => {
    setSelectedBsiCode(code);
    if (!code) return;
    const bsi = findBsiAsset(code);
    if (!bsi) return;

    setName(bsi.name);
    setCategory(bsi.category as AssetCategory);
    setDescription(`[${bsi.code}] ${bsi.rationale}`);
    setCVal(bsi.defaultC ?? 1);
    setIVal(bsi.defaultI ?? 1);
    setAVal(bsi.defaultA ?? 1);
  };

  const startEdit = (a: Asset) => {
    setEditingId(a.id);
    setSelectedBsiCode(a.bsiCode ?? '');
    setName(a.name);
    setCategory(a.category);
    setDescription(a.description ?? '');
    setCVal(a.confidentiality ?? 1);
    setIVal(a.integrity ?? 1);
    setAVal(a.availability ?? 1);
    setAmplifier(a.amplifier ?? 1.0);
  };

  const submit = () => {
    if (!name.trim()) return;
    const assetPayload: Asset = {
      id: editingId ?? crypto.randomUUID(),
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      bsiCode: selectedBsiCode || undefined,
      confidentiality: (Math.min(5, Math.max(1, cVal))) as 1 | 2 | 3 | 4 | 5,
      integrity: (Math.min(5, Math.max(1, iVal))) as 1 | 2 | 3 | 4 | 5,
      availability: (Math.min(5, Math.max(1, aVal))) as 1 | 2 | 3 | 4 | 5,
      amplifier: amplifier !== 1.0 ? amplifier : undefined,
    };

    if (editingId) {
      save(assets.map((a) => (a.id === editingId ? assetPayload : a)));
    } else {
      save([...assets, assetPayload]);
    }
    resetForm();
  };

  const remove = (id: string) => save(assets.filter((a) => a.id !== id));

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Scope Info Badge if present */}
      <div className="flex items-center justify-between rounded-lg border border-[#e5e1d8] bg-[#faf9f7] px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5 text-[#6b6460]">
          <Shield size={14} className="text-[#3b5bdb]" />
          <span>Komponenten-Scope:</span>
        </div>
        <select
          value={data.scope ?? 'placed_component'}
          onChange={(e) => updateNodeData(nodeId, { scope: e.target.value as NodeData['scope'] })}
          className="rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs font-semibold text-[#1a1917] focus:outline-none"
        >
          <option value="placed_component">In Verkehr gebracht (Nutzer-Produkt)</option>
          <option value="rdps_backend">RDPS Backend (Hersteller-Cloud)</option>
          <option value="external_3rd_party">Drittkomponente / Lieferkette</option>
        </select>
      </div>

      {assets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center text-[#c8c0b0]">
          <Database size={28} />
          <p className="text-sm">{t.assets.noAssets}</p>
          <p className="text-xs text-[#9b9590] max-w-xs">
            Wähle unten ein standardisiertes Asset aus dem BSI TR-03183-1 Katalog oder erstelle ein individuelles Schutzgut.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {assets.map((a) => (
            <div
              key={a.id}
              className={cn(
                'flex items-start justify-between rounded-lg border bg-white p-3 shadow-xs',
                editingId === a.id ? 'border-indigo-400 ring-1 ring-indigo-200' : 'border-[#e5e1d8]',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium text-[#1a1917]">{a.name}</span>
                  <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', CATEGORY_COLORS[a.category])}>
                    {a.category}
                  </span>
                  {a.bsiCode && (
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-indigo-700 border border-indigo-200">
                      BSI: {a.bsiCode}
                    </span>
                  )}
                </div>

                {/* C/I/A ratings */}
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[#6b6460]">
                  <span className="rounded bg-[#f4f1ec] px-1.5 py-0.5 font-mono">
                    <strong className="text-[#1a1917]">C:</strong> {a.confidentiality ?? 1}
                  </span>
                  <span className="rounded bg-[#f4f1ec] px-1.5 py-0.5 font-mono">
                    <strong className="text-[#1a1917]">I:</strong> {a.integrity ?? 1}
                  </span>
                  <span className="rounded bg-[#f4f1ec] px-1.5 py-0.5 font-mono">
                    <strong className="text-[#1a1917]">A:</strong> {a.availability ?? 1}
                  </span>
                  {a.amplifier && a.amplifier !== 1 && (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 font-mono text-amber-700">
                      Amp: x{a.amplifier}
                    </span>
                  )}
                </div>

                {a.description && <p className="mt-1 text-xs text-[#6b6460] line-clamp-2">{a.description}</p>}
              </div>

              <div className="ml-2 flex items-center gap-1">
                <button
                  onClick={() => startEdit(a)}
                  className="rounded p-1 text-[#6b6460] hover:bg-[#f4f1ec] hover:text-[#1e293b]"
                  title="Bearbeiten"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => remove(a.id)}
                  className="rounded p-1 text-[#6b6460] hover:bg-red-50 hover:text-red-600"
                  title="Löschen"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit form */}
      <div className="rounded-lg border border-[#e5e1d8] bg-[#faf9f7] p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BookmarkCheck size={14} className="text-indigo-600" />
            <p className="text-xs font-semibold text-[#1a1917] uppercase tracking-wide">
              {editingId ? t.assets.editAsset : 'Schutzgut hinzufügen (BSI TR-03183-1)'}
            </p>
          </div>
          {editingId && (
            <button onClick={resetForm} className="text-[#6b6460] hover:text-[#1a1917]">
              <X size={14} />
            </button>
          )}
        </div>

        {/* BSI TR-03183-1 Quick Template Selector */}
        <div>
          <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-1">
            BSI Standard-Asset Vorlage:
          </label>
          <select
            value={selectedBsiCode}
            onChange={(e) => handleSelectBsiTemplate(e.target.value)}
            className="w-full rounded border border-indigo-200 bg-indigo-50/50 px-2 py-1.5 text-xs text-[#1a1917] focus:border-[#1e293b] focus:outline-none"
          >
            <option value="">-- Standard-Vorlage auswählen (optional) --</option>
            <optgroup label="BSI TR-03183-1 Tabelle 1: Daten-Assets">
              {BSI_ASSET_CATALOG.filter((a) => a.category === 'data').map((a) => (
                <option key={a.code} value={a.code}>
                  [{a.code}] {a.name} (C:{a.defaultC} I:{a.defaultI} A:{a.defaultA})
                </option>
              ))}
            </optgroup>
            <optgroup label="BSI TR-03183-1 Tabelle 2: Funktions-Assets">
              {BSI_ASSET_CATALOG.filter((a) => a.category === 'functional').map((a) => (
                <option key={a.code} value={a.code}>
                  [{a.code}] {a.name} (A:{a.defaultA})
                </option>
              ))}
            </optgroup>
            <optgroup label="BSI TR-03183-1 Tabelle 3: Sicherheits-Assets">
              {BSI_ASSET_CATALOG.filter((a) => a.category === 'security').map((a) => (
                <option key={a.code} value={a.code}>
                  [{a.code}] {a.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-1">Asset-Name:</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.assets.namePlaceholder}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-1">Kategorie:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AssetCategory)}
              className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-xs text-[#1a1917] focus:border-[#1e293b] focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-1">
              Verstärker (Amplifier):
            </label>
            <select
              value={amplifier}
              onChange={(e) => setAmplifier(parseFloat(e.target.value))}
              className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-xs text-[#1a1917] focus:border-[#1e293b] focus:outline-none"
            >
              <option value="1.0">Standard (x1.0)</option>
              <option value="1.25">Gesteigert (x1.25)</option>
              <option value="1.5">Große Datenmenge (x1.5)</option>
              <option value="2.0">Kritische Infrastruktur (x2.0)</option>
            </select>
          </div>
        </div>

        {/* BSI C / I / A Ratings */}
        <div>
          <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-1">
            BSI Schutzbedarfe (C / I / A: 1=Gering bis 5=Sehr hoch):
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] text-[#6b6460]">Vertraulichkeit (C):</span>
              <select
                value={cVal}
                onChange={(e) => setCVal(parseInt(e.target.value, 10))}
                className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1917]"
              >
                <option value="1">1 - Gering</option>
                <option value="2">2 - Niedrig</option>
                <option value="3">3 - Moderat</option>
                <option value="4">4 - Hoch</option>
                <option value="5">5 - Sehr hoch</option>
              </select>
            </div>
            <div>
              <span className="text-[10px] text-[#6b6460]">Integrität (I):</span>
              <select
                value={iVal}
                onChange={(e) => setIVal(parseInt(e.target.value, 10))}
                className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1917]"
              >
                <option value="1">1 - Gering</option>
                <option value="2">2 - Niedrig</option>
                <option value="3">3 - Moderat</option>
                <option value="4">4 - Hoch</option>
                <option value="5">5 - Sehr hoch</option>
              </select>
            </div>
            <div>
              <span className="text-[10px] text-[#6b6460]">Verfügbarkeit (A):</span>
              <select
                value={aVal}
                onChange={(e) => setAVal(parseInt(e.target.value, 10))}
                className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1917]"
              >
                <option value="1">1 - Gering</option>
                <option value="2">2 - Niedrig</option>
                <option value="3">3 - Moderat</option>
                <option value="4">4 - Hoch</option>
                <option value="5">5 - Sehr hoch</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-1">Beschreibung / Rationale:</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.assets.descPlaceholder}
            className={inputClass}
          />
        </div>

        <button
          onClick={submit}
          disabled={!name.trim()}
          className="flex items-center gap-1.5 rounded bg-[#1e293b] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#374151] disabled:opacity-40 transition-colors"
        >
          {editingId ? (
            <>
              <Pencil size={12} /> {t.assets.updateAsset}
            </>
          ) : (
            <>
              <Plus size={12} /> {t.assets.addAsset}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
