// CISA Known Exploited Vulnerabilities catalogue: CVEs that are known to be exploited in the wild.
// A CVE in it that affects your product is an "actively exploited vulnerability" in the sense of CRA Art. 14.
const KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
const TTL_MS = 12 * 60 * 60 * 1000;

let cache: { ids: Set<string>; at: number } | null = null;

/** Set of CVE ids in the catalogue, or null when it cannot be fetched (callers then skip the check). */
export async function fetchKevCves(now = Date.now()): Promise<Set<string> | null> {
  if (cache && now - cache.at < TTL_MS) return cache.ids;
  try {
    const res = await fetch(KEV_URL, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return cache?.ids ?? null;
    const data = (await res.json()) as { vulnerabilities?: Array<{ cveID?: unknown }> };
    const ids = new Set((data.vulnerabilities ?? []).map((v) => v.cveID).filter((id): id is string => typeof id === 'string'));
    if (ids.size === 0) return cache?.ids ?? null;
    cache = { ids, at: now };
    return ids;
  } catch {
    return cache?.ids ?? null; // offline or air-gapped: keep working with the last known catalogue
  }
}

export function resetKevCache() { cache = null; }
