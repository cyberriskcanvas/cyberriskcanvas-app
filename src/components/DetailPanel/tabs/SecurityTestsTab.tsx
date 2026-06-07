'use client';

import { useState } from 'react';
import {
  Zap, Plus, Trash2, ChevronDown, ChevronRight,
  Download, CheckCircle2, XCircle, Circle, FlaskConical,
} from 'lucide-react';
import { useDiagramStore } from '@/store/diagramStore';
import type { NodeData, Threat, IEC62443Mapping, SecurityTest, SecurityTestStatus } from '@/types';
import { generateSecurityTests } from '@/data/securityTestMappings';
import { cn } from '@/utils/cn';
import { useTierGuard } from '@/hooks/useTierGuard';
import { PaywallModal } from '@/components/Paywall/PaywallModal';

const STATUS_CONFIG: Record<SecurityTestStatus, { label: string; color: string; icon: React.ElementType }> = {
  untested: { label: 'Not Tested', color: 'bg-[#f4f1ec] text-[#6b6460]', icon: Circle },
  passed:   { label: 'Passed',     color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  failed:   { label: 'Failed',     color: 'bg-red-100 text-red-700',     icon: XCircle },
};

const inputClass = 'w-full rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none';
const inactiveBtn = 'bg-[#f4f1ec] text-[#6b6460] hover:bg-[#e5e1d8]';
const outlineBtn = 'flex items-center gap-1.5 rounded border border-[#e5e1d8] bg-white px-3 py-1.5 text-xs font-medium text-[#6b6460] hover:bg-[#f4f1ec] hover:text-[#1a1917]';

interface Props {
  nodeId: string;
  data: NodeData;
}

export function SecurityTestsTab({ nodeId, data }: Props) {
  const { updateNodeData } = useDiagramStore();
  const testGuard = useTierGuard('test.generate');
  const tests = (data.securityTests ?? []) as SecurityTest[];
  const threats = (data.threats ?? []) as Threat[];
  const iecMappings = (data.iec62443 ?? []) as IEC62443Mapping[];

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formPrecondition, setFormPrecondition] = useState('');
  const [formSteps, setFormSteps] = useState('');
  const [formExpected, setFormExpected] = useState('');

  const save = (updated: SecurityTest[]) => updateNodeData(nodeId, { securityTests: updated });

  const handleGenerate = () => {
    const generated = generateSecurityTests(String(data.label), threats, iecMappings);
    const existing = tests.filter((t) => t.source === 'auto');
    const existingKeys = new Set(existing.map((t) => `${t.threatId ?? ''}-${t.requirementId ?? ''}`));
    const toAdd: SecurityTest[] = generated
      .filter((g) => !existingKeys.has(`${g.threatId ?? ''}-${g.requirementId ?? ''}`))
      .map((g) => ({ ...g, id: crypto.randomUUID(), status: 'untested' as SecurityTestStatus }));
    save([...tests, ...toAdd]);
  };

  const updateStatus = (id: string, status: SecurityTestStatus) =>
    save(tests.map((t) => (t.id === id ? { ...t, status } : t)));

  const remove = (id: string) => save(tests.filter((t) => t.id !== id));

  const addManual = () => {
    if (!formTitle.trim()) return;
    const steps = formSteps.split('\n').map((s) => s.trim()).filter(Boolean);
    save([...tests, {
      id: crypto.randomUUID(), title: formTitle.trim(), targetComponent: String(data.label),
      precondition: formPrecondition.trim() || 'No specific precondition.',
      testSteps: steps.length > 0 ? steps : ['Describe the test steps.'],
      expectedResult: formExpected.trim() || 'Describe the expected outcome.',
      status: 'untested', source: 'manual',
    }]);
    setFormTitle(''); setFormPrecondition(''); setFormSteps(''); setFormExpected('');
    setShowAddForm(false);
  };

  const exportMarkdown = () => {
    const component = String(data.label);
    const lines = [
      `# Security Test Specification – ${component}`, '',
      `Generated: ${new Date().toISOString().slice(0, 10)}  `,
      `Total: ${tests.length} | Passed: ${tests.filter((t) => t.status === 'passed').length} | Failed: ${tests.filter((t) => t.status === 'failed').length}`,
      '', '---', '',
    ];
    tests.forEach((t, i) => {
      lines.push(`## ${String(i + 1).padStart(3, '0')} – ${t.title}`, '');
      lines.push(`**Precondition:** ${t.precondition}`, '');
      lines.push('**Test Steps:**');
      t.testSteps.forEach((step, si) => lines.push(`${si + 1}. ${step}`));
      lines.push('', `**Expected Result:** ${t.expectedResult}`, '', '---', '');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `security-tests-${component.replace(/\s+/g, '_')}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const header = ['ID', 'Title', 'Status', 'IEC Req.', 'Precondition', 'Steps', 'Expected'];
    const rows = tests.map((t, i) => [
      `ST-${String(i + 1).padStart(3, '0')}`, t.title, STATUS_CONFIG[t.status].label,
      t.requirementId ?? '', t.precondition, t.testSteps.join(' | '), t.expectedResult,
    ].map(esc).join(','));
    const blob = new Blob([[header.map(esc).join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `security-tests-${String(data.label).replace(/\s+/g, '_')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const stats = {
    total: tests.length,
    passed: tests.filter((t) => t.status === 'passed').length,
    failed: tests.filter((t) => t.status === 'failed').length,
    untested: tests.filter((t) => t.status === 'untested').length,
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => testGuard.allowed ? handleGenerate() : testGuard.showPaywall()}
          disabled={threats.length === 0}
          title={threats.length === 0 ? 'Add threats first to auto-generate test cases' : undefined}
          className="flex items-center gap-1.5 rounded bg-[#1e293b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#374151] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Zap size={12} /> Auto-Generate
        </button>
        {testGuard.paywallVisible && (
          <PaywallModal currentTier={testGuard.tier} requiredTier={testGuard.requiredTier} onClose={testGuard.hidePaywall} />
        )}
        <button onClick={() => setShowAddForm((v) => !v)} className={outlineBtn}>
          <Plus size={12} /> Add Manual
        </button>
        {tests.length > 0 && (
          <>
            <button onClick={exportMarkdown} className={outlineBtn}><Download size={12} /> MD</button>
            <button onClick={exportCsv} className={outlineBtn}><Download size={12} /> CSV</button>
          </>
        )}
      </div>

      {/* Stats */}
      {tests.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: 'Total', value: stats.total, color: 'text-[#1a1917]' },
            { label: 'Passed', value: stats.passed, color: 'text-green-600' },
            { label: 'Failed', value: stats.failed, color: 'text-red-600' },
            { label: 'Untested', value: stats.untested, color: 'text-[#6b6460]' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-[#e5e1d8] bg-white p-2 text-center">
              <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
              <p className="text-[10px] text-[#6b6460]">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Manual add form */}
      {showAddForm && (
        <div className="rounded-lg border border-[#e5e1d8] bg-[#faf9f7] p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b6460]">Manual Test Case</p>
          <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Test case title" className={inputClass} />
          <input value={formPrecondition} onChange={(e) => setFormPrecondition(e.target.value)} placeholder="Precondition" className={inputClass} />
          <textarea value={formSteps} onChange={(e) => setFormSteps(e.target.value)} placeholder="Test steps (one per line)" rows={3} className="w-full resize-none rounded border border-[#e5e1d8] bg-white px-2 py-1.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none" />
          <input value={formExpected} onChange={(e) => setFormExpected(e.target.value)} placeholder="Expected result" className={inputClass} />
          <div className="flex gap-2">
            <button onClick={addManual} disabled={!formTitle.trim()} className="flex items-center gap-1.5 rounded bg-[#1e293b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#374151] disabled:opacity-40">
              <Plus size={12} /> Add
            </button>
            <button onClick={() => setShowAddForm(false)} className="rounded border border-[#e5e1d8] px-3 py-1.5 text-xs text-[#6b6460] hover:bg-[#f4f1ec]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {tests.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-[#c8c0b0]">
          <FlaskConical size={32} />
          <p className="text-sm font-medium text-[#6b6460]">No security tests yet</p>
          <p className="text-xs text-[#c8c0b0] max-w-[220px]">
            {threats.length > 0
              ? 'Click "Auto-Generate" to derive test cases from threats and IEC 62443 requirements.'
              : 'Add threats in the Threats tab first, then auto-generate test cases.'}
          </p>
        </div>
      )}

      {/* Test list */}
      {tests.length > 0 && (
        <div className="space-y-2">
          {tests.map((t, i) => {
            const cfg = STATUS_CONFIG[t.status];
            const Icon = cfg.icon;
            const isExpanded = expandedId === t.id;
            const label = `ST-${String(i + 1).padStart(3, '0')}`;

            return (
              <div key={t.id} className="rounded-lg border border-[#e5e1d8] bg-white overflow-hidden">
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-[#faf9f7]"
                  onClick={() => setExpandedId(isExpanded ? null : t.id)}
                >
                  {isExpanded ? <ChevronDown size={13} className="text-[#6b6460] shrink-0" /> : <ChevronRight size={13} className="text-[#6b6460] shrink-0" />}
                  <span className="shrink-0 font-mono text-[10px] text-[#c8c0b0]">{label}</span>
                  <span className="flex-1 min-w-0 text-xs font-medium text-[#1a1917] truncate">{t.title}</span>
                  <span className={cn('shrink-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium', cfg.color)}>
                    <Icon size={10} />{cfg.label}
                  </span>
                </div>

                {isExpanded && (
                  <div className="border-t border-[#e5e1d8] px-3 py-3 space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {t.requirementId && (
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[10px] text-indigo-700">{t.requirementId}</span>
                      )}
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px]', t.source === 'auto' ? 'bg-blue-100 text-blue-700' : 'bg-[#f4f1ec] text-[#6b6460]')}>
                        {t.source === 'auto' ? 'Auto-generated' : 'Manual'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6460] mb-1">Precondition</p>
                      <p className="text-xs text-[#1a1917]">{t.precondition}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6460] mb-1">Test Steps</p>
                      <ol className="space-y-1 list-none">
                        {t.testSteps.map((step, si) => (
                          <li key={si} className="flex gap-2 text-xs text-[#1a1917]">
                            <span className="shrink-0 rounded bg-[#f4f1ec] px-1.5 py-0.5 font-mono text-[10px] text-[#6b6460] mt-0.5">{si + 1}</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6460] mb-1">Expected Result</p>
                      <p className="text-xs text-[#1a1917]">{t.expectedResult}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {(Object.keys(STATUS_CONFIG) as SecurityTestStatus[]).map((s) => (
                          <button key={s} onClick={() => updateStatus(t.id, s)}
                            className={cn('rounded px-2 py-0.5 text-[10px] font-medium transition-all', t.status === s ? STATUS_CONFIG[s].color : inactiveBtn)}>
                            {STATUS_CONFIG[s].label}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => remove(t.id)} className="text-[#c8c0b0] hover:text-red-600">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
