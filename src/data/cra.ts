/**
 * EU Cyber Resilience Act (CRA) - Regulation (EU) 2024/2847
 * Standardized Requirements Catalog according to BSI TR-03183-1 Annex B
 */

export type CRADomain =
  | 'cra_part1_properties'
  | 'cra_part2_vulnerability'
  | 'user_transparency'
  | 'technical_documentation'
  | 'scope_classification'
  // Legacy aliases for backward compatibility
  | 'scope'
  | 'product_context'
  | 'secure_development'
  | 'risk_assessment'
  | 'vulnerability_handling'
  | 'classification';

export type ComplianceStatus = 'compliant' | 'partial' | 'non-compliant' | 'not-applicable';

export interface CRARequirement {
  id: string;
  title: string;
  description: string;
  craRef: string;
  domain: CRADomain;
  critical?: boolean;
  bsiStandard?: string;
  legacyId?: string;
}

export const DOMAIN_LABELS: Record<CRADomain, string> = {
  cra_part1_properties: 'CRA Anhang I Teil I – Produkteigenschaften (Security by Design & Default)',
  cra_part2_vulnerability: 'CRA Anhang I Teil II – Schwachstellenbehandlung (Vulnerability Handling)',
  user_transparency: 'CRA Anhang II – Nutzerinformationen & Transparenz',
  technical_documentation: 'CRA Anhang VII – Technische Dokumentation',
  scope_classification: 'CRA Anwendungsbereich & Produktklassifizierung (Art. 2, 8, Anhang III/IV)',
  // Legacy mappings
  scope: 'Scope Check',
  product_context: 'Product & Usage Context',
  secure_development: 'Secure Development & Product Security',
  risk_assessment: 'Cybersecurity Risk Assessment',
  vulnerability_handling: 'Vulnerability Handling & Support',
  classification: 'Product Classification & Conformity Path',
};

