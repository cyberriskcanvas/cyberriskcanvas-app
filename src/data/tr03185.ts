/**
 * BSI TR-03185: Secure Software Lifecycle (Version 1.1.1, 2026-07-02)
 *
 * Part 1: Secure Software Lifecycle for proprietary software (Producer & User perspective)
 * Part 2: Secure Software Lifecycle for Open Source Software (OSS / FLOSS)
 * Section 0.1: Utilising Artificial Intelligence
 */

export type TR03185Category =
  | 'prod_pm'
  | 'prod_doc'
  | 'prod_dev'
  | 'prod_test'
  | 'prod_rel'
  | 'prod_fix'
  | 'prod_decom'
  | 'oss_governance'
  | 'oss_legal'
  | 'oss_quality'
  | 'oss_build_release'
  | 'oss_vulnerability'
  | 'oss_decommissioning'
  | 'ai_security';

export interface TR03185Requirement {
  id: string;
  category: TR03185Category;
  title: string;
  description: string;
  level: 'MUST' | 'SHOULD' | 'MAY';
  target: 'producer' | 'user' | 'oss' | 'ai';
  craRef?: string;
  source: string;
}

export const TR03185_CATEGORY_LABELS: Record<TR03185Category, string> = {
  prod_pm: 'Projektmanagement & Governance (Hersteller)',
  prod_doc: 'Dokumentation (Projekt & Nutzer)',
  prod_dev: 'Sichere Softwareentwicklung (Secure Coding, Design, SBOM)',
  prod_test: 'Testen & Freigabe (SAST, DAST, Penetrationstests)',
  prod_rel: 'Auslieferung & Integrität (Release & Signatur)',
  prod_fix: 'Schwachstellenmanagement & Incident Response',
  prod_decom: 'Außerbetriebnahme & Deinstallation',
  oss_governance: 'Open Source: Governance & Contribution',
  oss_legal: 'Open Source: Lizenzmanagement & Legal',
  oss_quality: 'Open Source: Qualität, Peer-Review & Memory Safety',
  oss_build_release: 'Open Source: Reproduzierbare Builds & Release',
  oss_vulnerability: 'Open Source: Schwachstellenmeldungen & CVD',
  oss_decommissioning: 'Open Source: Projekt-End-of-Life',
  ai_security: 'KI-Sicherheit & Governance (LLMs / Code-Assistenten)',
};

