/** Return only an address whose ownership the identity provider attests. */
export function verifiedSsoEmail(
  provider: string,
  profile: Record<string, unknown> | null | undefined,
): string | null {
  if (!profile) return null;
  if (profile.email_verified === false) return null;

  // Entra's ordinary `email` claim is mutable and is not proof of ownership.
  const claimedEmail = provider === 'microsoft-entra-id' ? profile.verified_primary_email : profile.email;
  if (typeof claimedEmail !== 'string') return null;
  const email = claimedEmail.trim().toLowerCase();
  if (!email) return null;

  return provider === 'microsoft-entra-id' || profile.email_verified === true ? email : null;
}
