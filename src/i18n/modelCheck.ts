// Texts of the architecture check (de/en): findings per rule, panel and node facts.
import { useLanguageStore } from '@/store/languageStore';
import type { Finding, RuleId } from '@/utils/modelCheck';

type P = Record<string, string>;
interface RuleText { title: (p: P) => string; why: (p: P) => string; fix: (p: P) => string }

const en = {
  menu: 'Architecture check',
  panel: {
    title: 'Architecture check',
    intro: 'Rules over your architecture model. Each finding names the requirement it touches; adopt it as a threat or dismiss it with a reason.',
    clean: 'No open findings. The rules found nothing to flag in the current model.',
    open: (n: number) => `${n} open`,
    dismissed: (n: number) => `${n} dismissed`,
    severity: { high: 'High', medium: 'Medium', low: 'Low' },
    adopt: 'Adopt as threat',
    adopted: 'Adopted',
    dismiss: 'Dismiss with reason',
    reasonPlaceholder: 'Why is this acceptable?',
    confirmDismiss: 'Dismiss',
    cancel: 'Cancel',
    restore: 'Restore',
    show: 'Show on canvas',
    refs: 'Requirements',
    close: 'Close',
    howto: 'Tip: state exposure and authentication of each component in its Overview tab so the rules can check them.',
  },
  facts: {
    title: 'Security facts (architecture check)',
    exposure: 'Exposure',
    exposureOptions: { internet: 'Reachable from the internet', 'local-network': 'Local network only', physical: 'Physical access only', none: 'Not reachable from outside' },
    authentication: 'Authentication',
    authenticationOptions: { none: 'None', password: 'Password', mfa: 'Multi-factor', certificate: 'Certificate' },
    personalData: 'Processes personal data',
    notSet: '- not stated -',
  },
  task: (t: { subject?: string; detail?: string }) => `Architecture check: ${t.detail} (${t.subject ?? ''})`,
  rules: {
    M01: {
      title: (p) => `Unencrypted link ${p.from} → ${p.to}`,
      why: (p) => `The ${p.protocol} connection crosses a trust boundary without encryption. Data can be read or changed on the way.`,
      fix: () => 'Use an encrypted variant (TLS / VPN) or document a compensating measure for the link.',
    },
    M02: {
      title: (p) => `Insecure protocol ${p.protocol} (${p.from} → ${p.to})`,
      why: () => 'The protocol offers no confidentiality or authentication by itself, so anyone with network access inside the zone can listen or inject.',
      fix: () => 'Switch to the secured variant (e.g. MQTT/TLS, HTTPS, OPC-UA with security) or segment the network and justify the residual risk.',
    },
    M03: {
      title: (p) => (p.stated === 'none' ? `${p.component} is reachable from the internet without authentication` : `${p.component} is reachable from the internet, authentication not stated`),
      why: (p) => (p.stated === 'none' ? 'Anyone on the internet can use the component. Annex I Part I (2)(d) requires protection against unauthorised access.' : 'It is not documented how users and systems authenticate. Without that, access control cannot be assessed.'),
      fix: () => 'State the authentication method in the component Overview, or add one (password with lockout, MFA, certificates).',
    },
    M04: {
      title: (p) => `${p.exposed} is connected directly to the critical component ${p.critical}`,
      why: () => 'An internet-exposed component with a direct link to a critical component gives attackers a short path. A gateway or DMZ limits the damage of a compromise.',
      fix: () => 'Insert a gateway/firewall or separate zone between them, and filter what may pass.',
    },
    M05: {
      title: (p) => `Maintenance interface ${p.component} is reachable beyond physical access`,
      why: () => 'Debug and maintenance interfaces often bypass security functions. They should only be usable with physical access.',
      fix: () => 'Restrict the interface to physical access, disable it in production, or protect it with strong authentication.',
    },
    M06: {
      title: (p) => `Personal data in ${p.component} without confidentiality decision`,
      why: () => 'Data at rest and in transit has to be protected (Annex I Part I (2)(e)) and limited to what is needed (2)(g).',
      fix: () => 'Decide requirement ER.6 for the product (met, or not applicable with reason) and record the encryption measure.',
    },
    M07: {
      title: (p) => `Link ${p.from} (${p.slFrom}) → ${p.to} (${p.slTo}) has no conduit description`,
      why: () => 'IEC 62443-3-2 expects the conduit between zones of different security levels to be described and protected.',
      fix: () => 'Describe the conduit in the connection details (what passes, how it is filtered, who may use it).',
    },
    M08: {
      title: (p) => `${p.component} has no version`,
      why: () => 'Without a version the component cannot be matched against vulnerability databases or listed correctly in the SBOM.',
      fix: () => 'Enter the version in the component Overview.',
    },
    M09: {
      title: (p) => `Backend ${p.component} was not analysed`,
      why: () => 'Remote data processing solutions that belong to your product are in scope of the CRA and need their own threat analysis.',
      fix: () => 'Add threats and assets for the backend.',
    },
    M10: {
      title: (p) => `${p.component} has neither assets nor threats`,
      why: () => 'A component nobody looked at is a blind spot in the risk assessment.',
      fix: () => 'Add its assets and threats, or remove it from the model if it is out of scope.',
    },
    M11: {
      title: (p) => `Attack path ${p.entry} → ${p.target} (score ${p.score}) without any measure`,
      why: () => 'A realistic path from an entry point to a critical component exists and no component along it has a mitigation measure.',
      fix: () => 'Add measures on the path, ideally at the entry point or in front of the critical component.',
    },
  } as Record<RuleId, RuleText>,
};

