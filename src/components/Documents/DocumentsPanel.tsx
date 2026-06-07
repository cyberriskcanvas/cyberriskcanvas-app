'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { X, FileText, Upload, Trash2, Download, Eye, Loader2, AlertCircle } from 'lucide-react';
import { listDocuments, type DocumentMeta } from '@/actions/documents';
import { useT } from '@/hooks/useT';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';
import { MAX_PDF_SIZE } from '@/lib/uploadLimits';

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  projectId: string;
  onClose: () => void;
}

export function DocumentsPanel({ projectId, onClose }: Props) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewing, setViewing] = useState<DocumentMeta | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLoading(true);
    listDocuments(projectId)
      .then(setDocs)
      .catch(() => setError(t.documents.loadError))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError(t.documents.onlyPdf);
      return;
    }
    if (file.size > MAX_PDF_SIZE) {
      setError(t.documents.tooLarge);
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('projectId', projectId);
      fd.append('file', file);

      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? t.documents.uploadError);
      }
      const doc = await res.json() as DocumentMeta;
      setDocs((prev) => [doc, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.documents.uploadError);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (doc: DocumentMeta) => {
    if (!window.confirm(t.documents.deleteConfirm.replace('{name}', doc.name))) return;
    startTransition(async () => {
      setDeleting(doc.id);
      try {
        const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        setDocs((prev) => prev.filter((d) => d.id !== doc.id));
        if (viewing?.id === doc.id) setViewing(null);
      } catch {
        setError(t.documents.deleteError);
      } finally {
        setDeleting(null);
      }
    });
  };

  const documentUrl = (id: string) => `/api/documents/${id}`;
  const downloadUrl = (id: string) => `/api/documents/${id}?download=1`;

  return (
    <div className="flex h-full w-[340px] shrink-0 flex-col border-l border-[#e5e1d8] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e5e1d8] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#1a1917]">
          <FileText size={15} className="text-[#6b6460]" />
          {t.documents.title}
          <span className="rounded-full bg-[#f4f1ec] px-2 py-0.5 text-[11px] font-medium text-[#6b6460]">
            {docs.length}
          </span>
        </div>
        <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#c8c0b0] hover:bg-[#f4f1ec] hover:text-[#1a1917] transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle size={13} className="shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={12} /></button>
        </div>
      )}

      {/* Upload button */}
      <div className="border-b border-[#e5e1d8] px-3 py-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#c8c0b0] py-2.5 text-sm text-[#6b6460] transition-colors hover:border-[#1e293b] hover:bg-[#f4f1ec] hover:text-[#1a1917] disabled:opacity-50"
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? t.documents.uploading : t.documents.uploadBtn}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="mt-1.5 text-center text-[11px] text-[#c8c0b0]">{t.documents.hint}</p>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-[#c8c0b0]" />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <FileText size={28} className="text-[#e5e1d8]" />
            <p className="text-sm text-[#c8c0b0]">{t.documents.empty}</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#f4f1ec] px-1 py-1">
            {docs.map((doc) => (
              <li
                key={doc.id}
                className={cn(
                  'group flex items-center gap-2 rounded-lg px-2 py-2.5 transition-colors',
                  viewing?.id === doc.id ? 'bg-[#f4f1ec]' : 'hover:bg-[#faf9f7]',
                )}
              >
                <FileText size={15} className="shrink-0 text-red-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-[#1a1917]">{doc.name}</p>
                  <p className="text-[11px] text-[#c8c0b0]">
                    {formatBytes(doc.size)} · {formatDate(doc.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={documentUrl(doc.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t.documents.viewBtn}
                    className="flex h-6 w-6 items-center justify-center rounded text-[#6b6460] hover:bg-[#e5e1d8] hover:text-[#1a1917]"
                  >
                    <Eye size={13} />
                  </a>
                  <a
                    href={downloadUrl(doc.id)}
                    download
                    title={t.documents.downloadBtn}
                    className="flex h-6 w-6 items-center justify-center rounded text-[#6b6460] hover:bg-[#e5e1d8] hover:text-[#1a1917]"
                  >
                    <Download size={13} />
                  </a>
                  <button
                    onClick={() => handleDelete(doc)}
                    disabled={deleting === doc.id || isPending}
                    title={t.documents.deleteBtn}
                    className="flex h-6 w-6 items-center justify-center rounded text-[#c8c0b0] hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  >
                    {deleting === doc.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
