const MAX_REASON = 1000;
const MAX_ENTRIES = 500;

/** Dismissed finding id -> reason. Only rule-shaped ids ("M01:a+b") with a non-empty reason survive. */
export function sanitizeDismissed(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof raw !== 'object' || raw === null) return out;
  for (const [id, reason] of Object.entries(raw).slice(0, MAX_ENTRIES)) {
    if (/^M\d{2}:[^\s]{1,400}$/.test(id) && typeof reason === 'string' && reason.trim()) out[id] = reason.trim().slice(0, MAX_REASON);
  }
  return out;
}
