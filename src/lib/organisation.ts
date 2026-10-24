// The manufacturer level above the products: what is decided once and inherited by every product.
import { sanitizeCraChecklist, type CraChecklist } from './craChecklist';

/** Vulnerability-handling requirements that concern the organisation, not one product. */
export const ORG_REQUIREMENTS = ['VH.5', 'VH.6', 'VH.6a', 'VH.8a'] as const;
export type OrgRequirementId = (typeof ORG_REQUIREMENTS)[number];

export const isOrgRequirement = (id: string): id is OrgRequirementId => (ORG_REQUIREMENTS as readonly string[]).includes(id);

/**
 * The checklist a product effectively has: organisation decisions for the organisation-wide
 * requirements, overridden by the product's own entry when it set one.
 */
export function mergeChecklist(org: unknown, product: unknown): CraChecklist {
  const fromOrg = sanitizeCraChecklist(org);
  const inherited: CraChecklist = {};
  for (const id of ORG_REQUIREMENTS) if (fromOrg[id]) inherited[id] = fromOrg[id];
  return { ...inherited, ...sanitizeCraChecklist(product) };
}

/** Where the effective entry of a requirement comes from. */
export function checklistSource(id: string, org: unknown, product: unknown): 'product' | 'organisation' | null {
  if (sanitizeCraChecklist(product)[id]) return 'product';
  if (isOrgRequirement(id) && sanitizeCraChecklist(org)[id]) return 'organisation';
  return null;
}

// ── Profile and security.txt ──────────────────────────────────────────────────

export const PUBLISHER_CATEGORIES = ['vendor', 'coordinator', 'discoverer', 'other'] as const;

export interface OrgProfile {
  name: string;
  publisherName: string | null;
  publisherNamespace: string | null;
  publisherCategory: string;
  issuingAuthority: string | null;
  contactDetails: string | null;
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

/** Only the given fields are returned, cleaned; empty text becomes null (name: empty string). */
export function sanitizeOrgProfile(raw: Record<string, unknown>): Partial<OrgProfile> {
  const out: Partial<OrgProfile> = {};
  const name = text(raw.name, 256); if (name !== undefined) out.name = name;
  const pub = text(raw.publisherName, 256); if (pub !== undefined) out.publisherName = pub || null;
  const ns = text(raw.publisherNamespace, 512); if (ns !== undefined) out.publisherNamespace = ns || null;
  if (typeof raw.publisherCategory === 'string' && (PUBLISHER_CATEGORIES as readonly string[]).includes(raw.publisherCategory)) out.publisherCategory = raw.publisherCategory;
  const auth = text(raw.issuingAuthority, 512); if (auth !== undefined) out.issuingAuthority = auth || null;
  const contact = text(raw.contactDetails, 1024); if (contact !== undefined) out.contactDetails = contact || null;
  return out;
}

export interface StoredSecurityTxt {
  domain: string; psirtEmail: string; csirtEmail: string; reportWebUri: string; openPgpKeyUri: string;
  policyUri: string; csafProviderUri: string; expiresDays: number;
}

export const SECURITY_TXT_DEFAULTS: StoredSecurityTxt = {
  domain: '', psirtEmail: '', csirtEmail: '', reportWebUri: '', openPgpKeyUri: '', policyUri: '', csafProviderUri: '', expiresDays: 365,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanUrl(v: unknown): string {
  if (typeof v !== 'string' || !v.trim() || v.length > 512) return '';
  try {
    const u = new URL(v.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch { return ''; }
}

/** Cleans stored or submitted security.txt settings; unknown or invalid values fall back to empty. */
export function sanitizeSecurityTxt(raw: unknown): StoredSecurityTxt {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const email = (v: unknown) => (typeof v === 'string' && EMAIL_RE.test(v.trim()) && v.length <= 256 ? v.trim() : '');
  const days = Number(r.expiresDays);
  return {
    domain: typeof r.domain === 'string' ? r.domain.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '').slice(0, 253) : '',
    psirtEmail: email(r.psirtEmail),
    csirtEmail: email(r.csirtEmail),
    reportWebUri: cleanUrl(r.reportWebUri),
    openPgpKeyUri: cleanUrl(r.openPgpKeyUri),
    policyUri: cleanUrl(r.policyUri),
    csafProviderUri: cleanUrl(r.csafProviderUri),
    expiresDays: Number.isInteger(days) && days >= 30 && days <= 365 ? days : 365,
  };
}
