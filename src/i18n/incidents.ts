import { useLanguageStore } from '@/store/languageStore';
import type { Step } from '@/lib/craIncident';

const en = {
  title: 'Art. 14 reporting cases',
  intro: 'Actively exploited vulnerabilities and severe incidents must be reported to your CSIRT and ENISA via the single reporting platform. Canvas tracks the deadlines; you submit on the platform and tick the step here.',
  none: 'No open cases. Cases start automatically when a finding is listed as actively exploited (CISA KEV), or you can open one yourself.',
  newCase: 'Open a case',
  kind: { vulnerability: 'Actively exploited vulnerability', incident: 'Severe incident' },
  fields: { title: 'Title', cve: 'CVE (optional)', aware: 'Aware since', states: 'Member states where the product is available', save: 'Open case', cancel: 'Cancel' },
  source: { kev: 'detected automatically (CISA KEV)', manual: 'opened manually' },
  steps: { early: 'Early warning (24 h)', notification: 'Notification (72 h)', final: 'Final report' } as Record<Step, string>,
  finalHint: {
    vulnerability: 'Due 14 days after a corrective or mitigating measure is available.',
    incident: 'Due one month after the incident notification was submitted.',
  },
  measure: 'Corrective or mitigating measure available since',
  waiting: 'Not due yet: set the date a measure is available',
  due: (d: string) => `due ${d}`,
  estimated: (d: string) => `due at the latest ${d}`,
  state: { submitted: 'Submitted', pending: 'Open', due_soon: 'Due soon', overdue: 'Overdue', waiting: 'Waiting' } as Record<string, string>,
  submit: 'Mark as submitted', undo: 'Undo', submittedAt: (d: string) => `submitted ${d}`,
  hoursLeft: (h: number) => (h >= 48 ? `${Math.floor(h / 24)} days left` : `${Math.max(0, Math.floor(h))} h left`),
  overdueBy: (h: number) => `${Math.ceil(-h)} h overdue`,
  closeCase: 'Close case', reopen: 'Reopen', closed: 'Closed', remove: 'Delete',
  confirmDelete: 'Delete this case?',
  earlyJson: 'Download early-warning data (JSON)',
  platform: 'Submit on the ENISA single reporting platform (Art. 16)',
  notes: 'Notes',
  openCases: (n: number) => `${n} open case(s)`,
};

const de: typeof en = {
  title: 'Art.-14-Meldefälle',
  intro: 'Aktiv ausgenutzte Schwachstellen und schwerwiegende Vorfälle müssen Ihrem CSIRT und der ENISA über die zentrale Meldeplattform gemeldet werden. Canvas überwacht die Fristen; Sie melden auf der Plattform und haken den Schritt hier ab.',
  none: 'Keine offenen Fälle. Ein Fall startet automatisch, wenn ein Fund als aktiv ausgenutzt gelistet ist (CISA KEV), oder Sie eröffnen selbst einen.',
  newCase: 'Fall eröffnen',
  kind: { vulnerability: 'Aktiv ausgenutzte Schwachstelle', incident: 'Schwerwiegender Vorfall' },
  fields: { title: 'Titel', cve: 'CVE (optional)', aware: 'Bekannt seit', states: 'Mitgliedstaaten, in denen das Produkt verfügbar ist', save: 'Fall eröffnen', cancel: 'Abbrechen' },
  source: { kev: 'automatisch erkannt (CISA KEV)', manual: 'manuell eröffnet' },
  steps: { early: 'Frühwarnung (24 h)', notification: 'Meldung (72 h)', final: 'Abschlussbericht' },
  finalHint: {
    vulnerability: 'Fällig 14 Tage nach Verfügbarkeit einer Korrektur- oder Abhilfemaßnahme.',
    incident: 'Fällig einen Monat nach Einreichung der Vorfallmeldung.',
  },
  measure: 'Korrektur- oder Abhilfemaßnahme verfügbar seit',
  waiting: 'Noch nicht fällig: Datum der verfügbaren Maßnahme eintragen',
  due: (d) => `fällig ${d}`,
  estimated: (d) => `spätestens fällig ${d}`,
  state: { submitted: 'Eingereicht', pending: 'Offen', due_soon: 'Bald fällig', overdue: 'Überfällig', waiting: 'Wartet' },
  submit: 'Als eingereicht markieren', undo: 'Rückgängig', submittedAt: (d) => `eingereicht ${d}`,
  hoursLeft: (h) => (h >= 48 ? `noch ${Math.floor(h / 24)} Tage` : `noch ${Math.max(0, Math.floor(h))} h`),
  overdueBy: (h) => `${Math.ceil(-h)} h überfällig`,
  closeCase: 'Fall schließen', reopen: 'Wieder öffnen', closed: 'Geschlossen', remove: 'Löschen',
  confirmDelete: 'Diesen Fall löschen?',
  earlyJson: 'Daten zur Frühwarnung herunterladen (JSON)',
  platform: 'Auf der zentralen ENISA-Meldeplattform melden (Art. 16)',
  notes: 'Notizen',
  openCases: (n) => `${n} offene(r) Fall/Fälle`,
};

export function useIncidentsT() {
  const lang = useLanguageStore((s) => s.lang);
  return { t: { en, de }[lang], lang };
}