const de: typeof en = {
  menu: 'Architektur-Check',
  panel: {
    title: 'Architektur-Check',
    intro: 'Regeln über Ihr Architekturmodell. Jeder Fund nennt die betroffene Anforderung; übernehmen Sie ihn als Bedrohung oder verwerfen Sie ihn mit Begründung.',
    clean: 'Keine offenen Funde. Die Regeln finden im aktuellen Modell nichts zu beanstanden.',
    open: (n) => `${n} offen`,
    dismissed: (n) => `${n} verworfen`,
    severity: { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' },
    adopt: 'Als Bedrohung übernehmen',
    adopted: 'Übernommen',
    dismiss: 'Mit Begründung verwerfen',
    reasonPlaceholder: 'Warum ist das akzeptabel?',
    confirmDismiss: 'Verwerfen',
    cancel: 'Abbrechen',
    restore: 'Wiederherstellen',
    show: 'Im Canvas zeigen',
    refs: 'Anforderungen',
    close: 'Schließen',
    howto: 'Tipp: Geben Sie je Komponente im Reiter Übersicht Erreichbarkeit und Authentifizierung an, damit die Regeln sie prüfen können.',
  },
  facts: {
    title: 'Sicherheitsangaben (Architektur-Check)',
    exposure: 'Erreichbarkeit',
    exposureOptions: { internet: 'Aus dem Internet erreichbar', 'local-network': 'Nur im lokalen Netz', physical: 'Nur mit physischem Zugang', none: 'Von außen nicht erreichbar' },
    authentication: 'Authentifizierung',
    authenticationOptions: { none: 'Keine', password: 'Passwort', mfa: 'Mehr-Faktor', certificate: 'Zertifikat' },
    personalData: 'Verarbeitet personenbezogene Daten',
    notSet: '- nicht angegeben -',
  },
  task: (t) => `Architektur-Check: ${t.detail} (${t.subject ?? ''})`,
  rules: {
    M01: {
      title: (p) => `Unverschlüsselte Verbindung ${p.from} → ${p.to}`,
      why: (p) => `Die ${p.protocol}-Verbindung überschreitet eine Vertrauensgrenze ohne Verschlüsselung. Daten können unterwegs gelesen oder verändert werden.`,
      fix: () => 'Eine verschlüsselte Variante (TLS / VPN) verwenden oder für die Verbindung eine ausgleichende Maßnahme dokumentieren.',
    },
    M02: {
      title: (p) => `Unsicheres Protokoll ${p.protocol} (${p.from} → ${p.to})`,
      why: () => 'Das Protokoll bietet von sich aus weder Vertraulichkeit noch Authentifizierung. Jeder mit Netzzugang in der Zone kann mithören oder einspeisen.',
      fix: () => 'Auf die gesicherte Variante wechseln (z. B. MQTT/TLS, HTTPS, OPC-UA mit Security) oder das Netz segmentieren und das Restrisiko begründen.',
    },
    M03: {
      title: (p) => (p.stated === 'none' ? `${p.component} ist ohne Authentifizierung aus dem Internet erreichbar` : `${p.component} ist aus dem Internet erreichbar, Authentifizierung nicht angegeben`),
      why: (p) => (p.stated === 'none' ? 'Jeder im Internet kann die Komponente nutzen. Anhang I Teil I (2)(d) verlangt Schutz vor unbefugtem Zugriff.' : 'Es ist nicht dokumentiert, wie sich Nutzer und Systeme anmelden. Ohne diese Angabe lässt sich die Zugriffskontrolle nicht beurteilen.'),
      fix: () => 'Die Authentifizierung in der Komponentenübersicht angeben oder eine einführen (Passwort mit Sperre, MFA, Zertifikate).',
    },
    M04: {
      title: (p) => `${p.exposed} ist direkt mit der kritischen Komponente ${p.critical} verbunden`,
      why: () => 'Eine aus dem Internet erreichbare Komponente mit direkter Verbindung zu einer kritischen Komponente gibt Angreifern einen kurzen Weg. Ein Gateway oder eine DMZ begrenzt den Schaden einer Kompromittierung.',
      fix: () => 'Ein Gateway/eine Firewall oder eine eigene Zone dazwischensetzen und filtern, was passieren darf.',
    },
    M05: {
      title: (p) => `Wartungsschnittstelle ${p.component} ist über den physischen Zugang hinaus erreichbar`,
      why: () => 'Debug- und Wartungsschnittstellen umgehen oft Sicherheitsfunktionen. Sie sollten nur mit physischem Zugang nutzbar sein.',
      fix: () => 'Die Schnittstelle auf physischen Zugang beschränken, im Produktivbetrieb abschalten oder stark authentifizieren.',
    },
    M06: {
      title: (p) => `Personenbezogene Daten in ${p.component} ohne Entscheidung zur Vertraulichkeit`,
      why: () => 'Daten im Ruhezustand und bei der Übertragung müssen geschützt (Anhang I Teil I (2)(e)) und auf das Nötige beschränkt werden (2)(g).',
      fix: () => 'Anforderung ER.6 für das Produkt entscheiden (erfüllt, oder nicht anwendbar mit Begründung) und die Verschlüsselungsmaßnahme festhalten.',
    },
    M07: {
      title: (p) => `Verbindung ${p.from} (${p.slFrom}) → ${p.to} (${p.slTo}) ohne Conduit-Beschreibung`,
      why: () => 'IEC 62443-3-2 erwartet, dass der Conduit zwischen Zonen unterschiedlicher Security Level beschrieben und geschützt wird.',
      fix: () => 'Den Conduit in den Verbindungsdetails beschreiben (was passiert durch, wie gefiltert, wer darf).',
    },
    M08: {
      title: (p) => `${p.component} hat keine Version`,
      why: () => 'Ohne Version lässt sich die Komponente nicht mit Schwachstellendatenbanken abgleichen oder korrekt in der SBOM aufführen.',
      fix: () => 'Die Version in der Komponentenübersicht eintragen.',
    },
    M09: {
      title: (p) => `Backend ${p.component} wurde nicht analysiert`,
      why: () => 'Fernverarbeitungslösungen, die zu Ihrem Produkt gehören, liegen im Anwendungsbereich des CRA und brauchen eine eigene Bedrohungsanalyse.',
      fix: () => 'Bedrohungen und Assets für das Backend ergänzen.',
    },
    M10: {
      title: (p) => `${p.component} hat weder Assets noch Bedrohungen`,
      why: () => 'Eine Komponente, die sich niemand angesehen hat, ist ein blinder Fleck in der Risikobewertung.',
      fix: () => 'Assets und Bedrohungen ergänzen oder die Komponente aus dem Modell entfernen, wenn sie nicht zum Umfang gehört.',
    },
    M11: {
      title: (p) => `Angriffspfad ${p.entry} → ${p.target} (Score ${p.score}) ohne Maßnahme`,
      why: () => 'Es gibt einen realistischen Weg von einem Einstiegspunkt zu einer kritischen Komponente, und keine Komponente auf dem Weg hat eine Maßnahme.',
      fix: () => 'Maßnahmen auf dem Pfad ergänzen, am besten am Einstiegspunkt oder vor der kritischen Komponente.',
    },
  },
};

export const modelCheckTranslations = { en, de };
export type ModelCheckT = typeof en;

export function useModelCheckT(): ModelCheckT {
  const lang = useLanguageStore((s) => s.lang);
  return modelCheckTranslations[lang];
}

export function findingText(t: ModelCheckT, f: Pick<Finding, 'ruleId' | 'params'>) {
  const r = t.rules[f.ruleId];
  return { title: r.title(f.params), why: r.why(f.params), fix: r.fix(f.params) };
}
