// CSAF VEX builder for CSAF 2.0 (OASIS Standard) and CSAF 2.1 (Committee Specification
// Draft 03, offered as preview). Pure function: the route loads the data, this shapes it.
//
// Product model: the product is the manufacturer's project version. Every affected
// component is linked to it (2.0: relationships, 2.1: product_paths), so a VEX statement
// reads "component X as part of product version N is (not) affected".
import { parseCvssV3, scoreToSeverityV3 } from './cvss';
import { CWE_DATABASE } from '@/data/cwe';
import { severityOfScore } from './ownVulnerability';

export type CsafVersion = '2.0' | '2.1';
export const CSAF_VERSIONS: readonly CsafVersion[] = ['2.0', '2.1'];

/** TLP v2 labels as stored in the draft; mapped to TLP v1 for CSAF 2.0. */
export const TLP_LABELS = ['CLEAR', 'GREEN', 'AMBER', 'AMBER+STRICT', 'RED'] as const;
export type TlpLabel = (typeof TLP_LABELS)[number];

export const PUBLISHER_CATEGORIES = ['coordinator', 'discoverer', 'multiplier', 'other', 'translator', 'user', 'vendor'] as const;
const PUBLISHER_CATEGORIES_20 = new Set(['coordinator', 'discoverer', 'other', 'translator', 'user', 'vendor']);

// Only CSAF 2.1 defines `$schema`; in 2.0 it is an additional property the strict schema rejects.
const SCHEMA_URL_21 = 'https://docs.oasis-open.org/csaf/csaf/v2.1/schema/csaf.json';

// CWE catalogue release the CWE names are taken from (required by CSAF 2.1)
const CWE_VERSION = '4.18';

const DOC_STATUS: Record<string, string> = { DRAFT: 'draft', REVIEW: 'interim', PUBLISHED: 'final', ARCHIVED: 'final' };
const QUALITATIVE = new Set(['critical', 'high', 'medium', 'low', 'none']);

export interface CsafDraftInput {
  title: string;
  trackingId: string;
  version: string;
  revision: string;
  docStatus: string;
  aggregateSeverity: string;
  initialReleaseDate: Date;
  currentReleaseDate: Date;
  tlp: string;
  summary: string;
  details: string;
  publisherName: string;
  publisherNamespace: string;
  publisherCategory: string;
  licenseExpression?: string | null;
}

export interface CsafVulnInput {
  osvId: string;
  cveId: string | null;
  summary: string | null;
  severity: string | null;
  cvssVector: string | null;
  componentName: string;
  componentVersion: string | null;
  componentPurl: string | null;
  status: string;
  justification: string | null;
  versionNumber: number;
  versionLabel: string;
  remediationCategory?: string | null;
  remediationDetails?: string | null;
  remediationUrl?: string | null;
}

/** A vulnerability in the manufacturer's own code; published as a security advisory. */
export interface CsafOwnVulnInput {
  title: string;
  cveId: string | null;
  cweId: string | null;
  cvssVector: string | null;
  description: string;
  affectedVersions: number[];
  status: string;
  remediationCategory: string | null;
  remediationDetails: string | null;
  remediationUrl: string | null;
  acknowledgments: string | null;
}

export interface CsafOptions {
  version: CsafVersion;
  projectName: string;
  /** From the user's CSAF publisher profile. */
  contactDetails?: string | null;
  issuingAuthority?: string | null;
  /** Labels of the project versions (number to label), used for own vulnerabilities. */
  versionLabels?: Record<number, string>;
  now?: Date;
}

const DEFAULT_REMEDIATION_TEXT: Record<string, string> = {
  vendor_fix: 'A fixed version is available.',
  workaround: 'A workaround is available.',
  mitigation: 'A mitigation is available.',
  none_available: 'No remediation is available yet.',
  no_fix_planned: 'The manufacturer does not plan to fix this vulnerability.',
};

interface RemediationLike { category: string | null | undefined; details: string | null | undefined; url: string | null | undefined }

/** CSAF remediation statement for a category, with a default text when the user wrote none (details is mandatory). */
function remediationEntry(r: RemediationLike, productIds: string[]) {
  const category = r.category ?? 'none_available';
  return {
    category,
    details: r.details?.trim() || DEFAULT_REMEDIATION_TEXT[category] || DEFAULT_REMEDIATION_TEXT.none_available,
    ...(r.url ? { url: r.url } : {}),
    product_ids: productIds,
  };
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
}

/** Legacy TLP v1 values (WHITE) are accepted and treated as their TLP v2 equivalent. */
export function normaliseTlp(label: string): TlpLabel {
  const l = label.toUpperCase();
  if (l === 'WHITE') return 'CLEAR';
  return (TLP_LABELS as readonly string[]).includes(l) ? (l as TlpLabel) : 'CLEAR';
}

