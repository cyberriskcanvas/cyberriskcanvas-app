// Texts of the CRA roadmap, product data, project checklist and task list (de/en).
// Same language store as src/i18n/diagram.ts; kept separate so the large diagram dictionary stays untouched.
import { useLanguageStore } from '@/store/languageStore';
import type { Task } from '@/utils/deriveTasks';
import type { StationId } from '@/utils/deriveJourney';
import { modelCheckTranslations } from './modelCheck';

type StationText = { title: string; why: string };

const en = {
  tab: 'Roadmap',
  tabs: { design: 'Architecture & risks', operations: 'SBOM & vulnerabilities', documents: 'Documents', csaf: 'Advisories & reporting' },
  bar: {
    label: (n: number, total: number) => `Next step · ${n}/${total}`,
    open: 'Open roadmap',
    allDone: 'All roadmap stations are done.',
  },
  art14: {
    title: (n: number) => (n === 1 ? 'Art. 14 reporting case open' : `${n} Art. 14 reporting cases open`),
    due: (step: string, h: number) => `${step} due in ${h < 48 ? `${Math.max(1, Math.round(h))} h` : `${Math.round(h / 24)} days`}`,
    overdue: (step: string, h: number) => `${step} overdue by ${-h < 48 ? `${Math.max(1, Math.round(-h))} h` : `${Math.round(-h / 24)} days`}`,
    waiting: 'No report due right now',
    open: 'Open reporting cases',
  },
  introCard: {
    title: 'How this tool works',
    points: [
      'The roadmap tells you the next step. "Continue" takes you to the right place.',
      'The tabs are where the work happens. The bar under the tabs always shows the next step and leads back here.',
      'What belongs to your company (contact, security.txt, policies, SDL) is set once under Organisation and applies to every product.',
    ],
    ok: 'Got it',
    tour: 'Take the canvas tour',
  },
  title: 'CRA roadmap',
  intro: 'Ten stations from classification to post-market. The status is computed from your project data; work through them from top to bottom.',
  status: { open: 'Open', progress: 'In progress', done: 'Done' },
  continue: 'Continue',
  whatIsMissing: 'What is still open',
  allDone: 'Everything in this station is done.',
  decided: (done: number, total: number) => `${done} of ${total} requirements decided`,
  stations: {
    classify: { title: 'Classification', why: 'The product class (Annex III/IV) decides whether a self-assessment is enough or a notified body is needed.' },
    risk: { title: 'Risk analysis', why: 'The cybersecurity risk assessment (Art. 13(2)) is the basis for every other decision.' },
    requirements: { title: 'Requirements', why: 'For every essential requirement of Annex I Part I: does it apply, and how is it met? This becomes your Statement of Applicability.' },
    secdev: { title: 'Secure development & CI', why: 'Automated checks on every build (static analysis, secret scan) prove that security is tested continuously.' },
    sbom: { title: 'SBOM & vulnerabilities', why: 'An SBOM per release and triaged findings: no known exploitable vulnerabilities at release (Annex I Part I (2)(a)).' },
    vulnprocess: { title: 'Vulnerability handling', why: 'Contact point, disclosure policy, advisories and updates: the processes of Annex I Part II. Contact point, disclosure policy and the information-sharing requirements belong to your organisation: set them once in the Organisation area, every product inherits them.' },
    userinfo: { title: 'User information', why: 'What users must receive with the product (Annex II): purpose, risks, contact, support period, instructions.' },
    techdoc: { title: 'Technical documentation', why: 'The documentation for authorities and notified bodies (Annex VII). Micro and small enterprises may use a simplified format (Art. 33(5)).' },
    release: { title: 'Conformity & release', why: 'EU declaration of conformity, a green release gate and a frozen version as the audit-proof state.' },
    postmarket: { title: 'After the release', why: 'During the support period: monitor vulnerabilities, triage new findings, deliver updates, report actively exploited ones (Art. 14).' },
  } satisfies Record<StationId, StationText>,
  checks: {
    class_set: 'Product class is set',
    has_threats: 'At least one confirmed threat',
    drafts_confirmed: 'Suggested threats and assets reviewed',
    threats_assessed: 'Every threat assessed as a risk',
    risks_treated: 'Every risk has a measure or is accepted',
    model_clean: 'Architecture check has no open high or medium findings',
    er_decided: 'Every Annex I Part I requirement decided',
    ci_sast: 'Static analysis runs in CI',
    ci_secrets: 'Secret scan runs in CI',
    sbom_present: 'SBOM for the current version',
    vulns_triaged: 'No untriaged high/critical vulnerabilities',
    vh_decided: 'Vulnerability handling requirements decided',
    publisher_contact: 'Contact for vulnerability reports in the organisation profile',
    ut_decided: 'User information requirements decided',
    intended_purpose: 'Intended purpose described',
    support_end: 'End of the support period set',
    annex2_ready: 'User information (Annex II) complete',
    td_decided: 'Technical documentation requirements decided',
    support_rationale: 'Support period justified',
    doc_decided: 'EU declaration of conformity decided (UT.5)',
    declaration_ready: 'Declaration of conformity draft complete',
    gate_pass: 'Release gate passes',
    version_frozen: 'At least one version frozen',
    assessment_approved: 'Assessment approved by an assessor',
    support_running: 'Support period still running',
    cve_monitoring: 'Vulnerability monitoring ran in the last 7 days',
    reports_on_time: 'No overdue Art. 14 report',
  } as Record<string, string>,
  next: {
    product: 'Edit product data',
    docs: { 'docs-manufacturer': 'Manufacturer & product data', 'docs-userinfo': 'Generate user information (Annex II)', 'docs-techdoc': 'Fill Annex VII points', 'docs-declaration': 'Prepare declaration of conformity' } as Record<string, string>,
    tasks: 'Open task list',
    design: 'Open canvas',
    operations: 'Open SBOM & vulnerabilities',
    csaf: 'Open advisories & reporting',
    reporting: 'Open Art. 14 reporting cases',
    dashboard: 'Open reports & exports (PDF dossier)',
    organisation: 'Set organisation contact & policy',
    checklist: (group: string) => `Open checklist ${group}`,
  },
  supportDays: (days: number) => (days >= 0 ? `${days} days until the end of support` : `Support ended ${-days} days ago`),
  monitoringHint: 'Vulnerability monitoring runs inside the app every CVE_SCAN_INTERVAL_HOURS (default 24 h, needs the Pro licence). No recent scan was recorded: check the server log and that the setting is not 0.',
  sdlNote: (done: number) => `BSI TR-03185 SDL checklist (organisation-wide): ${done} items done (Organisation).`,
  proHint: 'CI evidence, SBOM and the release gate need a Pro licence.',
  product: {
    title: 'Product data',
    craClass: 'CRA product class',
    classes: { default: 'Default (not in Annex III/IV)', 'class-i': 'Important, class I (Annex III)', 'class-ii': 'Important, class II (Annex III)', critical: 'Critical (Annex IV)' },
    unset: '- not set -',
    scopeCheck: 'Not sure? Free scope check (CRA-Klartext)',
    conformity: 'Conformity assessment',
    notifiedBody: { no: 'No notified body needed', 'unless-standards': 'Notified body unless harmonised standards are fully applied', yes: 'Notified body or certification required' },
    procedures: 'Possible procedures',
    intendedPurpose: 'Intended purpose',
    intendedPurposeHint: 'What the product is for, its security environment and essential functions (Annex II 4).',
    supportEnd: 'End of the support period',
    supportEndHint: 'Until when vulnerabilities are handled and security updates provided (Art. 13(8), usually at least 5 years).',
    supportRationale: 'Rationale for the support period',
    supportRationaleHint: 'Why this period, e.g. expected time of use (Annex VII 4).',
    iec62443: 'Also assess against IEC 62443',
    iec62443Hint: 'For industrial and OT products: adds Security Level, IEC 62443 requirements per component and an IEC page in the report. Not needed for the CRA.',
    saved: 'Saved',
    close: 'Close',
  },
  checklist: {
    title: 'CRA checklist (whole product)',
    intro: 'One decision per requirement for the whole product. It takes precedence over component mappings in the Statement of Applicability.',
    groups: { ER: 'Annex I Part I', VH: 'Annex I Part II', UT: 'Annex II / V', TD: 'Annex VII' } as Record<string, string>,
    status: { compliant: 'Met', partial: 'Partly', 'non-compliant': 'Not met', 'not-applicable': 'Not applicable' } as Record<string, string>,
    clear: 'Reset',
    note: 'Justification / evidence',
    componentHint: (n: number) => `${n} component mapping(s)`,
    howTo: 'How to implement',
    why: 'Why',
    evidence: 'Evidence',
    ci: (source: string) => `Can be proven automatically from CI (SBOM & vulnerabilities → CI/CD, source ${source}).`,
    unreviewed: 'Draft, not yet reviewed by an expert.',
    org: { inherited: 'Set for the organisation', differs: 'Differs from the organisation', change: 'Change in the Organisation area', reset: 'Reset to organisation' },
  },
  tasks: {
    title: 'Task list',
    intro: 'What is still open in the risk analysis, most urgent first. Click an item to jump to the place that fixes it.',
    empty: 'Nothing open right now. New findings or failed checks will show up here.',
    confirmAll: 'Confirm all',
    open: 'Open',
    draftNote: 'Suggested threats and assets come from templates for the component type. They only count once you confirmed them; review before you use the analysis in an audit.',
    text: (t: Task): string => {
      switch (t.kind) {
        case 'confirm_draft': {
          const parts = [
            t.draftCounts?.threats ? `${t.draftCounts.threats} suggested ${t.draftCounts.threats === 1 ? 'threat' : 'threats'}` : '',
            t.draftCounts?.assets ? `${t.draftCounts.assets} suggested ${t.draftCounts.assets === 1 ? 'asset' : 'assets'}` : '',
          ].filter(Boolean).join(' and ');
          return `${t.subject}: review ${parts}, then confirm or delete them.`;
        }
        case 'assess_threat': return `${t.subject}: assess the risk of "${t.detail}".`;
        case 'add_measure': return `${t.subject}: add a measure for the ${t.riskLevel} risk "${t.detail}" or accept it formally.`;
        case 'open_measure': return `${t.subject}: implement measure "${t.detail}".`;
        case 'failed_test': return `${t.subject}: security test "${t.detail}" failed.`;
        case 'ci_gate': return `Release gate: ${t.detail}`;
        case 'model_finding': return `${modelCheckTranslations.en.menu}: ${modelCheckTranslations.en.rules[t.ruleId as keyof typeof modelCheckTranslations.en.rules].title(t.params ?? {})}`;
        default: return t.text;
      }
    },
  },
};

