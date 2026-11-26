import { describe, expect, it } from 'vitest';
import { componentKey, detectFormat, normaliseComponents } from '../sbomParse';

describe('detectFormat', () => {
  it('detects CycloneDX, SPDX 2 and SPDX 3', () => {
    expect(detectFormat({ bomFormat: 'CycloneDX' })).toBe('CycloneDX');
    expect(detectFormat({ spdxVersion: 'SPDX-2.3', packages: [] })).toBe('SPDX');
    expect(detectFormat({ '@context': 'https://spdx.org/rdf/3.0.1/spdx-context.jsonld', '@graph': [] })).toBe('SPDX');
    expect(detectFormat({})).toBeNull();
  });
});

describe('normaliseComponents', () => {
  it('reads SPDX 3.0.1 software_Package entries', () => {
    const bom = {
      '@context': 'https://spdx.org/rdf/3.0.1/spdx-context.jsonld',
      '@graph': [
        { type: 'SpdxDocument', name: 'doc' },
        { type: 'software_Package', name: 'openssl', software_packageVersion: '3.0.1', software_packageUrl: 'pkg:generic/openssl@3.0.1' },
        { type: 'software_Package', software_packageVersion: '1' },
      ],
    };
    expect(normaliseComponents(bom)).toEqual([{ name: 'openssl', version: '3.0.1', purl: 'pkg:generic/openssl@3.0.1' }]);
  });

  it('reads SPDX 2 packages with purl and CycloneDX components', () => {
    expect(normaliseComponents({ spdxVersion: 'SPDX-2.3', packages: [{ name: 'a', versionInfo: '1', externalRefs: [{ referenceType: 'purl', referenceLocator: 'pkg:npm/a@1' }] }] }))
      .toEqual([{ name: 'a', version: '1', purl: 'pkg:npm/a@1' }]);
    expect(normaliseComponents({ bomFormat: 'CycloneDX', components: [{ name: 'b' }, { name: ' ' }] })).toEqual([{ name: 'b' }]);
  });
});

describe('componentKey', () => {
  it('is the purl, else name@version', () => {
    expect(componentKey({ name: 'a', version: '1', purl: 'pkg:npm/a@1' })).toBe('pkg:npm/a@1');
    expect(componentKey({ name: 'busybox', version: '1.36.1' })).toBe('busybox@1.36.1');
    expect(componentKey({ name: 'busybox', purl: null })).toBe('busybox@');
  });
});

describe('inventory data', () => {
  it('reads CycloneDX licenses, hashes, supplier, CPE and nested components, and marks direct dependencies', () => {
    const comps = normaliseComponents({
      bomFormat: 'CycloneDX',
      metadata: { component: { 'bom-ref': 'app', name: 'app' } },
      dependencies: [{ ref: 'app', dependsOn: ['a'] }, { ref: 'a', dependsOn: ['b'] }],
      components: [
        { 'bom-ref': 'a', name: 'a', version: '1', purl: 'pkg:npm/a@1', supplier: { name: 'ACME' }, cpe: 'cpe:2.3:a:acme:a:1', licenses: [{ license: { id: 'MIT' } }], hashes: [{ alg: 'SHA-512', content: 'ff' }], components: [{ 'bom-ref': 'b', name: 'b', version: '2', licenses: [{ expression: 'MIT OR Apache-2.0' }] }] },
      ],
    });
    expect(comps).toEqual([
      { name: 'a', version: '1', purl: 'pkg:npm/a@1', supplier: 'ACME', cpe: 'cpe:2.3:a:acme:a:1', licenses: ['MIT'], hashes: [{ alg: 'SHA-512', content: 'ff' }], direct: true },
      { name: 'b', version: '2', licenses: ['MIT OR Apache-2.0'], direct: false },
    ]);
  });

  it('leaves direct unknown without a dependency graph', () => {
    expect(normaliseComponents({ bomFormat: 'CycloneDX', components: [{ name: 'a' }] })[0].direct).toBeUndefined();
  });

  it('reads SPDX 2 licenses and DEPENDS_ON, ignoring NOASSERTION', () => {
    const comps = normaliseComponents({
      spdxVersion: 'SPDX-2.3',
      relationships: [{ spdxElementId: 'SPDXRef-DOCUMENT', relationshipType: 'DESCRIBES', relatedSpdxElement: 'SPDXRef-app' }, { spdxElementId: 'SPDXRef-app', relationshipType: 'DEPENDS_ON', relatedSpdxElement: 'SPDXRef-a' }],
      packages: [
        { SPDXID: 'SPDXRef-a', name: 'a', versionInfo: '1', licenseConcluded: 'NOASSERTION', licenseDeclared: 'GPL-3.0-only', supplier: 'Organization: ACME' },
        { SPDXID: 'SPDXRef-b', name: 'b', versionInfo: '1' },
      ],
    });
    expect(comps).toEqual([
      { name: 'a', version: '1', licenses: ['GPL-3.0-only'], supplier: 'ACME', direct: true },
      { name: 'b', version: '1', direct: false },
    ]);
  });

  it('reads the plain SPDX 3 form the BSI export writes, without the product itself', () => {
    const comps = normaliseComponents({
      '@context': 'https://spdx.org/rdf/3.0.1/spdx-context.jsonld',
      elements: [
        { type: 'SpdxDocument', rootElement: 'urn:root' },
        { type: 'software_Package', spdxId: 'urn:root', name: 'product' },
        { type: 'software_Package', spdxId: 'urn:a', name: 'a', software_packageVersion: '1', hasConcludedLicense: 'MIT', externalIdentifiers: [{ externalIdentifierType: 'packageURL', identifier: 'pkg:npm/a@1' }], verifiedUsing: [{ algorithm: 'sha512', hashValue: 'ff' }] },
        { type: 'Relationship', from: 'urn:root', relationshipType: 'dependsOn', to: ['urn:a'] },
      ],
    });
    expect(comps).toEqual([{ name: 'a', version: '1', purl: 'pkg:npm/a@1', licenses: ['MIT'], hashes: [{ alg: 'sha512', content: 'ff' }], direct: true }]);
  });
});
