import { useState } from 'react';
import { Plus, Trash2, Database, Pencil, X, Sparkles } from 'lucide-react';
import { useDiagramStore } from '@/store/diagramStore';
import type { NodeData, Asset } from '@/types';
import { useT } from '@/hooks/useT';
import { cn } from '@/utils/cn';

const EXAMPLE_ASSETS: Omit<Asset, 'id'>[] = [
  { name: 'Firmware Image', category: 'operational', description: 'Integrity of the firmware binary stored on flash memory' },
  { name: 'Cryptographic Keys', category: 'safety', description: 'Private keys used for secure boot and code signing' },
  { name: 'Calibration Data', category: 'operational', description: 'Safety-relevant sensor calibration parameters' },
  { name: 'User Credentials', category: 'privacy', description: 'Authentication tokens and user account data' },
  { name: 'Diagnostic Logs', category: 'financial', description: 'Operational logs with potential IP value and liability exposure' },
];

const CATEGORIES: Asset['category'][] = ['financial', 'operational', 'privacy', 'safety', 'other'];
const CATEGORY_COLORS: Record<Asset['category'], string> = {
  financial: 'bg-yellow-100 text-yellow-700',
  operational: 'bg-blue-100 text-blue-700',
  privacy: 'bg-purple-100 text-purple-700',
  safety: 'bg-red-100 text-red-700',
  other: 'bg-[#f4f1ec] text-[#6b6460]',
};

const inputClass = 'w-full rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none';

interface Props {
  nodeId: string;
  data: NodeData;
}

export function AssetsTab({ nodeId, data }: Props) {
  const { updateNodeData } = useDiagramStore();
  const assets = (data.assets ?? []) as Asset[];
  const t = useT();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Asset['category']>('operational');
  const [description, setDescription] = useState('');

  const save = (updated: Asset[]) => updateNodeData(nodeId, { assets: updated });

  const loadExamples = () => save([
    ...assets,
    ...EXAMPLE_ASSETS.map((ex) => ({ ...ex, id: crypto.randomUUID() })),
  ]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCategory('operational');
    setDescription('');
  };

  const startEdit = (a: Asset) => {
    setEditingId(a.id);
    setName(a.name);
    setCategory(a.category);
    setDescription(a.description ?? '');
  };

  const submit = () => {
    if (!name.trim()) return;
    if (editingId) {
      save(assets.map((a) => a.id === editingId ? { ...a, name: name.trim(), category, description: description.trim() || undefined } : a));
    } else {
      save([...assets, { id: crypto.randomUUID(), name: name.trim(), category, description: description.trim() || undefined }]);
    }
    resetForm();
  };

  const remove = (id: string) => save(assets.filter((a) => a.id !== id));

  return (
    <div className="flex flex-col gap-4 p-4">
      {assets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center text-[#c8c0b0]">
          <Database size={28} />
          <p className="text-sm">{t.assets.noAssets}</p>
          <button
            onClick={loadExamples}
            className="flex items-center gap-1.5 rounded border border-[#e5e1d8] px-3 py-1.5 text-xs font-medium text-[#6b6460] hover:border-[#1e293b] hover:text-[#1e293b] transition-colors"
          >
            <Sparkles size={12} />
            {t.assets.loadExamples}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {assets.map((a) => (
            <div key={a.id} className={cn('flex items-start justify-between rounded-lg border bg-white p-3', editingId === a.id ? 'border-indigo-400' : 'border-[#e5e1d8]')}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-[#1a1917]">{a.name}</span>
                  <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', CATEGORY_COLORS[a.category])}>
                    {a.category}
                  </span>
                </div>
                {a.description && <p className="mt-0.5 text-xs text-[#6b6460] line-clamp-2">{a.description}</p>}
              </div>
              <div className="ml-2 flex items-center gap-1">
                <button onClick={() => startEdit(a)} className="text-[#c8c0b0] hover:text-[#1e293b]">
                  <Pencil size={13} />
                </button>
                <button onClick={() => remove(a.id)} className="text-[#c8c0b0] hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit form */}
      <div className="rounded-lg border border-[#e5e1d8] bg-[#faf9f7] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#6b6460] uppercase tracking-wide">
            {editingId ? t.assets.editAsset : t.assets.addAsset}
          </p>
          {editingId && (
            <button onClick={resetForm} className="text-[#c8c0b0] hover:text-[#1a1917]">
              <X size={14} />
            </button>
          )}
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.assets.namePlaceholder} className={inputClass} />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Asset['category'])}
          className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-sm text-[#1a1917] focus:border-[#1e293b] focus:outline-none"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.assets.descPlaceholder} className={inputClass} />
        <button
          onClick={submit}
          disabled={!name.trim()}
          className="flex items-center gap-1.5 rounded bg-[#1e293b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#374151] disabled:opacity-40"
        >
          {editingId ? <><Pencil size={12} /> {t.assets.updateAsset}</> : <><Plus size={12} /> {t.assets.addAsset}</>}
        </button>
      </div>
    </div>
  );
}
