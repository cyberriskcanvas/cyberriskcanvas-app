'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Circle, CircleDot, Building2, Download } from 'lucide-react';
import {
  getOrganisation, saveOrgReadinessAnswer, saveOrgRequirement, saveOrgSdl, saveOrgSecurityTxt, updateOrgProfile, type OrganisationDto,
} from '@/actions/organisation';
import { CRA_REQUIREMENTS } from '@/data/cra';
import { READINESS_QUESTIONS, AREA_LABEL } from '@/data/readinessQuestions';
import { TR03185_CATEGORY_LABELS, TR03185_REQUIREMENTS, type TR03185Category } from '@/data/tr03185';
import { generateBsiCvdPolicy, generateBsiSecurityTxt } from '@/data/securityTxt';
import { COMPLIANCE_STATUSES } from '@/lib/craChecklist';
import { ORG_REQUIREMENTS, PUBLISHER_CATEGORIES, type StoredSecurityTxt } from '@/lib/organisation';
import { READINESS_ANSWERS } from '@/lib/readiness';
import { deriveOrgStations, type OrgStation, type OrgStationId } from '@/utils/orgJourney';
import { CraGuidanceDetails } from '@/components/Compliance/CraGuidanceDetails';
import { useOrganisationT } from '@/i18n/organisation';
import { useSettingsT } from '@/i18n/settings';
import { usePanelsT } from '@/i18n/panels';
import { cn } from '@/utils/cn';

const input = 'w-full rounded-lg border border-[#d4cfc8] bg-[#faf9f7] px-3 py-2 text-sm text-[#1a1714] placeholder-[#c0bab4] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5] disabled:opacity-60';
const label = 'mb-1.5 block text-xs font-medium text-[#6b6460]';
const primary = 'flex items-center gap-2 rounded-lg bg-[#1a1714] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3d3a36] disabled:opacity-50';
const secondary = 'flex items-center gap-2 rounded-lg border border-[#d4cfc8] px-4 py-2 text-sm font-medium text-[#3d3a36] hover:bg-[#f4f1ec] disabled:opacity-50';

const STATUS_STYLE = {
  done: 'text-green-600',
  progress: 'text-amber-500',
  open: 'text-[#c0bab4]',
} as const;

function StatusIcon({ status }: { status: OrgStation['status'] }) {
  const cls = cn('h-4 w-4 shrink-0', STATUS_STYLE[status]);
  return status === 'done' ? <CheckCircle2 className={cls} /> : status === 'progress' ? <CircleDot className={cls} /> : <Circle className={cls} />;
}

