'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, FileText } from 'lucide-react';
import { getDocContext, type DocContext } from '@/actions/productInfo';
import { annexViiCoverage, generateAnnexII, generateDeclaration } from '@/utils/docGenerators';
import { useDocsT } from '@/i18n/docs';
import { DocumentsWizard, type DocsSection } from '@/components/Tasks/DocumentsWizard';
import { DocumentsPanel } from './DocumentsPanel';

const SECTIONS: DocsSection[] = ['manufacturer', 'userinfo', 'techdoc', 'declaration'];

/** Documents tab: the generated CRA documents with their status, and the uploaded evidence. */
export function DocumentsView({ projectId }: { projectId: string }) {
  const { t, lang } = useDocsT();
  const [ctx, setCtx] = useState<DocContext | null>(null);
  const [open, setOpen] = useState<DocsSection | null>(null);
  const load = useCallback(() => { getDocContext(projectId).then(setCtx).catch(() => {}); }, [projectId]);
  useEffect(load, [load]);

  const status = useMemo((): Partial<Record<DocsSection, { text: string; done: boolean }>> => {
    if (!ctx) return {};
    const annexII = generateAnnexII(ctx.data, ctx.facts, lang);
    const declaration = generateDeclaration(ctx.data, ctx.facts, lang);
    const rows = annexViiCoverage(ctx.data, ctx.facts, annexII.missing.length === 0, declaration.missing.length === 0);
    const covered = rows.filter((r) => r.state === 'dossier' || r.state === 'provided').length;
    const missing = (n: number) => ({ text: n === 0 ? t.view.complete : t.view.open(n), done: n === 0 });
    return {
      manufacturer: { text: t.view.base, done: true },
      userinfo: missing(annexII.missing.length),
      techdoc: { text: t.view.covered(covered, rows.length), done: covered === rows.length },
      declaration: missing(declaration.missing.length),
    };
  }, [ctx, lang, t]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        <p className="text-sm text-[#6b6460]">{t.view.intro}</p>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9b9590]">{t.view.generated}</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {SECTIONS.map((s) => (
              <button key={s} onClick={() => setOpen(s)} className="flex items-start gap-3 rounded-xl border border-[#e5e1d8] bg-white p-4 text-left hover:border-[#1a1714]">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#6b6460]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#1a1714]">{t.tabs[s]}</span>
                  <span className="mt-0.5 block text-xs text-[#6b6460]">{t[s].intro}</span>
                  {status[s] && (
                    <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${s === 'manufacturer' ? 'bg-[#f4f1ec] text-[#6b6460]' : status[s]!.done ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {status[s]!.text}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-indigo-700">{t.view.edit}<ChevronRight className="h-3.5 w-3.5" /></span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9b9590]">{t.view.evidence}</h3>
          <p className="text-xs text-[#6b6460]">{t.view.evidenceIntro}</p>
          <DocumentsPanel projectId={projectId} />
        </section>
      </div>

      {open && <DocumentsWizard projectId={projectId} section={open} onClose={() => { setOpen(null); load(); }} onChanged={() => {}} />}
    </div>
  );
}
