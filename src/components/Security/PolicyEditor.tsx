'use client';

import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { deletePolicy, listPolicies, savePolicy } from '@/actions/policies';
import { LICENSE_GROUPS } from '@/data/licenseGroups';
import { POLICY_SUBJECTS, VIOLATION_LEVELS, type Policy, type PolicyCondition, type PolicySubject } from '@/lib/policy';
import { SEVERITIES } from '@/lib/cvss';

const SUBJECT_LABEL: Record<PolicySubject, string> = {
  license: 'License is one of', license_group: 'License is in group', license_missing: 'License is missing', purl: 'Component matches purl',
  no_purl: 'Component has no versioned purl', severity: 'Vulnerability severity from', epss: 'EPSS from (0 to 1)', kev: 'Vulnerability is actively exploited (KEV)', cwe: 'Vulnerability has CWE',
};
const NO_VALUE: ReadonlySet<PolicySubject> = new Set(['license_missing', 'no_purl', 'kev']);
const LEVEL_LABEL = { fail: 'Blocks the release gate', warn: 'Warning', info: 'Information' } as const;
const EMPTY: Omit<Policy, 'id'> = { name: '', violation: 'fail', operator: 'any', conditions: [{ subject: 'license_group', value: 'strong-copyleft' }], projectIds: [] };

const summary = (c: PolicyCondition) => `${SUBJECT_LABEL[c.subject]}${c.value ? ` ${c.value}` : ''}`;

