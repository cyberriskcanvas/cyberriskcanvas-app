import { describe, expect, it } from 'vitest';
import { annexViiCoverage, generateAnnexII, generateDeclaration, type ProductFacts } from '../docGenerators';
import { emptyDocData, sanitizeDocData, type DocData } from '@/lib/docData';

const facts: ProductFacts = {
  productName: 'Smart Gateway', version: '2.1.0', intendedPurpose: 'Connects sensors to the cloud.', supportPeriodEnd: '2031-12-31T00:00:00Z',
  supportPeriodRationale: 'Expected use of 5 years', vulnerabilityContact: 'psirt@acme.example', craClass: 'default',
};
const complete = (): DocData => sanitizeDocData({
  manufacturer: { name: 'ACME GmbH', address: 'Hauptstr. 1, 10115 Berlin', email: 'info@acme.example', website: 'https://acme.example' },
  product: { type: 'IoT gateway', identification: 'GW-2' },
  securityEnvironment: 'Operated in a home network behind a router.',
  knownRisks: 'Weak Wi-Fi passwords on the home network.',
  supportType: 'Security updates and vulnerability handling',
  instructions: { commissioning: 'Change the default password.', dataImpact: 'A reset removes data.', updates: 'Use the update button.', decommissioning: 'Factory reset before disposal.', autoUpdateOff: 'Settings > Updates.' },
  cvdUrl: 'https://acme.example/cvd', declarationUrl: 'https://acme.example/doc', sbomLocation: 'https://acme.example/sbom',
  standards: 'EN 18031-1', notifiedBody: { name: '', number: '', certificate: '' },
});

describe('generateAnnexII', () => {
  it('lists every missing item and marks it in the text for an empty project', () => {
    const r = generateAnnexII(emptyDocData(), { ...facts, intendedPurpose: null, supportPeriodEnd: null, vulnerabilityContact: null, version: null }, 'en');
    expect(r.missing).toEqual(expect.arrayContaining(['manufacturer_name', 'manufacturer_address', 'manufacturer_email', 'contact_point', 'product_type', 'product_identification', 'purpose', 'environment', 'risks', 'support_type', 'support_end', 'commissioning', 'dataImpact', 'updates', 'decommissioning', 'autoUpdateOff']));
    expect(r.markdown).toContain('[TODO: Manufacturer name]');
    expect(r.markdown).not.toContain('## 6.'); // optional sections only appear when filled
    expect(r.markdown).not.toContain('## 9.');
  });

  it('produces a complete document in German and English without TODOs', () => {
    for (const lang of ['de', 'en'] as const) {
      const r = generateAnnexII(complete(), facts, lang);
      expect(r.missing, lang).toEqual([]);
      expect(r.markdown, lang).not.toContain('TODO');
      for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) expect(r.markdown, `${lang} section ${n}`).toContain(`## ${n}.`);
    }
    const de = generateAnnexII(complete(), facts, 'de');
    expect(de.markdown).toContain('31. Dezember 2031');
    expect(de.markdown).toContain('psirt@acme.example');
    expect(de.markdown).toContain('GW-2');
  });

  it('only includes the integrator instructions when given', () => {
    expect(generateAnnexII(complete(), facts, 'en').markdown).not.toContain('f) ');
    const d = complete(); d.instructions.integration = 'Follow the integration guide.';
    expect(generateAnnexII(d, facts, 'en').markdown).toContain('f) Information for integrators');
  });
});

describe('generateDeclaration', () => {
  it('fills the Annex V rows and reports missing manufacturer data', () => {
    const full = generateDeclaration(complete(), facts, 'en');
    expect(full.missing).toEqual([]);
    expect(full.rows[0][1]).toContain('Smart Gateway');
    expect(full.rows[4][1]).toBe('Not applicable.');
    expect(full.simplified.full).toContain('https://acme.example/doc');
    const empty = generateDeclaration(emptyDocData(), { ...facts, version: null }, 'de');
    expect(empty.missing).toEqual(expect.arrayContaining(['manufacturer_name', 'manufacturer_address', 'product_type', 'product_identification']));
  });

  it('names the notified body when one is set', () => {
    const d = complete(); d.notifiedBody = { name: 'TÜV Test', number: '0123', certificate: 'C-1' };
    expect(generateDeclaration(d, facts, 'en').rows[4][1]).toBe('Notified body: TÜV Test (No. 0123), certificate: C-1');
  });
});

describe('annexViiCoverage', () => {
  const state = (rows: ReturnType<typeof annexViiCoverage>, p: string) => rows.find((r) => r.point.point.replace(/[()]/g, '') === p)!;

  it('keeps the dossier defaults and upgrades points the team provided', () => {
    const base = annexViiCoverage(emptyDocData(), { ...facts, intendedPurpose: null, supportPeriodRationale: null }, false, false);
    expect(state(base, '1c').state).toBe('separate');
    expect(state(base, '3').state).toBe('dossier');
    expect(state(base, '1a').state).toBe('separate');

    const d = emptyDocData();
    d.annexVII['1c'] = { documentId: 'doc1', documentName: 'photos.pdf' };
    d.annexVII['2c'] = { note: 'Production runs under ISO 9001.' };
    const rows = annexViiCoverage(d, facts, true, true);
    expect(state(rows, '1c')).toMatchObject({ state: 'provided', detail: 'Attached: photos.pdf' });
    expect(state(rows, '2c').state).toBe('provided');
    expect(state(rows, '1a').state).toBe('provided'); // intended purpose in product data
    expect(state(rows, '4').state).toBe('provided');
    expect(state(rows, '1d').state).toBe('provided');
    expect(state(rows, '7').state).toBe('provided');
  });
});

describe('sanitizeDocData', () => {
  it('drops unknown keys, caps text and keeps only filled Annex VII entries', () => {
    const d = sanitizeDocData({ manufacturer: { name: ' ACME ', evil: 'x' }, extra: 1, annexVII: { '1c': { note: ' n ' }, '2c': {}, '9z': { note: 'x' } }, standards: 'x'.repeat(9000) });
    expect(d.manufacturer.name).toBe('ACME');
    expect('extra' in d).toBe(false);
    expect(Object.keys(d.annexVII)).toEqual(['1c']);
    expect(d.standards).toHaveLength(4000);
  });
});
