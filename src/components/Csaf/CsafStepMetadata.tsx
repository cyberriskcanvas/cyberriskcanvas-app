'use client';

import { useCsafT } from '@/i18n/csaf';

import Link from 'next/link';
import type { CsafDraft } from './types';

interface Props {
  draft: CsafDraft;
  onChange: (patch: Partial<CsafDraft>) => void;
}

const DOC_STATUSES = ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'] as const;
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
// TLP v2 labels; CSAF 2.0 export maps CLEAR to WHITE and AMBER+STRICT to AMBER (plus a distribution note)
const TLPS = [
  { value: 'CLEAR', color: 'bg-gray-100 text-gray-700' },
  { value: 'GREEN', color: 'bg-green-100 text-green-700' },
  { value: 'AMBER', color: 'bg-amber-100 text-amber-700' },
  { value: 'AMBER+STRICT', color: 'bg-amber-200 text-amber-800' },
  { value: 'RED', color: 'bg-red-100 text-red-700' },
] as const;

const VERSIONS = ['2.0', '2.1'] as const;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-[#6b6460]">{label}</label>
      {children}
      {hint && <p className="text-xs text-[#9b9590]">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, maxLength, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] placeholder-[#c0bab4] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
    />
  );
}

export function CsafStepMetadata({ draft, onChange }: Props) {
  const { t } = useCsafT();
  const toDateInput = (iso: string) => iso ? iso.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const fromDateInput = (val: string) => val ? new Date(val).toISOString() : draft.initialReleaseDate;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[#1a1714]">{t.meta.title}</h3>
        <p className="text-xs text-[#9b9590] mt-0.5">{t.meta.required(draft.csafVersion)}</p>
      </div>

      <Field label={t.meta.version} hint={draft.csafVersion === '2.1' ? t.meta.v21 : t.meta.v20}>
        <div className="flex gap-2">
          {VERSIONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ csafVersion: value })}
              className={[
                'rounded-lg border px-3 py-1.5 text-xs font-semibold',
                draft.csafVersion === value ? 'border-[#4f46e5] bg-indigo-50 text-[#4f46e5]' : 'border-[#d4cfc8] text-[#6b6460] hover:bg-[#f4f1ec]',
              ].join(' ')}
            >
              {value === '2.1' ? t.meta.v21label : 'CSAF 2.0'}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div className="col-span-2 lg:col-span-3 xl:col-span-4">
          <Field label={t.meta.docTitle} hint={t.meta.docTitleHint}>
            <Input value={draft.title} onChange={(v) => onChange({ title: v })} placeholder={t.meta.docTitlePh} maxLength={256} />
          </Field>
        </div>

        <Field label="Tracking ID" hint={t.meta.trackingHint}>
          <Input value={draft.trackingId} onChange={(v) => onChange({ trackingId: v })} placeholder="ACME-2024-001" maxLength={128} />
        </Field>

        <Field label="Version">
          <Input value={draft.version} onChange={(v) => onChange({ version: v })} placeholder="1" maxLength={32} />
        </Field>

        <div className="col-span-2 xl:col-span-2">
          <Field label={t.meta.revision}>
            <Input value={draft.revision} onChange={(v) => onChange({ revision: v })} placeholder="Initial release" maxLength={256} />
          </Field>
        </div>

        <Field label={t.meta.status}>
          <select
            value={draft.docStatus}
            onChange={(e) => onChange({ docStatus: e.target.value as CsafDraft['docStatus'] })}
            className="w-full rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] focus:border-[#4f46e5] focus:outline-none"
          >
            {DOC_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field label={t.meta.severity}>
          <select
            value={draft.aggregateSeverity}
            onChange={(e) => onChange({ aggregateSeverity: e.target.value as CsafDraft['aggregateSeverity'] })}
            className="w-full rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] focus:border-[#4f46e5] focus:outline-none"
          >
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field label={t.meta.initial}>
          <input
            type="date"
            value={toDateInput(draft.initialReleaseDate)}
            onChange={(e) => onChange({ initialReleaseDate: fromDateInput(e.target.value) })}
            className="w-full rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] focus:border-[#4f46e5] focus:outline-none"
          />
        </Field>

        <Field label={t.meta.current}>
          <input
            type="date"
            value={toDateInput(draft.currentReleaseDate)}
            onChange={(e) => onChange({ currentReleaseDate: fromDateInput(e.target.value) })}
            className="w-full rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] focus:border-[#4f46e5] focus:outline-none"
          />
        </Field>

        <div className="col-span-2 lg:col-span-3 xl:col-span-4">
          <Field label={t.meta.tlp}>
            <div className="grid grid-cols-5 gap-2">
              {TLPS.map(({ value, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ tlp: value as CsafDraft['tlp'] })}
                  className={[
                    'rounded-lg border px-2 py-2 text-xs font-semibold transition-all text-center',
                    draft.tlp === value ? `${color} border-current ring-2 ring-offset-1` : 'border-[#d4cfc8] text-[#6b6460] hover:bg-[#f4f1ec]',
                  ].join(' ')}
                >
                  {t.meta.tlpLabels[value]}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {draft.csafVersion === '2.1' && (
          <div className="col-span-2 lg:col-span-3 xl:col-span-4">
            <Field label={t.meta.license} hint={t.meta.licenseHint}>
              <Input value={draft.licenseExpression} onChange={(v) => onChange({ licenseExpression: v })} placeholder="CC-BY-4.0" maxLength={256} />
            </Field>
          </div>
        )}

        <div className="col-span-2 lg:col-span-3 xl:col-span-4">
          <Field label={t.meta.summary} hint={t.meta.summaryHint}>
            <textarea
              value={draft.summary}
              onChange={(e) => onChange({ summary: e.target.value })}
              rows={3}
              maxLength={4096}
              placeholder={t.meta.summaryPh}
              className="w-full resize-none rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] placeholder-[#c0bab4] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
            />
            <p className="text-right text-xs text-[#9b9590] mt-0.5">{draft.summary.length}/4096</p>
          </Field>
        </div>

        <div className="col-span-2 lg:col-span-3 xl:col-span-4">
          <Field label={t.meta.details} hint={t.meta.detailsHint}>
            <textarea
              value={draft.details}
              onChange={(e) => onChange({ details: e.target.value })}
              rows={4}
              maxLength={16384}
              placeholder={t.meta.detailsPh}
              className="w-full resize-none rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] placeholder-[#c0bab4] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
            />
          </Field>
        </div>
      </div>

      {/* Publisher info pulled from organisation profile */}
      <div className="rounded-lg border border-[#e5e1d8] bg-[#faf9f7] px-4 py-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#6b6460] uppercase tracking-wide">{t.meta.publisher}</p>
          <Link
            href="/organisation"
            target="_blank"
            className="text-xs text-indigo-600 hover:underline"
          >
            {t.meta.edit}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <div><span className="text-[#9b9590]">{t.meta.name}</span><span className="text-[#1a1714]">{draft.publisherName || '-'}</span></div>
          <div><span className="text-[#9b9590]">{t.meta.category}</span><span className="text-[#1a1714]">{draft.publisherCategory || '-'}</span></div>
          <div className="col-span-2"><span className="text-[#9b9590]">{t.meta.namespace}</span><span className="text-[#1a1714]">{draft.publisherNamespace || '-'}</span></div>
        </div>
        <p className="text-[11px] text-[#9b9590]">
          {t.meta.publisherNote}
        </p>
      </div>
    </div>
  );
}
