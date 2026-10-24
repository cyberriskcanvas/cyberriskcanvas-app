// One product's row in the overview of all products.
import type { Station, StationId } from './deriveJourney';

export type GateState = 'pass' | 'fail' | 'unknown';

export interface ProductSummary {
  stationsDone: number;
  stationsTotal: number;
  /** First station that is not done; null when the whole roadmap is done. */
  currentStation: StationId | null;
  gate: GateState;
  /** Untriaged high/critical findings; null without CI/SBOM access (free tier). */
  openHigh: number | null;
  art14: { open: number; overdue: number };
  supportDays: number | null;
  assessment: 'none' | 'open' | 'approved' | 'rejected';
}

export function summarizeProduct(input: {
  stations: Station[];
  /** Release gate verdict; null when it is unknown (no CI access or no run yet). */
  gatePass: boolean | null;
  openHigh: number | null;
  incidents: { open: number; overdue: number };
  supportDays: number | null;
  assessment: ProductSummary['assessment'];
}): ProductSummary {
  const done = input.stations.filter((s) => s.status === 'done').length;
  return {
    stationsDone: done,
    stationsTotal: input.stations.length,
    currentStation: input.stations.find((s) => s.status !== 'done')?.id ?? null,
    gate: input.gatePass === null ? 'unknown' : input.gatePass ? 'pass' : 'fail',
    openHigh: input.openHigh,
    art14: input.incidents,
    supportDays: input.supportDays,
    assessment: input.assessment,
  };
}