export function PolicyEditor() {
  const [data, setData] = useState<Awaited<ReturnType<typeof listPolicies>> | null>(null);
  const [draft, setDraft] = useState<(Omit<Policy, 'id'> & { id?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => listPolicies().then(setData).catch(() => setData(null));
  useEffect(() => { load(); }, []);

  if (!data) return null;
  const { policies, canEdit, projects } = data;
  if (!canEdit && policies.length === 0) return null;

  async function save() {
    if (!draft) return;
    const res = await savePolicy(draft, draft.id);
    if (!res.ok) { setError(res.error); return; }
    setDraft(null);
    setError(null);
    load();
  }
  const setCondition = (i: number, c: PolicyCondition) => setDraft((d) => d && { ...d, conditions: d.conditions.map((x, j) => (j === i ? c : x)) });

  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#1a1917]">Policies</h2>
        {canEdit && !draft && (
          <button onClick={() => setDraft({ ...EMPTY })} className="inline-flex items-center gap-1 rounded-lg bg-[#1e293b] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#334155]"><Plus size={13} /> New policy</button>
        )}
      </div>
      <p className="mb-3 text-xs text-[#6b6460]">Rules every product has to follow: forbidden licenses, too severe vulnerabilities, blocked components. A policy that blocks stops the release gate; the product team can waive a single component with a reason.</p>

      {policies.length === 0 && !draft && <p className="rounded-xl border border-dashed border-[#e5e1d8] bg-white px-6 py-8 text-center text-sm text-[#6b6460]">No policy yet.</p>}
      <div className="space-y-2">
        {policies.map((p) => (
          <div key={p.id} className="flex items-start justify-between gap-3 rounded-xl border border-[#e5e1d8] bg-white px-4 py-3">
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-[#1a1917]">{p.name} <span className="ml-1 rounded-full bg-[#f4f1ec] px-2 py-0.5 text-[11px] font-medium text-[#6b6460]">{LEVEL_LABEL[p.violation]}</span></p>
              <p className="text-xs text-[#6b6460]">{p.conditions.map(summary).join(p.operator === 'all' ? ' AND ' : ' OR ')} · {p.projectIds.length === 0 ? 'all products' : `${p.projectIds.length} product${p.projectIds.length === 1 ? '' : 's'}`}</p>
            </div>
            {canEdit && (
              <div className="flex shrink-0 gap-1">
                <button onClick={() => setDraft(p)} title="Edit" className="rounded p-1 text-[#9b9590] hover:bg-[#f4f1ec]"><Pencil size={14} /></button>
                <button onClick={() => { if (confirm(`Delete "${p.name}"?`)) deletePolicy(p.id).then(load); }} title="Delete" className="rounded p-1 text-[#9b9590] hover:bg-[#f4f1ec]"><Trash2 size={14} /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {draft && (
        <div className="mt-3 space-y-3 rounded-xl border border-[#e5e1d8] bg-white p-4 text-sm">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name, for example No strong copyleft" maxLength={120} className="w-full rounded-lg border border-[#d4cfc8] px-3 py-2" />
          <div className="flex flex-wrap gap-2">
            <select value={draft.violation} onChange={(e) => setDraft({ ...draft, violation: e.target.value as Policy['violation'] })} className="rounded-lg border border-[#d4cfc8] px-2 py-1.5">
              {VIOLATION_LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
            <select value={draft.operator} onChange={(e) => setDraft({ ...draft, operator: e.target.value as Policy['operator'] })} className="rounded-lg border border-[#d4cfc8] px-2 py-1.5">
              <option value="any">Violated if any condition holds</option>
              <option value="all">Violated if all conditions hold</option>
            </select>
          </div>
          {draft.conditions.map((c, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select value={c.subject} onChange={(e) => setCondition(i, { subject: e.target.value as PolicySubject, value: '' })} className="rounded-lg border border-[#d4cfc8] px-2 py-1.5">
                {POLICY_SUBJECTS.map((s) => <option key={s} value={s}>{SUBJECT_LABEL[s]}</option>)}
              </select>
              {c.subject === 'license_group' ? (
                <select value={c.value ?? ''} onChange={(e) => setCondition(i, { ...c, value: e.target.value })} className="rounded-lg border border-[#d4cfc8] px-2 py-1.5">
                  <option value="">- choose -</option>
                  {Object.keys(LICENSE_GROUPS).map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              ) : c.subject === 'severity' ? (
                <select value={c.value ?? ''} onChange={(e) => setCondition(i, { ...c, value: e.target.value })} className="rounded-lg border border-[#d4cfc8] px-2 py-1.5">
                  <option value="">- choose -</option>
                  {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : !NO_VALUE.has(c.subject) && (
                <input value={c.value ?? ''} onChange={(e) => setCondition(i, { ...c, value: e.target.value })} placeholder={c.subject === 'purl' ? 'pkg:npm/event-stream@3.3.*' : c.subject === 'license' ? 'GPL-3.0-only, AGPL-3.0-only' : ''} className="min-w-0 flex-1 rounded-lg border border-[#d4cfc8] px-3 py-1.5" />
              )}
              {draft.conditions.length > 1 && <button onClick={() => setDraft({ ...draft, conditions: draft.conditions.filter((_, j) => j !== i) })} className="text-xs text-[#9b9590] hover:text-red-600">Remove</button>}
            </div>
          ))}
          <button onClick={() => setDraft({ ...draft, conditions: [...draft.conditions, { subject: 'license_missing' }] })} className="text-xs font-medium text-[#1e293b] hover:underline">+ Add condition</button>
          <details>
            <summary className="cursor-pointer text-xs text-[#6b6460]">Applies to {draft.projectIds.length === 0 ? 'all products' : `${draft.projectIds.length} selected product(s)`}</summary>
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
              {projects.map((p) => (
                <label key={p.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={draft.projectIds.includes(p.id)} onChange={(e) => setDraft({ ...draft, projectIds: e.target.checked ? [...draft.projectIds, p.id] : draft.projectIds.filter((x) => x !== p.id) })} />
                  {p.name}
                </label>
              ))}
              <p className="text-[#9b9590]">Nothing selected = all products.</p>
            </div>
          </details>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => { setDraft(null); setError(null); }} className="rounded-lg px-4 py-2 text-[#6b6460] hover:bg-[#f4f1ec]">Cancel</button>
            <button onClick={save} className="rounded-lg bg-[#1e293b] px-4 py-2 font-medium text-white hover:bg-[#334155]">Save</button>
          </div>
        </div>
      )}
    </section>
  );
}
