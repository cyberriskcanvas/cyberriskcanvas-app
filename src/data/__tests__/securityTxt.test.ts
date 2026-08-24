import { describe, it, expect } from 'vitest';
import {
  generateBsiSecurityTxt,
  generateBsiCvdPolicy,
  type SecurityTxtConfig,
} from '../securityTxt';

describe('BSI TR-03183-3 security.txt & CVD Policy Generator', () => {
  const config: SecurityTxtConfig = {
    domain: 'example.com',
    psirtEmail: 'psirt@example.com',
    csirtEmail: 'csirt@example.com',
    reportWebUri: 'https://example.com/security-contact',
    openPgpKeyUri: 'https://example.com/openpgp-key_psirt.asc',
    policyUri: 'https://example.com/security-policy.html',
    csafProviderUri: 'https://example.com/.well-known/csaf/provider-metadata.json',
    preferredLanguages: ['en', 'de'],
    expiresDays: 365,
  };

  it('should generate valid RFC 9116 security.txt with BSI TR-03183-3 ordering', () => {
    const text = generateBsiSecurityTxt(config);

    expect(text).toContain('Canonical: https://example.com/.well-known/security.txt');
    expect(text).toContain('Contact: mailto:psirt@example.com');
    expect(text).toContain('Contact: mailto:csirt@example.com');
    expect(text).toContain('Contact: https://example.com/security-contact');
    expect(text).toContain('Encryption: https://example.com/openpgp-key_psirt.asc');
    expect(text).toContain('Preferred-Languages: en, de');
    expect(text).toContain('Policy: https://example.com/security-policy.html');
    expect(text).toContain('CSAF: https://example.com/.well-known/csaf/provider-metadata.json');
    expect(text).toContain('Expires:');
  });

  it('should generate CVD Policy markdown with 5/10/90 days SLAs', () => {
    const policy = generateBsiCvdPolicy('Acme Corp', config);

    expect(policy).toContain('# Coordinated Vulnerability Disclosure (CVD) Policy - Acme Corp');
    expect(policy).toContain('5 Arbeitstagen');
    expect(policy).toContain('10 Arbeitstagen');
    expect(policy).toContain('90 Tage');
    expect(policy).toContain('Safe Harbor');
    expect(policy).toContain('psirt@example.com');
  });
});
