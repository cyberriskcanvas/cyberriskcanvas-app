'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2, AlertCircle } from 'lucide-react';
import { SbomUpload } from './SbomUpload';
import { VulnerabilityTable } from './VulnerabilityTable';
import type { SbomMeta, Vulnerability } from './types';

interface Props {
  projectId: string;
  versionId: string;
}

export function OperationsView({ projectId, versionId }: Props) {
  const [sbom, setSbom] = useState<SbomMeta | null>(null);
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const loadVulns = () => {
    setLoading(true);
    setLoadError(null);
    fetch(`/api/projects/${projectId}/vulnerabilities`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? 'Fehler beim Laden.');
        setSbom(data.sbom ?? null);
        setVulns(Array.isArray(data.vulnerabilities) ? data.vulnerabilities : []);
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : 'Fehler beim Laden der Schwachstellen.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadVulns(); }, [projectId, versionId]);

  function handleUploaded(_newSbom: SbomMeta, _vulnCount: number) {
    loadVulns();
  }

  function handleVulnUpdated(updated: Pick<Vulnerability, 'id' | 'status' | 'justification' | 'updatedAt'>) {
    setVulns((prev) =>
      prev.map((v) =>
        v.id === updated.id ? { ...v, status: updated.status, justification: updated.justification, updatedAt: updated.updatedAt } : v,
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
        setExportError(data.error ?? 'Export fehlgeschlagen.');
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
      setExportError('Netzwerkfehler beim Export.');
    } finally {
      setExporting(false);
    }
  }

  const criticalCount = vulns.filter((v) => v.severity === 'CRITICAL').length;
  const highCount = vulns.filter((v) => v.severity === 'HIGH').length;
  const openCount = vulns.filter((v) => v.status === 'open').length;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#faf9f7]">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 w-full">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#1a1714]">Operations & Schwachstellen</h2>
            <p className="text-sm text-[#6b6460]">
              SBOM hochladen, Schwachstellen verwalten und VEX/CSAF exportieren.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || vulns.length === 0}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-[#1a1714] px-3 py-2 text-sm font-medium text-white hover:bg-[#3d3a36] disabled:opacity-40"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            VEX + CSAF exportieren
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
              { label: 'Gesamt', value: vulns.length, color: 'text-[#1a1714]' },
              { label: 'Critical', value: criticalCount, color: 'text-red-600' },
              { label: 'High', value: highCount, color: 'text-orange-600' },
              { label: 'Offen', value: openCount, color: 'text-[#6b6460]' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-[#e5e1d8] bg-white px-4 py-3">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-[#9b9590]">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* SBOM Upload */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9b9590]">SBOM</h3>
          <SbomUpload projectId={projectId} currentSbom={sbom} onUploaded={handleUploaded} />
        </section>

        {/* Vulnerability Table */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9b9590]">
            Schwachstellen
          </h3>
          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-[#9b9590]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Lade…
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