export const CRA_REQUIREMENTS: CRARequirement[] = [
  // ══════════════════════════════════════════════════════════════════════════════
  // CRA ANHANG I TEIL I: PRODUKTEIGENSCHAFTEN (BSI TR-03183-1 Tabellen 8 & 9)
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'ER.0',
    title: 'Angemessenes Cybersicherheitsniveau & Risikoorientierung',
    description: 'Produkte mit digitalen Elementen müssen so konzipiert, entwickelt und hergestellt werden, dass sie auf Basis einer dokumentierten Risikobewertung ein angemessenes Cybersicherheitsniveau gewährleisten.',
    craRef: 'Annex I Part I (1), Art. 13(2)',
    domain: 'cra_part1_properties',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 §5 / BSI TR-03185 §1.3.2.1',
    legacyId: 'sd_01',
  },
  {
    id: 'ER.1',
    title: 'Keine bekannten ausnutzbaren Schwachstellen',
    description: 'Das Produkt muss ohne bekannte ausnutzbare Schwachstellen auf dem Markt bereitgestellt werden.',
    craRef: 'Annex I Part I (2)(a)',
    domain: 'cra_part1_properties',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 Table 9 / BSI TR-03185 PROD.TEST.A.1',
  },
  {
    id: 'ER.2',
    title: 'Sichere Standardkonfiguration (Security by Default)',
    description: 'Bereitstellung mit einer standardmäßig sicheren Konfiguration (keine unsicheren Standard-Passwörter, unnötige Dienste standardmäßig deaktiviert).',
    craRef: 'Annex I Part I (2)(b)',
    domain: 'cra_part1_properties',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 Table 9 / BSI TR-03185 PROD.DEV.A.5',
    legacyId: 'sd_05',
  },
  {
    id: 'ER.3a',
    title: 'Möglichkeit zum Zurücksetzen (Factory Reset)',
    description: 'Möglichkeit für den Nutzer, das Produkt mit digitalen Elementen sicher in seinen ursprünglichen Werkszustand zurückzusetzen.',
    craRef: 'Annex I Part I (2)(b)',
    domain: 'cra_part1_properties',
    bsiStandard: 'BSI TR-03183-1 Table 9 / BSI TR-03185 PROD.DEV.B.4',
    legacyId: 'sd_11',
  },
  {
    id: 'ER.4',
    title: 'Behebbarkeit von Schwachstellen über Sicherheitsupdates',
    description: 'Gewährleistung, dass Schwachstellen über verifizierte Sicherheitsupdates behoben werden können.',
    craRef: 'Annex I Part I (2)(c)',
    domain: 'cra_part1_properties',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 Table 9 / BSI TR-03185 PROD.FIX.A.1',
    legacyId: 'sd_07',
  },
  {
    id: 'ER.4a',
    title: 'Automatische Sicherheitsupdates (sofern anwendbar)',
    description: 'Installation von Sicherheitsupdates innerhalb eines angemessenen Zeitrahmens standardmäßig aktiviert.',
    craRef: 'Annex I Part I (2)(c)',
    domain: 'cra_part1_properties',
    bsiStandard: 'BSI TR-03183-1 Table 9 / BSI TR-03185 USER.PATCH.A.3',
  },
  {
    id: 'ER.4b',
    title: 'Opt-Out-Mechanismus für automatische Updates',
    description: 'Bereitstellung eines klaren und benutzerfreundlichen Opt-Out-Mechanismus für automatische Updates.',
    craRef: 'Annex I Part I (2)(c)',
    domain: 'cra_part1_properties',
    bsiStandard: 'BSI TR-03183-1 Table 9',
  },
  {
    id: 'ER.4c',
    title: 'Benachrichtigung über verfügbare Updates',
    description: 'Proaktive Benachrichtigung der Nutzer über neu verfügbare Sicherheitsupdates.',
    craRef: 'Annex I Part I (2)(c)',
    domain: 'cra_part1_properties',
    bsiStandard: 'BSI TR-03183-1 Table 9 / BSI TR-03185 PROD.FIX.A.9',
  },
  {
    id: 'ER.4d',
    title: 'Möglichkeit zur temporären Update-Verschiebung',
    description: 'Möglichkeit für den Nutzer, anstehende Updates vorübergehend zurückzustellen.',
    craRef: 'Annex I Part I (2)(c)',
    domain: 'cra_part1_properties',
    bsiStandard: 'BSI TR-03183-1 Table 9',
  },
  {
    id: 'ER.5',
    title: 'Schutz vor unbefugtem Zugriff',
    description: 'Schutz vor unbefugtem Zugriff durch angemessene Kontrollmechanismen.',
    craRef: 'Annex I Part I (2)(d)',
    domain: 'cra_part1_properties',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 Table 9 / BSI TR-03185 PROD.DEV.B.4',
    legacyId: 'pc_03',
  },
  {
    id: 'ER.5a',
    title: 'Authentifizierung & Identitäts-/Zugriffsmanagement',
    description: 'Implementierung robuster Kontrollmechanismen, einschließlich Authentifizierungs-, Identitäts- oder Zugriffsmanagementsysteme.',
    craRef: 'Annex I Part I (2)(d)',
    domain: 'cra_part1_properties',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 Table 9 / BSI TR-03185 PROD.DEV.B.4',
  },
  {
    id: 'ER.5b',
    title: 'Meldung / Protokollierung möglicher unbefugter Zugriffe',
    description: 'Erkennung und Meldung bzw. Protokollierung von unbefugten Zugriffsversuchen.',
    craRef: 'Annex I Part I (2)(d)',
    domain: 'cra_part1_properties',
    bsiStandard: 'BSI TR-03183-1 Table 9',
  },
  {
    id: 'ER.6',
    title: 'Schutz der Vertraulichkeit von Daten (Data at Rest & in Transit)',
    description: 'Schutz der Vertraulichkeit gespeicherter, übertragener oder verarbeiteter Daten (personenbezogen oder anderweitig) durch Verschlüsselung nach Stand der Technik.',
    craRef: 'Annex I Part I (2)(e)',
    domain: 'cra_part1_properties',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 Table 9 / BSI TR-03185 PROD.DEV.B.4',
    legacyId: 'sd_06',
  },
  {
    id: 'ER.7',
    title: 'Schutz der Integrität & Schutz vor Manipulation',
    description: 'Schutz der Integrität von Daten, Befehlen, Programmen und Konfigurationen gegen unbefugte Manipulation sowie Meldung von Datenbeschädigungen.',
    craRef: 'Annex I Part I (2)(f)',
    domain: 'cra_part1_properties',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 Table 9 / BSI TR-03185 PROD.DEV.B.4',
    legacyId: 'sd_09',
  },
  {
    id: 'ER.8',
    title: 'Datenminimierung (Privacy by Design)',
    description: 'Nur Verarbeitung von Daten, die für den bestimmungsgemäßen Zweck des Produkts angemessen, relevant und erforderlich sind.',
    craRef: 'Annex I Part I (2)(g)',
    domain: 'cra_part1_properties',
    bsiStandard: 'BSI TR-03183-1 Table 9 / BSI TR-03185 PROD.DEV.B.4',
  },
  {
    id: 'ER.9',
    title: 'Verfügbarkeit wesentlicher Funktionen',
    description: 'Schutz der Verfügbarkeit grundlegender Funktionen auch nach einem Sicherheitsvorfall.',
    craRef: 'Annex I Part I (2)(h)',
    domain: 'cra_part1_properties',
    bsiStandard: 'BSI TR-03183-1 Table 9',
    legacyId: 'sd_10',
  },
  {
    id: 'ER.9a',
    title: 'Resilienz gegen Denial-of-Service (DoS) Angriffe',
    description: 'Implementierung von Schutz- und Ausgleichsmaßnahmen gegen DoS-Angriffe und Ressourcenerschöpfung.',
    craRef: 'Annex I Part I (2)(h)',
    domain: 'cra_part1_properties',
    bsiStandard: 'BSI TR-03183-1 Table 9',
  },
  {
    id: 'ER.10',
    title: 'Minimierung negativer Auswirkungen auf Drittnetze',
    description: 'Minimierung nachteiliger Auswirkungen des Produkts oder verbundener Geräte auf die Verfügbarkeit von Diensten anderer Geräte oder Netzwerke.',
    craRef: 'Annex I Part I (2)(i)',
    domain: 'cra_part1_properties',
    bsiStandard: 'BSI TR-03183-1 Table 9',
  },
  {
    id: 'ER.11',
    title: 'Minimierung von Angriffsflächen (Attack Surface Reduction)',
    description: 'Konzeption, Entwicklung und Produktion zur Reduzierung von Angriffsflächen auf das notwendige Minimum.',
    craRef: 'Annex I Part I (2)(j)',
    domain: 'cra_part1_properties',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 Table 9 / BSI TR-03185 PROD.DEV.B.4',
    legacyId: 'sd_04',
  },
  {
    id: 'ER.11a',
    title: 'Absicherung externer Schnittstellen',
    description: 'Spezifische Absicherung und Härtung aller physischen und netzwerkbasierten externen Schnittstellen.',
    craRef: 'Annex I Part I (2)(j)',
    domain: 'cra_part1_properties',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 Table 9 / BSI TR-03185 PROD.DEV.B.3',
  },
  {
    id: 'ER.12',
    title: 'Eindämmung von Sicherheitsvorfällen (Exploitation Mitigation)',
    description: 'Einsatz moderner Exploit-Mitigation-Techniken (z. B. ASLR, DEP, Sandboxing, Memory Safety), um die Auswirkung eines erfolgreichen Angriffs zu begrenzen.',
    craRef: 'Annex I Part I (2)(k)',
    domain: 'cra_part1_properties',
    bsiStandard: 'BSI TR-03183-1 Table 9 / BSI TR-03185 PROD.DEV.D.2',
  },
  {
    id: 'ER.13',
    title: 'Sicherheitsrelevante Protokollierung & Überwachung',
    description: 'Erfassung und Überwachung relevanter interner Aktivitäten (z. B. Authentifizierungsereignisse, Konfigurationsänderungen).',
    craRef: 'Annex I Part I (2)(l)',
    domain: 'cra_part1_properties',
    bsiStandard: 'BSI TR-03183-1 Table 9 / BSI TR-03185 PROD.DEV.B.4',
    legacyId: 'sd_08',
  },
  {
    id: 'ER.13a',
    title: 'Überwachung von Daten- und Funktionszugriffen',
    description: 'Protokollierung des Zugriffs auf sensible Daten, Dienste oder sicherheitskritische Funktionen.',
    craRef: 'Annex I Part I (2)(l)',
    domain: 'cra_part1_properties',
    bsiStandard: 'BSI TR-03183-1 Table 9',
  },
  {
    id: 'ER.13b',
    title: 'Opt-Out-Möglichkeit für Telemetrie/Logging durch den Nutzer',
    description: 'Möglichkeit für den Nutzer, das Logging/Monitoring zu deaktivieren, sofern keine gesetzliche Schutzpflicht entgegensteht.',
    craRef: 'Annex I Part I (2)(l)',
    domain: 'cra_part1_properties',
    bsiStandard: 'BSI TR-03183-1 Table 9',
  },
  {
    id: 'ER.14',
    title: 'Dauerhafte und sichere Datenlöschung',
    description: 'Bereitstellung der Möglichkeit für Nutzer, alle Daten und Einstellungen dauerhaft und sicher zu entfernen.',
    craRef: 'Annex I Part I (2)(m)',
    domain: 'cra_part1_properties',
    bsiStandard: 'BSI TR-03183-1 Table 9 / BSI TR-03185 PROD.DECOM.1',
  },
  {
    id: 'ER.14a',
    title: 'Sichere Datenübertragung bei Gerätewechsel',
    description: 'Sichere Übertragung von Daten und Einstellungen auf andere Produkte/Systeme vor der Löschung.',
    craRef: 'Annex I Part I (2)(m)',
    domain: 'cra_part1_properties',
    bsiStandard: 'BSI TR-03183-1 Table 9',
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // CRA ANHANG I TEIL II: SCHWACHSTELLENBEHANDLUNG (BSI TR-03183-1 Tabelle 10)
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'VH.1',
    title: 'Identifikation & Dokumentation von Komponenten und Schwachstellen',
    description: 'Kontinuierliche Erfassung aller verwendeten internen und Drittkomponenten sowie Identifikation von Schwachstellen.',
    craRef: 'Annex I Part II (1)',
    domain: 'cra_part2_vulnerability',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 Table 10 / BSI TR-03185 PROD.FIX.A.4',
    legacyId: 'vh_03',
  },
  {
    id: 'VH.1a',
    title: 'Erstellung einer Software Bill of Materials (SBOM)',
    description: 'Erstellung und Pflege einer maschinenlesbaren SBOM (CycloneDX 1.6+ oder SPDX 3.0.1+), die mindestens die Top-Level- und Scope-of-Delivery-Abhängigkeiten abdeckt.',
    craRef: 'Annex I Part II (1), Annex VII §2(3)',
    domain: 'cra_part2_vulnerability',
    critical: true,
    bsiStandard: 'BSI TR-03183-2 / BSI TR-03185 PROD.DEV.L.2',
    legacyId: 'td_01',
  },
  {
    id: 'VH.2',
    title: 'Unverzügliche Behebung von Schwachstellen',
    description: 'Systematische Behebung und Risikominderung von Schwachstellen ohne schuldhaftes Zögern über den gesamten definierten Supportzeitraum.',
    craRef: 'Annex I Part II (2), Art. 13(8)',
    domain: 'cra_part2_vulnerability',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 Table 10 / BSI TR-03185 PROD.FIX.A.8',
    legacyId: 'vh_02',
  },
  {
    id: 'VH.2a',
    title: 'Getrennte Bereitstellung von Sicherheits- und Funktionsupdates',
    description: 'Sicherheitsupdates müssen, sofern technisch machbar, getrennt von funktionalen Feature-Updates bereitgestellt werden.',
    craRef: 'Annex I Part II (2)',
    domain: 'cra_part2_vulnerability',
    bsiStandard: 'BSI TR-03183-1 Table 10 / BSI TR-03185 PROD.FIX.A.1',
  },
  {
    id: 'VH.3',
    title: 'Regelmäßige Sicherheitstests & Überprüfungen',
    description: 'Durchführung wirksamer und regelmäßiger Sicherheitstests (SAST, DAST, Code-Reviews, Penetrationstests).',
    craRef: 'Annex I Part II (3)',
    domain: 'cra_part2_vulnerability',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 Table 10 / BSI TR-03185 PROD.TEST.A.15',
    legacyId: 'sd_03',
  },
  {
    id: 'VH.4',
    title: 'Öffentliche Offenlegung & Security Advisories (CSAF 2.0)',
    description: 'Sobald ein Patch bereitsteht: Veröffentlichung klarer Sicherheitshinweise mit Schwachstellenbeschreibung, CVSS-Score, Auswirkung und Abhilfemaßnahmen.',
    craRef: 'Annex I Part II (4)',
    domain: 'cra_part2_vulnerability',
    critical: true,
    bsiStandard: 'BSI TR-03183-3 §4.4.10 / BSI TR-03191 / ISO 20153',
    legacyId: 'vh_04',
  },
  {
    id: 'VH.5',
    title: 'Coordinated Vulnerability Disclosure (CVD) Policy',
    description: 'Veröffentlichung und Durchsetzung einer verbindlichen Leitlinie zur koordinierten Offenlegung von Schwachstellen mit festen Reaktionszeiten (5/10 Tage).',
    craRef: 'Annex I Part II (5)',
    domain: 'cra_part2_vulnerability',
    critical: true,
    bsiStandard: 'BSI TR-03183-3 §4.4 / ISO/IEC 29147',
    legacyId: 'vh_01',
  },
  {
    id: 'VH.6',
    title: 'Informationsaustausch zu Drittkomponenten-Schwachstellen',
    description: 'Maßnahmen zur Weitergabe von Schwachstelleninformationen und Patches an Upstream-/Downstream-Hersteller von Drittkomponenten in maschinenlesbarer Form.',
    craRef: 'Annex I Part II (6), Art. 13(5)',
    domain: 'cra_part2_vulnerability',
    bsiStandard: 'BSI TR-03183-1 §3.6 / BSI TR-03185 PROD.FIX.A.8',
  },
  {
    id: 'VH.6a',
    title: 'Öffentliche Kontaktstelle für Schwachstellenmeldungen (security.txt)',
    description: 'Bereitstellung einer klaren Kontaktadresse (PSIRT/CSIRT Mailbox, Webformular) gemäß RFC 9116 security.txt unter /.well-known/security.txt.',
    craRef: 'Annex I Part II (6)',
    domain: 'cra_part2_vulnerability',
    critical: true,
    bsiStandard: 'BSI TR-03183-3 §4.2 / RFC 9116 / RFC 9580',
    legacyId: 'vh_12',
  },
  {
    id: 'VH.7',
    title: 'Sichere Update-Distributionsmechanismen',
    description: 'Mechanismen zur kryptografisch gesicherten Verteilung von Updates (Signaturprüfung, Authentizitätsnachweis).',
    craRef: 'Annex I Part II (7)',
    domain: 'cra_part2_vulnerability',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 Table 10 / BSI TR-03185 PROD.REL.1',
  },
  {
    id: 'VH.7a',
    title: 'Automatische Bereitstellung von Sicherheitsupdates',
    description: 'Sicherheitsupdates müssen automatisiert und ohne Medienbruch verteilt werden können.',
    craRef: 'Annex I Part II (7)',
    domain: 'cra_part2_vulnerability',
    bsiStandard: 'BSI TR-03183-1 Table 10',
  },
  {
    id: 'VH.8',
    title: 'Unverzügliche Verbreitung von Updates',
    description: 'Verteilung verfügbarer Sicherheitskorrekturen ohne schuldhaftes Zögern an alle Nutzer.',
    craRef: 'Annex I Part II (8)',
    domain: 'cra_part2_vulnerability',
    bsiStandard: 'BSI TR-03183-1 Table 10',
  },
  {
    id: 'VH.8a',
    title: 'Kostenfreie Sicherheitsupdates & Advisory-Begleitung',
    description: 'Sicherheitsupdates müssen während des Supportzeitraums kostenfrei zur Verfügung gestellt werden (inkl. verständlicher Sicherheitshinweise).',
    craRef: 'Annex I Part II (8), Art. 13(8)',
    domain: 'cra_part2_vulnerability',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 Table 10',
    legacyId: 'vh_05',
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // CRA ANHANG II: NUTZERINFORMATIONEN & TRANSPARENZ
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'UT.1',
    title: 'Sicherheitsrelevante Installations- & Härtungsanleitung',
    description: 'Bereitstellung einer verständlichen Dokumentation zur sicheren Erstinbetriebnahme, Netzwerkintegration und Härtung (Annex II §1–3).',
    craRef: 'Annex II §1–3',
    domain: 'user_transparency',
    critical: true,
    bsiStandard: 'BSI TR-03185 PROD.DOC.B.1 / BSI TR-03183-1 §4.8',
    legacyId: 'ut_01',
  },
  {
    id: 'UT.2',
    title: 'Kommunikation bekannter Sicherheitsgrenzen & Einsatzbedingungen',
    description: 'Transparente Angabe von vorgesehener Betriebsumgebung, Netzwerkanforderungen und bekannten Sicherheitsbeschränkungen.',
    craRef: 'Annex II §4',
    domain: 'user_transparency',
    bsiStandard: 'BSI TR-03185 PROD.DOC.B.3',
    legacyId: 'ut_02',
  },
  {
    id: 'UT.3',
    title: 'Anleitung zur Schwachstellenmeldung für Endnutzer',
    description: 'Leicht zugängliche Hinweise für Nutzer und Sicherheitsforscher, wie Sicherheitslücken gemeldet werden können.',
    craRef: 'Annex II §5',
    domain: 'user_transparency',
    critical: true,
    bsiStandard: 'BSI TR-03183-3 §4.5 / RFC 9116',
    legacyId: 'ut_03',
  },
  {
    id: 'UT.4',
    title: 'Transparenter Supportzeitraum (Mindestens 5 Jahre)',
    description: 'Eindeutige Angabe des Supportzeitraums für Sicherheitsupdates (Monat und Jahr) vor dem Kauf und in den Unterlagen.',
    craRef: 'Art. 13(8), Annex II §6',
    domain: 'user_transparency',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 §3.6',
    legacyId: 'ut_04',
  },
  {
    id: 'UT.5',
    title: 'EU-Konformitätserklärung & CE-Kennzeichnung',
    description: 'Erstellung der EU-Konformitätserklärung nach Anhang V und Anbringung der CE-Kennzeichnung.',
    craRef: 'Art. 28, Art. 30, Annex V',
    domain: 'user_transparency',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 §3.1 / TR-03183-H',
    legacyId: 'ut_05',
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // CRA ANHANG VII: TECHNISCHE DOKUMENTATION & AUDIT-NACHWEISE
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'TD.1',
    title: 'Dokumentierte Bedrohungs- und Risikobewertung (Threat Model)',
    description: 'Systematisches Bedrohungsmodell mit Schutzobjekten (Assets), Vertrauensgrenzen, Datenflüssen und Risikobewertung nach ISO 31000 / BSI TR-03183-1.',
    craRef: 'Art. 13(2), Annex VII §2(1)',
    domain: 'technical_documentation',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 §5 / BSI TR-03185 PROD.DEV.C',
    legacyId: 'ra_02',
  },
  {
    id: 'TD.2',
    title: 'Architektur- & Schnittstellendokumentation',
    description: 'Vollständige Beschreibung der Hard- und Softwarekomponenten, Schnittstellen (Ports/Protokolle) und Kommunikationsbeziehungen.',
    craRef: 'Annex VII §2(2)',
    domain: 'technical_documentation',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 §4.8, §5.7.2 / BSI TR-03185 PROD.DEV.B.3',
    legacyId: 'td_04',
  },
  {
    id: 'TD.3',
    title: 'Prüfberichte & Sicherheitsnachweise (Test Records)',
    description: 'Nachweise über durchgeführte Verifikationen, SAST-, DAST-, Fuzzing- und Penetrationstest-Ergebnisse.',
    craRef: 'Annex VII §2(4)',
    domain: 'technical_documentation',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 §4.8 / BSI TR-03185 PROD.TEST.A.16',
    legacyId: 'td_03',
  },
  {
    id: 'TD.4',
    title: 'Rückverfolgbarkeit von Risiken zu Maßnahmen (Traceability)',
    description: 'Lückenloser Nachweis, welche Maßnahmen welches identifizierte Risiko mindern, inkl. Begründung für akzeptierte Restrisiken.',
    craRef: 'Annex VII §2(1), Art. 13(2)',
    domain: 'technical_documentation',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 §5.11 / TR-03183-H §5.7',
    legacyId: 'ra_05',
  },
  {
    id: 'TD.5',
    title: 'Prozess für wesentliche Änderungen (Substantial Modifications)',
    description: 'Verfahren zur erneuten Risikobewertung und Konformitätsprüfung bei substanziellen Produktänderungen nach Inverkehrbringen.',
    craRef: 'Art. 3(32), Art. 13(2), Art. 31',
    domain: 'technical_documentation',
    bsiStandard: 'BSI TR-03183-1 §3.4 / TR-03183-H §5.8',
    legacyId: 'ra_06',
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // ANWENDUNGSBEREICH & KLASSIFIZIERUNG (Art. 2, 8, Anhang III & IV)
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'SC.1',
    title: 'Netzwerkanbindung & Datenverbindung (Art. 2 Abs. 1)',
    description: 'Das Produkt verfügt über eine direkte oder indirekte logische oder physische Datenverbindung zu einem Gerät oder Netzwerk.',
    craRef: 'Art. 2(1), Art. 3(1)',
    domain: 'scope_classification',
    bsiStandard: 'BSI TR-03183-1 §3.2',
    legacyId: 'sc_02',
  },
  {
    id: 'SC.2',
    title: 'Keine verdrängende Sektorregulierung (MDR, Kfz, Luftfahrt)',
    description: 'Prüfung, ob das Produkt vollständig unter bestehende Ausnahmeregelungen (z.B. Medizinprodukte, Kfz nach VO 2019/2144) fällt.',
    craRef: 'Art. 2(2)–(4)',
    domain: 'scope_classification',
    bsiStandard: 'BSI TR-03183-1 §3.2.1',
    legacyId: 'sc_05',
  },
  {
    id: 'CL.1',
    title: 'Einstufung nach Anhang III (Wichtige Produkte Klasse I / II)',
    description: 'Prüfung, ob das Produkt unter die Kategorien für wichtige Produkte fällt (z.B. Identity Management, Router, Hypervisors, Firewalls).',
    craRef: 'Art. 8, Annex III',
    domain: 'scope_classification',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 §3.8 / TR-03183-H',
    legacyId: 'cl_01',
  },
  {
    id: 'CL.2',
    title: 'Einstufung nach Anhang IV (Kritische Produkte)',
    description: 'Prüfung, ob das Produkt als kritisches Produkt (z.B. Hardware Security Modules, Smart Meter Gateways) eingestuft ist (zwingend benannte Stelle / EUCC).',
    craRef: 'Art. 8(2), Annex IV',
    domain: 'scope_classification',
    critical: true,
    bsiStandard: 'BSI TR-03183-1 §3.8.4',
    legacyId: 'cl_02',
  },
];

