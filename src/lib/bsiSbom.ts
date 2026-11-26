/**
 * BSI TR-03183-2 SBOM Generator
 * Technical Guideline BSI TR-03183: Cyber Resilience Requirements for Manufacturers and Products
 * Part 2: Software Bill of Materials (SBOM) - Version 2.1.0
 *
 * Implements CycloneDX v1.6 and SPDX v3.0.1 mapping according to BSI Taxonomy.
 * NOTE: An SBOM conformant to BSI TR-03183-2 MUST NOT contain vulnerability information (Section 3.1 & 8.1.14).
 */

export interface BsiSbomComponentInput {
  name: string;
  version?: string | null;
  purl?: string | null;
  type?: string | null;
  filename?: string | null;
  isExecutable?: boolean | null;
  isArchive?: boolean | null;
  isStructured?: boolean | null;
  concludedLicense?: string | null;
  declaredLicense?: string | null;
  effectiveLicense?: string | null;
  deployableHashSha512?: string | null;
  sourceCodeUri?: string | null;
  securityTxtUrl?: string | null;
  creator?: string | null;
}

export interface BsiSbomExportOptions {
  projectName: string;
  projectVersion?: string;
  projectDescription?: string;
  authorEmail?: string;
  authorUrl?: string;
  serialNumber?: string;
  scopeOfDelivery?: 'complete' | 'incomplete' | 'unknown';
}

/**
 * Builds a CycloneDX v1.6 JSON compliant with BSI TR-03183-2
 */
export function generateBsiCycloneDX16(
  components: BsiSbomComponentInput[],
  options: BsiSbomExportOptions,
): Record<string, unknown> {
  const serialUuid = options.serialNumber ?? `urn:uuid:${crypto.randomUUID()}`;
  const timestamp = new Date().toISOString();
  const creatorContact = options.authorEmail
    ? [{ email: options.authorEmail }]
    : options.authorUrl
      ? [{ url: options.authorUrl }]
      : [{ name: 'CyberRisk Canvas' }];

  const cdxComponents = components.map((c) => {
    const properties: Array<{ name: string; value: string }> = [];

    // BSI Property Taxonomy (TR-03183-2 Section 8.2 & https://github.com/BSI-Bund/tr-03183-cyclonedx-property-taxonomy)
    if (c.filename) {
      properties.push({ name: 'bsi:component:filename', value: c.filename });
    }
    if (c.isExecutable !== undefined && c.isExecutable !== null) {
      properties.push({
        name: 'bsi:component:executable',
        value: c.isExecutable ? 'executable' : 'non-executable',
      });
    }
    if (c.isArchive !== undefined && c.isArchive !== null) {
      properties.push({
        name: 'bsi:component:archive',
        value: c.isArchive ? 'archive' : 'no archive',
      });
    }
    if (c.isStructured !== undefined && c.isStructured !== null) {
      properties.push({
        name: 'bsi:component:structured',
        value: c.isStructured ? 'structured' : 'unstructured',
      });
    }
    if (c.effectiveLicense) {
      properties.push({
        name: 'bsi:component:effectiveLicense',
        value: c.effectiveLicense,
      });
    }

    const licenses: Array<{ expression?: string; license?: { id?: string; name?: string }; acknowledgement?: string }> = [];
    if (c.concludedLicense) {
      licenses.push({
        expression: c.concludedLicense,
        acknowledgement: 'concluded',
      });
    }
    if (c.declaredLicense && c.declaredLicense !== c.concludedLicense) {
      licenses.push({
        expression: c.declaredLicense,
        acknowledgement: 'declared',
      });
    }

    const externalReferences: Array<{ type: string; url: string; hashes?: Array<{ alg: string; content: string }> }> = [];
    if (c.deployableHashSha512) {
      externalReferences.push({
        type: 'distribution',
        url: c.purl ?? `urn:component:${encodeURIComponent(c.name)}`,
        hashes: [{ alg: 'SHA-512', content: c.deployableHashSha512 }],
      });
    }
    if (c.sourceCodeUri) {
      externalReferences.push({
        type: 'source-distribution',
        url: c.sourceCodeUri,
      });
    }
    if (c.securityTxtUrl) {
      externalReferences.push({
        type: 'rfc-9116',
        url: c.securityTxtUrl,
      });
    }

    return {
      type: c.type ?? 'library',
      name: c.name,
      version: c.version ?? undefined,
      purl: c.purl ?? undefined,
      ...(c.creator ? { manufacturer: { name: c.creator } } : {}),
      ...(properties.length > 0 ? { properties } : {}),
      ...(licenses.length > 0 ? { licenses } : {}),
      ...(externalReferences.length > 0 ? { externalReferences } : {}),
    };
  });

  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    serialNumber: serialUuid,
    version: 1,
    metadata: {
      timestamp,
      tools: {
        components: [
          {
            type: 'application',
            name: 'CyberRisk Canvas',
            version: '1.2.0',
            description: 'BSI TR-03183 & CRA Compliance Platform',
          },
        ],
      },
      authors: creatorContact,
      component: {
        type: 'application',
        name: options.projectName,
        version: options.projectVersion ?? '1.0.0',
        description: options.projectDescription ?? undefined,
      },
    },
    components: cdxComponents,
    // Compositions indicate dependency completeness (TR-03183-2 Section 5.2.2 & 8.2)
    compositions: [
      {
        aggregate: options.scopeOfDelivery ?? 'complete',
        assemblies: cdxComponents.map((c) => c.name),
        dependencies: cdxComponents.map((c) => c.name),
      },
    ],
  };
}

