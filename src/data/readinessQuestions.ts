/**
 * CRA readiness self-assessment: 27 questions in 7 areas, own wording based on the obligations of
 * Regulation (EU) 2024/2847 (no BSI text). `scope` says whether the answer is a property of the
 * organisation (asked once for all products) or of the product.
 */
import type { StationId } from '@/utils/deriveJourney';

export type ReadinessArea = 'roles' | 'secdev' | 'components' | 'vulnhandling' | 'reporting' | 'updates' | 'docs';
export const READINESS_AREAS: readonly ReadinessArea[] = ['roles', 'secdev', 'components', 'vulnhandling', 'reporting', 'updates', 'docs'];

type Text = { de: string; en: string };

export interface ReadinessQuestion {
  id: string;
  area: ReadinessArea;
  scope: 'org' | 'product';
  /** Roadmap station that closes the gap. */
  station: StationId;
  q: Text;
  hint: Text;
}

export const AREA_LABEL: Record<ReadinessArea, Text> = {
  roles: { de: 'Rollen & Verantwortung', en: 'Roles & responsibility' },
  secdev: { de: 'Sichere Entwicklung', en: 'Secure development' },
  components: { de: 'SBOM & Komponenten', en: 'SBOM & components' },
  vulnhandling: { de: 'Schwachstellenbehandlung', en: 'Vulnerability handling' },
  reporting: { de: 'Meldepflichten', en: 'Reporting duties' },
  updates: { de: 'Updates & Support', en: 'Updates & support' },
  docs: { de: 'Dokumentation & Konformität', en: 'Documentation & conformity' },
};

