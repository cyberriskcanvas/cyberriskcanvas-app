import { useState, useRef, useTransition } from 'react';
import { Plus, Trash2, CheckSquare, Calendar, User, Pencil, X, Link, AlertTriangle, BookOpen, ChevronDown, Paperclip, Download, FileText } from 'lucide-react';
import { useDiagramStore } from '@/store/diagramStore';
import { useProjectStore } from '@/store/projectStore';
import type { NodeData, Measure, Risk } from '@/types';
import { useT } from '@/hooks/useT';
import { cn } from '@/utils/cn';
import { MEASURE_TEMPLATES, CATEGORY_LABELS, IEC_CATEGORIES, type MeasureTemplate } from '@/data/measureTemplates';

function TemplateRow({ template, onAdd }: { template: MeasureTemplate; onAdd: () => void }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 hover:bg-emerald-50/60">
      <span className="mt-0.5 shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
        {template.iecCategory}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[#1a1917]">{template.title}</p>
        <p className="text-[10px] text-[#9b9590] mt-0.5 line-clamp-2">{template.description}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {template.requirementIds.map((id) => (
            <span key={id} className="rounded bg-[#f4f1ec] px-1 py-0.5 font-mono text-[9px] text-[#6b6460]">{id}</span>
          ))}
        </div>
      </div>
      <button
        onClick={onAdd}
        className="shrink-0 mt-0.5 flex items-center gap-0.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-700"
      >
        <Plus size={10} /> Add
      </button>
    </div>
  );
}

