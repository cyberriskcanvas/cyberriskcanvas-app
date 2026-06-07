import { useState, useRef, useEffect, useTransition } from 'react';
import { Plus, Trash2, AlertTriangle, Search, Pencil, X, Sparkles, Info, BookMarked, Bookmark, Library, ChevronDown, Globe } from 'lucide-react';
import { useDiagramStore } from '@/store/diagramStore';
import { useProjectStore } from '@/store/projectStore';
import type { NodeData, Threat, Risk, RiskLevel } from '@/types';
import { useT } from '@/hooks/useT';
import { AISuggestCwe } from '@/components/AI/AISuggestCwe';
import { searchCwe, type CweEntry } from '@/data/cwe';
import { cn } from '@/utils/cn';
import {
  getLibraryEntries,
  saveToLibrary,
  deleteLibraryEntry,
  getTeamLibraryEntries,
  saveToTeamLibrary,
  deleteTeamLibraryEntry,
  type LibraryEntry,
  type TeamLibraryEntry,
} from '@/actions/threatLibrary';
import { getExamplesForType, type ThreatExample } from '@/data/threatExamples';

const STRIDE_COLORS: Record<Threat['stride'], string> = {
  S: 'bg-red-100 text-red-700',
  T: 'bg-orange-100 text-orange-700',
  R: 'bg-yellow-100 text-yellow-700',
  I: 'bg-blue-100 text-blue-700',
  D: 'bg-purple-100 text-purple-700',
  E: 'bg-pink-100 text-pink-700',
};

const STRIDE_LABELS: Record<Threat['stride'], string> = {
  S: 'Spoofing', T: 'Tampering', R: 'Repudiation',
  I: 'Info Disclosure', D: 'Denial of Service', E: 'Elevation of Privilege',
};

const STRIDE_TOOLTIPS: Record<Threat['stride'], string> = {
  S: 'Someone pretends to be someone else.',
  T: 'Someone secretly modifies data.',
  R: 'Someone does something and later denies it.',
  I: 'Someone reads data that should be confidential.',
  D: 'Someone overwhelms the system until it fails.',
  E: 'Someone gains permissions (e.g. admin) they should not have.',
};

const inputClass = 'w-full rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none';

// ─── Risk auto-suggest ────────────────────────────────────────────────────────

const STRIDE_RISK_DEFAULTS: Record<Threat['stride'], { likelihood: 1|2|3|4|5; impact: 1|2|3|4|5 }> = {
  S: { likelihood: 3, impact: 4 }, // Spoofing      → HIGH
  T: { likelihood: 3, impact: 4 }, // Tampering     → HIGH
  R: { likelihood: 2, impact: 3 }, // Repudiation   → MEDIUM
  I: { likelihood: 3, impact: 3 }, // Info Disc.    → MEDIUM
  D: { likelihood: 4, impact: 3 }, // DoS           → HIGH
  E: { likelihood: 2, impact: 5 }, // EoP           → HIGH
};

function calcRiskLevel(likelihood: number, impact: number): RiskLevel {
  const score = likelihood * impact;
  if (score >= 20) return 'critical';
  if (score >= 12) return 'high';
  if (score >= 6) return 'medium';
  if (score >= 2) return 'low';
  return 'negligible';
}

interface Props {
  nodeId: string;
  nodeType: string;
  data: NodeData;
}

// ─── Suggested entry (from curated catalogue, save-to-library) ───────────────

