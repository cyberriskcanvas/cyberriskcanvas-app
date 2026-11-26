'use client';

import { useEffect, useState } from 'react';
import type { ComponentRow } from '@/lib/inventory';
import { useOperationsT } from '@/i18n/operations';

interface Props {
  projectId: string;
  /** Version number; null = the active version. */
  version: number | null;
  /** Changes when an SBOM was uploaded, so the list reloads. */
  refreshKey: string;
}

/** Inventory of the SBOM: what is in the product, under which license, and whether a direct dependency. */
export function ComponentTable({ projectId, version, refreshKey }: Props) {
  const { t } = useOperationsT();
  const [rows, setRows] = useState<ComponentRow[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch(`/api/components?project=${projectId}${version === null ? '' : `&version=${version}`}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows)
      .catch(() => setRows([]));
  }, [projectId, version, refreshKey]);

  if (rows.length === 0) return null;
  const shown = rows.filter((r) => `${r.name} ${r.purl ?? ''} ${r.licenses.join(' ')}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9b9590]">{t.components.title(rows.length)}</h3>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t.components.filter}
          className="w-56 rounded-lg border border-[#d4cfc8] bg-white px-2 py-1 text-xs focus:border-[#4f46e5] focus:outline-none"
        />
      </div>
      <div className="max-h-96 overflow-auto rounded-lg border border-[#e5e1d8]">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 bg-[#faf9f7]">
            <tr className="border-b border-[#e5e1d8] text-left font-semibold text-[#6b6460]">
              <th className="px-3 py-2">{t.table.component}</th>
              <th className="px-3 py-2">{t.components.license}</th>
              <th className="px-3 py-2">{t.components.kind}</th>
              <th className="px-3 py-2 text-right">{t.components.advisories}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.key} className="border-b border-[#f4f1ec]">
                <td className="px-3 py-1.5 text-[#3d3a36]"><span className="font-medium">{r.name}</span>{r.version && <span className="ml-1 text-[#9b9590]">@{r.version}</span>}{!r.purl && <span title={t.components.noPurlTitle} className="ml-1.5 rounded bg-yellow-100 px-1 text-[10px] text-yellow-700">{t.components.noPurl}</span>}</td>
                <td className="px-3 py-1.5 text-[#6b6460]">{r.licenses.join(', ') || '–'}</td>
                <td className="px-3 py-1.5 text-[#6b6460]">{r.direct === null ? '–' : r.direct ? t.components.direct : t.components.transitive}</td>
                <td className="px-3 py-1.5 text-right text-[#3d3a36]">{r.advisories || <span className="text-[#c8c0b0]">0</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
