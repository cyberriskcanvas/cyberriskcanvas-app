import { describe, it, expect } from 'vitest';
import {
  generateBsiCycloneDX16,
  generateBsiSpdx30,
  type BsiSbomComponentInput,
  type BsiSbomExportOptions,
} from '../bsiSbom';

describe('BSI TR-03183-2 SBOM Generator', () => {
  const mockComponents: BsiSbomComponentInput[] = [
    {
      name: 'openssl',
      version: '3.0.8',
      purl: 'pkg:generic/openssl@3.0.8',
      filename: 'libcrypto.so.3',
      isExecutable: true,
      isArchive: false,
      isStructured: true,
      concludedLicense: 'Apache-2.0',
      declaredLicense: 'Apache-2.0',
      deployableHashSha512: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      securityTxtUrl: 'https://openssl.org/.well-known/security.txt',
      creator: 'The OpenSSL Project',
    },
    {
      name: 'custom-firmware',
      version: '1.0.0',
      filename: 'firmware.bin',
      isExecutable: true,
      isArchive: true,
      isStructured: false,
      concludedLicense: 'Proprietary',
    },
  ];

  const options: BsiSbomExportOptions = {
    projectName: 'Smart Camera SNC-X5',
    projectVersion: '1.2.0',
    projectDescription: 'Connected security camera',
    authorEmail: 'security@example.com',
  };

  it('should generate valid BSI CycloneDX 1.6 SBOM without vulnerability blocks', () => {
    const sbom = generateBsiCycloneDX16(mockComponents, options);

    expect(sbom.bomFormat).toBe('CycloneDX');
    expect(sbom.specVersion).toBe('1.6');
    expect(sbom.version).toBe(1);
    expect(sbom.serialNumber).toMatch(/^urn:uuid:/);

    // CRITICAL: BSI TR-03183-2 Section 3.1 & 8.1.14 forbids vulnerability info in SBOM
    expect(sbom.vulnerabilities).toBeUndefined();

    // Check components and BSI taxonomy properties
    const comps = (sbom.components as Array<Record<string, unknown>>);
    expect(comps.length).toBe(2);

    const openssl = comps[0];
    expect(openssl.name).toBe('openssl');
    expect(openssl.version).toBe('3.0.8');

    const props = openssl.properties as Array<{ name: string; value: string }>;
    expect(props.some((p) => p.name === 'bsi:component:filename' && p.value === 'libcrypto.so.3')).toBe(true);
    expect(props.some((p) => p.name === 'bsi:component:executable' && p.value === 'executable')).toBe(true);
    expect(props.some((p) => p.name === 'bsi:component:archive' && p.value === 'no archive')).toBe(true);
    expect(props.some((p) => p.name === 'bsi:component:structured' && p.value === 'structured')).toBe(true);

    // Check compositions (dependency completeness)
    expect(sbom.compositions).toBeDefined();
  });

  it('should generate valid BSI SPDX 3.0.1 SBOM', () => {
    const spdx = generateBsiSpdx30(mockComponents, options);

    expect(spdx.type).toBe('SpdxDocument');
    expect(spdx.elements).toBeDefined();

    const elements = spdx.elements as Array<Record<string, unknown>>;
    const rootDoc = elements.find((e) => e.type === 'SpdxDocument');
    expect(rootDoc).toBeDefined();
    expect(rootDoc?.specVersion).toBe('3.0.1');

    const opensslPkg = elements.find((e) => e.type === 'software_Package' && e.name === 'openssl');
    expect(opensslPkg).toBeDefined();
    expect(opensslPkg?.software_packageVersion).toBe('3.0.8');
    expect(opensslPkg?.software_additionalPurpose).toContain('executable');
    expect(opensslPkg?.software_additionalPurpose).toContain('container');
  });
});