function download(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

/** The manufacturer's side of the CRA: five stations that apply to every product. */
export default function OrganisationClient() {
  const router = useRouter();
  const { t, lang } = useOrganisationT();
  const o = useSettingsT().t.org;
  const sdlT = usePanelsT().t.sdl;
  const [org, setOrg] = useState<OrganisationDto | null>(null);
  const [selected, setSelected] = useState<OrgStationId>('profile');
  const [profile, setProfile] = useState({ name: '', publisherName: '', publisherNamespace: '', publisherCategory: 'vendor', issuingAuthority: '', contactDetails: '' });
  const [txt, setTxt] = useState<StoredSecurityTxt | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  function apply(next: OrganisationDto) {
    setOrg(next);
    setProfile({
      name: next.name, publisherName: next.publisherName ?? '', publisherNamespace: next.publisherNamespace ?? '', publisherCategory: next.publisherCategory,
      issuingAuthority: next.issuingAuthority ?? '', contactDetails: next.contactDetails ?? '',
    });
    setTxt(next.securityTxt);
  }
  useEffect(() => { getOrganisation().then(apply).catch(() => {}); }, []);

  const orgQuestions = useMemo(() => READINESS_QUESTIONS.filter((q) => q.scope === 'org'), []);
  const stations = useMemo(
    () => (org ? deriveOrgStations({
      name: org.name, publisherName: org.publisherName, publisherNamespace: org.publisherNamespace, contactDetails: org.contactDetails,
      securityTxt: org.securityTxt, checklist: org.checklist, sdl: org.sdl, sdlTotal: TR03185_REQUIREMENTS.length,
      readiness: org.readiness, readinessQuestionIds: orgQuestions.map((q) => q.id),
    }) : []),
    [org, orgQuestions],
  );

  if (!org || !txt) return <div className="min-h-screen bg-[#faf9f7] p-8 text-sm text-[#9b9590]">…</div>;
  const ro = !org.canEdit;
  const current = stations.find((s) => s.id === selected) ?? stations[0];

  function run(key: string, fn: () => Promise<OrganisationDto>) {
    setMsg((m) => ({ ...m, [key]: '' }));
    start(async () => {
      try { apply(await fn()); setMsg((m) => ({ ...m, [key]: o.saved })); }
      catch (e) { setMsg((m) => ({ ...m, [key]: e instanceof Error ? e.message : o.failed })); }
    });
  }

  const canDownload = !!txt.domain && !!txt.psirtEmail;
  const config = { ...txt, preferredLanguages: ['en', 'de'] };
  const text = t.stations[current.id];

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1a1917]">
      <header className="border-b border-[#e5e1d8] bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <button onClick={() => router.push('/dashboard')} title={t.back} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e1d8] text-[#6b6460] hover:bg-[#f5f3ef]"><ArrowLeft size={16} /></button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e293b]"><Building2 size={18} className="text-white" /></div>
          <div>
            <h1 className="text-base font-bold">{t.title}</h1>
            {org.updatedByName && <p className="text-[11px] text-[#6b6460]">{t.updatedBy(org.updatedByName)}</p>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <p className="max-w-3xl text-sm text-[#6b6460]">{t.intro}</p>
        {ro && <p className="mt-3 max-w-3xl rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">{t.readOnly}</p>}

        <div className="mt-6 flex flex-col gap-6 md:flex-row">
          {/* Stations */}
          <aside className="w-full shrink-0 md:w-72">
            <ol className="space-y-1 rounded-xl border border-[#e5e1d8] bg-white p-2">
              {stations.map((s, i) => (
                <li key={s.id}>
                  <button onClick={() => setSelected(s.id)} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors', current.id === s.id ? 'bg-[#f4f1ec] font-semibold' : 'hover:bg-[#faf9f7]')}>
                    <StatusIcon status={s.status} />
                    <span className="flex-1"><span className="mr-1.5 text-xs text-[#9b9590]">{i + 1}</span>{t.stations[s.id].title}</span>
                    <span className="text-[11px] text-[#9b9590]">{s.total > 0 ? t.progress(s.done, s.total) : ''}</span>
                  </button>
                </li>
              ))}
            </ol>
          </aside>

          {/* Station panel */}
          <section className="min-w-0 flex-1 space-y-4">
            <div className="rounded-xl border border-[#e5e1d8] bg-white p-5">
              <div className="flex items-center gap-2"><StatusIcon status={current.status} /><span className="text-[11px] font-semibold uppercase tracking-wide text-[#9b9590]">{t.status[current.status]}</span></div>
              <h2 className="mt-1 text-lg font-semibold">{text.title}</h2>
              <p className="mt-1 text-sm text-[#6b6460]">{text.why}</p>
              <div className="mt-3 rounded-lg border border-[#e5e1d8] bg-[#faf9f7] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9b9590]">{t.missing}</p>
                {current.missing.length === 0
                  ? <p className="mt-1 text-sm text-green-700">{t.complete}</p>
                  : <ul className="mt-1 space-y-0.5 text-sm text-[#3d3a36]">{current.missing.map((m) => <li key={m} className="flex items-center gap-2"><Circle className="h-3 w-3 text-[#c0bab4]" />{t.missingLabels[m] ?? m}</li>)}</ul>}
              </div>
            </div>

            {current.id === 'profile' && (
              <div className="space-y-4 rounded-xl border border-[#e5e1d8] bg-white p-5">
                <div><label className={label}>{o.orgName}</label><input className={input} disabled={ro} maxLength={256} placeholder={o.orgNamePh} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className={label}>{o.name}</label><input className={input} disabled={ro} maxLength={256} placeholder={o.namePh} value={profile.publisherName} onChange={(e) => setProfile({ ...profile, publisherName: e.target.value })} /></div>
                  <div><label className={label}>{o.ns}</label><input className={input} type="url" disabled={ro} maxLength={512} placeholder="https://security.example.com" value={profile.publisherNamespace} onChange={(e) => setProfile({ ...profile, publisherNamespace: e.target.value })} /><p className="mt-1 text-[11px] text-[#9b9590]">{o.nsHint}</p></div>
                  <div><label className={label}>{o.authority}</label><input className={input} disabled={ro} maxLength={512} placeholder={o.authorityPh} value={profile.issuingAuthority} onChange={(e) => setProfile({ ...profile, issuingAuthority: e.target.value })} /><p className="mt-1 text-[11px] text-[#9b9590]">{o.authorityHint}</p></div>
                  <div><label className={label}>{o.category}</label><select className={input} disabled={ro} value={profile.publisherCategory} onChange={(e) => setProfile({ ...profile, publisherCategory: e.target.value })}>{PUBLISHER_CATEGORIES.map((c) => <option key={c} value={c}>{o.categories[c]}</option>)}</select></div>
                </div>
                {!ro && <div className="flex items-center gap-3"><button className={primary} disabled={pending} onClick={() => run('profile', () => updateOrgProfile(profile))}>{o.save}</button>{msg.profile && <span className="text-xs text-[#6b6460]">{msg.profile}</span>}</div>}
              </div>
            )}

            {current.id === 'contact' && (
              <div className="space-y-4 rounded-xl border border-[#e5e1d8] bg-white p-5">
                <div><label className={label}>{o.contact}</label><textarea className={`${input} resize-none`} rows={3} disabled={ro} maxLength={1024} placeholder={o.contactPh} value={profile.contactDetails} onChange={(e) => setProfile({ ...profile, contactDetails: e.target.value })} /></div>
                {!ro && <div className="flex items-center gap-3"><button className={primary} disabled={pending} onClick={() => run('contact', () => updateOrgProfile({ contactDetails: profile.contactDetails }))}>{o.save}</button>{msg.contact && <span className="text-xs text-[#6b6460]">{msg.contact}</span>}</div>}
                <hr className="border-[#f0ede6]" />
                <div><h3 className="text-sm font-semibold">{o.txt}</h3><p className="text-xs text-[#6b6460]">{o.txtIntro}</p></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(Object.keys(o.txtFields) as (keyof typeof o.txtFields)[]).map((k) => (
                    <div key={k}><label className={label}>{o.txtFields[k]}</label>
                      <input className={input} disabled={ro} type={k === 'expiresDays' ? 'number' : 'text'} value={String(txt[k])} onChange={(e) => setTxt({ ...txt, [k]: k === 'expiresDays' ? Number(e.target.value) : e.target.value })} /></div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {!ro && <button className={primary} disabled={pending} onClick={() => run('txt', () => saveOrgSecurityTxt(txt))}>{o.save}</button>}
                  <button className={secondary} disabled={!canDownload} onClick={() => download('security.txt', generateBsiSecurityTxt(config), 'text/plain')}><Download size={14} />{o.downloadTxt}</button>
                  <button className={secondary} disabled={!canDownload} onClick={() => download('CVD-POLICY.md', generateBsiCvdPolicy(org.name || org.publisherName || txt.domain, config), 'text/markdown')}><Download size={14} />{o.downloadCvd}</button>
                  {msg.txt && <span className="text-xs text-[#6b6460]">{msg.txt}</span>}
                </div>
                {!canDownload && <p className="text-[11px] text-[#9b9590]">{o.needDomain}</p>}
              </div>
            )}

            {current.id === 'requirements' && (
              <ul className="space-y-3">
                {ORG_REQUIREMENTS.map((id) => {
                  const req = CRA_REQUIREMENTS.find((r) => r.id === id);
                  if (!req) return null;
                  const entry = org.checklist[id];
                  return (
                    <li key={id} className="rounded-xl border border-[#e5e1d8] bg-white p-4">
                      <div className="flex flex-wrap items-baseline gap-2"><span className="font-mono text-[11px] text-[#9b9590]">{id}</span><span className="text-sm font-semibold">{req.title}</span><span className="text-[10px] text-[#9b9590]">{req.craRef}</span></div>
                      <p className="mt-1 text-xs text-[#6b6460]">{req.description}</p>
                      <CraGuidanceDetails requirementId={id} />
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {COMPLIANCE_STATUSES.map((s) => (
                          <button key={s} disabled={ro || pending} onClick={() => run(id, () => saveOrgRequirement(id, { status: s, note: entry?.note }))}
                            className={cn('rounded border px-2.5 py-1 text-[11px] font-medium disabled:opacity-60', entry?.status === s ? 'border-[#1a1714] bg-[#1a1714] text-white' : 'border-transparent bg-[#f4f1ec] text-[#6b6460] hover:bg-[#e5e1d8]')}>{o.status[s]}</button>
                        ))}
                        {entry && !ro && <button onClick={() => run(id, () => saveOrgRequirement(id, null))} className="ml-1 text-[11px] text-[#9b9590] underline">{o.clear}</button>}
                      </div>
                      {entry && <textarea key={`${id}-${entry.status}`} defaultValue={entry.note ?? ''} placeholder={o.note} rows={2} maxLength={2000} disabled={ro}
                        onBlur={(e) => e.target.value !== (entry.note ?? '') && run(id, () => saveOrgRequirement(id, { status: entry.status, note: e.target.value }))} className={`${input} mt-2 resize-none text-xs`} />}
                      {msg[id] && <p className="mt-1 text-[11px] text-[#9b9590]">{msg[id]}</p>}
                    </li>
                  );
                })}
              </ul>
            )}

            {current.id === 'sdl' && (
              <div className="space-y-4">
                <p className="text-xs text-[#6b6460]">{t.sdl.done(current.done, current.total)}</p>
                {Object.entries(TR03185_REQUIREMENTS.reduce<Record<string, typeof TR03185_REQUIREMENTS>>((acc, r) => { (acc[r.category] ||= []).push(r); return acc; }, {})).map(([cat, reqs]) => (
                  <div key={cat} className="rounded-xl border border-[#e5e1d8] bg-white p-4">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide">{sdlT.categories[cat] ?? TR03185_CATEGORY_LABELS[cat as TR03185Category] ?? cat}</h3>
                    <ul className="space-y-1.5">
                      {reqs.map((r) => (
                        <li key={r.id}>
                          <label className={cn('flex items-start gap-2.5 rounded-lg px-2 py-1.5', ro ? 'cursor-default' : 'cursor-pointer hover:bg-[#faf9f7]')}>
                            <input type="checkbox" className="mt-1" disabled={ro || pending} checked={!!org.sdl[r.id]} onChange={() => run('sdl', () => saveOrgSdl({ ...org.sdl, [r.id]: !org.sdl[r.id] }))} />
                            <span className="text-sm"><span className="mr-1.5 font-mono text-[11px] text-[#9b9590]">{r.id}</span>{r.title}<span className="ml-2 text-[10px] uppercase text-[#9b9590]">{t.sdl.level[r.level]}</span></span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {current.id === 'readiness' && (
              <div className="space-y-3">
                <p className="text-xs text-[#6b6460]">{t.readiness.note}</p>
                {orgQuestions.map((q) => {
                  const cur = org.readiness[q.id];
                  return (
                    <div key={q.id} className="rounded-xl border border-[#e5e1d8] bg-white p-4">
                      <p className="text-sm">{q.q[lang]}</p>
                      <p className="mt-0.5 text-xs text-[#9b9590]">{q.hint[lang]} · {AREA_LABEL[q.area][lang]}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {READINESS_ANSWERS.map((a) => (
                          <button key={a} disabled={ro || pending} onClick={() => run('readiness', () => saveOrgReadinessAnswer(q.id, cur === a ? null : a))}
                            className={cn('rounded border px-2.5 py-1 text-[11px] font-medium disabled:opacity-60', cur === a ? 'border-[#1a1714] bg-[#1a1714] text-white' : 'border-transparent bg-[#f4f1ec] text-[#6b6460] hover:bg-[#e5e1d8]')}>{t.readiness.answers[a]}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-[#9b9590]">{t.products}</p>
          </section>
        </div>
      </main>
    </div>
  );
}
