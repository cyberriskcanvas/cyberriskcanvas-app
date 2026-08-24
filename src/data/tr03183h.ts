/**
 * BSI TR-03183-H: Conformity based on full quality assurance (Module H)
 * Version 1.1.0, 30/05/2026
 *
 * Provides ISO/IEC 27001 / ISO 27002 CRA-specific extended controls,
 * ISO 9001 quality system integration, and CRA Statement of Applicability (SoA) engine.
 */

import { CRA_REQUIREMENTS, type ComplianceStatus, type CRARequirement } from './cra';

export interface ModuleHControl {
  id: string;
  sourceStandard: 'ISO 27002:2022' | 'ISO 9001:2015' | 'CRA Module H';
  title: string;
  craRef: string;
  description: string;
  purpose: string;
}

export const MODULE_H_CONTROLS: ModuleHControl[] = [
  // ── Extended ISO/IEC 27002 Controls (Section 6) ───────────────────────────
  {
    id: 'CRA 5.7',
    sourceStandard: 'ISO 27002:2022',
    title: 'Threat Intelligence (für PwDE & RDPS)',
    craRef: 'Annex I Part II (1, 3)',
    description: 'Informationen zu Bedrohungen der Informationssicherheit bezogen auf die Produkte im Geltungsbereich müssen kontinuierlich gesammelt und analysiert werden.',
    purpose: 'Aufbau von Lagebewusstsein bezüglich der Bedrohungsumgebung des PwDE zur Ergreifung proaktiver Gegenmaßnahmen.',
  },
  {
    id: 'CRA 5.8',
    sourceStandard: 'ISO 27002:2022',
    title: 'Sicherheit im Projektmanagement (PwDE-Lebenszyklus)',
    craRef: 'Art. 13(1)',
    description: 'Informationssicherheit muss fest im Projektmanagement des gesamten Produktlebenszyklus verankert sein.',
    purpose: 'Sicherstellen, dass Produktrisiken in allen Projektphasen wirksam gesteuert werden.',
  },
  {
    id: 'CRA 8.8',
    sourceStandard: 'ISO 27002:2022',
    title: 'Management technischer Schwachstellen (PwDE Scope)',
    craRef: 'Annex I Part II (1–4)',
    description: 'Schwachstellen in verwendeten Informationssystemen und Produkten im Geltungsbereich müssen erfasst, bewertet und behoben werden.',
    purpose: 'Verhinderung der Ausnutzung technischer Schwachstellen im Feld.',
  },
  {
    id: 'CRA 8.25',
    sourceStandard: 'ISO 27002:2022',
    title: 'Sicherer Entwicklungslebenszyklus (SDLC)',
    craRef: 'Annex I Part I (1, 2)',
    description: 'Regeln für die sichere Entwicklung von Software, Hardware und Systemen für Konzeption, Bau und Produktion.',
    purpose: 'Security by Design als integralen Bestandteil des Engineering-Prozesses etablieren.',
  },
  {
    id: 'CRA 8.29',
    sourceStandard: 'ISO 27002:2022',
    title: 'Sicherheitstests in Entwicklung und Abnahme',
    craRef: 'Annex I Part II (3), Annex VII §2(4)',
    description: 'Durchführung definierter Sicherheitstests (Regression, Code Scan, Pentests) vor Release und Auslieferung.',
    purpose: 'Validierung der Einhaltung aller Sicherheitsanforderungen vor dem Inverkehrbringen.',
  },
  {
    id: 'CRA 8.32',
    sourceStandard: 'ISO 27002:2022',
    title: 'Änderungsmanagement (Change Management)',
    craRef: 'Art. 3(32), Art. 31',
    description: 'Formaler Prozess für Dokumentation, Spezifikation, Testung und Freigabe von Produkt- und Konfigurationsänderungen.',
    purpose: 'Aufrechterhaltung des Sicherheitsniveaus bei Produktanpassungen und Sicherheitsupdates.',
  },

  // ── ISO 9001 Quality System Integration (Section 5.11 / Annex D) ──────────
  {
    id: 'ISO 9001 8.3',
    sourceStandard: 'ISO 9001:2015',
    title: 'Entwicklung von Produkten und Dienstleistungen',
    craRef: 'Annex VIII Part IV 3.2(a)',
    description: 'Systematische Steuerung der Entwicklungsphasen, Eingaben, Steuerungsmaßnahmen und Verifikationsergebnisse.',
    purpose: 'Qualitätssicherung im Design- und Entwicklungsprozess.',
  },
  {
    id: 'ISO 9001 8.4',
    sourceStandard: 'ISO 9001:2015',
    title: 'Steuerung von extern bereitgestellten Prozessen & Produkten',
    craRef: 'Art. 13(5), Annex VIII Part IV 3.2(c)',
    description: 'Lieferantenbewertung und Integritätskontrolle von zugekauften Software- und Hardwarekomponenten.',
    purpose: 'Sichere Lieferkette und Third-Party Due Diligence.',
  },
  {
    id: 'ISO 9001 8.6',
    sourceStandard: 'ISO 9001:2015',
    title: 'Freigabe von Produkten und Dienstleistungen',
    craRef: 'Annex VIII Part IV 3.2(e)',
    description: 'Verifizierende Endkontrolle und formale Freigabe vor der Auslieferung an Kunden.',
    purpose: 'Verhinderung des Inverkehrbringens nicht-konformer Produkte.',
  },
  {
    id: 'ISO 9001 8.7',
    sourceStandard: 'ISO 9001:2015',
    title: 'Steuerung nichtkonformer Ergebnisse',
    craRef: 'Annex VIII Part IV 3.2(d)',
    description: 'Verfahren zur Identifikation, Sperrung und Korrektur fehlerhafter oder unsicherer Software-/Hardware-Stände.',
    purpose: 'Rückruf- und Quarantänemechanismen für fehlerhafte Stände.',
  },
];

export interface SoaRow {
  requirementId: string;
  title: string;
  craRef: string;
  domain: string;
  applicable: boolean;
  status: ComplianceStatus;
  justification?: string;
  implementedControls?: string[];
  evidence?: string;
}

export function generateStatementOfApplicability(
  mappings: Array<{ requirementId: string; status: ComplianceStatus; notes?: string }>,
  requirements: CRARequirement[] = CRA_REQUIREMENTS,
): SoaRow[] {
  return requirements.map((req) => {
    const userMap = mappings.find((m) => m.requirementId === req.id || m.requirementId === req.legacyId);
    const status: ComplianceStatus = userMap?.status ?? 'non-compliant';
    const applicable = status !== 'not-applicable';

    let justification = userMap?.notes;
    if (!applicable && !justification) {
      justification = 'Nicht zutreffend basierend auf Risikobewertung und Produktarchitektur (Begründung erforderlich nach TR-03183-H §5.7).';
    }

    return {
      requirementId: req.id,
      title: req.title,
      craRef: req.craRef,
      domain: req.domain,
      applicable,
      status,
      justification,
      evidence: userMap?.notes,
    };
  });
}
