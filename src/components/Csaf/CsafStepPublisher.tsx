'use client';

import type { CsafDraft } from './types';

interface Props {
  draft: CsafDraft;
  onChange: (patch: Partial<CsafDraft>) => void;
}

const CATEGORIES = [
  { value: 'vendor',      label: 'Vendor', hint: 'Der Hersteller des betroffenen Produkts' },
  { value: 'coordinator', label: 'Coordinator', hint: 'CERT oder Koordinationsstelle' },
  { value: 'discoverer',  label: 'Discoverer', hint: 'Der Entdecker der Schwachstelle' },
  { value: 'other',       label: 'Other', hint: 'Sonstige Rolle' },
] as const;

export function CsafStepPublisher({ draft, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[#1a1714]">Herausgeber-Informationen</h3>
        <p className="text-xs text-[#9b9590] mt-0.5">
          Wer veröffentlicht dieses Advisory? Wird im CSAF-Dokument als <code className="bg-[#f4f1ec] px-1 rounded text-[11px]">publisher</code> eingetragen.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#6b6460]">Organisation / Name</label>
          <input
            type="text"
            value={draft.publisherName}
            onChange={(e) => onChange({ publisherName: e.target.value })}
            placeholder="z.B. ACME Security Team"
            maxLength={256}
            className="w-full rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] placeholder-[#c0bab4] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#6b6460]">Namespace / URL</label>
          <input
            type="url"
            value={draft.publisherNamespace}
            onChange={(e) => onChange({ publisherNamespace: e.target.value })}
            placeholder="https://security.example.com"
            maxLength={512}
            className="w-full rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] placeholder-[#c0bab4] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
          />
          <p className="text-xs text-[#9b9590]">URL der ausgebenden Organisation. Muss mit https:// beginnen.</p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#6b6460]">Kategorie</label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {CATEGORIES.map(({ value, label, hint }) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ publisherCategory: value })}
                className={[
                  'rounded-lg border px-3 py-2.5 text-left transition-colors',
                  draft.publisherCategory === value
                    ? 'border-[#4f46e5] bg-[#eef2ff] text-[#4f46e5]'
                    : 'border-[#d4cfc8] text-[#3d3a36] hover:bg-[#f4f1ec]',
                ].join(' ')}
              >
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-[#9b9590]">{hint}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Completeness check */}
      <div className="rounded-lg border border-[#e5e1d8] bg-[#faf9f7] px-4 py-3 space-y-1.5">
        <p className="text-xs font-semibold text-[#6b6460] uppercase tracking-wide">Vollständigkeit</p>
        {[
          { label: 'Name', ok: draft.publisherName.length > 0 },
          { label: 'Namespace', ok: draft.publisherNamespace.startsWith('http') },
          { label: 'Kategorie', ok: true },
        ].map(({ label, ok }) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <span className={ok ? 'text-green-600' : 'text-[#9b9590]'}>{ok ? '✓' : '○'}</span>
            <span className={ok ? 'text-[#3d3a36]' : 'text-[#9b9590]'}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