export const TR03185_REQUIREMENTS: TR03185Requirement[] = [
  // ── Part 1: Producer Project Management ────────────────────────────────────
  {
    id: 'PROD.PM.A.1',
    category: 'prod_pm',
    title: 'Sicherheitsanforderungen für Entwicklungsinfrastruktur',
    description: 'Alle Informationssicherheitsanforderungen für die Entwicklungsinfrastruktur und -prozesse müssen identifiziert, dokumentiert und fortlaufend aktualisiert werden.',
    level: 'MUST',
    target: 'producer',
    craRef: 'Art. 13(1)',
    source: 'BSI TR-03185 Part 1 Table 14',
  },
  {
    id: 'PROD.PM.A.5',
    category: 'prod_pm',
    title: 'Sicherheitsintegriertes Vorgehensmodell (SDL)',
    description: 'Ein geeignetes Prozessmodell für die Softwareentwicklung (inkl. Wartung) muss definiert werden. Sicherheitsanforderungen müssen fest in den Entwicklungszyklus integriert sein.',
    level: 'MUST',
    target: 'producer',
    craRef: 'Annex I Part I (1)',
    source: 'BSI TR-03185 Part 1 Table 14',
  },
  {
    id: 'PROD.PM.C.2',
    category: 'prod_pm',
    title: 'Funktionstrennung (Separation of Duties)',
    description: 'Unvereinbare Aufgaben wie operative Entwicklung und Sicherheitsfreigabe/Testen müssen personell getrennt und dokumentiert sein.',
    level: 'SHOULD',
    target: 'producer',
    source: 'BSI TR-03185 Part 1 Table 15',
  },

  // ── Part 1: Documentation ──────────────────────────────────────────────────
  {
    id: 'PROD.DOC.A.1',
    category: 'prod_doc',
    title: 'Projektdokumentation & Bedrohungsmodell',
    description: 'Vollständige Projekt-, Funktions- und Schnittstellendokumentation inklusive Software-Architektur und Threat Model.',
    level: 'SHOULD',
    target: 'producer',
    craRef: 'Annex VII §2(2)',
    source: 'BSI TR-03185 Part 1 Table 16',
  },
  {
    id: 'PROD.DOC.B.1',
    category: 'prod_doc',
    title: 'Sicherheitsrelevante Nutzer- & Härtungsanleitung',
    description: 'Erstellung einer verständlichen Nutzerdokumentation mit Anleitungen zur sicheren Erstkonfiguration (Security by Default) und Härtung.',
    level: 'MUST',
    target: 'producer',
    craRef: 'Annex II §1–3',
    source: 'BSI TR-03185 Part 1 Table 17',
  },

  // ── Part 1: Development & Secure Coding ────────────────────────────────────
  {
    id: 'PROD.DEV.A.4',
    category: 'prod_dev',
    title: 'Verbindliche Coding-Standards & Eingabevalidierung',
    description: 'Verbindliche Programmierrichtlinien mit strikter Eingabevalidierung an Vertrauensgrenzen, Vermeidung unsicherer Konstrukte und sauberer Fehlerbehandlung.',
    level: 'MUST',
    target: 'producer',
    craRef: 'Annex I Part I (2)(j)',
    source: 'BSI TR-03185 Part 1 Table 18',
  },
  {
    id: 'PROD.DEV.C.1',
    category: 'prod_dev',
    title: 'Systematische Bedrohungsmodellierung (STRIDE)',
    description: 'Durchführung einer formalen Bedrohungsmodellierung in der Entwurfsphase unter Berücksichtigung von Datenflüssen, Vertrauensgrenzen und Angriffsvektoren.',
    level: 'MUST',
    target: 'producer',
    craRef: 'Annex VII §2(1)',
    source: 'BSI TR-03185 Part 1 Table 20',
  },
  {
    id: 'PROD.DEV.D.2',
    category: 'prod_dev',
    title: 'Sichere Architekturprinzipien (Layering, Kapselung)',
    description: 'Einsatz bewährter Architekturprinzipien wie Domain Separation, Kapselung und Schichtenmodell (Defense in Depth).',
    level: 'MUST',
    target: 'producer',
    craRef: 'Annex I Part I (2)(k)',
    source: 'BSI TR-03185 Part 1 Table 21',
  },
  {
    id: 'PROD.DEV.G.1',
    category: 'prod_dev',
    title: 'Sorgfaltspflicht bei Drittkomponenten (Supply Chain)',
    description: 'Dritt- und Open-Source-Komponenten dürfen nur aus vertrauenswürdigen Quellen bezogen werden; Integrität muss per Prüfsumme/Signatur verifiziert werden.',
    level: 'MUST',
    target: 'producer',
    craRef: 'Art. 13(5)',
    source: 'BSI TR-03185 Part 1 Table 24',
  },
  {
    id: 'PROD.DEV.I.3',
    category: 'prod_dev',
    title: 'Automatisierte, reproduzierbare Builds',
    description: 'Automatisierte Build-Pipelines zur Erzeugung deterministischer/reproduzierbarer Builds mit Aufbewahrung der Build-Logs.',
    level: 'MUST',
    target: 'producer',
    source: 'BSI TR-03185 Part 1 Table 26',
  },
  {
    id: 'PROD.DEV.L.2',
    category: 'prod_dev',
    title: 'Software Bill of Materials (SBOM) Erstellung',
    description: 'Erstellung und sichere Archivierung eines maschinenlesbaren Herkunftsnachweises aller Komponenten (SBOM) je Release nach BSI TR-03183-2.',
    level: 'MUST',
    target: 'producer',
    craRef: 'Annex I Part II (1)',
    source: 'BSI TR-03185 Part 1 Table 27',
  },

  // ── Part 1: Testing & Release ──────────────────────────────────────────────
  {
    id: 'PROD.TEST.A.1',
    category: 'prod_test',
    title: 'Umfassendes Testkonzept inkl. Negativtests',
    description: 'Festlegung von Testrahmenbedingungen mit repräsentativer Funktionsprüfung, Negativtests und Prüfung auf bekannte Schwachstellen.',
    level: 'MUST',
    target: 'producer',
    craRef: 'Annex I Part II (3)',
    source: 'BSI TR-03185 Part 1 Table 28',
  },
  {
    id: 'PROD.TEST.A.15',
    category: 'prod_test',
    title: 'Penetrationstests & Schwachstellenanalysen',
    description: 'Durchführung strukturierter Penetrationstests und automatisierter statischer/dynamischer Code-Analysen (SAST/DAST).',
    level: 'SHOULD',
    target: 'producer',
    craRef: 'Annex VII §2(4)',
    source: 'BSI TR-03185 Part 1 Table 28',
  },

  // ── Part 1: Delivery & Release ─────────────────────────────────────────────
  {
    id: 'PROD.REL.1',
    category: 'prod_rel',
    title: 'Kryptografische Integritätssicherung bei Auslieferung',
    description: 'Bereitstellung von Mechanismen zur Sicherstellung der Integrität und Authentizität (z. B. SHA-512 Prüfsummen, digitale Signaturen).',
    level: 'MUST',
    target: 'producer',
    craRef: 'Annex I Part I (2)(f)',
    source: 'BSI TR-03185 Part 1 Table 30',
  },

  // ── Part 1: Vulnerability Management ───────────────────────────────────────
  {
    id: 'PROD.FIX.A.1',
    category: 'prod_fix',
    title: 'Definierte Behebungszeitfenster für Sicherheitsupdates',
    description: 'Dokumentation verbindlicher Zeitfenster für die Bereitstellung von Sicherheitsupdates nach Schwachstellenbekanntgabe.',
    level: 'MUST',
    target: 'producer',
    craRef: 'Annex I Part II (2)',
    source: 'BSI TR-03185 Part 1 Table 31',
  },
  {
    id: 'PROD.FIX.A.8',
    category: 'prod_fix',
    title: 'Strukturierter Behebungsprozess & Benachrichtigung',
    description: 'Fester Prozess zur Analyse, Behebung (Patch/Plan) und Benachrichtigung von Drittanbietern und Nutzern (CSAF Advisories).',
    level: 'MUST',
    target: 'producer',
    craRef: 'Annex I Part II (4, 6)',
    source: 'BSI TR-03185 Part 1 Table 31',
  },

  // ── Part 1: Decommissioning ────────────────────────────────────────────────
  {
    id: 'PROD.DECOM.1',
    category: 'prod_decom',
    title: 'Regelung zur Außerbetriebnahme & Datenlöschung',
    description: 'Beschreibung der Deinstallation und vollständigen, permanenten Datenlöschung in der Nutzerdokumentation.',
    level: 'MUST',
    target: 'producer',
    craRef: 'Annex I Part I (2)(m)',
    source: 'BSI TR-03185 Part 1 Table 32',
  },

  // ── Part 2: Open Source Software (OSS / FLOSS) Lifecycle ──────────────────
  {
    id: 'OSS.GV.01',
    category: 'oss_governance',
    title: 'Contribution-Leitfaden & Qualitätserwartungen',
    description: 'Dokumentation von Richtlinien zur Mitarbeit am Projekt und Definition der geforderten Code-Qualität.',
    level: 'MUST',
    target: 'oss',
    source: 'BSI TR-03185 Part 2 Table 35',
  },
  {
    id: 'OSS.LE.01',
    category: 'oss_legal',
    title: 'Lizenzdeklaration für alle Inhalte (SPDX)',
    description: 'Eindeutige Angabe einer anerkannten Open-Source-Lizenz für alle bereitgestellten Inhalte, Code-Artefakte und Dokumentationen.',
    level: 'MUST',
    target: 'oss',
    source: 'BSI TR-03185 Part 2 Table 36',
  },
  {
    id: 'OSS.QA.01',
    category: 'oss_quality',
    title: 'Transparente Liste von Drittkomponenten',
    description: 'Verfügbarkeit einer vollständigen Übersicht aller im Open-Source-Projekt verwendeten Drittbibliotheken.',
    level: 'MUST',
    target: 'oss',
    craRef: 'Art. 13(5)',
    source: 'BSI TR-03185 Part 2 Table 37',
  },
  {
    id: 'OSS.QA.05',
    category: 'oss_quality',
    title: 'Maßnahmen zur Vermeidung von Memory-Safety-Problemen',
    description: 'Einsatz speichersicherer Programmiersprachen oder Verwendung automatisierter Speicherüberprüfungen (z. B. Sanitizers, Safe Wrappers).',
    level: 'SHOULD',
    target: 'oss',
    source: 'BSI TR-03185 Part 2 Table 37',
  },
  {
    id: 'OSS.BR.02',
    category: 'oss_build_release',
    title: 'Eindeutige, monoton steigende Versionierung',
    description: 'Zuweisung eindeutiger Versionsbezeichner (z. B. SemVer oder CalVer) für alle veröffentlichten Releases.',
    level: 'MUST',
    target: 'oss',
    source: 'BSI TR-03185 Part 2 Table 38',
  },
  {
    id: 'OSS.VM.01',
    category: 'oss_vulnerability',
    title: 'Vertraulicher Sicherheitskontakt für Schwachstellen',
    description: 'Bereitstellung einer vertraulichen Kontaktmöglichkeit für Sicherheitsforscher in der Projektdokumentation.',
    level: 'MUST',
    target: 'oss',
    craRef: 'Annex I Part II (6)',
    source: 'BSI TR-03185 Part 2 Table 39',
  },

  // ── Section 0.1: Artificial Intelligence (AI) Governance ───────────────────
  {
    id: 'AI.GOV.01',
    category: 'ai_security',
    title: 'Risikobewertung für probabilistische KI-Code-Assistenten',
    description: 'Systematische Überprüfung von durch KI-Modelle / LLMs generiertem Quellcode (Gefahr von Halluzinationen unsicherer Pakete oder verdeckter Sicherheitslücken).',
    level: 'MUST',
    target: 'ai',
    source: 'BSI TR-03185 Section 0.1',
  },
  {
    id: 'AI.TEST.01',
    category: 'ai_security',
    title: 'Einsatz KI-basierter Schwachstellen-Scanner',
    description: 'Nutzung fortschrittlicher automatisierter KI-gestützter Vulnerability-Scanner zur Erkennung komplexer Schwachstellenmuster im Code.',
    level: 'SHOULD',
    target: 'ai',
    source: 'BSI TR-03185 Section 0.1 & §1.3.2.4',
  },
];