/**
 * Builds an SPDX v3.0.1 JSON compliant with BSI TR-03183-2
 */
export function generateBsiSpdx30(
  components: BsiSbomComponentInput[],
  options: BsiSbomExportOptions,
): Record<string, unknown> {
  const rootDocId = `urn:spdx:doc-${crypto.randomUUID()}`;
  const primaryPkgId = `urn:spdx:pkg-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  const elements: Array<Record<string, unknown>> = [
    {
      type: 'SpdxDocument',
      spdxId: rootDocId,
      name: `BSI TR-03183-2 SBOM - ${options.projectName}`,
      specVersion: '3.0.1',
      creationInfo: {
        type: 'CreationInfo',
        created: now,
        createdBy: [options.authorEmail ? `mailto:${options.authorEmail}` : 'https://cyberriskcanvas.com'],
      },
      rootElement: primaryPkgId,
    },
    {
      type: 'software_Package',
      spdxId: primaryPkgId,
      name: options.projectName,
      software_packageVersion: options.projectVersion ?? '1.0.0',
      description: options.projectDescription ?? undefined,
    },
  ];

  components.forEach((c) => {
    const pkgId = `urn:spdx:pkg-${crypto.randomUUID()}`;
    const additionalPurposes: string[] = [];
    if (c.isExecutable) additionalPurposes.push('executable');
    if (c.isArchive) additionalPurposes.push('archive');
    if (c.isStructured) additionalPurposes.push('container');

    const pkg: Record<string, unknown> = {
      type: 'software_Package',
      spdxId: pkgId,
      name: c.name,
      software_packageVersion: c.version ?? undefined,
      ...(additionalPurposes.length > 0 ? { software_additionalPurpose: additionalPurposes } : {}),
      ...(c.concludedLicense ? { hasConcludedLicense: c.concludedLicense } : {}),
      ...(c.declaredLicense ? { hasDeclaredLicense: c.declaredLicense } : {}),
    };

    if (c.purl) {
      pkg.externalIdentifiers = [
        {
          type: 'ExternalIdentifier',
          externalIdentifierType: 'packageURL',
          identifier: c.purl,
        },
      ];
    }

    if (c.deployableHashSha512) {
      pkg.verifiedUsing = [
        {
          type: 'Hash',
          algorithm: 'sha512',
          hashValue: c.deployableHashSha512,
        },
      ];
    }

    elements.push(pkg);

    // Dependency relationship from primary package to component
    elements.push({
      type: 'Relationship',
      spdxId: `urn:spdx:rel-${crypto.randomUUID()}`,
      from: primaryPkgId,
      relationshipType: 'dependsOn',
      to: [pkgId],
      completeness: options.scopeOfDelivery ?? 'complete',
    });
  });

  return {
    '@context': 'https://spdx.org/rdf/3.0.1/spdx-context.jsonld',
    type: 'SpdxDocument',
    spdxId: rootDocId,
    elements,
  };
}