const de: typeof en = {
  tab: 'Fahrplan',
  tabs: { design: 'Architektur & Risiken', operations: 'SBOM & Schwachstellen', documents: 'Dokumente', csaf: 'Advisories & Meldungen' },
  bar: {
    label: (n, total) => `Nächster Schritt · ${n}/${total}`,
    open: 'Fahrplan öffnen',
    allDone: 'Alle Stationen des Fahrplans sind erledigt.',
  },
  art14: {
    title: (n) => (n === 1 ? 'Art.-14-Meldefall offen' : `${n} Art.-14-Meldefälle offen`),
    due: (step, h) => `${step} fällig in ${h < 48 ? `${Math.max(1, Math.round(h))} Std.` : `${Math.round(h / 24)} Tagen`}`,
    overdue: (step, h) => `${step} seit ${-h < 48 ? `${Math.max(1, Math.round(-h))} Std.` : `${Math.round(-h / 24)} Tagen`} überfällig`,
    waiting: 'Gerade ist keine Meldung fällig',
    open: 'Meldefälle öffnen',
  },
  introCard: {
    title: 'So funktioniert das Tool',
    points: [
      'Der Fahrplan zeigt den nächsten Schritt. „Weiter" bringt Sie an die richtige Stelle.',
      'In den Tabs findet die Arbeit statt. Die Leiste unter den Tabs zeigt immer den nächsten Schritt und führt hierher zurück.',
      'Was zum Unternehmen gehört (Kontakt, security.txt, Richtlinien, SDL), legen Sie einmal unter Organisation fest; es gilt für alle Produkte.',
    ],
    ok: 'Verstanden',
    tour: 'Canvas-Tour starten',
  },
  title: 'CRA-Fahrplan',
  intro: 'Zehn Stationen von der Einstufung bis nach dem Release. Der Status ergibt sich aus Ihren Projektdaten; arbeiten Sie sie von oben nach unten ab.',
  status: { open: 'Offen', progress: 'In Arbeit', done: 'Erledigt' },
  continue: 'Weiter',
  whatIsMissing: 'Was noch offen ist',
  allDone: 'In dieser Station ist alles erledigt.',
  decided: (done, total) => `${done} von ${total} Anforderungen entschieden`,
  stations: {
    classify: { title: 'Einstufung', why: 'Die Produktklasse (Anhang III/IV) entscheidet, ob eine Selbstbewertung genügt oder eine benannte Stelle nötig ist.' },
    risk: { title: 'Risikoanalyse', why: 'Die Cybersicherheits-Risikobewertung (Art. 13(2)) ist die Grundlage aller weiteren Entscheidungen.' },
    requirements: { title: 'Anforderungen', why: 'Für jede grundlegende Anforderung aus Anhang I Teil I: Gilt sie, und wie wird sie erfüllt? Daraus entsteht Ihr Statement of Applicability.' },
    secdev: { title: 'Sichere Entwicklung & CI', why: 'Automatische Prüfungen bei jedem Build (statische Analyse, Secret-Scan) belegen, dass Sicherheit laufend getestet wird.' },
    sbom: { title: 'SBOM & Schwachstellen', why: 'Eine SBOM je Release und bewertete Funde: keine bekannten ausnutzbaren Schwachstellen beim Inverkehrbringen (Anhang I Teil I (2)(a)).' },
    vulnprocess: { title: 'Schwachstellenprozess', why: 'Kontaktstelle, Offenlegungsrichtlinie, Advisories und Updates: die Prozesse aus Anhang I Teil II. Kontaktstelle, Offenlegungsrichtlinie und die Anforderungen zum Informationsaustausch gehören zur Organisation: einmal im Bereich Organisation festlegen, jedes Produkt erbt sie.' },
    userinfo: { title: 'Nutzerinformationen', why: 'Was Nutzer mit dem Produkt erhalten müssen (Anhang II): Zweck, Risiken, Kontakt, Supportzeitraum, Anleitungen.' },
    techdoc: { title: 'Technische Dokumentation', why: 'Die Dokumentation für Behörden und benannte Stellen (Anhang VII). Kleinst- und Kleinunternehmen dürfen ein vereinfachtes Format nutzen (Art. 33(5)).' },
    release: { title: 'Konformität & Release', why: 'EU-Konformitätserklärung, ein grünes Release-Gate und eine eingefrorene Version als prüfsicherer Stand.' },
    postmarket: { title: 'Nach dem Release', why: 'Im Supportzeitraum: Schwachstellen überwachen, neue Funde bewerten, Updates liefern, aktiv ausgenutzte melden (Art. 14).' },
  },
  checks: {
    class_set: 'Produktklasse ist festgelegt',
    has_threats: 'Mindestens eine bestätigte Bedrohung',
    drafts_confirmed: 'Vorgeschlagene Bedrohungen und Assets geprüft',
    threats_assessed: 'Jede Bedrohung als Risiko bewertet',
    risks_treated: 'Jedes Risiko hat eine Maßnahme oder ist akzeptiert',
    model_clean: 'Architektur-Check ohne offene Funde mit hoher oder mittlerer Schwere',
    er_decided: 'Alle Anforderungen aus Anhang I Teil I entschieden',
    ci_sast: 'Statische Analyse läuft in der CI',
    ci_secrets: 'Secret-Scan läuft in der CI',
    sbom_present: 'SBOM für die aktuelle Version',
    vulns_triaged: 'Keine unbewerteten High/Critical-Schwachstellen',
    vh_decided: 'Anforderungen zur Schwachstellenbehandlung entschieden',
    publisher_contact: 'Kontakt für Schwachstellenmeldungen im Organisationsprofil',
    ut_decided: 'Anforderungen an Nutzerinformationen entschieden',
    intended_purpose: 'Bestimmungsgemäßer Zweck beschrieben',
    support_end: 'Ende des Supportzeitraums festgelegt',
    annex2_ready: 'Nutzerinformationen (Anhang II) vollständig',
    td_decided: 'Anforderungen an die technische Dokumentation entschieden',
    support_rationale: 'Supportzeitraum begründet',
    doc_decided: 'EU-Konformitätserklärung entschieden (UT.5)',
    declaration_ready: 'Entwurf der Konformitätserklärung vollständig',
    gate_pass: 'Release-Gate bestanden',
    version_frozen: 'Mindestens eine Version eingefroren',
    assessment_approved: 'Assessment durch Prüfende freigegeben',
    support_running: 'Supportzeitraum läuft noch',
    cve_monitoring: 'Schwachstellenüberwachung lief in den letzten 7 Tagen',
    reports_on_time: 'Keine überfällige Art.-14-Meldung',
  },
  next: {
    product: 'Produktdaten bearbeiten',
    docs: { 'docs-manufacturer': 'Hersteller- und Produktdaten', 'docs-userinfo': 'Nutzerinformationen erzeugen (Anhang II)', 'docs-techdoc': 'Punkte aus Anhang VII ausfüllen', 'docs-declaration': 'Konformitätserklärung vorbereiten' } as Record<string, string>,
    tasks: 'Aufgabenliste öffnen',
    design: 'Canvas öffnen',
    operations: 'SBOM & Schwachstellen öffnen',
    csaf: 'Advisories & Meldungen öffnen',
    reporting: 'Art.-14-Meldefälle öffnen',
    dashboard: 'Berichte & Exporte öffnen (PDF-Dossier)',
    organisation: 'Organisations-Kontakt & Richtlinie festlegen',
    checklist: (group) => `Checkliste ${group} öffnen`,
  },
  supportDays: (days) => (days >= 0 ? `Noch ${days} Tage bis Supportende` : `Support seit ${-days} Tagen beendet`),
  monitoringHint: 'Die Schwachstellenüberwachung läuft in der App alle CVE_SCAN_INTERVAL_HOURS (Standard 24 h, Pro-Lizenz nötig). Es wurde kein aktueller Scan erfasst: Serverlog prüfen und ob die Einstellung nicht 0 ist.',
  sdlNote: (done) => `BSI-TR-03185-SDL-Checkliste (organisationsweit): ${done} Punkte erledigt (Organisation).`,
  proHint: 'CI-Nachweise, SBOM und Release-Gate benötigen eine Pro-Lizenz.',
  product: {
    title: 'Produktdaten',
    craClass: 'CRA-Produktklasse',
    classes: { default: 'Standard (nicht in Anhang III/IV)', 'class-i': 'Wichtig, Klasse I (Anhang III)', 'class-ii': 'Wichtig, Klasse II (Anhang III)', critical: 'Kritisch (Anhang IV)' },
    unset: '- nicht festgelegt -',
    scopeCheck: 'Unsicher? Kostenloser Scope-Check (CRA-Klartext)',
    conformity: 'Konformitätsbewertung',
    notifiedBody: { no: 'Keine benannte Stelle nötig', 'unless-standards': 'Benannte Stelle, außer harmonisierte Normen werden vollständig angewandt', yes: 'Benannte Stelle oder Zertifizierung nötig' },
    procedures: 'Mögliche Verfahren',
    intendedPurpose: 'Bestimmungsgemäßer Zweck',
    intendedPurposeHint: 'Wofür das Produkt gedacht ist, seine Sicherheitsumgebung und wesentlichen Funktionen (Anhang II Nr. 4).',
    supportEnd: 'Ende des Supportzeitraums',
    supportEndHint: 'Bis wann Schwachstellen behandelt und Sicherheitsupdates bereitgestellt werden (Art. 13(8), in der Regel mindestens 5 Jahre).',
    supportRationale: 'Begründung des Supportzeitraums',
    supportRationaleHint: 'Warum dieser Zeitraum, z. B. erwartete Nutzungsdauer (Anhang VII Nr. 4).',
    iec62443: 'Zusätzlich nach IEC 62443 bewerten',
    iec62443Hint: 'Für Industrie- und OT-Produkte: ergänzt Security Level, IEC-62443-Anforderungen je Komponente und eine IEC-Seite im Bericht. Für den CRA nicht nötig.',
    saved: 'Gespeichert',
    close: 'Schließen',
  },
  checklist: {
    title: 'CRA-Checkliste (gesamtes Produkt)',
    intro: 'Eine Entscheidung je Anforderung für das ganze Produkt. Sie hat im Statement of Applicability Vorrang vor Zuordnungen einzelner Komponenten.',
    groups: { ER: 'Anhang I Teil I', VH: 'Anhang I Teil II', UT: 'Anhang II / V', TD: 'Anhang VII' },
    status: { compliant: 'Erfüllt', partial: 'Teilweise', 'non-compliant': 'Nicht erfüllt', 'not-applicable': 'Nicht anwendbar' },
    clear: 'Zurücksetzen',
    note: 'Begründung / Nachweis',
    componentHint: (n) => `${n} Komponenten-Zuordnung(en)`,
    howTo: 'So setzen Sie das um',
    why: 'Warum',
    evidence: 'Nachweis',
    ci: (source) => `Kann automatisch aus der CI belegt werden (SBOM & Schwachstellen → CI/CD, Quelle ${source}).`,
    unreviewed: 'Entwurf, noch nicht fachlich geprüft.',
    org: { inherited: 'Für die Organisation festgelegt', differs: 'Weicht von der Organisation ab', change: 'Im Bereich Organisation ändern', reset: 'Auf Organisation zurücksetzen' },
  },
  tasks: {
    title: 'Aufgabenliste',
    intro: 'Was in der Risikoanalyse noch offen ist, Dringendes zuerst. Ein Klick springt an die Stelle, an der es erledigt wird.',
    empty: 'Gerade ist nichts offen. Neue Funde oder fehlgeschlagene Prüfungen erscheinen hier.',
    confirmAll: 'Alle bestätigen',
    open: 'Öffnen',
    draftNote: 'Vorgeschlagene Bedrohungen und Assets stammen aus Vorlagen für den Komponententyp. Sie zählen erst, wenn Sie sie bestätigt haben; prüfen Sie sie, bevor Sie die Analyse in einem Audit verwenden.',
    text: (t) => {
      switch (t.kind) {
        case 'confirm_draft': {
          const parts = [
            t.draftCounts?.threats ? `${t.draftCounts.threats} vorgeschlagene ${t.draftCounts.threats === 1 ? 'Bedrohung' : 'Bedrohungen'}` : '',
            t.draftCounts?.assets ? `${t.draftCounts.assets} vorgeschlagene${t.draftCounts.assets === 1 ? 's Asset' : ' Assets'}` : '',
          ].filter(Boolean).join(' und ');
          return `${t.subject}: ${parts} prüfen, dann bestätigen oder löschen.`;
        }
        case 'assess_threat': return `${t.subject}: Risiko von „${t.detail}" bewerten.`;
        case 'add_measure': return `${t.subject}: Maßnahme für das Risiko „${t.detail}" (${t.riskLevel}) festlegen oder formal akzeptieren.`;
        case 'open_measure': return `${t.subject}: Maßnahme „${t.detail}" umsetzen.`;
        case 'failed_test': return `${t.subject}: Sicherheitstest „${t.detail}" fehlgeschlagen.`;
        case 'ci_gate': return `Release-Gate: ${t.detail}`;
        case 'model_finding': return `${modelCheckTranslations.de.menu}: ${modelCheckTranslations.de.rules[t.ruleId as keyof typeof modelCheckTranslations.de.rules].title(t.params ?? {})}`;
        default: return t.text;
      }
    },
  },
};

export const journeyTranslations = { en, de };
export type JourneyT = typeof en;

export function useJourneyT(): JourneyT {
  const lang = useLanguageStore((s) => s.lang);
  return journeyTranslations[lang];
}
