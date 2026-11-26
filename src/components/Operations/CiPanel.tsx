'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, Download, KeyRound, List, Loader2, ShieldCheck, ShieldX, Trash2, XCircle } from 'lucide-react';
import { useOperationsT } from '@/i18n/operations';
import { CI_PLATFORMS, ciLiveTestSnippet, ciReleaseSnippet, ciSnippet, type CiPlatform } from '@/lib/ciSnippets';
import { setGateFailOn } from '@/actions/gate';
import { CiFindings } from './CiFindings';

/** Sources whose findings can be listed one by one. */
const SARIF_SOURCES = new Set(['sast', 'secrets', 'vulnscan', 'dast']);
const THRESHOLDS = ['critical', 'high', 'medium', 'low'] as const;

interface Run {
  id: string; source: string; part: string; result: 'ok' | 'findings'; summary: string;
  commit: string | null; ref: string | null; url: string | null; createdAt: string;
}
interface Latest { id: string; source: string; part: string; result: 'ok' | 'findings'; summary: string }
interface Token { id: string; name: string; prefix: string; lastUsedAt: string | null; createdAt: string }
interface RunsResponse {
  version: { number: number } | null;
  failOn: string;
  runs: Run[];
  latest: Latest[];
  gate: { pass: boolean; reasons: { code: string; message: string }[] };
}

const btn = 'flex items-center gap-1.5 rounded-lg border border-[#e5e1d8] bg-white px-3 py-1.5 text-xs font-medium text-[#6b6460] hover:bg-[#f4f1ec] hover:text-[#1a1714]';

