/**
 * BSI TR-03183-1 Environment & Likelihood Calculation
 * Derived from BSI TR-03183-1 Section 5.14.2 & Annex D (Tables 11, 12, 13)
 */

export type BSIInterfaceRestriction =
  | 'physical'
  | 'local'
  | 'dedicated_network'
  | 'known_network'
  | 'external_network';

export type BSIAccessRestriction =
  | 'restricted'
  | 'public_restricted'
  | 'movable'
  | 'non_restricted';

export type BSIUserCapability =
  | 'skilled'
  | 'instructed'
  | 'layman'
  | 'non_user_related';

export interface BSIEnvironmentOption<T extends string> {
  value: T;
  label: string;
  description: string;
  factor: number;
  basePercent: number;
}

export const BSI_INTERFACE_OPTIONS: BSIEnvironmentOption<BSIInterfaceRestriction>[] = [
  {
    value: 'physical',
    label: 'Physisch / Intern (Physical)',
    description: 'Ausschließlich interner Bus / direkte Hardware-Manipulation erforderlich.',
    factor: 0.38,
    basePercent: 0.10,
  },
  {
    value: 'local',
    label: 'Lokal (Nahfeld / IPC / NFC / USB)',
    description: 'Nahbereichsverbindung oder Interprozesskommunikation auf demselben System.',
    factor: 0.55,
    basePercent: 0.20,
  },
  {
    value: 'dedicated_network',
    label: 'Dediziertes geschlossenes Netz (Home-Bus, P2P)',
    description: 'Bekanntes und vertrauenswürdiges Netzwerk ohne direkte externe Internetverbindung.',
    factor: 0.70,
    basePercent: 0.40,
  },
  {
    value: 'known_network',
    label: 'Geteiltes lokales Netz (LAN / WLAN)',
    description: 'Mehrzweck-Heim- oder Firmennetz, geteilt mit anderen Geräten des Nutzers.',
    factor: 0.80,
    basePercent: 0.50,
  },
  {
    value: 'external_network',
    label: 'Externes / Öffentliches Netz (WAN / Internet / Cloud)',
    description: 'Direkte Anbindung an unkontrollierte externe Netzwerke oder Mobilfunk.',
    factor: 1.00,
    basePercent: 1.00,
  },
];

export const BSI_ACCESS_OPTIONS: BSIEnvironmentOption<BSIAccessRestriction>[] = [
  {
    value: 'restricted',
    label: 'Strikt beschränkt (Restricted)',
    description: 'Zugang nur für autorisierte, bekannte Personen in geschützten Räumen.',
    factor: 0.42,
    basePercent: 0.10,
  },
  {
    value: 'public_restricted',
    label: 'Öffentlich beaufsichtigt (Public Restricted)',
    description: 'Öffentlicher Raum, aber unter ständiger Aufsicht durch befugtes Personal.',
    factor: 0.58,
    basePercent: 0.20,
  },
  {
    value: 'movable',
    label: 'Mobil / Entwendbar (Movable)',
    description: 'Tragbares Gerät in teil-öffentlichen Räumen (erhöhtes Entwendungsrisiko).',
    factor: 0.81,
    basePercent: 0.50,
  },
  {
    value: 'non_restricted',
    label: 'Unbeschränkt (Non Restricted)',
    description: 'Keine Zugangsbeschränkung; für beliebige Angreifer physisch/logisch erreichbar.',
    factor: 1.00,
    basePercent: 1.00,
  },
];

export const BSI_USER_OPTIONS: BSIEnvironmentOption<BSIUserCapability>[] = [
  {
    value: 'skilled',
    label: 'Fachkundig (Skilled / IT-Profi)',
    description: 'Sicherheitsbewusste Administratoren und Entwickler, die Fehler aktiv vermeiden.',
    factor: 0.58,
    basePercent: 0.20,
  },
  {
    value: 'instructed',
    label: 'Eingewiesen (Instructed / Handwerker)',
    description: 'Nutzer, die nach Handbuch konfigurieren und Standardregeln befolgen.',
    factor: 0.81,
    basePercent: 0.50,
  },
  {
    value: 'layman',
    label: 'Laie (Layman / Endverbraucher)',
    description: 'Ungeschulter Konsument; hohe Wahrscheinlichkeit von Fehlbedienung/Social Engineering.',
    factor: 1.00,
    basePercent: 1.00,
  },
  {
    value: 'non_user_related',
    label: 'Nutzerunabhängig (Non-user-related)',
    description: 'Automatisierte Dienste oder Hintergrundprozesse ohne Nutzerinteraktion.',
    factor: 1.00,
    basePercent: 1.00,
  },
];

/**
 * Calculates environmental likelihood based on BSI TR-03183-1 Annex D.1 formula:
 * environment = round(1 + interface * access * user_capability * 4)
 * clamped to 1..5 scale.
 */
export function calculateBSILikelihood(
  interfaceRest: BSIInterfaceRestriction,
  accessRest: BSIAccessRestriction,
  userCap: BSIUserCapability,
): 1 | 2 | 3 | 4 | 5 {
  const iFactor = BSI_INTERFACE_OPTIONS.find((o) => o.value === interfaceRest)?.factor ?? 1.0;
  const aFactor = BSI_ACCESS_OPTIONS.find((o) => o.value === accessRest)?.factor ?? 1.0;
  const uFactor = BSI_USER_OPTIONS.find((o) => o.value === userCap)?.factor ?? 1.0;

  const rawProduct = iFactor * aFactor * uFactor;
  const scored = Math.round(1 + rawProduct * 4);
  const clamped = Math.min(5, Math.max(1, scored)) as 1 | 2 | 3 | 4 | 5;
  return clamped;
}

/**
 * BSI Acceptance Rule (Section 5.14.3 & Annex D.2):
 * - Level 1 (Very Low) & 2 (Low): Acceptable without mitigation
 * - Level 3 (Moderate), 4 (High), 5 (Very High): MUST be treated (cannot simply be accepted without formal justification)
 */
export function isBSIRiskAcceptableByDefault(score: number): boolean {
  return score <= 4; // score = likelihood * impact; Level 1-2 (low/negligible) is <= 4
}
