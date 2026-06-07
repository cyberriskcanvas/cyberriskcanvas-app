'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldAlert, ChevronDown, ChevronRight, ExternalLink, Clock } from 'lucide-react';
import type { SecurityOverview, SecurityOverviewFinding } from '@/actions/securityOverview';
import { cn } from '@/utils/cn';
import { severityBadgeClass } from '@/lib/severityStyles';
import { relativeTime } from '@/utils/format';

function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return <span className="text-xs text-[#c8c0b0]">-</span>;
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', severityBadgeClass(severity))}>
      {severity}
    </span>
  );
}

interface Props { overview: SecurityOverview }

export default function SecurityOverviewClient({ overview }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { totals, lastScan, projects, findings } = overview;

  const diagramByProject = useMemo(
    () => new Map(projects.map((p) => [p.projectId, p.diagramId])),
    [projects],
  );

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <header className="border-b border-[#e5e1d8] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e1d8] text-[#6b6460] transition-colors hover:bg-[#f5f3ef]"
              title="Back to projects"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e293b]">
              <ShieldAlert size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#1a1917]">Security Overview</h1>
              <p className="text-[11px] text-[#6b6460]">
                Components and vulnerabilities across {totals.projectCount} project{totals.projectCount === 1 ? '' : 's'} - no need to open each one individually
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#6b6460]">
            <Clock size={13} />
            {lastScan ? (
              <span>
                Last CVE scan: {relativeTime(lastScan.finishedAt ?? lastScan.startedAt)}
                {lastScan.status === 'running' && ' (running…)'}
                {lastScan.status === 'failed' && ' (failed)'}
                {lastScan.status === 'completed' && lastScan.newCount > 0 && ` · ${lastScan.newCount} new finding${lastScan.newCount === 1 ? '' : 's'}`}
              </span>
            ) : (
              <span>No CVE scan has run yet - configure the external cron against /api/internal/cve-scan</span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <SummaryCard label="Active findings" value={totals.activeCount} color="bg-[#1e293b]" />
          <SummaryCard label="Critical" value={totals.criticalCount} color="bg-red-600" />
          <SummaryCard label="High" value={totals.highCount} color="bg-orange-600" />
          <SummaryCard label="Medium" value={totals.mediumCount} color="bg-yellow-600" />
          <SummaryCard label="Low" value={totals.lowCount} color="bg-blue-600" />
        </div>

        <section>
          <h2 className="mb-1 text-sm font-bold text-[#1a1917]">Findings across projects</h2>
          <p className="mb-3 text-xs text-[#6b6460]">
            The same vulnerable component often shows up in several projects - grouped by advisory so you can triage once and see everywhere it matters.
          </p>
          {findings.length === 0 ? (
            <EmptyState text="No open or in-triage findings - nothing needs attention right now." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#e5e1d8] bg-white">
              {findings.map((f) => (
                <FindingRow
                  key={f.key}
                  finding={f}
                  expanded={expanded.has(f.key)}
                  onToggle={() => toggle(f.key)}
                  diagramByProject={diagramByProject}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold text-[#1a1917]">By project</h2>
          {projects.length === 0 ? (
            <EmptyState text="No projects with SBOM data visible to you yet." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#e5e1d8] bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e1d8] text-left text-[11px] uppercase tracking-wide text-[#6b6460]">
                    <th className="px-4 py-2.5 font-semibold">Project</th>
                    <th className="px-4 py-2.5 font-semibold">Team</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Critical</th>
                    <th className="px-4 py-2.5 text-right font-semibold">High</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Medium</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Low</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Active</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Last SBOM scan</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.projectId} className="border-b border-[#f0ede7] transition-colors last:border-0 hover:bg-[#faf9f7]">
                      <td className="px-4 py-2.5 font-medium text-[#1a1917]">{p.projectName}</td>
                      <td className="px-4 py-2.5 text-[#6b6460]">{p.teamName ?? '-'}</td>
                      <Count value={p.criticalCount} />
                      <Count value={p.highCount} />
                      <Count value={p.mediumCount} />
                      <Count value={p.lowCount} />
                      <td className="px-4 py-2.5 text-right font-semibold text-[#1a1917]">{p.activeCount}</td>
                      <td className="px-4 py-2.5 text-right text-[#6b6460]">{relativeTime(p.lastScanAt)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {p.diagramId && (
                          <button onClick={() => router.push(`/diagram/${p.diagramId}`)} className="inline-flex items-center gap-1 text-xs font-medium text-[#1e293b] hover:underline">
                            Open <ExternalLink size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Count({ value }: { value: number }) {
  return <td className="px-4 py-2.5 text-right text-[#1a1917]">{value || <span className="text-[#c8c0b0]">0</span>}</td>;
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-[#e5e1d8] bg-white p-4">
      <div className={cn('mb-2 inline-flex h-2.5 w-2.5 rounded-full', color)} />
      <p className="text-2xl font-bold text-[#1a1917]">{value}</p>
      <p className="text-xs text-[#6b6460]">{label}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#e5e1d8] bg-white px-6 py-10 text-center text-sm text-[#6b6460]">
      {text}
    </div>
  );
}

function FindingRow({
  finding, expanded, onToggle, diagramByProject,
}: {
  finding: SecurityOverviewFinding;
  expanded: boolean;
  onToggle: () => void;
  diagramByProject: Map<string, string | null>;
}) {
  const router = useRouter();
  const title = finding.cveId ?? finding.osvId;

  return (
    <div className="border-b border-[#f0ede7] last:border-0">
      <button onClick={onToggle} className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#faf9f7]">
        {expanded ? <ChevronDown size={15} className="mt-0.5 shrink-0 text-[#6b6460]" /> : <ChevronRight size={15} className="mt-0.5 shrink-0 text-[#6b6460]" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-[#1a1917]">{title}</span>
            <SeverityBadge severity={finding.severity} />
            {finding.cvssScore !== null && <span className="text-[11px] text-[#6b6460]">CVSS {finding.cvssScore.toFixed(1)}</span>}
            <span className="rounded-full border border-[#e5e1d8] bg-[#faf9f7] px-2 py-0.5 text-[11px] font-medium text-[#6b6460]">
              affects {finding.affected.length} project{finding.affected.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-[#6b6460]">
            <span className="font-medium text-[#1a1917]">{finding.componentName}</span>
            {finding.componentPurl && <span className="ml-1.5 font-mono">{finding.componentPurl}</span>}
            {finding.summary && <span className="ml-2">{finding.summary}</span>}
          </p>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-[#f0ede7] bg-[#faf9f7] px-4 py-2">
          <table className="w-full text-xs">
            <tbody>
              {finding.affected.map((a) => {
                const diagramId = diagramByProject.get(a.projectId);
                return (
                  <tr key={a.vulnId} className="border-b border-[#f0ede7] last:border-0">
                    <td className="py-1.5 pr-3 font-medium text-[#1a1917]">{a.projectName}</td>
                    <td className="py-1.5 pr-3 font-mono text-[#6b6460]">{a.componentVersion ?? '-'}</td>
                    <td className="py-1.5 pr-3">
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', a.status === 'in_triage' ? 'border-yellow-200 bg-yellow-50 text-yellow-700' : 'border-[#e5e1d8] bg-white text-[#6b6460]')}>
                        {a.status === 'in_triage' ? 'in triage' : 'open'}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 text-[#6b6460]">seen {relativeTime(a.lastSeenAt)}</td>
                    <td className="py-1.5 text-right">
                      {diagramId && (
                        <button onClick={() => router.push(`/diagram/${diagramId}`)} className="inline-flex items-center gap-1 font-medium text-[#1e293b] hover:underline">
                          Open <ExternalLink size={11} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
