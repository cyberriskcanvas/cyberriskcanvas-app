'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { getDocContext, saveDocData, type DocContext } from '@/actions/productInfo';
import { ANNEX_VII_KEYS, INSTRUCTION_KEYS, type AnnexViiKey, type DocData } from '@/lib/docData';
import { annexViiCoverage, generateAnnexII, generateDeclaration, missingLabel, type DocLang } from '@/utils/docGenerators';
import { exportDeclarationPdf, exportMarkdownPdf } from '@/utils/docPdf';
import { useDocsT } from '@/i18n/docs';

export type DocsSection = 'manufacturer' | 'userinfo' | 'techdoc' | 'declaration';
const SECTIONS: DocsSection[] = ['manufacturer', 'userinfo', 'techdoc', 'declaration'];

interface Props { projectId: string; section: DocsSection; onClose: () => void; onChanged: () => void }

const input = 'w-full rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-1.5 text-sm text-[#1a1714] focus:border-[#4f46e5] focus:outline-none';
const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-[#6b6460]';
const STATE_COLOR = { dossier: 'bg-blue-100 text-blue-800', provided: 'bg-green-100 text-green-800', partial: 'bg-amber-100 text-amber-800', separate: 'bg-red-100 text-red-800' } as const;

function download(content: string, filename: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function DocumentsWizard({ projectId, section: initial, onClose, onChanged }: Props) {
  const { t, lang: uiLang } = useDocsT();
  const [ctx, setCtx] = useState<DocContext | null>(null);
  const [data, setData] = useState<DocData | null>(null);
  const [section, setSection] = useState<DocsSection>(initial);
  const [docLang, setDocLang] = useState<DocLang>(uiLang);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { getDocContext(projectId).then((c) => { setCtx(c); setData(c.data); }).catch(() => {}); }, [projectId]);

  function update(mutate: (d: DocData) => DocData) {
    setData((prev) => {
      if (!prev) return prev;
      const next = mutate(structuredClone(prev));
      if (timer.current) clearTimeout(timer.current);
      setSaving(true);
      timer.current = setTimeout(async () => {
        try { await saveDocData(projectId, next); onChanged(); } finally { setSaving(false); }
      }, 700);
      return next;
    });
  }

  const annexII = useMemo(() => (data && ctx ? generateAnnexII(data, ctx.facts, docLang) : null), [data, ctx, docLang]);
  const declaration = useMemo(() => (data && ctx ? generateDeclaration(data, ctx.facts, docLang) : null), [data, ctx, docLang]);
  const coverage = useMemo(() => (data && ctx ? annexViiCoverage(data, ctx.facts, (annexII?.missing.length ?? 1) === 0, (declaration?.missing.length ?? 1) === 0) : []), [data, ctx, annexII, declaration]);

  if (!data || !ctx) return null;

  const text = (label: string, value: string, set: (d: DocData, v: string) => void, rows = 0, hint?: string) => (
    <div className="space-y-1">
      <label className={labelCls}>{label}</label>
      {rows > 0
        ? <textarea defaultValue={value} rows={rows} maxLength={4000} onChange={(e) => update((d) => { set(d, e.target.value); return d; })} className={input} />
        : <input defaultValue={value} maxLength={512} onChange={(e) => update((d) => { set(d, e.target.value); return d; })} className={input} />}
      {hint && <p className="text-xs text-[#9b9590]">{hint}</p>}
    </div>
  );

  const langSelect = (
    <label className="flex items-center gap-2 text-xs text-[#6b6460]">
      {section === 'declaration' ? t.declaration.language : t.userinfo.language}
      <select value={docLang} onChange={(e) => setDocLang(e.target.value as DocLang)} className="rounded border border-[#e5e1d8] px-2 py-1 text-xs">
        <option value="de">Deutsch</option><option value="en">English</option>
      </select>
    </label>
  );
  const slug = ctx.facts.productName.replace(/\s+/g, '-');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2 border-b border-[#e5e1d8] px-5 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#1a1714]">{t.title}</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#9b9590]">{saving ? t.saving : t.saved}</span>
              <button onClick={onClose} title={t.close} className="text-[#9b9590] hover:text-[#1a1714]"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SECTIONS.map((s) => (
              <button key={s} onClick={() => setSection(s)} className={`rounded-full border px-3 py-1 text-xs font-medium ${section === s ? 'border-[#1a1714] bg-[#1a1714] text-white' : 'border-[#e5e1d8] text-[#6b6460] hover:bg-[#f4f1ec]'}`}>{t.tabs[s]}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {section === 'manufacturer' && (
            <>
              <p className="text-xs text-[#6b6460]">{t.manufacturer.intro}</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {text(t.manufacturer.name, data.manufacturer.name, (d, v) => { d.manufacturer.name = v; })}
                {text(t.manufacturer.email, data.manufacturer.email, (d, v) => { d.manufacturer.email = v; })}
                {text(t.manufacturer.address, data.manufacturer.address, (d, v) => { d.manufacturer.address = v; })}
                {text(t.manufacturer.website, data.manufacturer.website, (d, v) => { d.manufacturer.website = v; })}
                {text(t.manufacturer.productName, data.product.name || ctx.facts.productName, (d, v) => { d.product.name = v; })}
                {text(t.manufacturer.productType, data.product.type, (d, v) => { d.product.type = v; })}
                {text(t.manufacturer.productIdentification, data.product.identification || ctx.facts.version || '', (d, v) => { d.product.identification = v; })}
                {text(t.manufacturer.cvdUrl, data.cvdUrl, (d, v) => { d.cvdUrl = v; })}
                {text(t.manufacturer.declarationUrl, data.declarationUrl, (d, v) => { d.declarationUrl = v; })}
                {text(t.manufacturer.sbomLocation, data.sbomLocation, (d, v) => { d.sbomLocation = v; })}
              </div>
              {text(t.manufacturer.standards, data.standards, (d, v) => { d.standards = v; }, 3)}
              <fieldset className="space-y-2 rounded-lg border border-[#e5e1d8] p-3">
                <legend className="px-1 text-xs font-semibold text-[#6b6460]">{t.manufacturer.notifiedBody}</legend>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {text(t.manufacturer.nbName, data.notifiedBody.name, (d, v) => { d.notifiedBody.name = v; })}
                  {text(t.manufacturer.nbNumber, data.notifiedBody.number, (d, v) => { d.notifiedBody.number = v; })}
                  {text(t.manufacturer.nbCertificate, data.notifiedBody.certificate, (d, v) => { d.notifiedBody.certificate = v; })}
                </div>
              </fieldset>
            </>
          )}

          {section === 'userinfo' && annexII && (
            <>
              <p className="text-xs text-[#6b6460]">{t.userinfo.intro}</p>
              {text(t.userinfo.securityEnvironment, data.securityEnvironment, (d, v) => { d.securityEnvironment = v; }, 3)}
              {text(t.userinfo.knownRisks, data.knownRisks, (d, v) => { d.knownRisks = v; }, 3)}
              {text(t.userinfo.supportType, data.supportType, (d, v) => { d.supportType = v; })}
              <p className="pt-1 text-xs font-semibold text-[#1a1714]">{t.userinfo.instructions}</p>
              {INSTRUCTION_KEYS.map((k) => text(t.userinfo.instructionLabels[k], data.instructions[k], (d, v) => { d.instructions[k] = v; }, 2))}

              <div className="space-y-2 border-t border-[#f0ede6] pt-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`text-xs font-medium ${annexII.missing.length === 0 ? 'text-green-700' : 'text-amber-700'}`}>{t.userinfo.missing(annexII.missing.length)}</span>
                  {annexII.missing.length > 0 && <span className="text-[11px] text-[#9b9590]">{annexII.missing.map((m) => missingLabel(docLang, m)).join(' · ')}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {langSelect}
                  <button onClick={() => download(annexII.markdown, `${slug}-annex-II.md`, 'text/markdown')} className="flex items-center gap-1.5 rounded-lg border border-[#e5e1d8] px-3 py-1.5 text-xs font-medium text-[#3d3a36] hover:bg-[#f4f1ec]"><Download className="h-3.5 w-3.5" />{t.userinfo.downloadMd}</button>
                  <button onClick={() => exportMarkdownPdf(annexII.markdown, `${slug}-annex-II.pdf`)} className="flex items-center gap-1.5 rounded-lg bg-[#1a1714] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3d3a36]"><Download className="h-3.5 w-3.5" />{t.userinfo.downloadPdf}</button>
                </div>
                <p className="text-[11px] italic text-[#9b9590]">{t.userinfo.hint}</p>
                <p className="pt-1 text-xs font-semibold text-[#1a1714]">{t.userinfo.preview}</p>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-[#faf9f7] p-3 text-xs leading-relaxed text-[#3d3a36]">{annexII.markdown}</pre>
              </div>
            </>
          )}

          {section === 'techdoc' && (
            <>
              <p className="text-xs text-[#6b6460]">{t.techdoc.intro}</p>
              {ctx.documents.length === 0 && <p className="text-[11px] text-[#9b9590]">{t.techdoc.noDocuments}</p>}
              <ul className="space-y-3">
                {ANNEX_VII_KEYS.map((key: AnnexViiKey) => {
                  const row = coverage.find((r) => r.point.point.replace(/[()]/g, '') === key);
                  const entry = data.annexVII[key];
                  return (
                    <li key={key} className="space-y-2 rounded-lg border border-[#e5e1d8] p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] text-[#9b9590]">{row?.point.point}</span>
                        <span className="text-sm font-semibold text-[#1a1714]">{t.techdoc.points[key]}</span>
                        {row && <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATE_COLOR[row.state]}`}>{t.techdoc.state[row.state]}</span>}
                      </div>
                      {row && <p className="text-[11px] text-[#9b9590]">{row.detail}</p>}
                      <textarea defaultValue={entry?.note ?? ''} rows={2} maxLength={4000} placeholder={t.techdoc.note}
                        onChange={(e) => update((d) => { d.annexVII[key] = { ...d.annexVII[key], note: e.target.value }; return d; })} className={input} />
                      {ctx.documents.length > 0 && (
                        <label className="flex items-center gap-2 text-xs text-[#6b6460]">{t.techdoc.attach}
                          <select value={entry?.documentId ?? ''} className="rounded border border-[#e5e1d8] px-2 py-1 text-xs"
                            onChange={(e) => update((d) => { d.annexVII[key] = { ...d.annexVII[key], documentId: e.target.value || undefined, documentName: ctx.documents.find((x) => x.id === e.target.value)?.name }; return d; })}>
                            <option value="">{t.techdoc.none}</option>
                            {ctx.documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.name}</option>)}
                          </select>
                        </label>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {section === 'declaration' && declaration && (
            <>
              <p className="text-xs text-[#6b6460]">{t.declaration.intro}</p>
              <p className={`text-xs font-medium ${declaration.missing.length === 0 ? 'text-green-700' : 'text-amber-700'}`}>{t.declaration.missing(declaration.missing.length)}</p>
              {declaration.missing.length > 0 && <p className="text-[11px] text-[#9b9590]">{t.declaration.openPoints}: {declaration.missing.map((m) => missingLabel(docLang, m)).join(' · ')}</p>}
              <div className="space-y-2 rounded-lg border border-[#e5e1d8] p-4">
                <p className="text-sm font-semibold text-[#1a1714]">{declaration.title}</p>
                <p className="text-xs italic text-amber-700">{declaration.draftNote}</p>
                {declaration.rows.map(([l, v]) => (<div key={l}><p className="text-[11px] font-semibold text-[#6b6460]">{l}</p><p className="text-sm text-[#1a1714]">{v}</p></div>))}
                {declaration.statements.map((s) => <p key={s} className="text-xs text-[#3d3a36]">{s}</p>)}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {langSelect}
                <button onClick={() => exportDeclarationPdf(declaration, `${slug}-declaration-of-conformity.pdf`)} className="flex items-center gap-1.5 rounded-lg bg-[#1a1714] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3d3a36]"><Download className="h-3.5 w-3.5" />{t.declaration.downloadPdf}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
