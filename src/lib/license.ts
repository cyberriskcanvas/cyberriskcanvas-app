/**
 * Online license validation via the cyberklartext-api.
 *
 * The license key is stored in the `licenses` DB table and managed via
 * the admin UI (/admin → License). Validation results are cached
 * in-process for LICENSE_CACHE_DAYS (default: 1 day).
 */

const VALIDATE_URL = 'https://api.cyberklartext.de/api/v1/canvas-licenses/validate';

export interface LicenseInfo {
  valid: boolean;
  licensee: string | null;
  expiresAt: string | null;
}

const CACHE_TTL_MS =
  (Number(process.env.LICENSE_CACHE_DAYS ?? '1') || 1) * 24 * 60 * 60 * 1000;

let _cache: { info: LicenseInfo; cachedAt: number } | null = null;
let _changedAt = 0;

export function invalidateLicenseCache(): void {
  _cache = null;
  _changedAt = Date.now();
}

/**
 * Timestamp of the last license change (key saved/removed). Used by the
 * NextAuth jwt callback to force an immediate tier refresh on active
 * sessions instead of waiting for the regular TTL-based re-check.
 */
export function getLicenseChangedAt(): number {
  return _changedAt;
}

export async function validateKey(key: string): Promise<LicenseInfo> {
  if (!key) return { valid: false, licensee: null, expiresAt: null };
  try {
    const res = await fetch(VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json() as { valid: boolean; licensee?: string; expiresAt?: string | null };
      return { valid: data.valid, licensee: data.licensee ?? null, expiresAt: data.expiresAt ?? null };
    }
    console.warn(`[license] Validation returned HTTP ${res.status}`);
  } catch (err) {
    console.warn('[license] Validation request failed:', (err as Error).message);
  }
  return { valid: false, licensee: null, expiresAt: null };
}

export async function getLicenseInfo(): Promise<LicenseInfo> {
  if (_cache && Date.now() - _cache.cachedAt < CACHE_TTL_MS) {
    return _cache.info;
  }

  const { prisma } = await import('@/lib/db');
  const license = await prisma.license.findFirst();
  const info = license ? await validateKey(license.key) : { valid: false, licensee: null, expiresAt: null };

  _cache = { info, cachedAt: Date.now() };
  return info;
}

export async function hasValidLicense(): Promise<boolean> {
  return (await getLicenseInfo()).valid;
}