export function CiPanel({ projectId, refreshKey }: { projectId: string; refreshKey: string }) {
  const { t: all, lang } = useOperationsT();
  const t = all.ci;
  const loc = lang === 'de' ? 'de-DE' : 'en-GB';
  const [data, setData] = useState<RunsResponse | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);
  const [platform, setPlatform] = useState<CiPlatform>('github');
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState<{ id: string; source: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [r, tr] = await Promise.all([
        fetch(`/api/projects/${projectId}/ci/runs`),
        fetch(`/api/projects/${projectId}/ci-tokens`),
      ]);
      const rj = await r.json();
      if (!r.ok) throw new Error(rj.error ?? t.loadFailed);
      setData(rj);
      // Tokens need write access: read-only members just see the runs.
      setTokens(tr.ok ? await tr.json() : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.loadFailed);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  async function createToken() {
    if (!newName.trim()) return;
    const res = await fetch(`/api/projects/${projectId}/ci-tokens`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim() }),
    });
    const j = await res.json();
    if (!res.ok) { setError(j.error ?? t.tokenFailed); return; }
    setFresh(j.token);
    setNewName('');
    load();
  }

  async function changeFailOn(value: string) {
    try {
      await setGateFailOn(projectId, value);
      load();
    } catch {
      setError(t.failOnSaveFailed);
    }
  }
  const toggleFindings = (id: string, source: string) => setShown((s) => (s?.id === id ? null : { id, source }));

  async function revoke(id: string) {
    await fetch(`/api/projects/${projectId}/ci-tokens/${id}`, { method: 'DELETE' });
    load();
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const snippet = ciSnippet(platform, origin);
  const hasRuns = (data?.runs.length ?? 0) > 0;
  const steps = [
    { done: tokens.length > 0, label: t.step1 },
    { done: false, label: t.step2 },
    { done: hasRuns, label: t.step3 },
  ];

  return (
    <div className="space-y-4 rounded-xl border border-[#e5e1d8] bg-white p-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}
      {!data && !error && <div className="flex items-center gap-2 text-sm text-[#9b9590]"><Loader2 className="h-4 w-4 animate-spin" />{all.loading}</div>}

      {data && (
        <>
          {/* Gate verdict (neutral until the first run arrived, an empty project has not "passed" anything) */}
          {!hasRuns && data.gate.pass ? (
            <div className="rounded-lg border border-[#e5e1d8] bg-[#faf9f7] px-3 py-2.5 text-sm text-[#6b6460]">
              {t.noRuns}
            </div>
          ) : (
          <div className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${data.gate.pass ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            {data.gate.pass ? <ShieldCheck className="mt-0.5 h-5 w-5 text-green-600" /> : <ShieldX className="mt-0.5 h-5 w-5 text-red-600" />}
            <div className="text-sm">
              <p className={`font-semibold ${data.gate.pass ? 'text-green-800' : 'text-red-800'}`}>
                {t.gate(data.version?.number ?? null, data.gate.pass)}
              </p>
              {data.gate.reasons.map((r) => <p key={r.message} className="text-red-700">{r.message}</p>)}
              {data.gate.pass && <p className="text-green-700">{t.gateOk}</p>}
            </div>
          </div>
          )}

          {/* Gate threshold of the project */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6b6460]">
            <label htmlFor="ci-fail-on" className="font-medium text-[#1a1714]">{t.failOn}</label>
            <select id="ci-fail-on" value={data.failOn} onChange={(e) => changeFailOn(e.target.value)}
              className="rounded-lg border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1714] focus:border-[#1a1714] focus:outline-none">
              {THRESHOLDS.map((s) => <option key={s} value={s}>{t.severities[s]}</option>)}
            </select>
            <span className="basis-full text-[11px] text-[#9b9590] sm:basis-auto sm:flex-1">{t.failOnHint}</span>
          </div>

          {/* Latest per source/part */}
          {data.latest.length > 0 && (
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {data.latest.map((l) => (
                <div key={l.id} className={`rounded-lg border px-3 py-2 ${shown?.id === l.id ? 'border-indigo-300 bg-indigo-50/40' : 'border-[#e5e1d8]'}`}>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-[#1a1714]">
                    {l.result === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <XCircle className="h-3.5 w-3.5 text-red-600" />}
                    {t.sources[l.source] ?? l.source}{l.part ? ` · ${l.part}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-[#6b6460]">{l.summary}</p>
                  {SARIF_SOURCES.has(l.source) && (
                    <button onClick={() => toggleFindings(l.id, l.source)} className="mt-1 flex items-center gap-1 text-[11px] font-medium text-indigo-700 hover:underline">
                      <List className="h-3 w-3" />{shown?.id === l.id ? t.hideFindings : t.showFindings}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {shown && <CiFindings key={shown.id} projectId={projectId} runId={shown.id} source={shown.source} failOn={data.failOn} onClose={() => setShown(null)} />}

          {/* Setup stations until the first run arrived */}
          {!hasRuns && (
            <ol className="flex flex-wrap gap-2 text-xs">
              {steps.map((s) => (
                <li key={s.label} className={`rounded-full border px-3 py-1 ${s.done ? 'border-green-200 bg-green-50 text-green-700' : 'border-[#e5e1d8] text-[#6b6460]'}`}>{s.label}</li>
              ))}
            </ol>
          )}

          {/* Run history */}
          {hasRuns && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#3d3a36]">
                <thead className="text-[#9b9590]"><tr><th className="py-1 pr-3">{t.time}</th><th className="pr-3">{t.source}</th><th className="pr-3">{t.result}</th><th className="pr-3">{t.commit}</th><th /></tr></thead>
                <tbody>
                  {data.runs.map((r) => (
                    <tr key={r.id} className="border-t border-[#f0ede6]">
                      <td className="py-1.5 pr-3 whitespace-nowrap">{new Date(r.createdAt).toLocaleString(loc)}</td>
                      <td className="pr-3">{t.sources[r.source] ?? r.source}{r.part ? ` · ${r.part}` : ''}</td>
                      <td className={`pr-3 ${r.result === 'ok' ? 'text-green-700' : 'text-red-700'}`}>{r.summary}</td>
                      <td className="pr-3 font-mono">{r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="underline">{r.commit?.slice(0, 7) ?? t.run}</a> : r.commit?.slice(0, 7) ?? '–'}</td>
                      <td className="whitespace-nowrap">
                        {SARIF_SOURCES.has(r.source) && (
                          <button onClick={() => toggleFindings(r.id, r.source)} title={shown?.id === r.id ? t.hideFindings : t.showFindings} className="mr-2 text-[#6b6460] hover:text-[#1a1714]"><List className="h-3.5 w-3.5" /></button>
                        )}
                        <a href={`/api/projects/${projectId}/ci/runs/${r.id}/file`} title={t.rawFile} className="text-[#6b6460] hover:text-[#1a1714]"><Download className="h-3.5 w-3.5" /></a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Tokens */}
      <div className="space-y-2 border-t border-[#f0ede6] pt-3">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#9b9590]"><KeyRound className="h-3.5 w-3.5" />{t.tokens}</h4>
        {fresh && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {t.copyNow}
            <code className="mt-1 block break-all font-mono">{fresh}</code>
            <button className={`${btn} mt-2`} onClick={() => navigator.clipboard.writeText(fresh)}><Copy className="h-3.5 w-3.5" />{t.copy}</button>
          </div>
        )}
        {tokens.map((tk) => (
          <div key={tk.id} className="flex items-center justify-between rounded-lg border border-[#e5e1d8] px-3 py-1.5 text-xs text-[#3d3a36]">
            <span><b>{tk.name}</b> <span className="font-mono text-[#9b9590]">crci_{tk.prefix}…</span> · {tk.lastUsedAt ? t.lastUsed(new Date(tk.lastUsedAt).toLocaleDateString(loc)) : t.neverUsed}</span>
            <button onClick={() => revoke(tk.id)} title={t.revoke} className="text-red-600 hover:text-red-800"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        <div className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t.tokenName} maxLength={100}
            className="w-64 rounded-lg border border-[#e5e1d8] px-2 py-1.5 text-xs text-[#1a1714] placeholder-[#c0bab4] focus:border-[#1a1714] focus:outline-none" />
          <button onClick={createToken} disabled={!newName.trim()} className={`${btn} disabled:opacity-40`}>{t.createToken}</button>
        </div>
      </div>

      {/* Snippets */}
      <div className="space-y-2 border-t border-[#f0ede6] pt-3">
        <div className="flex items-center gap-2">
          {CI_PLATFORMS.map((p) => (
            <button key={p.id} onClick={() => setPlatform(p.id)}
              className={`rounded px-2.5 py-1 text-xs font-medium ${platform === p.id ? 'bg-[#1a1714] text-white' : 'bg-[#f4f1ec] text-[#6b6460] hover:bg-[#e5e1d8]'}`}>{p.label}</button>
          ))}
          <button className={`${btn} ml-auto`} onClick={() => { navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            <Copy className="h-3.5 w-3.5" />{copied ? t.copied : t.copy}
          </button>
        </div>
        <pre className="max-h-72 overflow-auto rounded-lg bg-[#1a1714] p-3 text-xs leading-relaxed text-[#e5e1d8]">{snippet}</pre>

        <details className="rounded-lg border border-[#e5e1d8] p-3 text-xs text-[#6b6460]">
          <summary className="cursor-pointer font-medium text-[#1a1714]">{t.liveTitle}</summary>
          <p className="mt-2">{t.liveBody}</p>
          <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-[#1a1714] p-3 leading-relaxed text-[#e5e1d8]">{ciLiveTestSnippet(origin)}</pre>
        </details>

        <details className="rounded-lg border border-[#e5e1d8] p-3 text-xs text-[#6b6460]">
          <summary className="cursor-pointer font-medium text-[#1a1714]">{t.releaseTitle}</summary>
          <p className="mt-2">{t.releaseBody}</p>
          <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-[#1a1714] p-3 leading-relaxed text-[#e5e1d8]">{ciReleaseSnippet(origin)}</pre>
        </details>
      </div>
    </div>
  );
}
