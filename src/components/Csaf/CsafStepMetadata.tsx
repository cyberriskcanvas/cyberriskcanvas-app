'use client';

import Link from 'next/link';
import type { CsafDraft } from './types';

interface Props {
  draft: CsafDraft;
  onChange: (patch: Partial<CsafDraft>) => void;
}

const DOC_STATUSES = ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'] as const;
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const TLPS = [
  { value: 'WHITE', label: 'WHITE - Unrestricted', color: 'bg-gray-100 text-gray-700' },
  { value: 'GREEN', label: 'GREEN - Community', color: 'bg-green-100 text-green-700' },
  { value: 'AMBER', label: 'AMBER - Limited', color: 'bg-amber-100 text-amber-700' },
  { value: 'RED',   label: 'RED - Restricted', color: 'bg-red-100 text-red-700' },
] as const;

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
  const toDateInput = (iso: string) => iso ? iso.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const fromDateInput = (val: string) => val ? new Date(val).toISOString() : draft.initialReleaseDate;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[#1a1714]">Dokument-Metadaten</h3>
        <p className="text-xs text-[#9b9590] mt-0.5">Pflichtfelder für ein valides CSAF 2.0 Dokument.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div className="col-span-2 lg:col-span-3 xl:col-span-4">
          <Field label="Titel" hint="Kurzer, beschreibender Titel des Advisories.">
            <Input value={draft.title} onChange={(v) => onChange({ title: v })} placeholder="z.B. Kritische Schwachstelle in openssl" maxLength={256} />
          </Field>
        </div>

        <Field label="Tracking ID" hint="Eindeutige Kennung, z.B. FIRMA-JAHR-001.">
          <Input value={draft.trackingId} onChange={(v) => onChange({ trackingId: v })} placeholder="ACME-2024-001" maxLength={128} />
        </Field>

        <Field label="Version">
          <Input value={draft.version} onChange={(v) => onChange({ version: v })} placeholder="1" maxLength={32} />
        </Field>

        <div className="col-span-2 xl:col-span-2">
          <Field label="Revision / Änderungsnotiz">
            <Input value={draft.revision} onChange={(v) => onChange({ revision: v })} placeholder="Initial release" maxLength={256} />
          </Field>
        </div>

        <Field label="Status">
          <select
            value={draft.docStatus}
            onChange={(e) => onChange({ docStatus: e.target.value as CsafDraft['docStatus'] })}
            className="w-full rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] focus:border-[#4f46e5] focus:outline-none"
          >
            {DOC_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Aggregierte Severity">
          <select
            value={draft.aggregateSeverity}
            onChange={(e) => onChange({ aggregateSeverity: e.target.value as CsafDraft['aggregateSeverity'] })}
            className="w-full rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] focus:border-[#4f46e5] focus:outline-none"
          >
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Erstveröffentlichung">
          <input
            type="date"
            value={toDateInput(draft.initialReleaseDate)}
            onChange={(e) => onChange({ initialReleaseDate: fromDateInput(e.target.value) })}
            className="w-full rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] focus:border-[#4f46e5] focus:outline-none"
          />
        </Field>

        <Field label="Aktuelle Veröffentlichung">
          <input
            type="date"
            value={toDateInput(draft.currentReleaseDate)}
            onChange={(e) => onChange({ currentReleaseDate: fromDateInput(e.target.value) })}
            className="w-full rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] focus:border-[#4f46e5] focus:outline-none"
          />
        </Field>

        <div className="col-span-2 lg:col-span-3 xl:col-span-4">
          <Field label="TLP - Traffic Light Protocol">
            <div className="grid grid-cols-4 gap-2">
              {TLPS.map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ tlp: value as CsafDraft['tlp'] })}
                  className={[
                    'rounded-lg border px-2 py-2 text-xs font-semibold transition-all text-center',
                    draft.tlp === value ? `${color} border-current ring-2 ring-offset-1` : 'border-[#d4cfc8] text-[#6b6460] hover:bg-[#f4f1ec]',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="col-span-2 lg:col-span-3 xl:col-span-4">
          <Field label="Zusammenfassung (Summary)" hint="Mindestens 10 Zeichen. Kurze Beschreibung des Advisories für die Zielgruppe.">
            <textarea
              value={draft.summary}
              onChange={(e) => onChange({ summary: e.target.value })}
              rows={3}
              maxLength={4096}
              placeholder="Kurzbeschreibung der Schwachstelle und der Auswirkungen…"
              className="w-full resize-none rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] placeholder-[#c0bab4] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
            />
            <p className="text-right text-xs text-[#9b9590] mt-0.5">{draft.summary.length}/4096</p>
          </Field>
        </div>

        <div className="col-span-2 lg:col-span-3 xl:col-span-4">
          <Field label="Details / Impact (optional)" hint="Ausführliche Beschreibung der Auswirkungen und betroffenen Systeme.">
            <textarea
              value={draft.details}
              onChange={(e) => onChange({ details: e.target.value })}
              rows={4}
              maxLength={16384}
              placeholder="Detaillierte Beschreibung der Auswirkungen…"
              className="w-full resize-none rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] placeholder-[#c0bab4] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
            />
          </Field>
        </div>
      </div>

      {/* Publisher info pulled from organisation profile */}
      <div className="rounded-lg border border-[#e5e1d8] bg-[#faf9f7] px-4 py-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#6b6460] uppercase tracking-wide">Herausgeber</p>
          <Link
            href="/settings?section=organisation"
            target="_blank"
            className="text-xs text-indigo-600 hover:underline"
          >
            Bearbeiten →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <div><span className="text-[#9b9590]">Name: </span><span className="text-[#1a1714]">{draft.publisherName || '-'}</span></div>
          <div><span className="text-[#9b9590]">Kategorie: </span><span className="text-[#1a1714]">{draft.publisherCategory || '-'}</span></div>
          <div className="col-span-2"><span className="text-[#9b9590]">Namespace: </span><span className="text-[#1a1714]">{draft.publisherNamespace || '-'}</span></div>
        </div>
        <p className="text-[11px] text-[#9b9590]">
          Herausgeber-Daten werden aus dem Organisationsprofil übernommen (Settings → Organisation).
        </p>
      </div>
    </div>
  );
}