// Helper to resolve requirement by ID or legacy ID
export function resolveCRARequirement(idOrLegacyId: string): CRARequirement | undefined {
  return CRA_REQUIREMENTS.find((r) => r.id === idOrLegacyId || r.legacyId === idOrLegacyId);
}

export function getRequirementsByDomain(): Record<CRADomain, CRARequirement[]> {
  const grouped = {} as Record<CRADomain, CRARequirement[]>;
  for (const req of CRA_REQUIREMENTS) {
    if (!grouped[req.domain]) grouped[req.domain] = [];
    grouped[req.domain].push(req);
  }
  return grouped;
}

export function calculateCRACompliance(
  mappings: { requirementId: string; status: ComplianceStatus }[],
  requirements: CRARequirement[] = CRA_REQUIREMENTS,
): { score: number; compliant: number; partial: number; nonCompliant: number } {
  const applicable = requirements.filter((r) => {
    const m = mappings.find((item) => item.requirementId === r.id || item.requirementId === r.legacyId);
    return m?.status !== 'not-applicable';
  });

  if (applicable.length === 0) return { score: 0, compliant: 0, partial: 0, nonCompliant: 0 };

  let compliant = 0;
  let partial = 0;
  let nonCompliant = 0;

  for (const req of applicable) {
    const m = mappings.find((item) => item.requirementId === req.id || item.requirementId === req.legacyId);
    const status = m?.status ?? 'non-compliant';
    if (status === 'compliant') compliant++;
    else if (status === 'partial') partial++;
    else nonCompliant++;
  }

  const score = Math.round(((compliant + partial * 0.5) / applicable.length) * 100);
  return { score, compliant, partial, nonCompliant };
}