function cvssV3Object(vector: string) {
  const baseScore = parseCvssV3(vector);
  if (baseScore === null) return null;
  const baseSeverity = scoreToSeverityV3(baseScore);
  return { version: vector.startsWith('CVSS:3.1/') ? '3.1' : '3.0', vectorString: vector, baseScore, baseSeverity };
}

/** Adds `value` to the list stored under `key`, without duplicates. */
function push<K>(map: Map<K, string[]>, key: K, value: string) {
  const list = map.get(key) ?? [];
  if (!list.includes(value)) list.push(value);
  map.set(key, list);
}

export function buildCsaf(draft: CsafDraftInput, vulns: CsafVulnInput[], opts: CsafOptions, ownVulns: CsafOwnVulnInput[] = []): { csaf: Record<string, unknown>; warnings: string[] } {
  const v21 = opts.version === '2.1';
  const warnings: string[] = [];
  const now = (opts.now ?? new Date()).toISOString();

  // ── Product tree ────────────────────────────────────────────────────────────
  const versions = new Map<number, { id: string; name: string }>();
  const components = new Map<string, { id: string; name: string; purl: string | null }>();
  const combos = new Map<string, { id: string; componentId: string; versionId: string; name: string }>();
  const usedIds = new Set<string>();
  const uniqueId = (base: string) => {
    let id = base;
    for (let i = 2; usedIds.has(id); i++) id = `${base}-${i}`;
    usedIds.add(id);
    return id;
  };

  const versionOf = (number: number, label: string) => {
    if (!versions.has(number)) {
      versions.set(number, { id: uniqueId(`CSAFPID-V${number}`), name: label.trim() || `v${number}` });
    }
    return versions.get(number)!;
  };

  const productIdOf = (v: CsafVulnInput): string => {
    const ver = versionOf(v.versionNumber, v.versionLabel);
    const compKey = `${v.componentPurl ?? ''}|${v.componentName}@${v.componentVersion ?? ''}`;
    if (!components.has(compKey)) {
      components.set(compKey, {
        id: uniqueId(`CSAFPID-C-${slugify(v.componentName)}-${slugify(v.componentVersion ?? 'unknown')}`),
        name: `${v.componentName} ${v.componentVersion ?? '(version unknown)'}`.trim(),
        purl: v.componentPurl,
      });
    }
    const comp = components.get(compKey)!;
    const comboKey = `${comp.id}|${ver.id}`;
    if (!combos.has(comboKey)) {
      combos.set(comboKey, {
        id: uniqueId(`${comp.id}-IN-V${v.versionNumber}`),
        componentId: comp.id,
        versionId: ver.id,
        name: `${comp.name} as component of ${opts.projectName} ${ver.name}`,
      });
    }
    return combos.get(comboKey)!.id;
  };

  // ── Vulnerabilities: one entry per advisory (CSAF forbids the same CVE twice) ─
  const groups = new Map<string, CsafVulnInput[]>();
  for (const v of vulns) {
    const key = v.cveId ?? v.osvId;
    groups.set(key, [...(groups.get(key) ?? []), v]);
  }

  const vulnerabilities: Record<string, unknown>[] = [...groups.entries()].map(([key, rows]) => {
    const status = new Map<string, string[]>();
    const impact = new Map<string, string[]>();
    const remediations = new Map<string, { r: RemediationLike; products: string[] }>();
    const addRemediation = (r: RemediationLike, pid: string) => {
      const key = `${r.category ?? ''}|${r.details ?? ''}|${r.url ?? ''}`;
      const cur = remediations.get(key) ?? { r, products: [] };
      if (!cur.products.includes(pid)) cur.products.push(pid);
      remediations.set(key, cur);
    };
    const scoreGroups = new Map<string, string[]>(); // `${severity}|${vector}` -> product ids

    for (const r of rows) {
      const pid = productIdOf(r);
      if (r.status === 'not_affected') {
        push(status, 'known_not_affected', pid);
        const why = r.justification?.trim();
        if (!why) warnings.push(`${key}: "not affected" for ${r.componentName} has no justification; a placeholder impact statement was used.`);
        push(impact, why || 'No justification recorded.', pid);
        continue;
      }
      if (r.status === 'affected') {
        push(status, 'known_affected', pid);
        if (!r.remediationCategory) warnings.push(`${key}: "affected" for ${r.componentName} has no remediation; "no remediation available yet" was stated.`);
        addRemediation({ category: r.remediationCategory, details: r.remediationDetails, url: r.remediationUrl }, pid);
      } else if (r.status === 'fixed') {
        push(status, 'fixed', pid);
        if (r.remediationCategory || r.remediationDetails) {
          addRemediation({ category: r.remediationCategory ?? 'vendor_fix', details: r.remediationDetails, url: r.remediationUrl }, pid);
        }
      } else {
        push(status, 'under_investigation', pid);
      }
      push(scoreGroups, `${r.severity ?? ''}|${r.cvssVector ?? ''}`, pid);
    }

    const first = rows[0];
    const cve = rows.find((r) => r.cveId)?.cveId ?? null;
    const entry: Record<string, unknown> = {
      ...(cve ? { cve } : { ids: [{ system_name: 'OSV', text: first.osvId }] }),
      title: key,
      notes: [{ category: 'summary', title: 'Vulnerability summary', text: first.summary || key }],
      product_status: Object.fromEntries(status),
    };
    if (impact.size > 0) {
      entry.threats = [...impact.entries()].map(([details, product_ids]) => ({ category: 'impact', details, product_ids }));
    }
    if (remediations.size > 0) {
      entry.remediations = [...remediations.values()].map(({ r, products }) => remediationEntry(r, products));
    }

    if (v21) {
      const metrics = [...scoreGroups.entries()].flatMap(([k, products]) => {
        const [severity, vector] = k.split('|');
        const cvss = vector ? cvssV3Object(vector) : null;
        const rating = severity.toLowerCase();
        const content: Record<string, unknown> = {
          ...(QUALITATIVE.has(rating) ? { qualitative_severity_rating: rating } : {}),
          ...(cvss ? { cvss_v3: cvss } : {}),
        };
        // Severity and vector come from the OSV advisory, so it is named as the source (CSAF 2.1 test 6.2.47)
        return Object.keys(content).length > 0 ? [{ content, products, source: `https://osv.dev/vulnerability/${encodeURIComponent(first.osvId)}` }] : [];
      });
      if (metrics.length > 0) entry.metrics = metrics;
    } else {
      const scores = [...scoreGroups.entries()].flatMap(([k, products]) => {
        const vector = k.split('|')[1];
        const cvss = vector ? cvssV3Object(vector) : null;
        return cvss ? [{ products, cvss_v3: cvss }] : [];
      });
      if (scores.length > 0) entry.scores = scores;
    }
    return entry;
  });

  // ── Own vulnerabilities (not from an SBOM) ──────────────────────────────────
  const usedKeys = new Set(groups.keys());
  let ownIncluded = 0;
  ownVulns.forEach((o, idx) => {
    const key = o.cveId ?? `OWN-${idx + 1}`;
    if (usedKeys.has(key)) {
      warnings.push(`${key}: already listed from an SBOM finding; the own entry "${o.title}" was skipped.`);
      return;
    }
    usedKeys.add(key);
    ownIncluded += 1;
    const pids = o.affectedVersions.map((n) => versionOf(n, opts.versionLabels?.[n] ?? '').id);
    const fixed = o.status === 'fixed';
    const entry: Record<string, unknown> = {
      ...(o.cveId ? { cve: o.cveId } : { ids: [{ system_name: draft.publisherName || 'Vendor', text: key }] }),
      title: o.title,
      notes: [{ category: 'description', title: 'Vulnerability description', text: o.description }],
      product_status: { [fixed ? 'fixed' : 'known_affected']: pids },
    };
    if (o.cweId) {
      const cwe = { id: o.cweId, name: CWE_DATABASE.find((c) => c.id === o.cweId)?.name ?? o.cweId };
      Object.assign(entry, v21 ? { cwes: [{ ...cwe, version: CWE_VERSION }] } : { cwe });
    }
    if (!fixed || o.remediationCategory || o.remediationDetails) {
      if (!fixed && !o.remediationCategory) warnings.push(`${key}: "${o.title}" has no remediation; "no remediation available yet" was stated.`);
      entry.remediations = [remediationEntry({ category: o.remediationCategory ?? (fixed ? 'vendor_fix' : null), details: o.remediationDetails, url: o.remediationUrl }, pids)];
    }
    const cvss = o.cvssVector ? cvssV3Object(o.cvssVector) : null;
    if (cvss) {
      if (v21) {
        entry.metrics = [{ content: { qualitative_severity_rating: severityOfScore(cvss.baseScore).toLowerCase(), cvss_v3: cvss }, products: pids }];
      } else {
        entry.scores = [{ products: pids, cvss_v3: cvss }];
      }
    }
    const names = (o.acknowledgments ?? '').split(/[,\n]/).map((n) => n.trim()).filter(Boolean);
    if (names.length > 0) entry.acknowledgments = [{ names }];
    vulnerabilities.push(entry);
  });

  const componentList = [...components.values()];
  const comboList = [...combos.values()];
  const product_tree: Record<string, unknown> = {
    branches: [{
      category: 'vendor',
      name: draft.publisherName || 'Unknown vendor',
      branches: [{
        category: 'product_name',
        name: opts.projectName,
        branches: [...versions.entries()].map(([num, ver]) => ({
          category: 'product_version',
          name: String(num),
          product: { name: `${opts.projectName} ${ver.name}`, product_id: ver.id },
        })),
      }],
    }],
    // Empty arrays are invalid in CSAF, so they are left out when only own vulnerabilities are published
    ...(componentList.length > 0
      ? { full_product_names: componentList.map((c) => ({
          name: c.name,
          product_id: c.id,
          ...(c.purl ? { product_identification_helper: v21 ? { purls: [c.purl] } : { purl: c.purl } } : {}),
        })) }
      : {}),
    ...(comboList.length === 0
      ? {}
      : v21
      ? {
          product_paths: comboList.map((c) => ({
            beginning_product_reference: c.componentId,
            subpaths: [{ category: 'default_component_of', next_product_reference: c.versionId }],
            full_product_name: { name: c.name, product_id: c.id },
          })),
        }
      : {
          relationships: comboList.map((c) => ({
            category: 'default_component_of',
            product_reference: c.componentId,
            relates_to_product_reference: c.versionId,
            full_product_name: { name: c.name, product_id: c.id },
          })),
        }),
  };

  // ── Document ────────────────────────────────────────────────────────────────
  const tlp = normaliseTlp(draft.tlp);
  const trackingId = draft.trackingId || `${slugify(opts.projectName)}-${new Date(now).getFullYear()}-001`;
  let title = draft.title || `Security advisory for ${opts.projectName}`;
  if (v21 && title.includes(trackingId)) {
    // CSAF 2.1: the title must not repeat the tracking id
    title = title.replace(trackingId, '').replace(/^[\s:\-–()[\]]+|[\s:\-–()[\]]+$/g, '') || `Security advisory for ${opts.projectName}`;
    warnings.push('The tracking id was removed from the title (not allowed in CSAF 2.1).');
  }
  if (!draft.publisherNamespace) warnings.push('Publisher namespace is missing; https://example.com was used. Set it in the Organisation area.');

  let publisherCategory = (PUBLISHER_CATEGORIES as readonly string[]).includes(draft.publisherCategory) ? draft.publisherCategory : 'vendor';
  if (!v21 && !PUBLISHER_CATEGORIES_20.has(publisherCategory)) publisherCategory = 'other'; // "multiplier" is new in 2.1
  const contact = opts.contactDetails?.trim();

  const distribution = v21
    ? { tlp: { label: tlp } }
    : tlp === 'AMBER+STRICT'
      ? { tlp: { label: 'AMBER' }, text: 'TLP v2.0: TLP:AMBER+STRICT' } // the form a 2.0→2.1 converter picks up
      : { tlp: { label: tlp === 'CLEAR' ? 'WHITE' : tlp } };

  const version = draft.version || '1';
  const currentRelease = draft.currentReleaseDate.toISOString();

  const csaf: Record<string, unknown> = {
    ...(v21 ? { $schema: SCHEMA_URL_21 } : {}),
    document: {
      category: ownIncluded > 0 ? 'csaf_security_advisory' : 'csaf_vex',
      csaf_version: opts.version,
      lang: 'en',
      title,
      publisher: {
        category: publisherCategory,
        name: draft.publisherName || 'Unknown',
        namespace: draft.publisherNamespace || 'https://example.com',
        ...(opts.issuingAuthority?.trim() ? { issuing_authority: opts.issuingAuthority.trim() } : {}),
        ...(contact ? (v21 ? { contact: { details: contact } } : { contact_details: contact }) : {}),
      },
      tracking: {
        id: trackingId,
        status: DOC_STATUS[draft.docStatus] ?? 'draft',
        version,
        initial_release_date: draft.initialReleaseDate.toISOString(),
        current_release_date: currentRelease,
        revision_history: [{ number: version, date: currentRelease, summary: draft.revision || 'Initial release' }],
        generator: { date: now, engine: { name: 'CyberRisk Canvas' } },
      },
      distribution,
      aggregate_severity: { text: draft.aggregateSeverity || 'MEDIUM' },
      ...(v21 && draft.licenseExpression?.trim() ? { license_expression: draft.licenseExpression.trim() } : {}),
      notes: [
        { category: 'summary', title: 'Summary', text: draft.summary || title },
        ...(draft.details ? [{ category: 'description', title: 'Impact', text: draft.details }] : []),
      ],
      // The security advisory profile requires references
      ...(ownIncluded > 0 ? { references: [{ category: 'external', summary: 'Publisher', url: draft.publisherNamespace || 'https://example.com' }] } : {}),
    },
    product_tree,
    vulnerabilities,
  };

  return { csaf: sortKeys(csaf) as Record<string, unknown>, warnings };
}

/** Alphabetical property order, recommended by CSAF (test 6.2.13). Array order is kept. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]));
  }
  return value;
}
