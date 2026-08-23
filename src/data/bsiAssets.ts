/**
 * BSI TR-03183-1 Standard Asset Catalog
 * Derived from BSI TR-03183-1 Section 5.14.1 (Tables 1, 2, 3)
 */

export type BSIAssetCategory = 'data' | 'functional' | 'security';

export interface BSIAssetDefinition {
  code: string;
  name: string;
  category: BSIAssetCategory;
  defaultC: number;
  defaultI: number;
  defaultA: number;
  rationale: string;
  isCustomizable?: boolean;
}

export const BSI_ASSET_CATALOG: BSIAssetDefinition[] = [
  // ── Table 1: Data Assets ───────────────────────────────────────────────────
  {
    code: 'PII.TechnicalNecessary',
    name: 'Technisch notwendige PII (IP-Adressen, Session-IDs, Protokolldaten)',
    category: 'data',
    defaultC: 2,
    defaultI: 1,
    defaultA: 1,
    rationale: 'Notwendig für Netzwerkkommunikation und Authentifizierung mit geringer Vertraulichkeitsauswirkung.',
  },
  {
    code: 'PII.Generic',
    name: 'Generische personenbezogene Daten (Namen, E-Mail, Adressen, Fotos)',
    category: 'data',
    defaultC: 3,
    defaultI: 2,
    defaultA: 3,
    rationale: 'Moderate Auswirkung bei Vertraulichkeitsverlust oder Datenleck.',
  },
  {
    code: 'PII.Important',
    name: 'Sensible / Kritische personenbezogene Daten (Finanz-, Gesundheits-, Biometriedaten)',
    category: 'data',
    defaultC: 4,
    defaultI: 3,
    defaultA: 3,
    rationale: 'Hohe Auswirkung auf Betroffene bei Offenlegung (Art. 9 DSGVO / besondere Kategorien).',
  },
  {
    code: 'BusinessData.Generic',
    name: 'Geschäftsdaten (Metriken, Controlling-Daten, interne Berichte)',
    category: 'data',
    defaultC: 3,
    defaultI: 2,
    defaultA: 3,
    rationale: 'Moderate Auswirkung bei Offenlegung oder Korruption betrieblicher Daten.',
  },
  {
    code: 'BusinessData.Important',
    name: 'Wichtige Geschäftsdaten / IP (Geschäftsgeheimnisse, Source Code, Konstruktionspläne)',
    category: 'data',
    defaultC: 4,
    defaultI: 4,
    defaultA: 3,
    rationale: 'Sehr hohe finanzielle oder betriebliche Auswirkung bei Diebstahl oder Manipulation.',
  },
  {
    code: 'Other.Telemetric',
    name: 'Telemetriedaten (ohne PII oder Geschäftsbezug)',
    category: 'data',
    defaultC: 1,
    defaultI: 1,
    defaultA: 1,
    rationale: 'Reine Zustandsmetriken ohne unmittelbare Schutzbedarfsrelevanz.',
  },
  {
    code: 'Other.Configuration',
    name: 'Allgemeine Konfigurationsdaten (nicht-vertraulich)',
    category: 'data',
    defaultC: 1,
    defaultI: 3,
    defaultA: 1,
    rationale: 'Fehlkonfiguration oder Manipulation stört Funktion des PwDE (Integritätsfokus).',
  },

  // ── Table 2: Functional Assets ─────────────────────────────────────────────
  {
    code: 'Functions.Essential',
    name: 'Wesentliche Kernfunktion des Produkts',
    category: 'functional',
    defaultC: 1,
    defaultI: 3,
    defaultA: 3,
    rationale: 'Funktion für bestimmungsgemäße Nutzung unerlässlich; Ausfall hat moderate bis hohe Auswirkung.',
  },
  {
    code: 'Functions.NonEssential',
    name: 'Nicht-essenzielle Komfortfunktion',
    category: 'functional',
    defaultC: 1,
    defaultI: 1,
    defaultA: 1,
    rationale: 'Ausfall beeinträchtigt das Produkt nicht wesentlich.',
  },
  {
    code: 'Functions.Safety',
    name: 'Sicherheitskritische Funktion (Funktionale Sicherheit / Safety)',
    category: 'functional',
    defaultC: 1,
    defaultI: 5,
    defaultA: 5,
    rationale: 'Ausfall oder Manipulation gefährdet Leben, Gesundheit oder physische Unversehrtheit.',
  },
  {
    code: 'Functions.CommunicationNetwork',
    name: 'Netzwerkkommunikation & Routing (Mehrere Peers / angrenzende Netze)',
    category: 'functional',
    defaultC: 1,
    defaultI: 3,
    defaultA: 2,
    rationale: 'Manipulation kann für Angriffe auf angrenzende Netze missbraucht werden.',
  },
  {
    code: 'Functions.CommunicationLocal',
    name: 'Lokale Nahfeldkommunikation (P2P, NFC, lokaler Bus)',
    category: 'functional',
    defaultC: 1,
    defaultI: 2,
    defaultA: 1,
    rationale: 'Verbindung zu einzelnen lokalen Peers mit begrenztem Angriffsvektor.',
  },

  // ── Table 3: Security Assets ───────────────────────────────────────────────
  {
    code: 'Security.Secrets',
    name: 'Sicherheits-Geheimnisse (Private Keys, Passwörter, API-Tokens, Session-Keys)',
    category: 'security',
    defaultC: 4,
    defaultI: 4,
    defaultA: 3,
    rationale: 'Verlust bricht Vertraulichkeit/Integrität aller geschützten Ziel-Assets (C\'/I\'/A\').',
  },
  {
    code: 'Security.PublicConfiguration',
    name: 'Öffentliche Sicherheitskonfiguration (Zertifikate, Cipher Suites, Trust-Stores)',
    category: 'security',
    defaultC: 1,
    defaultI: 4,
    defaultA: 3,
    rationale: 'Öffentlich bekannt, muss aber vor unbefugter Manipulation geschützt werden.',
  },
  {
    code: 'Security.Logs',
    name: 'Sicherheitsrelevante Audit-Logs & Ereignisprotokolle',
    category: 'security',
    defaultC: 3,
    defaultI: 4,
    defaultA: 2,
    rationale: 'Schutz vor Manipulation zur Verschleierung von Vorfällen; Aufbewahrungspflicht.',
  },
  {
    code: 'Security.Mechanism',
    name: 'Sicherheitsmechanismen (Verschlüsselungsengine, Access-Control-Subsystem)',
    category: 'security',
    defaultC: 1,
    defaultI: 4,
    defaultA: 3,
    rationale: 'Kernkomponente zur Durchsetzung von Sicherheitsrichtlinien.',
  },
];

export function findBsiAsset(code: string): BSIAssetDefinition | undefined {
  return BSI_ASSET_CATALOG.find((a) => a.code === code);
}

export function calculateEffectiveImpact(
  base: { c: number; i: number; a: number },
  amplifier = 1.0,
): { c: number; i: number; a: number; maxImpact: number } {
  const c = Math.min(5, Math.max(1, Math.round(base.c * amplifier)));
  const i = Math.min(5, Math.max(1, Math.round(base.i * amplifier)));
  const a = Math.min(5, Math.max(1, Math.round(base.a * amplifier)));
  return { c, i, a, maxImpact: Math.max(c, i, a) };
}
