import { useLanguageStore } from '@/store/languageStore';
import type { AnnexViiKey } from '@/lib/docData';
import type { AnnexViiState } from '@/utils/docGenerators';

const en = {
  open: 'Documents',
  title: 'Documents for authorities and users',
  tabs: { manufacturer: 'Manufacturer & product', userinfo: 'User information (Annex II)', techdoc: 'Technical documentation (Annex VII)', declaration: 'Declaration of conformity (Annex V)' },
  view: {
    intro: 'What you hand over to authorities and users: the documents Canvas generates from your product data, and the evidence you upload.',
    generated: 'Generated documents',
    evidence: 'Evidence (uploaded PDFs)',
    evidenceIntro: 'Test reports, policies, certificates. You can attach them to Annex VII points in the technical documentation.',
    edit: 'Open',
    base: 'Basis for all documents',
    complete: 'Complete',
    open: (n: number) => `${n} open point(s)`,
    covered: (n: number, total: number) => `${n} of ${total} points covered`,
  },
  saving: 'Saving…',
  saved: 'Saved',
  close: 'Close',
  manufacturer: {
    intro: 'Entered once, used in all documents below.',
    name: 'Manufacturer name', address: 'Postal address', email: 'Email or other digital contact', website: 'Website (optional)',
    productName: 'Product name', productType: 'Product type', productIdentification: 'Version, batch or serial number',
    cvdUrl: 'Link to your vulnerability disclosure policy', declarationUrl: 'Link to the EU declaration of conformity (optional)', sbomLocation: 'Where users can get the SBOM (optional)',
    standards: 'Applied harmonised standards, specifications or certification schemes (with the parts applied; describe your own solution where none was applied)',
    notifiedBody: 'Notified body (only if one was involved)', nbName: 'Name', nbNumber: 'Number', nbCertificate: 'Certificate',
  },
  userinfo: {
    intro: 'Information and instructions that must accompany the product. Purpose and end of support come from the product data on the roadmap.',
    securityEnvironment: 'Intended security environment, essential functions and security properties',
    knownRisks: 'Known or foreseeable circumstances that can lead to significant cybersecurity risks (also under foreseeable misuse)',
    supportType: 'Type of security support you offer',
    instructions: 'Instructions (text, or the internet address where they can be found)',
    instructionLabels: { commissioning: 'Commissioning and secure use', dataImpact: 'How changes affect the security of data', updates: 'How to install security updates', decommissioning: 'Secure decommissioning and removing user data', autoUpdateOff: 'How to turn off automatic security updates', integration: 'Integrators: what they need to meet Annex I and VII (only if the product is meant for integration)' },
    preview: 'Preview', language: 'Document language', downloadMd: 'Download Markdown', downloadPdf: 'Download PDF',
    missing: (n: number) => (n === 0 ? 'Complete: no open points.' : `${n} open point(s), marked [TODO] in the text`),
    hint: 'Ticking off requirements UT.1–UT.4 stays your decision in the checklist.',
  },
  techdoc: {
    intro: 'Points the dossier cannot cover itself. Add a short text, attach a document, or both. The PDF dossier then shows the point as provided.',
    note: 'Note / reference', attach: 'Attach a document', none: '- none -',
    noDocuments: 'No project documents yet. Upload PDFs in the Documents tab (Pro).',
    state: { dossier: 'In the dossier', provided: 'Provided', partial: 'Partly', separate: 'Missing' } as Record<AnnexViiState, string>,
    points: { '1a': 'Intended purpose', '1b': 'Software versions affecting compliance', '1c': 'Photos or illustrations (hardware)', '1d': 'User information and instructions (Annex II)', '2b': 'Vulnerability handling processes, incl. secure update distribution', '2c': 'Production and monitoring processes and their validation', '4': 'Information used to determine the support period', '5': 'Applied standards / solutions chosen instead', '6': 'Reports of the conformity tests', '7': 'Copy of the EU declaration of conformity' } as Record<AnnexViiKey, string>,
  },
  declaration: {
    intro: 'A draft of the EU declaration of conformity from your product data. The manufacturer has to check and sign it; this does not replace a legal review.',
    missing: (n: number) => (n === 0 ? 'Complete: no open points.' : `${n} open point(s): see the manufacturer & product tab`),
    openPoints: 'Open points', downloadPdf: 'Download PDF draft', language: 'Document language',
  },
};

