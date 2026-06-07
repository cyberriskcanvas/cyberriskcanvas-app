'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Upload, Package, Shield, Trash2, AlertTriangle,
  ChevronDown, ChevronRight, RefreshCw, PackageCheck,
  Search, ExternalLink, X, Layers, List, Box,
} from 'lucide-react';
import { useDiagramStore } from '@/store/diagramStore';
import { getSbomData, deleteSbomData } from '@/actions/sbom';
import { usePaywallStore } from '@/store/paywallStore';
import type { SbomComponentData, SbomImportResult, SbomVulnerabilityData } from '@/types';
import { cn } from '@/utils/cn';
import { severityBadgeClass } from '@/lib/severityStyles';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEV_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 };

const FILTER_CHIPS = [
  { value: 'ALL',      label: 'All' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH',     label: 'High' },
  { value: 'MEDIUM',   label: 'Medium' },
  { value: 'LOW',      label: 'Low' },
  { value: 'CLEAN',    label: 'Clean' },
] as const;

type FilterValue = (typeof FILTER_CHIPS)[number]['value'];
type ViewMode = 'vulns' | 'packages' | 'components';

// ─── Derived types ────────────────────────────────────────────────────────────

interface UniqueVuln extends SbomVulnerabilityData {
  affectedComponents: Array<{ name: string; version?: string | null }>;
}

/** All CVEs for one package name (across all its versions in the SBOM). */
interface PackageGroup {
  name: string;
  versions: string[];
  vulns: UniqueVuln[];
  worstSeverity: string;
  totalVulns: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sevOrder(s?: string | null): number { return SEV_ORDER[s ?? 'NONE'] ?? 4; }

function worstSev(comp: SbomComponentData): string {
  if (!comp.vulnerabilities.length) return 'NONE';
  return comp.vulnerabilities.map((v) => v.severity ?? 'NONE').sort((a, b) => sevOrder(a) - sevOrder(b))[0];
}

function vulnUrl(v: Pick<SbomVulnerabilityData, 'cveId' | 'osvId'>): string {
  if (v.cveId) return `https://nvd.nist.gov/vuln/detail/${v.cveId}`;
  if (v.osvId.startsWith('GHSA-')) return `https://github.com/advisories/${v.osvId}`;
  return `https://osv.dev/vulnerability/${v.osvId}`;
}

function getUniqueVulns(components: SbomComponentData[]): UniqueVuln[] {
  const map = new Map<string, UniqueVuln>();
  for (const comp of components) {
    for (const v of comp.vulnerabilities) {
      const key = v.cveId ?? v.osvId;
      const existing = map.get(key);
      if (existing) {
        existing.affectedComponents.push({ name: comp.name, version: comp.version });
      } else {
        map.set(key, { ...v, affectedComponents: [{ name: comp.name, version: comp.version }] });
      }
    }
  }
  return [...map.values()].sort((a, b) => {
    const sd = sevOrder(a.severity) - sevOrder(b.severity);
    if (sd !== 0) return sd;
    return (b.cvssScore ?? 0) - (a.cvssScore ?? 0);
  });
}

/**
 * Groups components by package name. For each name, collects all unique CVEs
 * across every version. Packages without vulns are omitted unless filter=CLEAN.
 */
function getPackageGroups(components: SbomComponentData[]): PackageGroup[] {
  const groups = new Map<string, { versions: Set<string>; vulnMap: Map<string, UniqueVuln> }>();

  for (const comp of components) {
    if (!groups.has(comp.name)) groups.set(comp.name, { versions: new Set(), vulnMap: new Map() });
    const g = groups.get(comp.name)!;
    if (comp.version && comp.version !== 'unknown') g.versions.add(comp.version);

    for (const v of comp.vulnerabilities) {
      const key = v.cveId ?? v.osvId;
      const existing = g.vulnMap.get(key);
      if (existing) {
        existing.affectedComponents.push({ name: comp.name, version: comp.version });
      } else {
        g.vulnMap.set(key, { ...v, affectedComponents: [{ name: comp.name, version: comp.version }] });
      }
    }
  }

  const result: PackageGroup[] = [];
  for (const [name, { versions, vulnMap }] of groups) {
    const vulns = [...vulnMap.values()].sort((a, b) => sevOrder(a.severity) - sevOrder(b.severity));
    result.push({
      name,
      versions: [...versions].sort(),
      vulns,
      worstSeverity: vulns[0]?.severity ?? 'NONE',
      totalVulns: vulns.length,
    });
  }

  return result.sort((a, b) => {
    const sd = sevOrder(a.worstSeverity) - sevOrder(b.worstSeverity);
    if (sd !== 0) return sd;
    return b.totalVulns - a.totalVulns;
  });
}

function matchesSearch(q: string, texts: string[]): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return texts.some((t) => t?.toLowerCase().includes(lower));
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

interface Props { nodeId: string; diagramId: string }

function SbomDropZone({ onFile }: { onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.json')) onFile(f);
  }, [onFile]);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
        dragging ? 'border-indigo-500 bg-indigo-950/30' : 'border-gray-700 hover:border-gray-600 hover:bg-gray-900/50',
      )}
    >
      <Upload size={24} className={dragging ? 'text-indigo-400' : 'text-gray-600'} />
      <div>
        <p className="text-sm font-medium text-gray-300">CycloneDX SBOM hier ablegen</p>
        <p className="mt-0.5 text-xs text-gray-600">oder klicken - nur .json Dateien</p>
      </div>
      <input ref={inputRef} type="file" accept=".json,application/json" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}

