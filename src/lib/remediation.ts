// What users can do about a vulnerability (CSAF `remediations`, CycloneDX VEX `response`).

export const REMEDIATION_CATEGORIES = ['vendor_fix', 'workaround', 'mitigation', 'none_available', 'no_fix_planned'] as const;
export type RemediationCategory = (typeof REMEDIATION_CATEGORIES)[number];

export interface Remediation {
  category: RemediationCategory | null;
  details: string | null;
  url: string | null;
}

const MAX_DETAILS = 2000;
const MAX_URL = 512;

/** Cleans user input: unknown categories, over-long text and non-http(s) URLs are dropped. */
export function sanitizeRemediation(raw: { category?: unknown; details?: unknown; url?: unknown } | null | undefined): Remediation {
  const category = (REMEDIATION_CATEGORIES as readonly unknown[]).includes(raw?.category) ? (raw!.category as RemediationCategory) : null;
  const details = typeof raw?.details === 'string' && raw.details.trim() ? raw.details.trim().slice(0, MAX_DETAILS) : null;
  let url: string | null = null;
  if (typeof raw?.url === 'string' && raw.url.trim() && raw.url.length <= MAX_URL) {
    try {
      const u = new URL(raw.url.trim());
      if (u.protocol === 'https:' || u.protocol === 'http:') url = u.toString();
    } catch { /* not a URL */ }
  }
  return { category, details, url };
}

/** The user can act on it (a fix, a workaround or a mitigation exists). */
export function hasActionableRemediation(category: string | null | undefined): boolean {
  return category === 'vendor_fix' || category === 'workaround' || category === 'mitigation';
}

/** CycloneDX VEX `analysis.response` for a remediation category. */
export function vexResponse(category: string | null | undefined): string[] | undefined {
  switch (category) {
    case 'vendor_fix': return ['update'];
    case 'workaround': return ['workaround_available'];
    case 'mitigation': return ['workaround_available'];
    case 'none_available': return ['can_not_fix'];
    case 'no_fix_planned': return ['will_not_fix'];
    default: return undefined;
  }
}