const de: typeof en = {
  open: 'Dokumente',
  title: 'Dokumente für Behörden und Nutzer',
  tabs: { manufacturer: 'Hersteller & Produkt', userinfo: 'Nutzerinformationen (Anhang II)', techdoc: 'Technische Dokumentation (Anhang VII)', declaration: 'Konformitätserklärung (Anhang V)' },
  view: {
    intro: 'Was Sie Behörden und Nutzern geben: die Dokumente, die Canvas aus Ihren Produktdaten erzeugt, und die Nachweise, die Sie hochladen.',
    generated: 'Erzeugte Dokumente',
    evidence: 'Nachweise (hochgeladene PDFs)',
    evidenceIntro: 'Prüfberichte, Richtlinien, Zertifikate. Sie lassen sich in der technischen Dokumentation den Punkten aus Anhang VII zuordnen.',
    edit: 'Öffnen',
    base: 'Grundlage aller Dokumente',
    complete: 'Vollständig',
    open: (n) => `${n} offene Punkt(e)`,
    covered: (n, total) => `${n} von ${total} Punkten abgedeckt`,
  },
  saving: 'Speichert…',
  saved: 'Gespeichert',
  close: 'Schließen',
  manufacturer: {
    intro: 'Einmal erfasst, in allen Dokumenten unten verwendet.',
    name: 'Name des Herstellers', address: 'Postanschrift', email: 'E-Mail oder anderer digitaler Kontakt', website: 'Website (optional)',
    productName: 'Produktname', productType: 'Produkttyp', productIdentification: 'Version, Charge oder Seriennummer',
    cvdUrl: 'Link zu Ihrer Richtlinie zur koordinierten Offenlegung', declarationUrl: 'Link zur EU-Konformitätserklärung (optional)', sbomLocation: 'Wo Nutzer die SBOM erhalten (optional)',
    standards: 'Angewandte harmonisierte Normen, Spezifikationen oder Zertifizierungsschemata (mit den angewandten Teilen; bei Nichtanwendung die eigene Lösung beschreiben)',
    notifiedBody: 'Benannte Stelle (nur wenn eine beteiligt war)', nbName: 'Name', nbNumber: 'Nummer', nbCertificate: 'Bescheinigung',
  },
  userinfo: {
    intro: 'Informationen und Anleitungen, die dem Produkt beiliegen müssen. Zweck und Supportende kommen aus den Produktdaten im Fahrplan.',
    securityEnvironment: 'Vorgesehene Sicherheitsumgebung, wesentliche Funktionen und Sicherheitseigenschaften',
    knownRisks: 'Bekannte oder vorhersehbare Umstände, die zu erheblichen Cybersicherheitsrisiken führen können (auch bei vorhersehbarer Fehlanwendung)',
    supportType: 'Art der angebotenen Sicherheitsunterstützung',
    instructions: 'Anleitungen (Text oder die Internetadresse, unter der sie zu finden sind)',
    instructionLabels: { commissioning: 'Inbetriebnahme und sichere Nutzung', dataImpact: 'Auswirkungen von Änderungen auf die Datensicherheit', updates: 'Installation von Sicherheitsupdates', decommissioning: 'Sichere Außerbetriebnahme und Entfernen von Nutzerdaten', autoUpdateOff: 'Automatische Sicherheitsupdates abschalten', integration: 'Integratoren: was sie für Anhang I und VII brauchen (nur wenn das Produkt zum Einbau gedacht ist)' },
    preview: 'Vorschau', language: 'Sprache des Dokuments', downloadMd: 'Markdown herunterladen', downloadPdf: 'PDF herunterladen',
    missing: (n) => (n === 0 ? 'Vollständig: keine offenen Punkte.' : `${n} offene(r) Punkt(e), im Text mit [TODO] markiert`),
    hint: 'Das Abhaken der Anforderungen UT.1–UT.4 bleibt Ihre Entscheidung in der Checkliste.',
  },
  techdoc: {
    intro: 'Punkte, die das Dossier nicht selbst abdecken kann. Ergänzen Sie einen kurzen Text, hängen Sie ein Dokument an, oder beides. Das PDF-Dossier zeigt den Punkt dann als bereitgestellt.',
    note: 'Hinweis / Verweis', attach: 'Dokument anhängen', none: '- keins -',
    noDocuments: 'Noch keine Projektdokumente. PDFs laden Sie im Tab Dokumente hoch (Pro).',
    state: { dossier: 'Im Dossier', provided: 'Bereitgestellt', partial: 'Teilweise', separate: 'Fehlt' } as Record<AnnexViiState, string>,
    points: { '1a': 'Bestimmungsgemäßer Zweck', '1b': 'Softwareversionen mit Einfluss auf die Konformität', '1c': 'Fotos oder Abbildungen (Hardware)', '1d': 'Nutzerinformationen und Anleitungen (Anhang II)', '2b': 'Prozesse der Schwachstellenbehandlung, inkl. sichere Update-Verteilung', '2c': 'Produktions- und Überwachungsprozesse und deren Validierung', '4': 'Angaben zur Bestimmung des Supportzeitraums', '5': 'Angewandte Normen / stattdessen gewählte Lösungen', '6': 'Berichte der Konformitätsprüfungen', '7': 'Kopie der EU-Konformitätserklärung' } as Record<AnnexViiKey, string>,
  },
  declaration: {
    intro: 'Ein Entwurf der EU-Konformitätserklärung aus Ihren Produktdaten. Der Hersteller muss sie prüfen und unterzeichnen; sie ersetzt keine rechtliche Prüfung.',
    missing: (n) => (n === 0 ? 'Vollständig: keine offenen Punkte.' : `${n} offene(r) Punkt(e): siehe Reiter Hersteller & Produkt`),
    openPoints: 'Offene Punkte', downloadPdf: 'PDF-Entwurf herunterladen', language: 'Sprache des Dokuments',
  },
};

export function useDocsT() {
  const lang = useLanguageStore((s) => s.lang);
  return { t: { en, de }[lang], lang };
}
