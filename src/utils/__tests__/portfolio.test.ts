import { describe, expect, it } from 'vitest';
import { summarizeProduct } from '../portfolio';
import type { Station, StationId } from '../deriveJourney';

const st = (id: StationId, status: Station['status']): Station => ({ id, status, checks: [], next: [] });
const base = { openHigh: 0, incidents: { open: 0, overdue: 0 }, supportDays: 400, assessment: 'none' as const };

describe('summarizeProduct', () => {
  it('counts done stations and names the first unfinished one', () => {
    const s = summarizeProduct({ ...base, gatePass: true, stations: [st('classify', 'done'), st('risk', 'done'), st('requirements', 'progress'), st('secdev', 'open')] });
    expect(s).toMatchObject({ stationsDone: 2, stationsTotal: 4, currentStation: 'requirements', gate: 'pass' });
  });
  it('has no current station when everything is done', () => {
    expect(summarizeProduct({ ...base, gatePass: true, stations: [st('classify', 'done')] }).currentStation).toBeNull();
  });
  it('maps the gate: fail, pass, unknown without CI', () => {
    const stations = [st('classify', 'open')];
    expect(summarizeProduct({ ...base, stations, gatePass: false }).gate).toBe('fail');
    expect(summarizeProduct({ ...base, stations, gatePass: null }).gate).toBe('unknown');
  });
  it('passes Art. 14, support and findings through', () => {
    const s = summarizeProduct({ ...base, stations: [], gatePass: null, openHigh: null, incidents: { open: 2, overdue: 1 }, supportDays: -3 });
    expect(s).toMatchObject({ openHigh: null, art14: { open: 2, overdue: 1 }, supportDays: -3 });
  });
});
