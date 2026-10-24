import { useLanguageStore } from '@/store/languageStore';

const en = {
  trial: { label: 'Trial License', body: 'This installation runs in trial mode. Pro features are locked once the trial licence expires.' },
  banner: {
    frozen: (n: number, label: string | null) => `Version ${n}${label ? ` - ${label}` : ''} is frozen`,
    by: (name: string) => ` · approved by ${name}`,
    on: (d: string) => ` on ${d}`,
    readOnly: '. No changes possible.',
  },
  freeze: {
    title: 'Freeze version',
    body: 'The current version is frozen. The risk assessment and SBOM are saved as a fixed state. A new active version starts automatically.',
    label: 'Version label', placeholder: 'e.g. 1.0 or CRA-Audit-2026-Q2',
    required: 'Please enter a version label.', failed: 'Could not freeze.',
    cancel: 'Cancel', busy: 'Freezing…', submit: 'Freeze version',
  },
  branch: {
    title: 'Create new working copy',
    body: (label: string) => `A full copy of version ${label} is created. The original stays frozen and unchanged.`,
    name: 'Name of the new working copy', failed: 'Could not create the working copy.',
    cancel: 'Cancel', busy: 'Creating…', submit: 'Create working copy',
  },
  txt: {
    title: 'BSI TR-03183-3 security.txt & CVD policy generator',
    subtitle: 'RFC 9116 / RFC 9580 compliant security contacts and coordinated disclosure',
    section: 'Contact & domain details',
    domain: 'Website domain:', psirt: 'PSIRT email (contact 1 - product security):', csirt: 'CSIRT email (contact 2 - infrastructure):',
    web: 'Report page / web form (contact 3):', pgp: 'OpenPGP public key URI (.asc):', policy: 'CVD policy URL:', csaf: 'CSAF provider metadata URI:',
    expires: 'Validity (max. 365 days):',
    copy: 'Copy', copied: 'Copied', download: 'Download',
    hintA: 'Note: place the generated ', hintB: ' at ', hintC: ' and sign it with OpenPGP as per RFC 9580.',
  },
};

const de: typeof en = {
  trial: { label: 'Trial License', body: 'Diese Installation läuft im Testbetrieb. Nach Ablauf der Testlizenz werden Pro-Funktionen gesperrt.' },
  banner: {
    frozen: (n, label) => `Version ${n}${label ? ` - ${label}` : ''} ist eingefroren`,
    by: (name) => ` · freigegeben von ${name}`,
    on: (d) => ` am ${d}`,
    readOnly: '. Keine Änderungen möglich.',
  },
  freeze: {
    title: 'Version einfrieren',
    body: 'Die aktuelle Version wird eingefroren. Risikoanalyse und SBOM werden als fester Stand gespeichert. Anschließend startet automatisch eine neue aktive Version.',
    label: 'Versionsbezeichnung', placeholder: 'z.B. 1.0 oder CRA-Audit-2026-Q2',
    required: 'Bitte eine Versionsbezeichnung eingeben.', failed: 'Fehler beim Einfrieren.',
    cancel: 'Abbrechen', busy: 'Wird eingefroren…', submit: 'Version einfrieren',
  },
  branch: {
    title: 'Neue Arbeitskopie erstellen',
    body: (label) => `Es wird eine vollständige Kopie von Version ${label} erstellt. Das Original bleibt eingefroren und unverändert.`,
    name: 'Name der neuen Arbeitskopie', failed: 'Fehler beim Erstellen der Arbeitskopie.',
    cancel: 'Abbrechen', busy: 'Wird erstellt...', submit: 'Arbeitskopie erstellen',
  },
  txt: {
    title: 'BSI TR-03183-3 security.txt & CVD-Policy Generator',
    subtitle: 'RFC 9116 / RFC 9580 konforme Sicherheitskontakte und koordinierte Offenlegung',
    section: 'Kontakt- & Domänenangaben',
    domain: 'Website Domain:', psirt: 'PSIRT E-Mail (Kontakt 1 - Produktsicherheit):', csirt: 'CSIRT E-Mail (Kontakt 2 - Infrastruktur):',
    web: 'Meldeseite / Webformular (Kontakt 3):', pgp: 'OpenPGP Public Key URI (.asc):', policy: 'CVD Policy URL:', csaf: 'CSAF Provider-Metadata URI:',
    expires: 'Gültigkeitsdauer (Max. 365 Tage):',
    copy: 'Kopieren', copied: 'Kopiert', download: 'Download',
    hintA: 'Hinweis: Platzieren Sie die generierte ', hintB: ' unter ', hintC: ' und signieren Sie diese mit OpenPGP gemäß RFC 9580.',
  },
};

export function useChromeT() {
  const lang = useLanguageStore((s) => s.lang);
  return { t: { en, de }[lang], lang };
}
