import type { Threat } from '@/types';

const STRIDE_COLORS: Record<Threat['stride'], string> = {
  S: '#ef4444', // red
  T: '#f97316', // orange
  R: '#eab308', // yellow
  I: '#3b82f6', // blue
  D: '#a855f7', // purple
  E: '#ec4899', // pink
};

const STRIDE_KEYS: Threat['stride'][] = ['S', 'T', 'R', 'I', 'D', 'E'];

interface Props {
  threats: Threat[];
}

export function StrideCoverage({ threats }: Props) {
  if (threats.length === 0) return null;

  const covered = new Set(threats.map((t) => t.stride));

  return (
    <div className="mt-1.5 flex items-center gap-0.5">
      {STRIDE_KEYS.map((s) => {
        const active = covered.has(s);
        return (
          <span
            key={s}
            title={active ? `${s} - covered` : `${s} - not modelled`}
            style={active ? { backgroundColor: STRIDE_COLORS[s], color: '#fff' } : {}}
            className={`inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold leading-none transition-colors ${
              active ? '' : 'bg-gray-100 text-gray-300'
            }`}
          >
            {s}
          </span>
        );
      })}
    </div>
  );
}
