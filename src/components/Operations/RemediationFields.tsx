'use client';

import { REMEDIATION_CATEGORIES } from '@/lib/remediation';
import { useOperationsT } from '@/i18n/operations';

export interface RemediationValue { category: string; details: string; url: string }

const field = 'w-full rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] placeholder-[#c0bab4] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]';

/** Category, details and link of a remediation; shared by the vulnerability and the own-vulnerability dialogs. */
export function RemediationFields({ value, onChange, warnIfMissing = false }: { value: RemediationValue; onChange: (v: RemediationValue) => void; warnIfMissing?: boolean }) {
  const { t } = useOperationsT();
  const r = t.remed;
  const actionable = ['vendor_fix', 'workaround', 'mitigation'].includes(value.category);
  return (
    <div className="space-y-2 rounded-lg border border-[#e5e1d8] bg-[#faf9f7] p-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[#6b6460]">{r.title}</p>
        <p className="text-[11px] text-[#9b9590]">{r.hint}</p>
      </div>
      <select value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })} className={field}>
        <option value="">{r.choose}</option>
        {REMEDIATION_CATEGORIES.map((c) => <option key={c} value={c}>{r.categories[c]}</option>)}
      </select>
      <textarea value={value.details} onChange={(e) => onChange({ ...value, details: e.target.value })} rows={2} maxLength={2000} placeholder={r.details} className={`${field} resize-none`} />
      <input value={value.url} onChange={(e) => onChange({ ...value, url: e.target.value })} maxLength={512} placeholder={r.url} className={field} />
      {warnIfMissing && !actionable && <p className="text-[11px] text-amber-700">{r.missing}</p>}
    </div>
  );
}
