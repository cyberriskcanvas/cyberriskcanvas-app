import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { buildCsaf, type CsafDraftInput, type CsafOwnVulnInput, type CsafVersion, type CsafVulnInput } from '../csaf';

// ── Official schemas (see fixtures/csaf-schema/SOURCE.md) ─────────────────────
// They mix JSON Schema dialects (draft-04/07, 2020-12, custom CSAF/FIRST metaschemas), so they
// are registered by the URL CSAF refers to, without metaschema validation.
const DIR = path.join(__dirname, 'fixtures', 'csaf-schema');
const URL_OF: Record<string, string> = {
  'cvss-v2.0.json': 'https://www.first.org/cvss/cvss-v2.0.json',
  'cvss-v3.0.json': 'https://www.first.org/cvss/cvss-v3.0.json',
  'cvss-v3.1.json': 'https://www.first.org/cvss/cvss-v3.1.json',
  'cvss-v4.0.json': 'https://www.first.org/cvss/cvss-v4.0.json',
  'ssvc-SelectionList_2_0_0.schema.json': 'https://certcc.github.io/SSVC/data/schema/v2/SelectionList_2_0_0.schema.json',
  'extension-content-2.1-csd03.json': 'https://docs.oasis-open.org/csaf/csaf/v2.1/schema/extension-content.json',
  'extension-metaschema-2.1-csd03.json': 'https://docs.oasis-open.org/csaf/csaf/v2.1/schema/extension-metaschema.json',
  'csaf-2.0.json': 'https://docs.oasis-open.org/csaf/csaf/v2.0/csaf_json_schema.json',
  'csaf-2.1-csd03.json': 'https://docs.oasis-open.org/csaf/csaf/v2.1/schema/csaf.json',
};

const ajv = new Ajv2020({ strict: false, validateSchema: false, allErrors: true });
addFormats(ajv);
for (const file of readdirSync(DIR).filter((f) => f in URL_OF)) {
  const schema = JSON.parse(readFileSync(path.join(DIR, file), 'utf8'));
  delete schema.$schema;
  delete schema.$id;
  delete schema.id;
  ajv.addSchema(schema, URL_OF[file]);
}

// Vocabulary metaschema not bundled with ajv; only referenced by the x_extensions metaschema
ajv.addSchema({ type: ['object', 'boolean'], properties: { format: { type: 'string' } } }, 'https://json-schema.org/draft/2020-12/meta/format-assertion');

function validate(version: CsafVersion, doc: unknown): string[] {
  const fn = ajv.getSchema(URL_OF[version === '2.0' ? 'csaf-2.0.json' : 'csaf-2.1-csd03.json'])!;
  return fn(doc) ? [] : (fn.errors ?? []).map((e) => `${e.instancePath} ${e.message}`);
}

// ── Fixture ───────────────────────────────────────────────────────────────────
const draft: CsafDraftInput = {
  title: 'Security advisory for Gateway',
  trackingId: 'gateway-2026-001',
  version: '1',
  revision: 'Initial release',
  docStatus: 'DRAFT',
  aggregateSeverity: 'CRITICAL',
  initialReleaseDate: new Date('2026-10-01T00:00:00Z'),
  currentReleaseDate: new Date('2026-10-17T00:00:00Z'),
  tlp: 'AMBER+STRICT',
  summary: 'Vulnerabilities in third-party components of the gateway.',
  details: '',
  publisherName: 'ACME GmbH',
  publisherNamespace: 'https://acme.example',
  publisherCategory: 'multiplier',
  licenseExpression: 'CC-BY-4.0',
};

