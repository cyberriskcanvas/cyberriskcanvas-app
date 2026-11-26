import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchEpss } from '../epss';

afterEach(() => vi.unstubAllGlobals());

describe('fetchEpss', () => {
  it('parses scores per CVE and asks in batches of 100', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ data: [{ cve: 'CVE-1', epss: '0.25', percentile: '0.9' }, { cve: 'CVE-2', epss: 'x' }, {}] }) }));
    vi.stubGlobal('fetch', fetchMock);
    const scores = await fetchEpss(Array.from({ length: 150 }, (_, i) => `CVE-${i}`));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect([...scores]).toEqual([['CVE-1', { epss: 0.25, percentile: 0.9 }]]);
  });

  it('skips a failed batch instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect((await fetchEpss(['CVE-1'])).size).toBe(0);
  });
});
