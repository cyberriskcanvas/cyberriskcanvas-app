/** Keeps only known requirement ids with a boolean value; drops everything else. */
export function sanitizeSdlChecklist(raw: unknown, validIds: ReadonlySet<string>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (typeof raw !== 'object' || raw === null) return out;
  for (const [id, done] of Object.entries(raw)) {
    if (validIds.has(id) && done === true) out[id] = true;
  }
  return out;
}
