/**
 * Badge color classes for OSV/CVSS severity levels, shared across the
 * Security Overview, per-project vulnerability table, and SBOM tab - each
 * picks the variant matching its surrounding (light or dark-themed) UI.
 */

export type SeverityStyleVariant = 'light' | 'dark';

const LIGHT: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LOW: 'bg-blue-100 text-blue-700 border-blue-200',
  NONE: 'bg-gray-100 text-gray-600 border-gray-200',
};

const DARK: Record<string, string> = {
  CRITICAL: 'bg-red-900/70 text-red-300 border-red-800',
  HIGH: 'bg-orange-900/70 text-orange-300 border-orange-800',
  MEDIUM: 'bg-yellow-900/70 text-yellow-300 border-yellow-800',
  LOW: 'bg-blue-900/70 text-blue-300 border-blue-800',
  NONE: 'bg-gray-800 text-gray-500 border-gray-700',
};

/** Returns the badge color classes for a severity level (falls back to NONE for unknown/missing). */
export function severityBadgeClass(severity: string | null | undefined, variant: SeverityStyleVariant = 'light'): string {
  const map = variant === 'dark' ? DARK : LIGHT;
  return map[severity ?? 'NONE'] ?? map.NONE;
}
