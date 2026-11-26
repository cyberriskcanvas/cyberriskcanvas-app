'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { deleteOwnVulnerability, listOwnVulnerabilities, saveOwnVulnerability, type OwnVulnDto } from '@/actions/ownVulnerabilities';
import { getProjectVersions } from '@/actions/baselines';
import { CWE_DATABASE } from '@/data/cwe';
import { parseCvssV3 } from '@/lib/cvss';
import { severityOfScore } from '@/lib/ownVulnerability';
import { useCsafT } from '@/i18n/csaf';
import { RemediationFields, type RemediationValue } from '@/components/Operations/RemediationFields';

interface VersionRow { number: number; label: string }

const field = 'w-full rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] placeholder-[#c0bab4] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]';
const label = 'block text-xs font-semibold uppercase tracking-wide text-[#6b6460] mb-1';

const EMPTY: Omit<OwnVulnDto, 'id'> = {
  title: '', cveId: null, cweId: null, cvssVector: null, description: '', affectedVersions: [], status: 'affected',
  remediation: { category: '', details: '', url: '' }, acknowledgments: '',
};

export function OwnVulnerabilities({ projectId, onCount }: { projectId: string; onCount?: (n: number) => void }) {
  const { t } = useCsafT();
  const o = t.own;
  const [items, setItems] = useState<OwnVulnDto[]>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [editing, setEditing] = useState<(Omit<OwnVulnDto, 'id'> & { id?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A new entry starts with the newest version selected, also when the version list arrives after the dialog opened
  useEffect(() => {
    if (editing && !editing.id && editing.affectedVersions.length === 0 && versions.length > 0) {
      setEditing({ ...editing, affectedVersions: [versions[versions.length - 1].number] });
    }
  }, [editing, versions]);

  const apply = useCallback((list: OwnVulnDto[]) => { setItems(list); onCount?.(list.length); }, [onCount]);

  useEffect(() => {
    listOwnVulnerabilities(projectId).then(apply).catch(() => {});
    getProjectVersions(projectId).then((v) => setVersions(v.map((x) => ({ number: x.number, label: x.label })))).catch(() => {});
  }, [projectId, apply]);

  async function save() {
    if (!editing) return;
    setError(null);
    try {
      const res = await saveOwnVulnerability(projectId, editing as unknown as Record<string, unknown>, editing.id);
      if (!res.ok) { setError(res.error); return; }
      apply(res.items);
      setEditing(null);
    } catch {
      setError(o.saveFailed);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(o.confirmDelete)) return;
    apply(await deleteOwnVulnerability(projectId, id));
  }

  const score = useMemo(() => (editing?.cvssVector ? parseCvssV3(editing.cvssVector) : null), [editing?.cvssVector]);
  const set = (patch: Partial<Omit<OwnVulnDto, 'id'>>) => setEditing((e) => (e ? { ...e, ...patch } : e));
  const fixed = editing?.status === 'fixed';

  return (
    <section className="mt-10 rounded-xl border border-[#e5e1d8] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[#1a1714]">{o.title}</h3>
          <p className="mt-1 text-xs text-[#6b6460]">{o.intro}</p>
        </div>
        <button onClick={() => { setError(null); setEditing({ ...EMPTY }); }}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#d4cfc8] px-3 py-1.5 text-xs font-medium text-[#3d3a36] hover:bg-[#f4f1ec]">
          <Plus className="h-3.5 w-3.5" />{o.add}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-xs text-[#9b9590]">{o.none}</p>
      ) : (
        <ul className="mt-4 divide-y divide-[#f0ede6]">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#1a1714]">{i.title}</p>
                <p className="text-xs text-[#6b6460]">
                  {[i.cveId, i.cweId, i.status === 'fixed' ? o.statusFixed : o.statusAffected, i.affectedVersions.map((n) => `v${n}`).join(', ')].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => { setError(null); setEditing(i); }} title={o.edit} className="rounded p-1.5 text-[#9b9590] hover:bg-[#f4f1ec] hover:text-[#3d3a36]"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => remove(i.id)} title={o.remove} className="rounded p-1.5 text-[#9b9590] hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl border border-[#e5e1d8] bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#e5e1d8] px-5 py-3">
              <h4 className="text-sm font-semibold text-[#1a1714]">{editing.id ? o.modalEdit : o.modalAdd}</h4>
              <button onClick={() => setEditing(null)} className="rounded p-1 text-[#9b9590] hover:bg-[#f4f1ec]"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 overflow-y-auto px-5 py-4">
              <div><label className={label}>{o.fields.title}</label><input className={field} maxLength={256} value={editing.title} onChange={(e) => set({ title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>{o.fields.cve}</label><input className={field} placeholder="CVE-2026-12345" value={editing.cveId ?? ''} onChange={(e) => set({ cveId: e.target.value || null })} /></div>
                <div>
                  <label className={label}>{o.fields.cwe}</label>
                  <input className={field} list="own-vuln-cwe" placeholder="CWE-79" value={editing.cweId ?? ''} onChange={(e) => set({ cweId: e.target.value || null })} />
                  <datalist id="own-vuln-cwe">{CWE_DATABASE.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</datalist>
                </div>
              </div>
              <div>
                <label className={label}>{o.fields.vector}</label>
                <input className={`${field} font-mono text-xs`} placeholder="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" value={editing.cvssVector ?? ''} onChange={(e) => set({ cvssVector: e.target.value || null })} />
                {editing.cvssVector && (
                  <p className={`mt-1 text-xs ${score === null ? 'text-red-600' : 'text-[#6b6460]'}`}>{score === null ? o.badVector : o.score(score, severityOfScore(score))}</p>
                )}
              </div>
              <div><label className={label}>{o.fields.description}</label><textarea className={`${field} resize-none`} rows={4} maxLength={4096} value={editing.description} onChange={(e) => set({ description: e.target.value })} /></div>
              <div>
                <label className={label}>{o.fields.status}</label>
                <div className="flex gap-2">
                  {(['affected', 'fixed'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => set({ status: s })}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${editing.status === s ? 'border-[#1a1714] bg-[#1a1714] text-white' : 'border-[#d4cfc8] text-[#3d3a36] hover:bg-[#f4f1ec]'}`}>
                      {s === 'fixed' ? o.statusFixed : o.statusAffected}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={label}>{o.fields.versions}</label>
                <p className="mb-1.5 text-[11px] text-[#9b9590]">{o.versionsHint(!!fixed)}</p>
                <div className="flex flex-wrap gap-2">
                  {versions.map((v) => {
                    const on = editing.affectedVersions.includes(v.number);
                    return (
                      <button key={v.number} type="button"
                        onClick={() => set({ affectedVersions: on ? editing.affectedVersions.filter((n) => n !== v.number) : [...editing.affectedVersions, v.number] })}
                        className={`rounded-lg border px-2.5 py-1 text-xs ${on ? 'border-[#4f46e5] bg-[#eef2ff] text-[#4f46e5]' : 'border-[#d4cfc8] text-[#6b6460] hover:bg-[#f4f1ec]'}`}>
                        {o.versionName(v.number, v.label)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <RemediationFields value={editing.remediation as RemediationValue} onChange={(remediation) => set({ remediation })} warnIfMissing={!fixed} />
              <div><label className={label}>{o.fields.ack}</label><input className={field} maxLength={1000} value={editing.acknowledgments} onChange={(e) => set({ acknowledgments: e.target.value })} /></div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-[#e5e1d8] px-5 py-3">
              <button onClick={() => setEditing(null)} className="rounded-lg px-4 py-2 text-sm text-[#6b6460] hover:bg-[#f4f1ec]">{o.cancel}</button>
              <button onClick={save} className="rounded-lg bg-[#1a1714] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d3a36]">{o.save}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
