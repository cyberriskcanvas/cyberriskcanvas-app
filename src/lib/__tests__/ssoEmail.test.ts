import { describe, expect, it } from 'vitest';
import { verifiedSsoEmail } from '../ssoEmail';

describe('verifiedSsoEmail', () => {
  it('accepts a verified OIDC address', () => {
    expect(verifiedSsoEmail('oidc', { email: ' Alice@Example.com ', email_verified: true }))
      .toBe('alice@example.com');
  });

  it('rejects an OIDC address when verification is absent or false', () => {
    expect(verifiedSsoEmail('oidc', { email: 'admin@example.com' })).toBeNull();
    expect(verifiedSsoEmail('oidc', { email: 'admin@example.com', email_verified: false })).toBeNull();
  });

  it('uses Entra verified_primary_email instead of its mutable email claim', () => {
    expect(verifiedSsoEmail('microsoft-entra-id', {
      email: 'admin@example.com',
      verified_primary_email: 'member@example.com',
    })).toBe('member@example.com');
    expect(verifiedSsoEmail('microsoft-entra-id', { email: 'admin@example.com' })).toBeNull();
    expect(verifiedSsoEmail('microsoft-entra-id', { email: 'admin@example.com', email_verified: true })).toBeNull();
    expect(verifiedSsoEmail('microsoft-entra-id', {
      verified_primary_email: 'member@example.com', email_verified: false,
    })).toBeNull();
  });

  it('does not accept Entra-only claims from a generic OIDC provider', () => {
    expect(verifiedSsoEmail('oidc', { email: 'admin@example.com', verified_primary_email: 'admin@example.com' }))
      .toBeNull();
  });
});
