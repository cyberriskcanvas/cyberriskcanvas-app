'use client';

import { useEffect, useState } from 'react';
import { getTrend } from '@/actions/metrics';
import type { TrendPoint } from '@/lib/metrics';

const LINES = [
  { key: 'critical', color: '#dc2626' },
  { key: 'high', color: '#ea580c' },
  { key: 'medium', color: '#ca8a04' },
  { key: 'low', color: '#2563eb' },
] as const;

interface Props {
  /** null = all products the user can see */
  projectId: string | null;
  labels: Record<(typeof LINES)[number]['key'], string>;
  empty: string;
  /** Changes when the data changed, so the chart reloads. */
  refreshKey?: string;
}

const W = 600, H = 140, PAD = 24;

/** Open findings per severity over the last 90 days (inline SVG, no chart library). */
export function TrendChart({ projectId, labels, empty, refreshKey }: Props) {
  const [points, setPoints] = useState<TrendPoint[] | null>(null);
  useEffect(() => { getTrend(projectId).then(setPoints).catch(() => setPoints([])); }, [projectId, refreshKey]);

  if (!points) return null;
  if (points.length < 2) return <p className="text-xs text-[#9b9590]">{empty}</p>;

  const max = Math.max(1, ...points.flatMap((p) => LINES.map((l) => p[l.key])));
  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / (points.length - 1);
  const y = (v: number) => H - PAD - (v * (H - 2 * PAD)) / max;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={LINES.map((l) => labels[l.key]).join(', ')} className="w-full rounded-lg border border-[#e5e1d8] bg-white">
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke="#e5e1d8" />
        <text x={4} y={y(max) + 4} fontSize="10" fill="#9b9590">{max}</text>
        <text x={PAD} y={H - 6} fontSize="10" fill="#9b9590">{points[0].day}</text>
        <text x={W - PAD} y={H - 6} fontSize="10" fill="#9b9590" textAnchor="end">{points[points.length - 1].day}</text>
        {LINES.map((l) => (
          <polyline key={l.key} fill="none" stroke={l.color} strokeWidth="2" points={points.map((p, i) => `${x(i)},${y(p[l.key])}`).join(' ')} />
        ))}
        {points.map((p, i) => <rect key={p.day} x={x(i) - 6} y={0} width={12} height={H} fill="transparent"><title>{`${p.day}: ${LINES.map((l) => `${labels[l.key]} ${p[l.key]}`).join(', ')}`}</title></rect>)}
      </svg>
      <div className="mt-1 flex gap-3 text-[11px] text-[#6b6460]">
        {LINES.map((l) => <span key={l.key} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: l.color }} />{labels[l.key]}</span>)}
      </div>
    </div>
  );
}