const STATUS_STYLE: Record<Measure['status'], { color: string; dot: string }> = {
  open: { color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  'in-progress': { color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  mitigated: { color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  'risk-accepted': { color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
};

const inputClass = 'w-full rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none';
const inactiveBtn = 'bg-[#f4f1ec] text-[#6b6460] hover:bg-[#e5e1d8]';

const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg,.xlsx,.txt,.xml';

interface Props {
  nodeId: string;
  data: NodeData;
  readOnly?: boolean;
}

export function MeasuresTab({ nodeId, data, readOnly = false }: Props) {
  const { updateNodeData } = useDiagramStore();
  const diagramId = useDiagramStore((s) => s.diagramId);
  const projectId = useProjectStore((s) => s.projectId);
  const measures = (data.measures ?? []) as Measure[];
  const risks = (data.risks ?? []) as Risk[];
  const t = useT();

  const STATUS_CONFIG: Record<Measure['status'], { label: string; color: string; dot: string }> = {
    open: { label: t.measures.statusOpen, ...STATUS_STYLE.open },
    'in-progress': { label: t.measures.statusInProgress, ...STATUS_STYLE['in-progress'] },
    mitigated: { label: t.measures.statusMitigated, ...STATUS_STYLE.mitigated },
    'risk-accepted': { label: t.measures.statusRiskAccepted, ...STATUS_STYLE['risk-accepted'] },
  };

  const [showTemplates, setShowTemplates] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<string>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [riskId, setRiskId] = useState('');
  const [owner, setOwner] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [evidenceLink, setEvidenceLink] = useState('');
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [acceptanceReason, setAcceptanceReason] = useState('');
  const [acceptedBy, setAcceptedBy] = useState('');

  // Evidence upload state
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const save = (updated: Measure[]) => updateNodeData(nodeId, { measures: updated });

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setRiskId('');
    setOwner('');
    setDueDate('');
    setEvidenceLink('');
    setRiskAccepted(false);
    setAcceptanceReason('');
    setAcceptedBy('');
  };

  const startEdit = (m: Measure) => {
    setEditingId(m.id);
    setTitle(m.title);
    setDescription(m.description ?? '');
    setRiskId(m.riskId ?? '');
    setOwner(m.owner ?? '');
    setDueDate(m.dueDate ?? '');
    setEvidenceLink(m.evidenceLink ?? '');
    setRiskAccepted(m.riskAccepted ?? false);
    setAcceptanceReason(m.acceptanceReason ?? '');
    setAcceptedBy(m.acceptedBy ?? '');
  };

  const isSubmitDisabled = () => {
    if (!title.trim()) return true;
    if (riskAccepted && (!acceptanceReason.trim() || !acceptedBy.trim())) return true;
    return false;
  };

  const submit = () => {
    if (isSubmitDisabled()) return;

    const base = {
      title: title.trim(),
      description: description.trim() || undefined,
      riskId: riskId || undefined,
      owner: owner.trim() || undefined,
      dueDate: dueDate || undefined,
    };

    const acceptance = riskAccepted
      ? { riskAccepted: true, acceptanceReason: acceptanceReason.trim(), acceptedBy: acceptedBy.trim(), evidenceLink: undefined }
      : { riskAccepted: false, acceptanceReason: undefined, acceptedBy: undefined, evidenceLink: evidenceLink.trim() || undefined };

    const newStatus: Measure['status'] = riskAccepted ? 'risk-accepted' : (editingId ? measures.find((m) => m.id === editingId)?.status ?? 'open' : 'open');

    if (editingId) {
      save(measures.map((m) => m.id === editingId ? { ...m, ...base, ...acceptance, status: newStatus } : m));
    } else {
      save([...measures, { id: crypto.randomUUID(), status: newStatus, ...base, ...acceptance }]);
    }
    resetForm();
  };

  const updateStatus = (id: string, status: Measure['status']) =>
    save(measures.map((m) => (m.id === id ? { ...m, status } : m)));

  const remove = (id: string) => save(measures.filter((m) => m.id !== id));

  // ─── Evidence upload ──────────────────────────────────────────────────────────

  const triggerUpload = (measureId: string) => {
    if (!projectId || !diagramId) return;
    setUploadingFor(measureId);
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !uploadingFor || !projectId || !diagramId) {
      setUploadingFor(null);
      return;
    }

    const fd = new FormData();
    fd.append('diagramId', diagramId);
    fd.append('measureId', uploadingFor);
    fd.append('file', file);

    try {
      const res = await fetch(`/api/projects/${projectId}/evidence`, { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setUploadError(body.error ?? 'Upload failed');
        setUploadingFor(null);
        return;
      }
      const record = await res.json() as { id: string; name: string };
      const currentMeasureId = uploadingFor;
      save(measures.map((m) => m.id === currentMeasureId
        ? { ...m, evidenceFiles: [...(m.evidenceFiles ?? []), { id: record.id, name: record.name }] }
        : m,
      ));
    } catch {
      setUploadError('Upload failed');
    }
    setUploadingFor(null);
  };

  const deleteEvidenceFile = (measureId: string, fileId: string) => {
    if (!projectId) return;
    setDeletingFileId(fileId);
    startTransition(async () => {
      try {
        await fetch(`/api/projects/${projectId}/evidence/${fileId}`, { method: 'DELETE' });
        save(measures.map((m) => m.id === measureId
          ? { ...m, evidenceFiles: (m.evidenceFiles ?? []).filter((f) => f.id !== fileId) }
          : m,
        ));
      } finally {
        setDeletingFileId(null);
      }
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────

  const stats = {
    open: measures.filter((m) => m.status === 'open').length,
    inProgress: measures.filter((m) => m.status === 'in-progress').length,
    mitigated: measures.filter((m) => m.status === 'mitigated').length,
    riskAccepted: measures.filter((m) => m.status === 'risk-accepted').length,
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Hidden file input for evidence upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={handleFileSelected}
      />

      {measures.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              { key: 'open', count: stats.open, cfg: STATUS_CONFIG.open },
              { key: 'in-progress', count: stats.inProgress, cfg: STATUS_CONFIG['in-progress'] },
              { key: 'mitigated', count: stats.mitigated, cfg: STATUS_CONFIG.mitigated },
              { key: 'risk-accepted', count: stats.riskAccepted, cfg: STATUS_CONFIG['risk-accepted'] },
            ] as const
          ).map(({ key, count, cfg }) => (
            <div key={key} className="rounded-lg border border-[#e5e1d8] bg-white p-2 text-center">
              <div className={cn('mx-auto mb-1 h-2 w-2 rounded-full', cfg.dot)} />
              <p className="text-lg font-bold text-[#1a1917]">{count}</p>
              <p className="text-[9px] text-[#6b6460] leading-tight">{cfg.label}</p>
            </div>
          ))}
        </div>
      )}

      {uploadError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle size={12} />
          {uploadError}
          <button onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-red-700"><X size={12} /></button>
        </div>
      )}

      {measures.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center text-[#c8c0b0]">
          <CheckSquare size={28} />
          <p className="text-sm">{t.measures.noMeasures}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {measures.map((m) => {
            const cfg = STATUS_CONFIG[m.status];
            const linkedRisk = risks.find((r) => r.id === m.riskId);
            const evidenceFiles = m.evidenceFiles ?? [];
            const isUploading = uploadingFor === m.id;
            return (
              <div key={m.id} className={cn('rounded-lg border bg-white p-3', editingId === m.id ? 'border-indigo-400' : 'border-[#e5e1d8]')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', cfg.dot)} />
                      <span className="text-sm font-medium text-[#1a1917]">{m.title}</span>
                    </div>
                    {m.description && <p className="mt-1 text-xs text-[#6b6460]">{m.description}</p>}
                    {linkedRisk && (
                      <p className="mt-1 text-[10px] text-indigo-600">
                        ↳ {t.measures.linkedRisk}: {linkedRisk.level.toUpperCase()} (L{linkedRisk.likelihood}×I{linkedRisk.impact})
                      </p>
                    )}

                    {/* Risk acceptance details */}
                    {m.riskAccepted ? (
                      <div className="mt-1.5 rounded bg-orange-50 border border-orange-200 px-2 py-1 space-y-0.5">
                        {m.acceptedBy && (
                          <p className="text-[10px] text-orange-700 flex items-center gap-1">
                            <User size={9} />{m.acceptedBy}
                          </p>
                        )}
                        {m.acceptanceReason && (
                          <p className="text-[10px] text-orange-600 italic">{m.acceptanceReason}</p>
                        )}
                      </div>
                    ) : m.evidenceLink ? (
                      <a
                        href={m.evidenceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 flex items-center gap-1 text-[10px] text-indigo-500 hover:underline"
                      >
                        <Link size={9} />{m.evidenceLink}
                      </a>
                    ) : null}

                    {/* Evidence files */}
                    {evidenceFiles.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {evidenceFiles.map((f) => (
                          <div key={f.id} className="flex items-center gap-1.5 rounded bg-[#f4f1ec] px-2 py-1">
                            <FileText size={10} className="text-[#6b6460] shrink-0" />
                            <a
                              href={`/api/projects/${projectId}/evidence/${f.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 min-w-0 truncate text-[10px] text-indigo-600 hover:underline"
                            >
                              {f.name}
                            </a>
                            <a
                              href={`/api/projects/${projectId}/evidence/${f.id}?download=1`}
                              className="text-[#c8c0b0] hover:text-[#1e293b] shrink-0"
                              title="Download"
                            >
                              <Download size={10} />
                            </a>
                            {!readOnly && (
                              <button
                                onClick={() => deleteEvidenceFile(m.id, f.id)}
                                disabled={deletingFileId === f.id}
                                className="text-[#c8c0b0] hover:text-red-500 disabled:opacity-40 shrink-0"
                                title="Remove file"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-1 flex items-center gap-3 text-[10px] text-[#c8c0b0]">
                      {m.owner && <span className="flex items-center gap-1"><User size={10} />{m.owner}</span>}
                      {m.dueDate && <span className="flex items-center gap-1"><Calendar size={10} />{m.dueDate}</span>}
                    </div>

                    {!readOnly && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(Object.keys(STATUS_CONFIG) as Measure['status'][]).map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(m.id, s)}
                            className={cn('rounded px-2 py-0.5 text-[10px] font-medium transition-all', m.status === s ? STATUS_CONFIG[s].color : inactiveBtn)}
                          >
                            {STATUS_CONFIG[s].label}
                          </button>
                        ))}
                      </div>
                    )}
                    {readOnly && (
                      <span className={cn('mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-medium', STATUS_CONFIG[m.status].color)}>
                        {STATUS_CONFIG[m.status].label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!readOnly && projectId && diagramId && (
                      <button
                        onClick={() => triggerUpload(m.id)}
                        disabled={isUploading}
                        title="Attach evidence file"
                        className={cn(
                          'flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                          isUploading
                            ? 'bg-indigo-100 text-indigo-500 animate-pulse'
                            : 'text-[#c8c0b0] hover:text-indigo-500',
                        )}
                      >
                        <Paperclip size={12} />
                        {isUploading && 'Uploading…'}
                      </button>
                    )}
                    {!readOnly && (
                      <>
                        <button onClick={() => startEdit(m)} className="text-[#c8c0b0] hover:text-[#1e293b]"><Pencil size={13} /></button>
                        <button onClick={() => remove(m.id)} className="text-[#c8c0b0] hover:text-red-600"><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Template panel */}
      {!readOnly && (
        <>
          <button
            onClick={() => setShowTemplates((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 self-start rounded border px-2.5 py-1.5 text-xs font-medium transition-colors',
              showTemplates
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-[#e5e1d8] text-[#6b6460] hover:border-emerald-300 hover:text-emerald-700',
            )}
          >
            <BookOpen size={12} />
            IEC 62443 Templates
            <ChevronDown size={11} className={cn('transition-transform', showTemplates && 'rotate-180')} />
          </button>

          {showTemplates && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-emerald-100 bg-emerald-50">
                <BookOpen size={12} className="text-emerald-600 shrink-0" />
                <span className="text-xs font-semibold text-emerald-800 flex-1">Security Control Templates</span>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  className="rounded border border-emerald-200 bg-white px-1.5 py-0.5 text-xs text-[#1a1917] focus:outline-none"
                >
                  <option value="ALL">All categories</option>
                  {IEC_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat} - {CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-emerald-100">
                {MEASURE_TEMPLATES
                  .filter((t) => templateCategory === 'ALL' || t.iecCategory === templateCategory)
                  .map((tmpl, i) => (
                    <TemplateRow
                      key={i}
                      template={tmpl}
                      onAdd={() => {
                        save([...measures, {
                          id: crypto.randomUUID(),
                          title: tmpl.title,
                          description: tmpl.description,
                          status: 'open',
                        }]);
                      }}
                    />
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add / Edit form */}
      {!readOnly && <div className="rounded-lg border border-[#e5e1d8] bg-[#faf9f7] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#6b6460] uppercase tracking-wide">
            {editingId ? t.measures.editMeasure : t.measures.addMeasure}
          </p>
          {editingId && <button onClick={resetForm} className="text-[#c8c0b0] hover:text-[#1a1917]"><X size={14} /></button>}
        </div>

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.measures.titlePlaceholder} className={inputClass} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.measures.descPlaceholder} rows={2} className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none resize-none" />

        {risks.length > 0 && (
          <select value={riskId} onChange={(e) => setRiskId(e.target.value)} className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-sm text-[#1a1917] focus:border-[#1e293b] focus:outline-none">
            <option value="">{t.measures.linkToRisk}</option>
            {risks.map((r) => <option key={r.id} value={r.id}>{r.level.toUpperCase()} · L{r.likelihood}×I{r.impact}</option>)}
          </select>
        )}

        {/* Risk acceptance toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setRiskAccepted((v) => !v)}
            className={cn(
              'relative h-4 w-8 rounded-full transition-colors',
              riskAccepted ? 'bg-orange-400' : 'bg-[#d0ccc5]',
            )}
          >
            <span className={cn('absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform', riskAccepted ? 'translate-x-4' : 'translate-x-0.5')} />
          </div>
          <span className="flex items-center gap-1 text-xs text-[#6b6460]">
            <AlertTriangle size={11} className={riskAccepted ? 'text-orange-500' : 'text-[#c8c0b0]'} />
            {t.measures.riskAcceptLabel}
          </span>
        </label>

        {/* Conditional fields */}
        {riskAccepted ? (
          <>
            <textarea
              value={acceptanceReason}
              onChange={(e) => setAcceptanceReason(e.target.value)}
              placeholder={t.measures.acceptanceReasonPlaceholder}
              rows={2}
              className="w-full rounded border border-orange-300 bg-white px-2 py-1.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-orange-500 focus:outline-none resize-none"
            />
            <input
              value={acceptedBy}
              onChange={(e) => setAcceptedBy(e.target.value)}
              placeholder={t.measures.acceptedByPlaceholder}
              className="w-full rounded border border-orange-300 bg-white px-2 py-1.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-orange-500 focus:outline-none"
            />
          </>
        ) : (
          <input
            value={evidenceLink}
            onChange={(e) => setEvidenceLink(e.target.value)}
            placeholder={t.measures.evidenceLinkPlaceholder}
            className={inputClass}
          />
        )}

        <div className="grid grid-cols-2 gap-2">
          <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder={t.measures.ownerPlaceholder} className="rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none" />
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-sm text-[#1a1917] focus:border-[#1e293b] focus:outline-none" />
        </div>

        <button onClick={submit} disabled={isSubmitDisabled()} className="flex items-center gap-1.5 rounded bg-[#1e293b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#374151] disabled:opacity-40">
          {editingId ? <><Pencil size={12} /> {t.measures.updateMeasure}</> : <><Plus size={12} /> {t.measures.addMeasure}</>}
        </button>
      </div>}
    </div>
  );
}
