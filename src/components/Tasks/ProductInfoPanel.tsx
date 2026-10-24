'use client';

import { useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { saveProductInfo, type ProductInfo } from '@/actions/productInfo';
import { setIec62443 } from '@/actions/projects';
import { useProjectStore } from '@/store/projectStore';
import { CRA_CLASSES, conformityPath, isCraClass } from '@/data/conformity';
import { useJourneyT } from '@/i18n/journey';
import { useLanguageStore } from '@/store/languageStore';

interface Props {
  projectId: string;
  initial: ProductInfo;
  onSaved: (info: ProductInfo) => void;
  onClose: () => void;
}

const field = 'w-full rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] focus:border-[#4f46e5] focus:outline-none';
const label = 'block text-xs font-semibold uppercase tracking-wide text-[#6b6460]';

/** CRA class with conformity path, intended purpose and support period of the product. */
export function ProductInfoPanel({ projectId, initial, onSaved, onClose }: Props) {
  const t = useJourneyT().product;
  const lang = useLanguageStore((s) => s.lang);
  const [info, setInfo] = useState<ProductInfo>(initial);
  const [saved, setSaved] = useState(false);
  const iec62443 = useProjectStore((s) => s.iec62443);
  const setIecStore = useProjectStore((s) => s.setIec62443);

  async function toggleIec(enabled: boolean) {
    setIecStore(enabled);
    try {
      await setIec62443(projectId, enabled);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setIecStore(!enabled);
    }
  }

  async function save(patch: Partial<ProductInfo>) {
    const next = { ...info, ...patch };
    setInfo(next);
    await saveProductInfo(projectId, patch);
    onSaved(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const path = isCraClass(info.craClass) ? conformityPath(info.craClass) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#1a1714]">{t.title}</h3>
          <div className="flex items-center gap-3">
            {saved && <span className="text-xs text-green-700">{t.saved}</span>}
            <button onClick={onClose} title={t.close} className="text-[#9b9590] hover:text-[#1a1714]"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={label}>{t.craClass}</label>
          <select value={info.craClass ?? ''} onChange={(e) => save({ craClass: e.target.value || null })} className={field}>
            <option value="">{t.unset}</option>
            {CRA_CLASSES.map((c) => <option key={c} value={c}>{t.classes[c]}</option>)}
          </select>
          <a href="https://cyberklartext.de/tools/compliance/cra-klartext" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
            {t.scopeCheck}<ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {path && (
          <div className="space-y-1 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
            <p className="font-semibold">{t.conformity}: {t.notifiedBody[path.notifiedBody]}</p>
            <p>{t.procedures}: {path.procedures.join(', ')}</p>
            <p>{path.note[lang]}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className={label}>{t.intendedPurpose}</label>
          <textarea defaultValue={info.intendedPurpose ?? ''} onBlur={(e) => e.target.value !== (info.intendedPurpose ?? '') && save({ intendedPurpose: e.target.value })} rows={3} maxLength={4000} className={field} />
          <p className="text-xs text-[#9b9590]">{t.intendedPurposeHint}</p>
        </div>

        <div className="space-y-1.5">
          <label className={label}>{t.supportEnd}</label>
          <input type="date" defaultValue={info.supportPeriodEnd?.slice(0, 10) ?? ''} onChange={(e) => save({ supportPeriodEnd: e.target.value ? new Date(e.target.value).toISOString() : null })} className={field} />
          <p className="text-xs text-[#9b9590]">{t.supportEndHint}</p>
        </div>

        <div className="space-y-1.5">
          <label className={label}>{t.supportRationale}</label>
          <textarea defaultValue={info.supportPeriodRationale ?? ''} onBlur={(e) => e.target.value !== (info.supportPeriodRationale ?? '') && save({ supportPeriodRationale: e.target.value })} rows={3} maxLength={4000} className={field} />
          <p className="text-xs text-[#9b9590]">{t.supportRationaleHint}</p>
        </div>

        <label className="flex items-start gap-2.5 rounded-lg border border-[#e5e1d8] bg-[#faf9f7] px-3 py-2.5 text-sm text-[#1a1714]">
          <input type="checkbox" checked={iec62443} onChange={(e) => toggleIec(e.target.checked)} className="mt-0.5" />
          <span>
            <span className="font-medium">{t.iec62443}</span>
            <span className="block text-xs text-[#9b9590]">{t.iec62443Hint}</span>
          </span>
        </label>
      </div>
    </div>
  );
}
