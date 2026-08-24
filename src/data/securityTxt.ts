/**
 * BSI TR-03183-3 security.txt & CVD Policy Helper
 * Technical Guideline BSI TR-03183: Cyber Resilience Requirements for Manufacturers and Products
 * Part 3: Vulnerability Reports and Notifications - Version 1.0.0
 * RFC 9116 & RFC 9580 compliance
 */

export interface SecurityTxtConfig {
  domain: string; // e.g. "example.com"
  psirtEmail: string; // e.g. "psirt@example.com" (Contact 1)
  csirtEmail: string; // e.g. "csirt@example.com" (Contact 2)
  reportWebUri?: string; // e.g. "https://example.com/security-contact" (Contact 3)
  openPgpKeyUri?: string; // e.g. "https://example.com/openpgp-key_psirt.asc"
  openPgpFingerprint?: string; // e.g. "ABCD 1234 ..."
  policyUri?: string; // e.g. "https://example.com/security-policy.html"
  acknowledgmentsUri?: string; // e.g. "https://example.com/hall-of-fame.html"
  csafProviderUri?: string; // e.g. "https://example.com/.well-known/csaf/provider-metadata.json"
  preferredLanguages?: string[]; // e.g. ["en", "de"] (en is mandatory)
  expiresDays?: number; // max 365 days
}

export function generateBsiSecurityTxt(config: SecurityTxtConfig): string {
  const lines: string[] = [];

  // Canonical URI (BSI TR-03183-3 Section 4.2.2)
  lines.push('# Our canonical URI');
  const baseDomain = config.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  lines.push(`Canonical: https://${baseDomain}/.well-known/security.txt`);
  lines.push('');

  // Contact addresses (BSI TR-03183-3 Section 4.2.3: Order: 1. PSIRT, 2. CSIRT, 3. Web URI)
  lines.push('# Our security addresses');
  lines.push(`Contact: mailto:${config.psirtEmail.trim()}`);
  if (config.csirtEmail.trim()) {
    lines.push(`Contact: mailto:${config.csirtEmail.trim()}`);
  }
  if (config.reportWebUri?.trim()) {
    lines.push(`Contact: ${config.reportWebUri.trim()}`);
  }
  lines.push('');

  // OpenPGP keys (BSI TR-03183-3 Section 4.2.4 & Section 4.3.2)
  if (config.openPgpKeyUri?.trim()) {
    lines.push('# Our OpenPGP keys');
    lines.push(`Encryption: ${config.openPgpKeyUri.trim()}`);
    lines.push('');
  }

  // Acknowledgments (BSI TR-03183-3 Section 4.2.5)
  if (config.acknowledgmentsUri?.trim()) {
    lines.push('# Our security acknowledgments page');
    lines.push(`Acknowledgments: ${config.acknowledgmentsUri.trim()}`);
    lines.push('');
  }

  // Preferred languages (BSI TR-03183-3 Section 4.2.6: English is mandatory)
  lines.push('# Our preferred languages');
  const langs = config.preferredLanguages && config.preferredLanguages.length > 0
    ? Array.from(new Set(['en', ...config.preferredLanguages])).join(', ')
    : 'en, de';
  lines.push(`Preferred-Languages: ${langs}`);
  lines.push('');

  // CVD Policy (BSI TR-03183-3 Section 4.2.7)
  if (config.policyUri?.trim()) {
    lines.push('# Our security policy');
    lines.push(`Policy: ${config.policyUri.trim()}`);
    lines.push('');
  }

  // CSAF metadata (BSI TR-03183-3 Section 4.2.8)
  if (config.csafProviderUri?.trim()) {
    lines.push('# Our security advisories');
    lines.push(`CSAF: ${config.csafProviderUri.trim()}`);
    lines.push('');
  }

  // Expiry date (BSI TR-03183-3 Section 4.2.9: Max 1 year in future, RFC 3339 UTC "Z")
  const days = Math.min(365, Math.max(30, config.expiresDays ?? 365));
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + days);
  expDate.setMilliseconds(0);
  lines.push(`Expires: ${expDate.toISOString()}`);

  return lines.join('\n');
}

/**
 * Generates a CVD Policy Markdown document according to BSI TR-03183-3 Section 4.4
 */
export function generateBsiCvdPolicy(companyName: string, config: SecurityTxtConfig): string {
  const date = new Date().toISOString().split('T')[0];
  return `# Coordinated Vulnerability Disclosure (CVD) Policy - ${companyName}

*Version vom: ${date} | Gültig gemäß BSI TR-03183-3 & CRA Art. 13/14*

## 1. Einleitung & Grundsätze
${companyName} nimmt die Sicherheit seiner Produkte, Dienste und Infrastrukturen sehr ernst. Wir schätzen die Arbeit der IT-Sicherheits-Community und fördern eine koordinierte und verantwortungsvolle Meldung von Schwachstellen (Coordinated Vulnerability Disclosure).

## 2. Schutzversprechen für Sicherheitsforscher (Safe Harbor)
Wir versichern gemäß BSI TR-03183-3 §4.4.4:
- **Keine rechtlichen Schritte:** Gegen meldende Personen werden keinerlei rechtliche Schritte eingeleitet, sofern sie im Einklang mit dieser Richtlinie in gutem Glauben handeln und keine kriminellen Absichten verfolgen.
- **Vertraulichkeit:** Alle eingehenden Meldungen und personenbezogenen Daten werden vertraulich behandelt und ohne ausdrückliche Zustimmung nicht an unbefugte Dritte weitergegeben.
- **Keine Geheimhaltungsvereinbarung (NDA):** Es wird keine Unterzeichnung einer NDA als Bedingung für die Schwachstellenbearbeitung verlangt.

## 3. Garantierte Reaktionszeiten (BSI TR-03183-3 §4.4.8)
- **Erste Rückmeldung:** Innerhalb von **5 Arbeitstagen** (nicht-automatisiert).
- **Detaillierte technische Bewertung:** Innerhalb von **10 Arbeitstagen** mit Bestätigung, Rückfragen oder Fristverlängerungsbegründung.

## 4. Offenlegungsfrist (Disclosure Timeline)
- **Reguläre Offenlegungsfrist:** **90 Tage** nach Eingang der validierten Meldung.
- **Fristverlängerung:** In begründeten Ausnahmefällen um maximal weitere 90 Tage in Abstimmung mit dem zuständigen nationalen CSIRT (CERT-Bund).
- **Veröffentlichung:** Bereitstellung strukturierter Security Advisories im Format **CSAF 2.0** und Weiterleitung an die European Vulnerability Database (EUVD / ENISA).

## 5. Kontaktmöglichkeiten
- **PSIRT (Produktsicherheit):** \`${config.psirtEmail}\`
- **CSIRT (Infrastruktur):** \`${config.csirtEmail}\`
${config.reportWebUri ? `- **Anonymes Web-Formular:** [${config.reportWebUri}](${config.reportWebUri})` : ''}
${config.openPgpKeyUri ? `- **OpenPGP Public Key:** [${config.openPgpKeyUri}](${config.openPgpKeyUri})` : ''}
`;
}
