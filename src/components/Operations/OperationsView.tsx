'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2, AlertCircle } from 'lucide-react';
import { SbomUpload } from './SbomUpload';
import { VulnerabilityTable } from './VulnerabilityTable';
import { CiPanel } from './CiPanel';
import { ComponentTable } from './ComponentTable';
import { PolicyViolations } from './PolicyViolations';
import { TrendChart } from '@/components/Security/TrendChart';
import type { SbomMeta, Vulnerability, VulnUpdate } from './types';
import { useOperationsT } from '@/i18n/operations';

interface Props {
  projectId: string;
  versionId: string;
}

export function OperationsView({ projectId, versionId }: Props) {
  const { t } = useOperationsT();
  const [sbom, setSbom] = useState<SbomMeta | null>(null);
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [versions, setVersions] = useState<Array<{ number: number; label: string; status: string }>>([]);
  const [selected, setSelected] = useState<number | null>(null); // null = the active version
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const loadVulns = () => {
    setLoading(true);
    setLoadError(null);
    fetch(`/api/projects/${projectId}/vulnerabilities${selected === null ? '' : `?version=${selected}`}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? t.loadError);
        setSbom(data.sbom ?? null);
        setVulns(Array.isArray(data.vulnerabilities) ? data.vulnerabilities : []);
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : t.loadError))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadVulns(); }, [projectId, versionId, selected]);
  useEffect(() => {
    fetch(`/api/projects/${projectId}/versions`).then((r) => (r.ok ? r.json() : [])).then(setVersions).catch(() => setVersions([]));
  }, [projectId, versionId]);
  const frozen = selected !== null && versions.find((v) => v.number === selected)?.status === 'frozen';

  function handleUploaded(_newSbom: SbomMeta, _vulnCount: number) {
    loadVulns();
  }

  function handleVulnUpdated(updated: VulnUpdate) {
    setVulns((prev) =>
      prev.map((v) =>
        v.id === updated.id ? { ...v, ...updated } : v,
      ),
    );
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/csaf`);
      if (!res.ok) {
        const data = await res.json();
        setExportError(data.error ?? t.exportFailed);
        return;
      }
      const data = await res.json() as { vex: unknown; csaf: unknown; projectName: string };

      // Download VEX file
      const vexBlob = new Blob([JSON.stringify(data.vex, null, 2)], { type: 'application/json' });
      const vexUrl = URL.createObjectURL(vexBlob);
      const vexA = document.createElement('a');
      vexA.href = vexUrl;
      vexA.download = `${data.projectName.replace(/[^a-z0-9]+/gi, '-')}-vex.json`;
      vexA.click();
      URL.revokeObjectURL(vexUrl);

      // Download CSAF file (slight delay to avoid browser blocking)
      await new Promise((resolve) => setTimeout(resolve, 300));
      const csafBlob = new Blob([JSON.stringify(data.csaf, null, 2)], { type: 'application/json' });
      const csafUrl = URL.createObjectURL(csafBlob);
      const csafA = document.createElement('a');
      csafA.href = csafUrl;
      csafA.download = `${data.projectName.replace(/[^a-z0-9]+/gi, '-')}-csaf.json`;
      csafA.click();
      URL.revokeObjectURL(csafUrl);
    } catch {
      setExportError(t.exportNetwork);
    } finally {
      setExporting(false);
    }
  }

  const counted = vulns.filter((v) => !v.suppressed);
  const criticalCount = counted.filter((v) => v.severity === 'CRITICAL').length;
  const highCount = counted.filter((v) => v.severity === 'HIGH').length;
  const openCount = counted.filter((v) => v.status === 'open').length;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#faf9f7]">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 w-full">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#1a1714]">{t.title}</h2>
            <p className="text-sm text-[#6b6460]">
              {t.subtitle}
            </p>
          </div>
          {versions.length > 1 && (
            <select
              value={selected ?? ''}
              onChange={(e) => setSelected(e.target.value === '' ? null : Number(e.target.value))}
              className="shrink-0 rounded-lg border border-[#d4cfc8] bg-white px-2 py-2 text-sm text-[#3d3a36]"
            >
              <option value="">{t.version.current}</option>
              {versions.filter((v) => v.status === 'frozen').map((v) => (
                <option key={v.number} value={v.number}>{t.version.frozen(v.number, v.label)}</option>
              ))}
            </select>
          )}
          <button
            onClick={handleExport}
            disabled={exporting || vulns.length === 0}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-[#1a1714] px-3 py-2 text-sm font-medium text-white hover:bg-[#3d3a36] disabled:opacity-40"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {t.export}
          </button>
        </div>

        {exportError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {exportError}
          </div>
        )}

        {/* Stats */}
        {vulns.length > 0 && (
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: t.stats.total, value: counted.length, color: 'text-[#1a1714]' },
              { label: t.stats.critical, value: criticalCount, color: 'text-red-600' },
              { label: t.stats.high, value: highCount, color: 'text-orange-600' },
              { label: t.stats.open, value: openCount, color: 'text-[#6b6460]' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-[#e5e1d8] bg-white px-4 py-3">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-[#9b9590]">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {vulns.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9b9590]">{t.sections.trend}</h3>
            <TrendChart projectId={projectId} labels={{ critical: t.stats.critical, high: t.stats.high, medium: t.stats.medium, low: t.stats.low }} empty={t.trendEmpty} refreshKey={`${vulns.length}-${openCount}`} />
          </section>
        )}

        {/* CI/CD: pipeline evidence + release gate */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9b9590]">{t.sections.ci}</h3>
          <CiPanel projectId={projectId} refreshKey={`${vulns.length}-${openCount}`} />
        </section>

        {/* SBOM Upload */}
        {!frozen && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9b9590]">{t.sections.sbom}</h3>
            <SbomUpload projectId={projectId} currentSbom={sbom} onUploaded={handleUploaded} />
          </section>
        )}

        <PolicyViolations projectId={projectId} version={selected} refreshKey={`${sbom?.id ?? ''}-${vulns.length}`} />

        <ComponentTable projectId={projectId} version={selected} refreshKey={sbom?.id ?? ''} />

        {/* Vulnerability Table */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9b9590]">
            {t.sections.vulns}
          </h3>
          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-[#9b9590]">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.loading}
            </div>
          ) : loadError ? (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {loadError}
            </div>
          ) : (
            <VulnerabilityTable
              projectId={projectId}
              vulnerabilities={vulns}
              onUpdated={handleVulnUpdated}
            />
          )}
        </section>
      </div>
    </div>
  );
}
