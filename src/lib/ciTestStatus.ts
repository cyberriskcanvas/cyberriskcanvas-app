import type { SecurityTest, SecurityTestStatus } from '@/types';

export interface CiLatest { source: string; result: string }

/**
 * Status of a security test that is linked to a CI source: all newest runs ok -> passed,
 * any run with findings -> failed, no run yet -> untested.
 * ponytail: derived at view time, never written into the node JSON (avoids races with the
 * Redis save buffer and live collaboration). Persist it if the PDF dossier should include CI state.
 */
export function effectiveTestStatus(test: Pick<SecurityTest, 'status' | 'ciSource'>, latest: CiLatest[]): SecurityTestStatus {
  if (!test.ciSource) return test.status;
  const runs = latest.filter((l) => l.source === test.ciSource);
  if (runs.length === 0) return 'untested';
  return runs.every((r) => r.result === 'ok') ? 'passed' : 'failed';
}