function SuggestedEntry({
  example,
  projectId,
  componentType,
  onAdded,
}: {
  example: ThreatExample;
  projectId: string;
  componentType?: string;
  onAdded: (entry: LibraryEntry) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const entry = await saveToLibrary(
      projectId,
      { name: example.name, stride: example.stride, cweId: example.cweId, description: example.description },
      componentType,
    );
    setSaved(true);
    setSaving(false);
    onAdded(entry);
  };

  return (
    <div className="flex items-start gap-2 rounded px-2 py-1.5 hover:bg-indigo-50/60">
      <span className={cn('mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold', STRIDE_COLORS[example.stride])}>
        {example.stride}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[#1a1917] truncate">{example.name}</p>
        {example.cweId && (
          <span className="rounded bg-[#f4f1ec] px-1 py-0.5 font-mono text-[9px] text-[#6b6460]">{example.cweId}</span>
        )}
      </div>
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className={cn(
          'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors disabled:opacity-50',
          saved
            ? 'bg-green-100 text-green-700'
            : 'bg-indigo-600 text-white hover:bg-indigo-700',
        )}
      >
        {saved ? 'Saved' : saving ? '…' : '+ Save'}
      </button>
    </div>
  );
}

// ─── Shared entry row used in both project and team library panels ────────────

function LibraryEntryRow({
  entry,
  onUse,
  onRemove,
  isPending,
}: {
  entry: LibraryEntry | TeamLibraryEntry;
  onUse: (entry: LibraryEntry | TeamLibraryEntry) => void;
  onRemove: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 hover:bg-indigo-50/60">
      <span className={cn('mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold', STRIDE_COLORS[entry.stride as Threat['stride']])}>
        {entry.stride}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[#1a1917] truncate">{entry.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {entry.cweId && (
            <span className="rounded bg-[#f4f1ec] px-1 py-0.5 font-mono text-[9px] text-[#6b6460]">{entry.cweId}</span>
          )}
          {entry.componentTypeHint && (
            <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] text-slate-500 uppercase">{entry.componentTypeHint}</span>
          )}
        </div>
        {entry.description && (
          <p className="mt-0.5 text-[10px] text-[#9b9590] line-clamp-2">{entry.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0 mt-0.5">
        <button
          onClick={() => onUse(entry)}
          title="Add to this component"
          className="flex items-center gap-0.5 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-indigo-700"
        >
          <Plus size={10} /> Add
        </button>
        <button
          onClick={() => onRemove(entry.id)}
          disabled={isPending}
          title="Remove from library"
          className="text-[#c8c0b0] hover:text-red-500 disabled:opacity-40"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Library Panel ────────────────────────────────────────────────────────────

function LibraryPanel({
  projectId,
  componentType,
  onUse,
  onClose,
}: {
  projectId: string;
  nodeType: string;
  componentType?: string;
  onUse: (entry: LibraryEntry | TeamLibraryEntry) => void;
  onClose: () => void;
}) {
  type LibTab = 'project' | 'team';
  const [activeTab, setActiveTab] = useState<LibTab>('project');

  // Project library state
  const [projectEntries, setProjectEntries] = useState<LibraryEntry[]>([]);
  const [projectLoading, setProjectLoading] = useState(true);
  const [isProjectPending, startProjectTransition] = useTransition();

  // Team library state
  const [teamEntries, setTeamEntries] = useState<TeamLibraryEntry[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamLoaded, setTeamLoaded] = useState(false);
  const [isTeamPending, startTeamTransition] = useTransition();
  const [teamError, setTeamError] = useState<string | null>(null);

  // Shared filter state
  const [strideFilter, setStrideFilter] = useState<Threat['stride'] | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setProjectLoading(true);
    getLibraryEntries(projectId)
      .then(setProjectEntries)
      .finally(() => setProjectLoading(false));
  }, [projectId]);

  const loadTeamLibrary = () => {
    if (teamLoaded) return;
    setTeamLoading(true);
    setTeamError(null);
    getTeamLibraryEntries(projectId)
      .then(setTeamEntries)
      .catch(() => setTeamError('Could not load team library.'))
      .finally(() => { setTeamLoading(false); setTeamLoaded(true); });
  };

  const handleTabChange = (tab: LibTab) => {
    setActiveTab(tab);
    setSearch('');
    setStrideFilter('ALL');
    if (tab === 'team') loadTeamLibrary();
  };

  const removeProject = (id: string) => {
    startProjectTransition(async () => {
      await deleteLibraryEntry(id);
      setProjectEntries((prev) => prev.filter((e) => e.id !== id));
    });
  };

  const removeTeam = (id: string) => {
    startTeamTransition(async () => {
      await deleteTeamLibraryEntry(id);
      setTeamEntries((prev) => prev.filter((e) => e.id !== id));
    });
  };

  const filterEntries = (entries: (LibraryEntry | TeamLibraryEntry)[]) =>
    entries.filter((e) => {
      if (strideFilter !== 'ALL' && e.stride !== strideFilter) return false;
      if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

  const currentEntries: (LibraryEntry | TeamLibraryEntry)[] = activeTab === 'project' ? projectEntries : teamEntries;
  const currentLoading = activeTab === 'project' ? projectLoading : teamLoading;
  const currentPending = activeTab === 'project' ? isProjectPending : isTeamPending;
  const currentRemove = activeTab === 'project' ? removeProject : removeTeam;
  const filteredEntries = filterEntries(currentEntries);

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-indigo-200 bg-indigo-50">
        <div className="flex items-center gap-1.5">
          <Library size={13} className="text-indigo-600" />
          <span className="text-xs font-semibold text-indigo-800">Threat Library</span>
        </div>
        <button onClick={onClose} className="text-indigo-400 hover:text-indigo-700">
          <X size={13} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-indigo-100">
        <button
          onClick={() => handleTabChange('project')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium transition-colors',
            activeTab === 'project'
              ? 'border-b-2 border-indigo-500 text-indigo-700 bg-white'
              : 'text-[#9b9590] hover:text-indigo-600',
          )}
        >
          <Library size={11} />
          This Project
          {projectEntries.length > 0 && (
            <span className="rounded-full bg-indigo-200 px-1.5 text-[9px] font-bold text-indigo-700">{projectEntries.length}</span>
          )}
        </button>
        <button
          onClick={() => handleTabChange('team')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium transition-colors',
            activeTab === 'team'
              ? 'border-b-2 border-indigo-500 text-indigo-700 bg-white'
              : 'text-[#9b9590] hover:text-indigo-600',
          )}
        >
          <Globe size={11} />
          Team
          {teamEntries.length > 0 && (
            <span className="rounded-full bg-indigo-200 px-1.5 text-[9px] font-bold text-indigo-700">{teamEntries.length}</span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-indigo-100">
        <div className="flex items-center gap-1 rounded border border-[#e5e1d8] bg-white px-2 py-1 flex-1">
          <Search size={11} className="text-[#c8c0b0] shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search threats…"
            className="flex-1 bg-transparent text-xs text-[#1a1917] placeholder-[#c8c0b0] focus:outline-none"
          />
        </div>
        <select
          value={strideFilter}
          onChange={(e) => setStrideFilter(e.target.value as Threat['stride'] | 'ALL')}
          className="rounded border border-[#e5e1d8] bg-white px-1.5 py-1 text-xs text-[#1a1917] focus:outline-none"
        >
          <option value="ALL">All STRIDE</option>
          {(Object.keys(STRIDE_LABELS) as Threat['stride'][]).map((s) => (
            <option key={s} value={s}>{s} - {STRIDE_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Entries */}
      <div className="max-h-64 overflow-y-auto divide-y divide-indigo-100">
        {teamError && activeTab === 'team' ? (
          <p className="px-3 py-4 text-center text-xs text-red-500">{teamError}</p>
        ) : currentLoading ? (
          <p className="px-3 py-4 text-center text-xs text-[#9b9590]">Loading…</p>
        ) : currentEntries.length === 0 ? (
          <div className="px-3 py-3">
            {activeTab === 'project' ? (
              <>
                <p className="text-[11px] text-[#9b9590] mb-2">
                  No saved threats yet. Bookmark any threat to add it here, or add from suggestions:
                </p>
                <div className="space-y-1">
                  {getExamplesForType(componentType).slice(0, 5).map((ex, i) => (
                    <SuggestedEntry key={i} example={ex} projectId={projectId} componentType={componentType} onAdded={onUse} />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-[#9b9590]">
                No threats in the team library yet. Save any threat to the team library using the <Globe size={10} className="inline" /> button.
              </p>
            )}
          </div>
        ) : filteredEntries.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-[#9b9590]">No threats match the filter.</p>
        ) : (
          filteredEntries.map((entry) => (
            <LibraryEntryRow
              key={entry.id}
              entry={entry}
              onUse={onUse}
              onRemove={currentRemove}
              isPending={currentPending}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── ThreatsTab ───────────────────────────────────────────────────────────────

export function ThreatsTab({ nodeId, nodeType, data }: Props) {
  const { updateNodeData } = useDiagramStore();
  const projectId = useProjectStore((s) => s.projectId);
  const threats = (data.threats ?? []) as Threat[];
  const risks = (data.risks ?? []) as Risk[];
  const t = useT();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [stride, setStride] = useState<Threat['stride']>('T');
  const [cweId, setCweId] = useState('');
  const [description, setDescription] = useState('');
  const [cweQuery, setCweQuery] = useState('');
  const [showCweSearch, setShowCweSearch] = useState(false);
  const [showStrideTooltip, setShowStrideTooltip] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [teamSavedIds, setTeamSavedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const strideTooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showStrideTooltip) return;
    const handler = (e: MouseEvent) => {
      if (!strideTooltipRef.current?.contains(e.target as Node)) setShowStrideTooltip(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showStrideTooltip]);

  const cweResults = cweQuery ? searchCwe(cweQuery) : [];

  const save = (updated: Threat[]) => updateNodeData(nodeId, { threats: updated });

  const componentType = data.componentType as string | undefined;
  const examples = getExamplesForType(componentType);

  const loadExamples = () => {
    const toAdd = examples.slice(0, 3).map((ex) => ({ ...ex, id: crypto.randomUUID() }));
    save([...threats, ...toAdd]);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCweId('');
    setCweQuery('');
    setDescription('');
  };

  const startEdit = (th: Threat) => {
    setEditingId(th.id);
    setName(th.name);
    setStride(th.stride);
    setCweId(th.cweId ?? '');
    setCweQuery(th.cweId ?? '');
    setDescription(th.description ?? '');
    setShowCweSearch(false);
  };

  const submit = () => {
    if (!name.trim()) return;
    if (editingId) {
      save(threats.map((th) => th.id === editingId
        ? { ...th, name: name.trim(), stride, cweId: cweId || undefined, description: description.trim() || undefined }
        : th));
    } else {
      save([...threats, { id: crypto.randomUUID(), name: name.trim(), stride, cweId: cweId || undefined, description: description.trim() || undefined }]);
    }
    resetForm();
  };

  const selectCwe = (entry: CweEntry) => {
    setCweId(entry.id);
    setCweQuery(entry.id);
    setShowCweSearch(false);
    if (!name) setName(entry.name.split(' ').slice(0, 4).join(' '));
  };

  const remove = (id: string) => save(threats.filter((th) => th.id !== id));

  const quickAssessRisk = (th: Threat) => {
    const defaults = STRIDE_RISK_DEFAULTS[th.stride];
    const level = calcRiskLevel(defaults.likelihood, defaults.impact);
    const newRisk: Risk = {
      id: crypto.randomUUID(),
      threatId: th.id,
      likelihood: defaults.likelihood,
      impact: defaults.impact,
      level,
      status: 'open',
    };
    updateNodeData(nodeId, { risks: [...risks, newRisk] });
  };

  const bookmarkThreat = (th: Threat) => {
    if (!projectId || savedIds.has(th.id)) return;
    startTransition(async () => {
      await saveToLibrary(
        projectId,
        { name: th.name, stride: th.stride, cweId: th.cweId, description: th.description },
        data.componentType as string | undefined,
      );
      setSavedIds((prev) => new Set([...prev, th.id]));
    });
  };

  const bookmarkThreatToTeam = (th: Threat) => {
    if (!projectId || teamSavedIds.has(th.id)) return;
    startTransition(async () => {
      try {
        await saveToTeamLibrary(
          projectId,
          { name: th.name, stride: th.stride, cweId: th.cweId, description: th.description },
          data.componentType as string | undefined,
        );
        setTeamSavedIds((prev) => new Set([...prev, th.id]));
      } catch {
        // project has no team - silently ignore
      }
    });
  };

  const useLibraryEntry = (entry: LibraryEntry | TeamLibraryEntry) => {
    const already = threats.some((th) => th.name === entry.name && th.stride === entry.stride);
    if (already) return;
    save([
      ...threats,
      {
        id: crypto.randomUUID(),
        name: entry.name,
        stride: entry.stride as Threat['stride'],
        cweId: entry.cweId ?? undefined,
        description: entry.description ?? undefined,
        source: 'manual' as const,
      },
    ]);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <AISuggestCwe nodeId={nodeId} nodeType={nodeType} data={data} />

      {/* Library toggle */}
      {projectId && (
        <button
          onClick={() => setShowLibrary((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 self-start rounded border px-2.5 py-1.5 text-xs font-medium transition-colors',
            showLibrary
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
              : 'border-[#e5e1d8] text-[#6b6460] hover:border-indigo-300 hover:text-indigo-700',
          )}
        >
          <Library size={12} />
          Project Library
          <ChevronDown size={11} className={cn('transition-transform', showLibrary && 'rotate-180')} />
        </button>
      )}

      {/* Library panel */}
      {showLibrary && projectId && (
        <LibraryPanel
          projectId={projectId}
          nodeType={nodeType}
          componentType={componentType}
          onUse={useLibraryEntry}
          onClose={() => setShowLibrary(false)}
        />
      )}

      {threats.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center text-[#c8c0b0]">
          <AlertTriangle size={28} />
          <p className="text-sm">{t.threats.noThreats}</p>
          <button
            onClick={loadExamples}
            className="flex items-center gap-1.5 rounded border border-[#e5e1d8] px-3 py-1.5 text-xs font-medium text-[#6b6460] hover:border-[#1e293b] hover:text-[#1e293b] transition-colors"
          >
            <Sparkles size={12} />
            {componentType ? `Load ${componentType.toUpperCase()} examples` : t.threats.loadExamples}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {threats.map((th) => {
            const alreadySaved = savedIds.has(th.id);
            const hasRisk = risks.some((r) => r.threatId === th.id);
            return (
              <div key={th.id} className={cn('rounded-lg border bg-white p-3', editingId === th.id ? 'border-indigo-400' : 'border-[#e5e1d8]')}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', STRIDE_COLORS[th.stride])}>
                        {th.stride}
                      </span>
                      <span className="text-sm font-medium text-[#1a1917]">{th.name}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-[#6b6460]">{STRIDE_LABELS[th.stride]}</span>
                      {th.cweId && (
                        <span className="rounded bg-[#f4f1ec] px-1.5 py-0.5 font-mono text-[10px] text-[#6b6460]">{th.cweId}</span>
                      )}
                    </div>
                    {th.description && <p className="mt-1 text-xs text-[#6b6460] line-clamp-2">{th.description}</p>}
                    {!hasRisk && (
                      <button
                        onClick={() => quickAssessRisk(th)}
                        className="mt-1.5 flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        <AlertTriangle size={9} />
                        No risk assessed - Quick assess ({STRIDE_RISK_DEFAULTS[th.stride].likelihood}×{STRIDE_RISK_DEFAULTS[th.stride].impact})
                      </button>
                    )}
                  </div>
                  <div className="ml-2 flex items-center gap-1">
                    {projectId && (
                      <>
                        <button
                          onClick={() => bookmarkThreat(th)}
                          disabled={alreadySaved || isPending}
                          title={alreadySaved ? 'Saved to project library' : 'Save to project library'}
                          className={cn(
                            'transition-colors disabled:opacity-40',
                            alreadySaved ? 'text-indigo-500' : 'text-[#c8c0b0] hover:text-indigo-500',
                          )}
                        >
                          {alreadySaved ? <BookMarked size={13} /> : <Bookmark size={13} />}
                        </button>
                        <button
                          onClick={() => bookmarkThreatToTeam(th)}
                          disabled={teamSavedIds.has(th.id) || isPending}
                          title={teamSavedIds.has(th.id) ? 'Saved to team library' : 'Save to team library'}
                          className={cn(
                            'transition-colors disabled:opacity-40',
                            teamSavedIds.has(th.id) ? 'text-emerald-500' : 'text-[#c8c0b0] hover:text-emerald-500',
                          )}
                        >
                          <Globe size={13} />
                        </button>
                      </>
                    )}
                    <button onClick={() => startEdit(th)} className="text-[#c8c0b0] hover:text-[#1e293b]">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => remove(th.id)} className="text-[#c8c0b0] hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit form */}
      <div className="rounded-lg border border-[#e5e1d8] bg-[#faf9f7] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#6b6460] uppercase tracking-wide">
            {editingId ? t.threats.editThreat : t.threats.addThreat}
          </p>
          {editingId && (
            <button onClick={resetForm} className="text-[#c8c0b0] hover:text-[#1a1917]">
              <X size={14} />
            </button>
          )}
        </div>

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.threats.namePlaceholder} className={inputClass} />

        <div className="flex items-center gap-1.5">
          <select
            value={stride}
            onChange={(e) => setStride(e.target.value as Threat['stride'])}
            className="flex-1 rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-sm text-[#1a1917] focus:border-[#1e293b] focus:outline-none"
          >
            {(Object.keys(STRIDE_LABELS) as Threat['stride'][]).map((s) => (
              <option key={s} value={s}>{s} - {STRIDE_LABELS[s]}</option>
            ))}
          </select>
          <div className="relative flex-shrink-0" ref={strideTooltipRef}>
            <button
              type="button"
              onClick={() => setShowStrideTooltip((v) => !v)}
              className="flex items-center justify-center text-[#c8c0b0] hover:text-[#6b6460]"
            >
              <Info size={14} />
            </button>
            {showStrideTooltip && (
              <div className="absolute right-0 bottom-full mb-2 z-50 w-60 rounded-lg border border-[#e5e1d8] bg-white shadow-lg p-2.5">
                <p className="text-[11px] font-semibold text-[#1a1917] mb-1">{stride} - {STRIDE_LABELS[stride]}</p>
                <p className="text-[11px] text-[#6b6460] leading-relaxed">{STRIDE_TOOLTIPS[stride]}</p>
              </div>
            )}
          </div>
        </div>

        {/* CWE search */}
        <div className="relative">
          <div className="flex items-center gap-1 rounded border border-[#e5e1d8] bg-white px-2 py-1.5">
            <Search size={12} className="text-[#c8c0b0] shrink-0" />
            <input
              value={cweQuery}
              onChange={(e) => { setCweQuery(e.target.value); setShowCweSearch(true); setCweId(''); }}
              onFocus={() => setShowCweSearch(true)}
              placeholder={t.threats.cwePlaceholder}
              className="flex-1 bg-transparent text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:outline-none"
            />
            {cweId && <span className="shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[10px] text-indigo-700">{cweId}</span>}
          </div>

          {showCweSearch && cweResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[#e5e1d8] bg-white shadow-lg">
              {cweResults.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCwe(c)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[#f4f1ec]"
                >
                  <span className="shrink-0 rounded bg-[#f4f1ec] px-1.5 py-0.5 font-mono text-[10px] text-[#6b6460]">{c.id}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#1a1917] line-clamp-1">{c.name}</p>
                    <p className="text-[10px] text-[#6b6460]">{c.category}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.threats.descPlaceholder} className={inputClass} />

        <button
          onClick={submit}
          disabled={!name.trim()}
          className="flex items-center gap-1.5 rounded bg-[#1e293b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#374151] disabled:opacity-40"
        >
          {editingId ? <><Pencil size={12} /> {t.threats.updateThreat}</> : <><Plus size={12} /> {t.threats.addThreat}</>}
        </button>
      </div>
    </div>
  );
}
