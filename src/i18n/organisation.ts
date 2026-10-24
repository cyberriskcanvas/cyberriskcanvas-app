import { useLanguageStore } from '@/store/languageStore';
import type { OrgStationId } from '@/utils/orgJourney';

const en = {
  title: 'Organisation',
  back: 'Back to projects',
  intro: 'The CRA puts requirements on you as the manufacturer and on every product. Set up here what belongs to the whole company: every product inherits it and can override a requirement in its own checklist.',
  readOnly: 'Only administrators can change the organisation. You see what is set.',
  updatedBy: (n: string) => `Last changed by ${n}`,
  progress: (done: number, total: number) => `${done} of ${total}`,
  status: { open: 'Open', progress: 'In progress', done: 'Done' },
  stations: {
    profile: { title: 'Profile & publisher', why: 'Who you are as the manufacturer. It appears in advisories (CSAF publisher), in the EU declaration of conformity and as the manufacturer in every document.' },
    contact: { title: 'Security contact', why: 'Where people report vulnerabilities (Annex I Part II): the contact, the security.txt and the CVD policy, published once for all products.' },
    requirements: { title: 'Vulnerability-handling requirements', why: 'VH.5 CVD policy, VH.6 sharing information on third-party vulnerabilities, VH.6a public contact point and VH.8a free security updates are properties of the company. Decide them once.' },
    sdl: { title: 'Secure development (SDL)', why: 'BSI TR-03185 describes the processes of your company, not of one product. Keep the checklist here.' },
    readiness: { title: 'Readiness (organisation)', why: 'The self-assessment questions about the whole organisation. The product questions are answered in each product.' },
  } as Record<OrgStationId, { title: string; why: string }>,
  missing: 'Still open',
  missingLabels: {
    name: 'Company name', publisher: 'Publisher name', namespace: 'Namespace URL', contact: 'Contact for vulnerability reports', domain: 'Website domain', psirt: 'PSIRT email',
    sdl: 'Checklist items not done', readiness: 'Questions not answered with "yes"',
  } as Record<string, string>,
  complete: 'Nothing open here.',
  sdl: { done: (a: number, b: number) => `${a} of ${b} items done`, level: { MUST: 'must', SHOULD: 'should', MAY: 'may' } as Record<string, string> },
  readiness: { answers: { yes: 'Yes', partly: 'Partly', no: 'No', unknown: "Don't know" } as Record<string, string>, note: 'Answer honestly: "don\'t know" counts like "no" until you find out.' },
  products: 'Products inherit this',
};

const de: typeof en = {
  title: 'Organisation',
  back: 'Zurück zu den Projekten',
  intro: 'Der CRA stellt Anforderungen an Sie als Hersteller und an jedes Produkt. Legen Sie hier fest, was zum ganzen Unternehmen gehört: Jedes Produkt erbt es und kann eine Anforderung in seiner eigenen Checkliste überschreiben.',
  readOnly: 'Nur Administratoren können die Organisation ändern. Sie sehen, was hinterlegt ist.',
  updatedBy: (n) => `Zuletzt geändert von ${n}`,
  progress: (done, total) => `${done} von ${total}`,
  status: { open: 'Offen', progress: 'In Arbeit', done: 'Erledigt' },
  stations: {
    profile: { title: 'Profil & Herausgeber', why: 'Wer Sie als Hersteller sind. Das erscheint in Advisories (CSAF-Publisher), in der EU-Konformitätserklärung und als Hersteller in jedem Dokument.' },
    contact: { title: 'Sicherheitskontakt', why: 'Wo Schwachstellen gemeldet werden (Anhang I Teil II): die Kontaktstelle, die security.txt und die CVD-Policy, einmal für alle Produkte veröffentlicht.' },
    requirements: { title: 'Anforderungen zum Schwachstellenmanagement', why: 'VH.5 CVD-Policy, VH.6 Informationsaustausch zu Drittkomponenten, VH.6a öffentliche Kontaktstelle und VH.8a kostenlose Sicherheitsupdates sind Eigenschaften des Unternehmens. Einmal entscheiden.' },
    sdl: { title: 'Sichere Entwicklung (SDL)', why: 'BSI TR-03185 beschreibt die Prozesse Ihres Unternehmens, nicht die eines Produkts. Führen Sie die Checkliste hier.' },
    readiness: { title: 'Reifegrad (Organisation)', why: 'Die Fragen der Selbsteinschätzung zur ganzen Organisation. Die Produktfragen beantworten Sie im jeweiligen Produkt.' },
  },
  missing: 'Noch offen',
  missingLabels: {
    name: 'Firmenname', publisher: 'Publisher-Name', namespace: 'Namespace-URL', contact: 'Kontakt für Schwachstellenmeldungen', domain: 'Website-Domain', psirt: 'PSIRT-E-Mail',
    sdl: 'Checklistenpunkte nicht erledigt', readiness: 'Fragen nicht mit „Ja" beantwortet',
  },
  complete: 'Hier ist nichts mehr offen.',
  sdl: { done: (a, b) => `${a} von ${b} Punkten erledigt`, level: { MUST: 'muss', SHOULD: 'soll', MAY: 'kann' } },
  readiness: { answers: { yes: 'Ja', partly: 'Teilweise', no: 'Nein', unknown: 'Weiß nicht' }, note: 'Antworten Sie ehrlich: „Weiß nicht" zählt wie „Nein", bis Sie es geklärt haben.' },
  products: 'Produkte erben das',
};

export function useOrganisationT() {
  const lang = useLanguageStore((s) => s.lang);
  return { t: { en, de }[lang], lang };
}