const base = { summary: 'summary', versionNumber: 2, versionLabel: '2.1.0', justification: null, cvssVector: null } as const;
const vulns: CsafVulnInput[] = [
  { ...base, osvId: 'CVE-2021-44228', cveId: 'CVE-2021-44228', severity: 'CRITICAL', cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H', componentName: 'log4j-core', componentVersion: '2.14.1', componentPurl: 'pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1', status: 'open' },
  // same CVE in a frozen version: must end up in the SAME vulnerability entry
  { ...base, osvId: 'CVE-2021-44228', cveId: 'CVE-2021-44228', severity: 'CRITICAL', componentName: 'log4j-core', componentVersion: '2.14.1', componentPurl: 'pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1', status: 'fixed', versionNumber: 1, versionLabel: '' },
  { ...base, osvId: 'CVE-2020-8203', cveId: 'CVE-2020-8203', severity: 'HIGH', componentName: 'lodash', componentVersion: '4.17.15', componentPurl: 'pkg:npm/lodash@4.17.15', status: 'not_affected', justification: 'zipObjectDeep is never called' },
  { ...base, osvId: 'GHSA-xxxx-yyyy-zzzz', cveId: null, severity: 'MEDIUM', componentName: 'left-pad', componentVersion: null, componentPurl: null, status: 'not_affected' },
  { ...base, osvId: 'CVE-2022-0001', cveId: 'CVE-2022-0001', severity: null, componentName: 'zlib', componentVersion: '1.2.11', componentPurl: null, status: 'in_triage' },
];

type Doc = {
  document: { title: string; distribution: { tlp: { label: string }; text?: string }; publisher: Record<string, unknown>; license_expression?: string };
  product_tree: { branches: unknown[]; full_product_names: { product_id: string }[]; relationships?: { full_product_name: { product_id: string } }[]; product_paths?: { full_product_name: { product_id: string } }[] };
  vulnerabilities: Array<{ cve?: string; product_status: Record<string, string[]>; threats?: { category: string; product_ids: string[] }[]; scores?: unknown[]; metrics?: unknown[] }>;
};

function definedIds(doc: Doc): Set<string> {
  const ids = new Set<string>();
  JSON.stringify(doc.product_tree, (k, v) => { if (k === 'product_id') ids.add(v); return v; });
  return ids;
}

describe.each(['2.0', '2.1'] as const)('buildCsaf CSAF %s', (version) => {
  const { csaf, warnings } = buildCsaf(draft, vulns, { version, projectName: 'Gateway', contactDetails: 'psirt@acme.example', now: new Date('2026-10-17T10:00:00Z') });
  const doc = csaf as unknown as Doc;

  it('is valid against the official JSON schema', () => {
    expect(validate(version, csaf)).toEqual([]);
  });

  it('defines every product it references (VEX profile)', () => {
    const ids = definedIds(doc);
    const referenced = doc.vulnerabilities.flatMap((v) => [...Object.values(v.product_status).flat(), ...(v.threats ?? []).flatMap((t) => t.product_ids)]);
    expect(referenced.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('has an impact statement for every known_not_affected product', () => {
    for (const v of doc.vulnerabilities) {
      const impacted = new Set((v.threats ?? []).filter((t) => t.category === 'impact').flatMap((t) => t.product_ids));
      for (const id of v.product_status.known_not_affected ?? []) expect(impacted.has(id), id).toBe(true);
    }
    expect(warnings.some((w) => w.includes('GHSA-xxxx-yyyy-zzzz'))).toBe(true); // missing justification is reported
  });

  it('lists each CVE once and links components to the product version', () => {
    const cves = doc.vulnerabilities.map((v) => v.cve).filter(Boolean);
    expect(new Set(cves).size).toBe(cves.length);
    const log4j = doc.vulnerabilities.find((v) => v.cve === 'CVE-2021-44228')!;
    expect(log4j.product_status.under_investigation).toHaveLength(1);
    expect(log4j.product_status.fixed).toHaveLength(1);
    const links = version === '2.0' ? doc.product_tree.relationships : doc.product_tree.product_paths;
    expect(links?.length).toBeGreaterThan(0);
  });

  it('maps TLP and publisher category per version', () => {
    if (version === '2.0') {
      expect(doc.document.distribution).toEqual({ tlp: { label: 'AMBER' }, text: 'TLP v2.0: TLP:AMBER+STRICT' });
      expect(doc.document.publisher.category).toBe('other');
      expect(doc.document.publisher.contact_details).toBe('psirt@acme.example');
      expect(doc.document.license_expression).toBeUndefined();
    } else {
      expect(doc.document.distribution.tlp.label).toBe('AMBER+STRICT');
      expect(doc.document.publisher.category).toBe('multiplier');
      expect(doc.document.publisher.contact).toEqual({ details: 'psirt@acme.example' });
      expect(doc.document.license_expression).toBe('CC-BY-4.0');
    }
  });

  it('exports CVSS only for affected products (scores in 2.0, metrics in 2.1)', () => {
    const log4j = doc.vulnerabilities.find((v) => v.cve === 'CVE-2021-44228')!;
    const lodash = doc.vulnerabilities.find((v) => v.cve === 'CVE-2020-8203')!;
    expect(version === '2.0' ? log4j.scores : log4j.metrics).toBeDefined();
    expect(lodash.scores ?? lodash.metrics).toBeUndefined();
  });
});


// ── Affected findings with remediation, and own vulnerabilities ───────────────
const affectedVulns: CsafVulnInput[] = [
  { ...base, osvId: 'CVE-2021-44228', cveId: 'CVE-2021-44228', severity: 'CRITICAL', cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H', componentName: 'log4j-core', componentVersion: '2.14.1', componentPurl: 'pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1', status: 'affected', remediationCategory: 'vendor_fix', remediationDetails: 'Update log4j-core to 2.17.1 (gateway 2.2.0).', remediationUrl: 'https://acme.example/sa-2026-001' },
  { ...base, osvId: 'CVE-2022-0001', cveId: 'CVE-2022-0001', severity: 'HIGH', componentName: 'zlib', componentVersion: '1.2.11', componentPurl: null, status: 'affected' },
];
const own: CsafOwnVulnInput[] = [
  { title: 'Path traversal in the upload handler', cveId: 'CVE-2026-12345', cweId: 'CWE-22', cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N', description: 'The upload handler accepts ../ in file names.', affectedVersions: [1, 2], status: 'affected', remediationCategory: 'workaround', remediationDetails: 'Block uploads at the reverse proxy.', remediationUrl: null, acknowledgments: 'A. Researcher, B. Finder' },
  { title: 'Hard-coded maintenance password', cveId: null, cweId: null, cvssVector: null, description: 'A default maintenance password exists in firmware 1.x.', affectedVersions: [2], status: 'fixed', remediationCategory: null, remediationDetails: null, remediationUrl: null, acknowledgments: null },
];

type RemDoc = { document: { category: string; references?: unknown[] }; vulnerabilities: Array<{ cve?: string; ids?: unknown[]; title: string; cwe?: { id: string; name: string }; cwes?: { id: string; name: string }[]; product_status: Record<string, string[]>; remediations?: { category: string; details: string; url?: string; product_ids: string[] }[]; acknowledgments?: { names: string[] }[]; scores?: unknown[]; metrics?: unknown[] }> };

describe.each(['2.0', '2.1'] as const)('affected findings and own vulnerabilities, CSAF %s', (version) => {
  const opts = { version, projectName: 'Gateway', versionLabels: { 1: '1.0.0', 2: '2.1.0' }, now: new Date('2026-10-17T10:00:00Z') } as const;

  it('exports affected findings as known_affected with their remediation', () => {
    const { csaf, warnings } = buildCsaf(draft, affectedVulns, opts);
    expect(validate(version, csaf)).toEqual([]);
    const doc = csaf as unknown as RemDoc;
    const log4j = doc.vulnerabilities.find((v) => v.cve === 'CVE-2021-44228')!;
    expect(log4j.product_status.known_affected).toHaveLength(1);
    expect(log4j.remediations).toEqual([expect.objectContaining({ category: 'vendor_fix', details: 'Update log4j-core to 2.17.1 (gateway 2.2.0).', url: 'https://acme.example/sa-2026-001', product_ids: log4j.product_status.known_affected })]);
    expect(doc.document.category).toBe('csaf_vex');
    // known_affected without a remediation states "none available" and warns
    const zlib = doc.vulnerabilities.find((v) => v.cve === 'CVE-2022-0001')!;
    expect(zlib.remediations?.[0]).toMatchObject({ category: 'none_available' });
    expect(zlib.remediations?.[0].details.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.includes('CVE-2022-0001'))).toBe(true);
  });

  it('adds a fix statement to fixed findings that have one', () => {
    const fixed: CsafVulnInput[] = [{ ...affectedVulns[0], status: 'fixed' }];
    const doc = buildCsaf(draft, fixed, opts).csaf as unknown as RemDoc;
    expect(doc.vulnerabilities[0].product_status.fixed).toHaveLength(1);
    expect(doc.vulnerabilities[0].remediations?.[0].category).toBe('vendor_fix');
  });

  it('publishes own vulnerabilities as a security advisory that validates against the schema', () => {
    const { csaf, warnings } = buildCsaf(draft, affectedVulns, opts, own);
    expect(validate(version, csaf)).toEqual([]);
    const doc = csaf as unknown as RemDoc;
    expect(doc.document.category).toBe('csaf_security_advisory');
    expect(doc.document.references?.length).toBeGreaterThan(0);
    const traversal = doc.vulnerabilities.find((v) => v.cve === 'CVE-2026-12345')!;
    expect(traversal.product_status.known_affected).toHaveLength(2); // versions 1 and 2
    expect(traversal.remediations?.[0]).toMatchObject({ category: 'workaround', details: 'Block uploads at the reverse proxy.' });
    expect(version === '2.0' ? traversal.cwe : traversal.cwes?.[0]).toMatchObject({ id: 'CWE-22', name: expect.any(String) });
    expect(traversal.acknowledgments).toEqual([{ names: ['A. Researcher', 'B. Finder'] }]);
    expect(version === '2.0' ? traversal.scores : traversal.metrics).toBeDefined();
    const password = doc.vulnerabilities.find((v) => v.title === 'Hard-coded maintenance password')!;
    expect(password.ids).toBeDefined(); // no CVE: an internal id is used
    expect(password.product_status.fixed).toHaveLength(1);
    expect(warnings.some((w) => w.includes('CVE-2022-0001'))).toBe(true);
    // every referenced product is defined in the product tree
    const ids = definedIds(csaf as unknown as Doc);
    const used = doc.vulnerabilities.flatMap((v) => [...Object.values(v.product_status).flat(), ...(v.remediations ?? []).flatMap((r) => r.product_ids)]);
    expect(used.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('works with own vulnerabilities only (no SBOM findings)', () => {
    const { csaf } = buildCsaf(draft, [], opts, own);
    expect(validate(version, csaf)).toEqual([]);
    expect((csaf as unknown as RemDoc).vulnerabilities).toHaveLength(2);
  });

  it('skips an own entry whose CVE is already listed from an SBOM finding', () => {
    const dup: CsafOwnVulnInput[] = [{ ...own[0], cveId: 'CVE-2021-44228' }];
    const { csaf, warnings } = buildCsaf(draft, affectedVulns, opts, dup);
    expect((csaf as unknown as RemDoc).vulnerabilities.filter((v) => v.cve === 'CVE-2021-44228')).toHaveLength(1);
    expect((csaf as unknown as RemDoc).document.category).toBe('csaf_vex');
    expect(warnings.some((w) => w.includes('skipped'))).toBe(true);
  });
});

describe('buildCsaf edge cases', () => {
  it('removes the tracking id from the title in 2.1 only', () => {
    const d = { ...draft, title: 'gateway-2026-001: Log4Shell in Gateway' };
    const t21 = (buildCsaf(d, vulns, { version: '2.1', projectName: 'Gateway' }).csaf as unknown as Doc).document.title;
    const t20 = (buildCsaf(d, vulns, { version: '2.0', projectName: 'Gateway' }).csaf as unknown as Doc).document.title;
    expect(t21).toBe('Log4Shell in Gateway');
    expect(t20).toBe(d.title);
  });

  it('treats legacy WHITE as CLEAR', () => {
    const doc = buildCsaf({ ...draft, tlp: 'WHITE' }, vulns, { version: '2.1', projectName: 'Gateway' }).csaf as unknown as Doc;
    expect(doc.document.distribution.tlp.label).toBe('CLEAR');
    const doc20 = buildCsaf({ ...draft, tlp: 'CLEAR' }, vulns, { version: '2.0', projectName: 'Gateway' }).csaf as unknown as Doc;
    expect(doc20.document.distribution.tlp.label).toBe('WHITE');
  });
});

describe('schema validation sanity', () => {
  it('rejects documents that break the schema (TLP v1 label in 2.1, missing product_id)', () => {
    const doc = buildCsaf(draft, vulns, { version: '2.1', projectName: 'Gateway' }).csaf as unknown as Doc;
    expect(validate('2.1', { ...doc, document: { ...doc.document, distribution: { tlp: { label: 'WHITE' } } } }).length).toBeGreaterThan(0);
    const broken = JSON.parse(JSON.stringify(doc));
    delete broken.product_tree.full_product_names[0].product_id;
    expect(validate('2.1', broken).length).toBeGreaterThan(0);
  });
});

describe('$schema', () => {
  it('is set in 2.1 only (strict 2.0 schema rejects it)', () => {
    expect(buildCsaf(draft, vulns, { version: '2.0', projectName: 'G' }).csaf.$schema).toBeUndefined();
    expect(buildCsaf(draft, vulns, { version: '2.1', projectName: 'G' }).csaf.$schema).toBe('https://docs.oasis-open.org/csaf/csaf/v2.1/schema/csaf.json');
  });
});
