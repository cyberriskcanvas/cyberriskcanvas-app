import type { OsvVuln } from './cvss';

export interface OsvComponentQuery {
  name: string;
  version?: string | null;
  purl?: string | null;
}

interface OsvBatchResponse {
  results: Array<{ vulns: OsvVuln[] | null } | null>;
}

/**
 * Batch-queries OSV.dev's querybatch endpoint for the given components, in
 * chunks of 50 (the practical batch size used across the codebase). Returns
 * one vuln array per input component, in the same order. A failed chunk
 * degrades to empty results for its components rather than failing the call.
 */
export async function queryOsvBatch(components: OsvComponentQuery[]): Promise<OsvVuln[][]> {
  const CHUNK = 50;
  const results: OsvVuln[][] = [];
  for (let i = 0; i < components.length; i += CHUNK) {
    const chunk = components.slice(i, i + CHUNK);
    const queries = chunk.map((c) => {
      if (c.purl) return { package: { purl: c.purl } };
      const eco = 'npm';
      if (c.version) return { package: { name: c.name, ecosystem: eco }, version: c.version };
      return { package: { name: c.name, ecosystem: eco } };
    });
    try {
      const res = await fetch('https://api.osv.dev/v1/querybatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries }),
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) {
        const data = await res.json() as OsvBatchResponse;
        for (const result of data.results ?? []) results.push(result?.vulns ?? []);
      } else {
        for (let j = 0; j < chunk.length; j++) results.push([]);
      }
    } catch {
      for (let j = 0; j < chunk.length; j++) results.push([]);
    }
  }
  return results;
}

/** Stable identity key for grouping/deduplicating components across SBOMs (purl when available, else name@version). */
export function componentIdentityKey(c: OsvComponentQuery): string {
  return c.purl ? `purl:${c.purl}` : `nv:${c.name}@${c.version ?? ''}`;
}
