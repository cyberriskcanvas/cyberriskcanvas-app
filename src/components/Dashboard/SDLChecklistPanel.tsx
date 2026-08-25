'use client';

import { useState } from 'react';
import { CheckCircle, Info, Shield, Sparkles, Terminal, BookOpen } from 'lucide-react';
import { TR03185_REQUIREMENTS, TR03185_CATEGORY_LABELS, type TR03185Category } from '@/data/tr03185';
import { cn } from '@/utils/cn';

export function SDLChecklistPanel() {
  const [filterTarget, setFilterTarget] = useState<'all' | 'producer' | 'oss' | 'ai'>('all');
  const [completedIds, setCompletedIds] = useState<Record<string, boolean>>({});

  const filtered = TR03185_REQUIREMENTS.filter(
    (r) => filterTarget === 'all' || r.target === filterTarget,
  );

  const toggleCheck = (id: string) => {
    setCompletedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const total = filtered.length;
  const completedCount = filtered.filter((r) => completedIds[r.id]).length;
  const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  // Group by category
  const grouped = filtered.reduce<Record<string, typeof TR03185_REQUIREMENTS>>((acc, req) => {
    if (!acc[req.category]) acc[req.category] = [];
    acc[req.category].push(req);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-[#e5e1d8] bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-indigo-50 p-2.5 border border-indigo-200 text-indigo-700">
              <Shield size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1a1917]">
                  BSI TR-03185 Sicherer Software-Lebenszyklus (SDL)
                </h2>
                <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                  Version 1.1.1
                </span>
              </div>
              <p className="text-xs text-[#6b6460] mt-1 max-w-2xl">
                Verbindliche Prozessvorgaben für Hersteller (Teil 1), Open-Source-Komponenten (Teil 2) und den Einsatz von Künstlicher Intelligenz (Abschnitt 0.1).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[#faf9f7] px-4 py-3 rounded-lg border border-[#e5e1d8]">
            <div className="text-right">
              <div className="text-xs font-semibold text-[#6b6460]">SDL-Erfüllungsgrad</div>
              <div className="text-lg font-bold text-[#1a1917]">{progressPct}%</div>
            </div>
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700">
              {completedCount}/{total}
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 mt-6 border-t border-[#e5e1d8] pt-4 flex-wrap">
          <span className="text-xs font-bold text-[#6b6460] uppercase mr-2">Geltungsbereich:</span>
          <button
            onClick={() => setFilterTarget('all')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              filterTarget === 'all'
                ? 'bg-[#1e293b] text-white'
                : 'bg-[#faf9f7] text-[#6b6460] hover:bg-[#e5e1d8]',
            )}
          >
            Alle ({TR03185_REQUIREMENTS.length})
          </button>
          <button
            onClick={() => setFilterTarget('producer')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              filterTarget === 'producer'
                ? 'bg-[#1e293b] text-white'
                : 'bg-[#faf9f7] text-[#6b6460] hover:bg-[#e5e1d8]',
            )}
          >
            <Terminal size={13} /> Teil 1: Hersteller (Proprietär)
          </button>
          <button
            onClick={() => setFilterTarget('oss')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              filterTarget === 'oss'
                ? 'bg-[#1e293b] text-white'
                : 'bg-[#faf9f7] text-[#6b6460] hover:bg-[#e5e1d8]',
            )}
          >
            <BookOpen size={13} /> Teil 2: Open Source (FLOSS)
          </button>
          <button
            onClick={() => setFilterTarget('ai')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              filterTarget === 'ai'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200',
            )}
          >
            <Sparkles size={13} /> §0.1: KI-Governance
          </button>
        </div>
      </div>

      {/* Category Groups */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, reqs]) => (
          <div key={category} className="rounded-xl border border-[#e5e1d8] bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#e5e1d8] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1a1917]">
                {TR03185_CATEGORY_LABELS[category as TR03185Category] ?? category}
              </h3>
              <span className="text-[11px] font-mono text-[#6b6460]">
                {reqs.filter((r) => completedIds[r.id]).length} / {reqs.length} erfüllt
              </span>
            </div>

            <div className="grid gap-2.5">
              {reqs.map((req) => {
                const isChecked = !!completedIds[req.id];
                return (
                  <div
                    key={req.id}
                    onClick={() => toggleCheck(req.id)}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-3.5 transition-all cursor-pointer select-none',
                      isChecked
                        ? 'border-green-300 bg-green-50/50'
                        : 'border-[#e5e1d8] bg-[#faf9f7] hover:bg-[#f4f1ec]',
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded border transition-colors',
                          isChecked
                            ? 'border-green-600 bg-green-600 text-white'
                            : 'border-[#c8c0b0] bg-white',
                        )}
                      >
                        {isChecked && <CheckCircle size={14} />}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#1a1917]">{req.id}</span>
                        <span className="text-xs font-bold text-[#1a1917]">{req.title}</span>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.2 text-[9px] font-bold uppercase',
                            req.level === 'MUST'
                              ? 'bg-red-100 text-red-700'
                              : req.level === 'SHOULD'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-700',
                          )}
                        >
                          {req.level}
                        </span>
                        {req.craRef && (
                          <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[9px] font-mono font-bold text-indigo-700 border border-indigo-200">
                            CRA: {req.craRef}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6b6460] mt-1 leading-relaxed">{req.description}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-[#9b9590]">
                        <Info size={11} /> {req.source}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
