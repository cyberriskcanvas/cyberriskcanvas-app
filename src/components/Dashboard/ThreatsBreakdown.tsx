import { cn } from '@/utils/cn';
import type { FlatThreat } from '@/utils/aggregateDiagram';
import type { Threat } from '@/types';

const STRIDE: { key: Threat['stride']; label: string; desc: string; color: string; bg: string }[] = [
  { key: 'S', label: 'Spoofing',              desc: 'Impersonating something or someone', color: 'text-red-600',    bg: 'bg-red-500' },
  { key: 'T', label: 'Tampering',             desc: 'Modifying data or code',             color: 'text-orange-600', bg: 'bg-orange-500' },
  { key: 'R', label: 'Repudiation',           desc: 'Claiming you didn\'t do something',  color: 'text-yellow-600', bg: 'bg-yellow-500' },
  { key: 'I', label: 'Information Disclosure',desc: 'Exposing information to outsiders',  color: 'text-blue-600',   bg: 'bg-blue-500' },
  { key: 'D', label: 'Denial of Service',     desc: 'Denying service to valid users',     color: 'text-purple-600', bg: 'bg-purple-500' },
  { key: 'E', label: 'Elevation of Privilege',desc: 'Gaining unintended capabilities',    color: 'text-pink-600',   bg: 'bg-pink-500' },
];

export function ThreatsBreakdown({ threats }: { threats: FlatThreat[] }) {
  const max = Math.max(...STRIDE.map((s) => threats.filter((t) => t.stride === s.key).length), 1);

  return (
    <div className="rounded-xl border border-[#e5e1d8] bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#1a1917]">Threats by STRIDE</h3>
      {threats.length === 0 ? (
        <p className="text-sm text-[#c8c0b0] text-center py-6">No threats defined yet</p>
      ) : (
        <div className="space-y-3">
          {STRIDE.map((s) => {
            const count = threats.filter((t) => t.stride === s.key).length;
            const pct = max > 0 ? (count / max) * 100 : 0;
            return (
              <div key={s.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white', s.bg)}>
                      {s.key}
                    </span>
                    <span className={cn('text-xs font-medium', s.color)}>{s.label}</span>
                  </div>
                  <span className="text-xs font-bold text-[#1a1917]">{count}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#f4f1ec]">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', s.bg, 'opacity-80')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