export const READINESS_QUESTIONS: ReadinessQuestion[] = [
  // ── Roles & responsibility ──
  { id: 'R01', area: 'roles', scope: 'org', station: 'vulnprocess',
    q: { de: 'Ist eine Person für die Cybersicherheit der Produkte verantwortlich?', en: 'Is one person responsible for the cybersecurity of your products?' },
    hint: { de: 'Auch in kleinen Teams braucht es einen Namen, nicht ein „wir alle".', en: 'Even in small teams it needs a name, not "all of us".' } },
  { id: 'R02', area: 'roles', scope: 'org', station: 'vulnprocess',
    q: { de: 'Gibt es eine Kontaktstelle für Sicherheitsmeldungen, die tatsächlich gelesen wird und eine Vertretung hat?', en: 'Is there a contact for security reports that is actually read and has a deputy?' },
    hint: { de: 'Eine Sammel-Mailadresse reicht, wenn sie jemand beobachtet.', en: 'A shared mailbox is enough if somebody watches it.' } },
  { id: 'R03', area: 'roles', scope: 'org', station: 'classify',
    q: { de: 'Ist klar, dass Sie als Hersteller gelten (Sie bringen das Produkt unter Ihrem Namen in Verkehr)?', en: 'Is it clear that you count as the manufacturer (you place the product on the market under your name)?' },
    hint: { de: 'Der Hersteller trägt alle Pflichten, auch wenn Teile zugekauft sind.', en: 'The manufacturer carries all obligations, even if parts are bought in.' } },

  // ── Secure development ──
  { id: 'D01', area: 'secdev', scope: 'product', station: 'requirements',
    q: { de: 'Werden Sicherheitsanforderungen je Release festgelegt (nicht erst am Ende)?', en: 'Are security requirements defined per release (not only at the end)?' },
    hint: { de: 'Z. B. als Punkte in der Anforderungsliste oder im Backlog.', en: 'For example as items in the requirements list or backlog.' } },
  { id: 'D02', area: 'secdev', scope: 'product', station: 'secdev',
    q: { de: 'Wird jede Änderung vor dem Zusammenführen von einer zweiten Person geprüft (Review)?', en: 'Is every change reviewed by a second person before merging?' },
    hint: { de: 'Pull-Request-Review mit Pflicht zur Freigabe.', en: 'Pull request review with mandatory approval.' } },
  { id: 'D03', area: 'secdev', scope: 'product', station: 'secdev',
    q: { de: 'Laufen automatische Sicherheitsprüfungen bei jedem Build (statische Analyse, Secret-Scan, Abhängigkeitsscan)?', en: 'Do automated security checks run on every build (static analysis, secret scan, dependency scan)?' },
    hint: { de: 'Siehe Station „Sichere Entwicklung & CI".', en: 'See the "Secure development & CI" station.' } },
  { id: 'D04', area: 'secdev', scope: 'product', station: 'secdev',
    q: { de: 'Wird das Release in einer kontrollierten Umgebung gebaut und ist es nachvollziehbar (Version, Commit, Build)?', en: 'Is the release built in a controlled environment and traceable (version, commit, build)?' },
    hint: { de: 'Nicht vom Laptop einer Person, sondern aus der Pipeline.', en: 'From the pipeline, not from one person\'s laptop.' } },
  { id: 'D05', area: 'secdev', scope: 'org', station: 'secdev',
    q: { de: 'Kennen die Entwickelnden die häufigsten Schwachstellenarten und wie man sie vermeidet?', en: 'Do the developers know the most common vulnerability classes and how to avoid them?' },
    hint: { de: 'Eine kurze Schulung oder ein Leitfaden genügt als Anfang.', en: 'A short training or guideline is a good start.' } },

  // ── SBOM & components ──
  { id: 'C01', area: 'components', scope: 'product', station: 'sbom',
    q: { de: 'Entsteht für jedes Release automatisch eine SBOM (CycloneDX oder SPDX)?', en: 'Is an SBOM (CycloneDX or SPDX) generated automatically for every release?' },
    hint: { de: 'Mit Name und Version jedes Bestandteils.', en: 'With name and version of every component.' } },
  { id: 'C02', area: 'components', scope: 'org', station: 'sbom',
    q: { de: 'Werden neue Fremdkomponenten vor der Übernahme geprüft (Pflegezustand, Lizenz, bekannte Schwachstellen)?', en: 'Are new third-party components checked before adoption (maintenance state, licence, known vulnerabilities)?' },
    hint: { de: 'Sie tragen die Verantwortung für das, was Sie einbauen (Art. 13(5)).', en: 'You are responsible for what you build in (Art. 13(5)).' } },
  { id: 'C03', area: 'components', scope: 'product', station: 'sbom',
    q: { de: 'Werden Abhängigkeiten regelmäßig aktualisiert?', en: 'Are dependencies updated regularly?' },
    hint: { de: 'Z. B. mit automatischen Update-Vorschlägen und monatlichem Blick darauf.', en: 'For example with automated update proposals and a monthly look at them.' } },

  // ── Vulnerability handling ──
  { id: 'V01', area: 'vulnhandling', scope: 'org', station: 'vulnprocess',
    q: { de: 'Ist eine Richtlinie zur koordinierten Offenlegung (CVD) veröffentlicht?', en: 'Is a coordinated vulnerability disclosure (CVD) policy published?' },
    hint: { de: 'Kontakt, Reaktionszeiten und Ablauf für Meldende.', en: 'Contact, response times and process for reporters.' } },
  { id: 'V02', area: 'vulnhandling', scope: 'org', station: 'vulnprocess',
    q: { de: 'Ist eine security.txt auf Ihrer Website erreichbar?', en: 'Is a security.txt available on your website?' },
    hint: { de: 'Der Generator unter Organisation erzeugt sie.', en: 'The generator in the Organisation area creates it.' } },
  { id: 'V03', area: 'vulnhandling', scope: 'org', station: 'vulnprocess',
    q: { de: 'Gibt es einen festen Ablauf, wie gemeldete Schwachstellen bewertet und mit Zielzeiten behoben werden?', en: 'Is there a fixed process for assessing reported vulnerabilities and fixing them within target times?' },
    hint: { de: 'Bewertung, Entscheidung, Fix, Test, Veröffentlichung.', en: 'Assessment, decision, fix, test, release.' } },
  { id: 'V04', area: 'vulnhandling', scope: 'org', station: 'vulnprocess',
    q: { de: 'Werden zu behobenen Schwachstellen Advisories veröffentlicht?', en: 'Are advisories published for fixed vulnerabilities?' },
    hint: { de: 'Beschreibung, betroffene Versionen, Schweregrad, korrigierte Version.', en: 'Description, affected versions, severity, fixed version.' } },
  { id: 'V05', area: 'vulnhandling', scope: 'product', station: 'postmarket',
    q: { de: 'Wird laufend beobachtet, ob in Ihren Komponenten neue Schwachstellen bekannt werden?', en: 'Do you continuously watch for new vulnerabilities in your components?' },
    hint: { de: 'Automatischer Abgleich der SBOM, nicht nur beim Release.', en: 'Automatic matching of the SBOM, not only at release time.' } },

  // ── Reporting duties ──
  { id: 'M01', area: 'reporting', scope: 'org', station: 'postmarket',
    q: { de: 'Kennt das Team die Meldepflicht für aktiv ausgenutzte Schwachstellen und schwere Vorfälle (24 h, 72 h, 14 Tage)?', en: 'Does the team know the duty to report actively exploited vulnerabilities and severe incidents (24 h, 72 h, 14 days)?' },
    hint: { de: 'Art. 14, gilt ab dem 11. September 2026.', en: 'Art. 14, applies from 11 September 2026.' } },
  { id: 'M02', area: 'reporting', scope: 'org', station: 'postmarket',
    q: { de: 'Ist festgelegt, wer die Meldung abgibt und wer ihn vertritt?', en: 'Is it defined who files the report and who deputises?' },
    hint: { de: 'Innerhalb von 24 Stunden muss jemand handeln können, auch am Wochenende.', en: 'Within 24 hours somebody must be able to act, also on weekends.' } },
  { id: 'M03', area: 'reporting', scope: 'org', station: 'postmarket',
    q: { de: 'Gibt es ein Verfahren, um zu erkennen, ob eine Schwachstelle aktiv ausgenutzt wird?', en: 'Is there a way to detect whether a vulnerability is being actively exploited?' },
    hint: { de: 'Z. B. Abgleich mit dem CISA-KEV-Katalog und den Quellen Ihrer CSIRT.', en: 'For example matching against the CISA KEV catalogue and the sources of your CSIRT.' } },

  // ── Updates & support ──
  { id: 'U01', area: 'updates', scope: 'product', station: 'release',
    q: { de: 'Können Sicherheitsupdates für alle Softwarebestandteile an die Nutzer ausgeliefert werden?', en: 'Can security updates be delivered to users for every software part?' },
    hint: { de: 'Auch für Firmware und Container, inkl. Rückfall bei fehlgeschlagenem Update.', en: 'Also for firmware and containers, including fallback on a failed update.' } },
  { id: 'U02', area: 'updates', scope: 'product', station: 'release',
    q: { de: 'Sind Updates signiert und wird die Signatur vor der Installation geprüft?', en: 'Are updates signed and is the signature verified before installation?' },
    hint: { de: 'Schützt den Update-Weg vor Missbrauch.', en: 'Protects the update channel from abuse.' } },
  { id: 'U03', area: 'updates', scope: 'product', station: 'userinfo',
    q: { de: 'Ist der Supportzeitraum festgelegt und den Nutzern mitgeteilt?', en: 'Is the support period defined and communicated to users?' },
    hint: { de: 'Mit Enddatum, in der Regel mindestens fünf Jahre (Art. 13(8)).', en: 'With an end date, usually at least five years (Art. 13(8)).' } },
  { id: 'U04', area: 'updates', scope: 'org', station: 'userinfo',
    q: { de: 'Sind Sicherheitsupdates im Supportzeitraum kostenlos?', en: 'Are security updates free of charge during the support period?' },
    hint: { de: 'Das Gesetz verlangt es, auch bei Abo-Modellen.', en: 'The law requires it, also for subscription models.' } },

  // ── Documentation & conformity ──
  { id: 'K01', area: 'docs', scope: 'product', station: 'risk',
    q: { de: 'Ist eine Cybersicherheits-Risikobewertung für das Produkt dokumentiert?', en: 'Is a cybersecurity risk assessment documented for the product?' },
    hint: { de: 'Die Risikoanalyse im Canvas erfüllt das, wenn sie aktuell ist.', en: 'The risk analysis in the canvas fulfils it when it is current.' } },
  { id: 'K02', area: 'docs', scope: 'org', station: 'techdoc',
    q: { de: 'Wird die technische Dokumentation mindestens 10 Jahre oder für den Supportzeitraum aufbewahrt (je nachdem, was länger ist)?', en: 'Is the technical documentation kept for at least 10 years or the support period, whichever is longer?' },
    hint: { de: 'Behörden können sie anfordern.', en: 'Authorities can request it.' } },
  { id: 'K03', area: 'docs', scope: 'product', station: 'userinfo',
    q: { de: 'Erhalten Nutzer Informationen und Anleitungen nach Anhang II (Kontakt, Zweck, Risiken, Support, Updates, Außerbetriebnahme)?', en: 'Do users receive information and instructions per Annex II (contact, purpose, risks, support, updates, decommissioning)?' },
    hint: { de: 'Siehe Station „Nutzerinformationen".', en: 'See the "User information" station.' } },
  { id: 'K04', area: 'docs', scope: 'product', station: 'classify',
    q: { de: 'Ist die Produktklasse und damit das Konformitätsverfahren geklärt?', en: 'Is the product class, and with it the conformity procedure, settled?' },
    hint: { de: 'Selbstbewertung oder benannte Stelle (Art. 32).', en: 'Self-assessment or notified body (Art. 32).' } },
  { id: 'K05', area: 'docs', scope: 'product', station: 'release',
    q: { de: 'Ist die EU-Konformitätserklärung vorbereitet und wird die CE-Kennzeichnung angebracht?', en: 'Is the EU declaration of conformity prepared and the CE marking affixed?' },
    hint: { de: 'Anhang V, vor dem Inverkehrbringen.', en: 'Annex V, before placing on the market.' } },
];