function VulnBadge({ severity }: { severity?: string | null }) {
  const s = severity ?? 'NONE';
  return (
    <span className={cn('inline-flex shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold', severityBadgeClass(s, 'dark'))}>
      {s}
    </span>
  );
}

function CvssChip({ score }: { score?: number | null }) {
  if (score == null) return null;
  return (
    <span className="rounded bg-gray-800 px-1 py-0.5 font-mono text-[9px] text-gray-400">
      CVSS&nbsp;{score.toFixed(1)}
    </span>
  );
}

function FilterBar({
  search, setSearch, filter, setFilter,
}: {
  search: string; setSearch: (s: string) => void;
  filter: FilterValue; setFilter: (f: FilterValue) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5">
        <Search size={12} className="shrink-0 text-gray-600" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="CVE-ID, Paketname, Zusammenfassung…"
          className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="shrink-0 text-gray-600 hover:text-gray-300">
            <X size={11} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {FILTER_CHIPS.map((chip) => {
          const active = filter === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() => setFilter(chip.value)}
              className={cn(
                'rounded border px-2 py-0.5 text-[10px] font-semibold transition-colors',
                active
                  ? chip.value === 'CRITICAL' ? 'border-red-700 bg-red-900/60 text-red-300'
                  : chip.value === 'HIGH'     ? 'border-orange-700 bg-orange-900/60 text-orange-300'
                  : chip.value === 'MEDIUM'   ? 'border-yellow-700 bg-yellow-900/60 text-yellow-300'
                  : chip.value === 'LOW'      ? 'border-blue-700 bg-blue-900/60 text-blue-300'
                  : chip.value === 'CLEAN'    ? 'border-green-800 bg-green-950/50 text-green-400'
                  : 'border-indigo-700 bg-indigo-900/60 text-indigo-300'
                  : 'border-gray-700 bg-gray-900 text-gray-500 hover:border-gray-600 hover:text-gray-300',
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Vulnerability-centric row ────────────────────────────────────────────────

function UniqueVulnRow({ v }: { v: UniqueVuln }) {
  const [open, setOpen] = useState(false);
  const href = vulnUrl(v);
  const label = v.cveId ?? v.osvId;
  const n = v.affectedComponents.length;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
        {open ? <ChevronDown size={12} className="shrink-0 text-gray-600" /> : <ChevronRight size={12} className="shrink-0 text-gray-600" />}
        <VulnBadge severity={v.severity} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <a href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
              className="group inline-flex items-center gap-0.5 font-mono text-[11px] text-indigo-300 hover:text-indigo-200 hover:underline">
              {label}<ExternalLink size={9} className="opacity-50 group-hover:opacity-100" />
            </a>
            <CvssChip score={v.cvssScore} />
          </div>
          {v.summary && <p className="mt-0.5 text-[10px] leading-relaxed text-gray-500 line-clamp-1">{v.summary}</p>}
        </div>
        <span className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-medium',
          n > 1 ? 'border-orange-900/50 bg-orange-950/30 text-orange-500' : 'border-gray-800 bg-gray-900 text-gray-600')}>
          {n} pkg{n !== 1 ? 's' : ''}
        </span>
      </button>
      {open && (
        <div className="border-t border-gray-800 px-3 py-2 space-y-1">
          {v.summary && <p className="text-[10px] leading-relaxed text-gray-400">{v.summary}</p>}
          <div className="mt-1 flex flex-wrap gap-1">
            {v.affectedComponents.map((c, idx) => (
              <span key={idx} className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">
                {c.name}{c.version ? `@${c.version}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Package-centric row (new) ────────────────────────────────────────────────

function PackageGroupRow({ group, searchQuery }: { group: PackageGroup; searchQuery: string }) {
  const [open, setOpen] = useState(false);

  const autoExpand = searchQuery
    ? group.vulns.some((v) =>
        v.cveId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.osvId.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : false;

  useEffect(() => { if (autoExpand) setOpen(true); }, [autoExpand]);

  const criticalCount = group.vulns.filter((v) => v.severity === 'CRITICAL').length;
  const highCount     = group.vulns.filter((v) => v.severity === 'HIGH').length;
  const medCount      = group.vulns.filter((v) => v.severity === 'MEDIUM').length;
  const lowCount      = group.vulns.filter((v) => v.severity === 'LOW').length;

  return (
    <div className={cn('rounded-lg border bg-gray-900', group.worstSeverity === 'NONE' ? 'border-gray-800' : 'border-gray-700')}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
        {open ? <ChevronDown size={12} className="shrink-0 text-gray-600" /> : <ChevronRight size={12} className="shrink-0 text-gray-600" />}
        <Box size={12} className="shrink-0 text-gray-600" />
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-white">{group.name}</span>
          {group.versions.length > 0 && (
            <span className="ml-1.5 text-[10px] text-gray-600">
              {group.versions.length === 1 ? `v${group.versions[0]}` : `${group.versions.length} Versionen`}
            </span>
          )}
        </div>
        {/* Severity mini-bar */}
        <div className="flex shrink-0 items-center gap-1">
          {criticalCount > 0 && <span className="rounded bg-red-900/60 px-1 py-0.5 text-[9px] font-bold text-red-300">{criticalCount}C</span>}
          {highCount > 0     && <span className="rounded bg-orange-900/60 px-1 py-0.5 text-[9px] font-bold text-orange-300">{highCount}H</span>}
          {medCount > 0      && <span className="rounded bg-yellow-900/60 px-1 py-0.5 text-[9px] font-bold text-yellow-300">{medCount}M</span>}
          {lowCount > 0      && <span className="rounded bg-blue-900/60 px-1 py-0.5 text-[9px] font-bold text-blue-300">{lowCount}L</span>}
          {group.totalVulns === 0 && <span className="text-[10px] text-green-600">clean</span>}
        </div>
      </button>

      {open && group.vulns.length > 0 && (
        <div className="border-t border-gray-800 px-3 pb-2 pt-1 space-y-0.5">
          {group.vulns.map((v) => {
            const href = vulnUrl(v);
            const label = v.cveId ?? v.osvId;
            return (
              <div key={v.id} className="flex items-start gap-2 rounded-md px-1 py-1 hover:bg-gray-800/60">
                <VulnBadge severity={v.severity} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <a href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                      className="group inline-flex items-center gap-1 font-mono text-[11px] text-indigo-300 hover:text-indigo-200 hover:underline">
                      {label}<ExternalLink size={9} className="opacity-50 group-hover:opacity-100" />
                    </a>
                    <CvssChip score={v.cvssScore} />
                  </div>
                  {v.summary && <p className="mt-0.5 text-[10px] text-gray-500 line-clamp-2">{v.summary}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Component-centric row ────────────────────────────────────────────────────

function ComponentRow({ comp, searchQuery }: { comp: SbomComponentData; searchQuery: string }) {
  const [open, setOpen] = useState(false);
  const vulnCount = comp.vulnerabilities.length;
  const ws = worstSev(comp);
  const autoExpand = searchQuery
    ? comp.vulnerabilities.some((v) =>
        v.cveId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.osvId.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : false;
  useEffect(() => { if (autoExpand) setOpen(true); }, [autoExpand]);
  const sortedVulns = useMemo(
    () => comp.vulnerabilities.slice().sort((a, b) => sevOrder(a.severity) - sevOrder(b.severity)),
    [comp.vulnerabilities],
  );
  return (
    <div className={cn('rounded-lg border bg-gray-900', ws === 'NONE' ? 'border-gray-800' : 'border-gray-700')}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
        {open ? <ChevronDown size={12} className="shrink-0 text-gray-600" /> : <ChevronRight size={12} className="shrink-0 text-gray-600" />}
        <Package size={12} className="shrink-0 text-gray-600" />
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-white">{comp.name}</span>
          {comp.version && <span className="ml-1.5 text-[10px] text-gray-500">v{comp.version}</span>}
        </div>
        {vulnCount > 0 ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <VulnBadge severity={ws} />
            <span className="text-[10px] text-gray-500">{vulnCount}</span>
          </div>
        ) : (
          <span className="shrink-0 rounded border border-green-900/50 bg-green-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-green-600">clean</span>
        )}
      </button>
      {open && (
        <div className="border-t border-gray-800 px-3 pb-2 pt-1">
          {sortedVulns.length === 0 ? (
            <p className="py-1 text-[11px] text-green-700">Keine bekannten Schwachstellen</p>
          ) : (
            <div className="space-y-0.5">
              {sortedVulns.map((v) => (
                <div key={v.id} className="flex items-start gap-2 rounded-md px-1 py-1 hover:bg-gray-800/60">
                  <VulnBadge severity={v.severity} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <a href={vulnUrl(v)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                        className="group inline-flex items-center gap-1 font-mono text-[11px] text-indigo-300 hover:text-indigo-200 hover:underline">
                        {v.cveId ?? v.osvId}<ExternalLink size={9} className="opacity-50 group-hover:opacity-100" />
                      </a>
                      <CvssChip score={v.cvssScore} />
                    </div>
                    {v.summary && <p className="mt-0.5 text-[10px] text-gray-500 line-clamp-2">{v.summary}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {comp.purl && <p className="mt-2 truncate font-mono text-[9px] text-gray-700">{comp.purl}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Summary bar ──────────────────────────────────────────────────────────────

function SummaryBar({ result }: { result: SbomImportResult }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-3 text-center">
        <p className="text-lg font-bold text-white">{result.componentCount}</p>
        <p className="text-[10px] uppercase tracking-wide text-gray-500">Komponenten</p>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-3 text-center">
        <p className="text-lg font-bold text-white">{result.vulnCount}</p>
        <p className="text-[10px] uppercase tracking-wide text-gray-500">Einträge</p>
      </div>
      <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-center">
        <p className="text-lg font-bold text-red-400">{result.criticalCount}</p>
        <p className="text-[10px] uppercase tracking-wide text-red-800">Critical</p>
      </div>
      <div className="rounded-lg border border-orange-900/50 bg-orange-950/30 p-3 text-center">
        <p className="text-lg font-bold text-orange-400">{result.highCount}</p>
        <p className="text-[10px] uppercase tracking-wide text-orange-800">High</p>
      </div>
      {result.threatsCreated > 0 && (
        <div className="col-span-2 flex items-center gap-2 rounded-lg border border-indigo-900/50 bg-indigo-950/30 px-3 py-2">
          <Shield size={14} className="shrink-0 text-indigo-400" />
          <p className="text-xs text-indigo-300">
            {result.threatsCreated} Bedrohung{result.threatsCreated > 1 ? 'en' : ''} aus kritischen CVEs erstellt
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function SbomTab({ nodeId, diagramId }: Props) {
  const { updateNodeData } = useDiagramStore();
  const [components, setComponents] = useState<SbomComponentData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lastResult, setLastResult] = useState<SbomImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('packages');

  const loadData = useCallback(async () => {
    try {
      const data = await getSbomData(diagramId, nodeId);
      setComponents(data);
    } catch (e) {
      console.error('getSbomData error:', e);
      setComponents([]);
    } finally {
      setLoading(false);
    }
  }, [diagramId, nodeId]);

  useEffect(() => {
    setLoading(true); setComponents(null); setLastResult(null);
    setSearch(''); setFilter('ALL');
    loadData();
  }, [loadData]);

  // ── Computed lists ──────────────────────────────────────────────────────────

  const uniqueVulns = useMemo(() => (components ? getUniqueVulns(components) : []), [components]);
  const packageGroups = useMemo(() => (components ? getPackageGroups(components) : []), [components]);

  // Vuln view filter
  const displayedVulns = useMemo(() => uniqueVulns.filter((v) => {
    const sev = v.severity ?? 'NONE';
    const passFilter = filter === 'ALL' || sev === filter;
    return passFilter && matchesSearch(search, [v.cveId ?? '', v.osvId, v.summary ?? '']);
  }), [uniqueVulns, filter, search]);

  // Package view filter
  const displayedPackages = useMemo(() => packageGroups.filter((g) => {
    const ws = g.worstSeverity;
    const passFilter =
      filter === 'ALL' ||
      (filter === 'CLEAN' && ws === 'NONE') ||
      (filter !== 'CLEAN' && ws === filter);
    const searchTexts = [g.name, ...g.vulns.flatMap((v) => [v.cveId ?? '', v.osvId, v.summary ?? ''])];
    return passFilter && matchesSearch(search, searchTexts);
  }), [packageGroups, filter, search]);

  // Component view filter
  const displayedComponents = useMemo(() => {
    if (!components) return [];
    return components
      .slice()
      .sort((a, b) => sevOrder(worstSev(a)) - sevOrder(worstSev(b)))
      .filter((comp) => {
        const ws = worstSev(comp);
        const passFilter =
          filter === 'ALL' ||
          (filter === 'CLEAN' && ws === 'NONE') ||
          (filter !== 'CLEAN' && ws === filter);
        return passFilter && matchesSearch(search, [
          comp.name, comp.version ?? '', comp.purl ?? '',
          ...comp.vulnerabilities.flatMap((v) => [v.cveId ?? '', v.osvId, v.summary ?? '']),
        ]);
      });
  }, [components, filter, search]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const uniqueVulnCount = uniqueVulns.length;
  const packageGroupCount = packageGroups.filter((g) => g.totalVulns > 0).length;
  const componentCount = components?.length ?? 0;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    setUploading(true); setError(null); setLastResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file); fd.append('diagramId', diagramId); fd.append('nodeId', nodeId);
      const res = await fetch('/api/sbom/upload', { method: 'POST', body: fd });
      const json = await res.json() as SbomImportResult & { error?: string };
      if (!res.ok) {
        if (res.status === 403) usePaywallStore.getState().showPaywall('pro');
        setError(json.error ?? 'Upload fehlgeschlagen');
        return;
      }
      setLastResult(json); setSearch(''); setFilter('ALL');
      const fresh = await getSbomData(diagramId, nodeId);
      setComponents(fresh);
      updateNodeData(nodeId, {});
    } catch (e) {
      setError((e as Error).message ?? 'Unbekannter Fehler');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Alle SBOM-Daten und auto-erstellte Bedrohungen löschen?')) return;
    setLoading(true);
    try {
      await deleteSbomData(diagramId, nodeId);
      setComponents([]); setLastResult(null); setSearch(''); setFilter('ALL');
      updateNodeData(nodeId, { threats: [] });
    } catch (e) {
      setError((e as Error).message ?? 'Löschen fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const hasData = components && components.length > 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PackageCheck size={15} className="text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">SBOM</span>
        </div>
        {hasData && (
          <div className="flex items-center gap-1">
            <button onClick={loadData} className="rounded p-1 text-gray-600 hover:text-gray-300" title="Aktualisieren">
              <RefreshCw size={13} />
            </button>
            <button onClick={handleDelete} className="rounded p-1 text-gray-600 hover:text-red-400" title="Löschen">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Upload zone */}
      {uploading ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-indigo-800 bg-indigo-950/20 p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-indigo-300">SBOM wird geparst & OSV.dev abgefragt…</p>
        </div>
      ) : (
        <SbomDropZone onFile={handleFile} />
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2.5">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {lastResult && <SummaryBar result={lastResult} />}

      {/* Controls */}
      {hasData && !loading && (
        <div className="space-y-2">
          {/* 3-way view toggle */}
          <div className="flex rounded-lg border border-gray-800 bg-gray-900 p-0.5">
            {/* Packages (new default) */}
            <button
              onClick={() => setViewMode('packages')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-colors',
                viewMode === 'packages' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300',
              )}
              title="Nach Paketname gruppiert"
            >
              <Box size={11} />
              Pakete
              <span className={cn('rounded px-1 text-[8px] font-bold', viewMode === 'packages' ? 'bg-indigo-500 text-indigo-100' : 'bg-gray-800 text-gray-500')}>
                {packageGroupCount}
              </span>
            </button>
            {/* CVE-centric */}
            <button
              onClick={() => setViewMode('vulns')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-colors',
                viewMode === 'vulns' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300',
              )}
              title="Einzigartige CVEs"
            >
              <Layers size={11} />
              CVEs
              <span className={cn('rounded px-1 text-[8px] font-bold', viewMode === 'vulns' ? 'bg-indigo-500 text-indigo-100' : 'bg-gray-800 text-gray-500')}>
                {uniqueVulnCount}
              </span>
            </button>
            {/* Component-centric */}
            <button
              onClick={() => setViewMode('components')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-colors',
                viewMode === 'components' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300',
              )}
              title="Alle Komponenten"
            >
              <List size={11} />
              Komp.
              <span className={cn('rounded px-1 text-[8px] font-bold', viewMode === 'components' ? 'bg-indigo-500 text-indigo-100' : 'bg-gray-800 text-gray-500')}>
                {componentCount}
              </span>
            </button>
          </div>

          {/* View description */}
          <p className="text-[10px] text-gray-600">
            {viewMode === 'packages' && `${packageGroupCount} Pakete mit Schwachstellen - CVEs nach Paketname gruppiert`}
            {viewMode === 'vulns'    && `${uniqueVulnCount} einzigartige CVEs - paketübergreifend dedupliziert`}
            {viewMode === 'components' && `${componentCount} einzelne Komponenten aus dem SBOM`}
          </p>

          <FilterBar search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} />

          {/* Result count */}
          <p className="text-[10px] uppercase tracking-wide text-gray-600">
            {viewMode === 'packages'    && `${displayedPackages.length} von ${packageGroupCount} Paketen`}
            {viewMode === 'vulns'       && `${displayedVulns.length} von ${uniqueVulnCount} CVEs`}
            {viewMode === 'components'  && `${displayedComponents.length} von ${componentCount} Komponenten`}
          </p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-800/60" />)}
        </div>
      ) : hasData ? (
        <div className="space-y-1.5">
          {viewMode === 'packages' && (
            displayedPackages.length === 0
              ? <p className="py-6 text-center text-xs text-gray-600">Keine Pakete entsprechen dem Filter</p>
              : displayedPackages.map((g) => <PackageGroupRow key={g.name} group={g} searchQuery={search} />)
          )}
          {viewMode === 'vulns' && (
            displayedVulns.length === 0
              ? <p className="py-6 text-center text-xs text-gray-600">Keine CVEs entsprechen dem Filter</p>
              : displayedVulns.map((v) => <UniqueVulnRow key={v.cveId ?? v.osvId} v={v} />)
          )}
          {viewMode === 'components' && (
            displayedComponents.length === 0
              ? <p className="py-6 text-center text-xs text-gray-600">Keine Komponenten entsprechen dem Filter</p>
              : displayedComponents.map((c) => <ComponentRow key={c.id} comp={c} searchQuery={search} />)
          )}
        </div>
      ) : !loading && components !== null && !lastResult ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center text-gray-600">
          <Package size={24} />
          <p className="text-xs">Noch kein SBOM für diese Komponente importiert</p>
        </div>
      ) : null}
    </div>
  );
}
