'use client';

import { useRef, useState } from 'react';
import { Upload, FileJson, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { SbomMeta } from './types';

interface Props {
  projectId: string;
  currentSbom: SbomMeta | null;
  onUploaded: (sbom: SbomMeta, vulnCount: number) => void;
}

export function SbomUpload({ projectId, currentSbom, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function upload(file: File) {
    if (!file.name.endsWith('.json')) {
      setError('Nur JSON-Dateien (CycloneDX oder SPDX) werden unterstützt.');
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/projects/${projectId}/sbom`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Upload fehlgeschlagen.');
        return;
      }
      onUploaded(
        {
          id: data.sbomId,
          fileName: file.name,
          format: data.format,
          componentCount: data.componentCount,
          uploadedAt: new Date().toISOString(),
        },
        data.vulnCount,
      );
      setSuccess(
        `${data.componentCount} Komponenten analysiert · ${data.vulnCount} Schwachstellen gefunden (${data.criticalCount} CRITICAL, ${data.highCount} HIGH)`,
      );
    } catch {
      setError('Netzwerkfehler beim Upload.');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  return (
    <div className="space-y-3">
      {currentSbom && (
        <div className="flex items-center gap-2 rounded-lg border border-[#e5e1d8] bg-[#faf9f7] px-3 py-2 text-sm">
          <FileJson className="h-4 w-4 shrink-0 text-[#6b6460]" />
          <span className="flex-1 truncate text-[#3d3a36]">{currentSbom.fileName}</span>
          <span className="text-[#9b9590] text-xs">{currentSbom.format} · {currentSbom.componentCount} Komp.</span>
          <span className="text-[#9b9590] text-xs">
            {new Date(currentSbom.uploadedAt).toLocaleDateString('de-DE')}
          </span>
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className={[
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors',
          dragging ? 'border-[#4f46e5] bg-[#eef2ff]' : 'border-[#d4cfc8] hover:border-[#a09890] hover:bg-[#f4f1ec]',
          uploading ? 'pointer-events-none opacity-60' : '',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}
        />
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-[#6b6460]" />
        ) : (
          <Upload className="h-6 w-6 text-[#9b9590]" />
        )}
        <span className="text-sm font-medium text-[#3d3a36]">
          {uploading ? 'Wird analysiert…' : currentSbom ? 'Neue SBOM hochladen (ersetzt vorherige)' : 'SBOM hochladen'}
        </span>
        <span className="text-xs text-[#9b9590]">CycloneDX oder SPDX · JSON · max. 10 MB</span>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
