import { useLanguageStore } from '@/store/languageStore';

const en = {
  account: 'Account Settings', back: 'Back to Dashboard',
  nav: { profile: 'Profile', logo: 'White-Label Logo', organisation: 'Organisation', password: 'Password', team: 'Team', api: 'API Keys', danger: 'Danger Zone' },
  profile: { intro: 'Your name and company shown in reports.', name: 'Display Name', email: 'Email', emailFixed: 'Email cannot be changed.', company: 'Company Name', optional: 'Optional', save: 'Save Changes', updated: 'Profile updated.', failed: 'Update failed.' },
  logo: { intro: 'Appears on exported PDF reports. Max 200 KB (PNG, SVG, JPG).', upload: 'Click to upload logo', save: 'Save Logo', remove: 'Remove', tooLarge: 'File too large. Max 200 KB.', saved: 'Logo saved.', failed: 'Upload failed.' },
  org: {
    title: 'Organisation',
    intro: 'What belongs to your company, not to one product: set it once, every product uses it.',
    readOnly: 'Only administrators can change the organisation. You see what is set.',
    updatedBy: (n: string) => `Last changed by ${n}`,
    profile: 'Profile and CSAF publisher',
    profileIntro: 'Appears in advisories (CSAF publisher), in the EU declaration of conformity and as the manufacturer in documents.',
    orgName: 'Company name', orgNamePh: 'e.g. ACME Security Ltd',
    category: 'Category', name: 'Publisher name', namePh: 'e.g. ACME Security Ltd', ns: 'Namespace / URL', nsHint: 'Unique URL of the issuing organisation.',
    authority: 'Issuing authority', authorityPh: 'e.g. ACME PSIRT', authorityHint: 'Responsible body. If empty, the publisher name is used.',
    categories: { vendor: 'Vendor - manufacturer of the product', coordinator: 'Coordinator - CERT / coordinator', discoverer: 'Discoverer', other: 'Other' } as Record<string, string>,
    contact: 'Contact for vulnerability reports', contactPh: 'Email, PGP fingerprint, web form URL…',
    save: 'Save', saved: 'Saved.', failed: 'Could not save.',
    txt: 'Security contact (security.txt and CVD policy)',
    txtIntro: 'Saved once for the organisation. Download the files and publish them on your website (RFC 9116, BSI TR-03183-3).',
    txtFields: { domain: 'Website domain', psirtEmail: 'PSIRT email (contact 1)', csirtEmail: 'CSIRT email (contact 2)', reportWebUri: 'Report page / web form (contact 3)', openPgpKeyUri: 'OpenPGP public key URI (.asc)', policyUri: 'CVD policy URL', csafProviderUri: 'CSAF provider metadata URI', expiresDays: 'Validity in days (30-365)' },
    downloadTxt: 'Download security.txt', downloadCvd: 'Download CVD policy', needDomain: 'Set the domain and the PSIRT email to download the files.',
    reqs: 'Requirements that hold for the whole organisation',
    reqsIntro: 'Decide these once. Every product inherits the decision and can override it in its own checklist.',
    status: { compliant: 'Met', partial: 'Partly', 'non-compliant': 'Not met', 'not-applicable': 'Not applicable' } as Record<string, string>,
    note: 'Justification / evidence', clear: 'Clear',
  },
  pw: {
    title: 'Change Password', set: 'Update your login password.', unset: 'You signed in with a magic link - no password is set on your account.',
    current: 'Current Password', next: 'New Password', confirm: 'Confirm New Password', submit: 'Change Password', disabled: 'Password login is not enabled for this account.',
    mismatch: 'New passwords do not match.', ok: 'Password changed successfully.', failed: 'Password change failed.',
  },
  team: { title: 'Team memberships', none: 'You are not assigned to a team at the moment.', product: 'Product team', review: 'Review team', lead: 'Lead', member: 'Member', adminNote: 'As an administrator you can manage teams and members in the admin portal.', adminOpen: 'Open admin portal' },
  api: {
    intro: 'Create API keys for programmatic access to your projects.', auth: 'Authenticate requests with ', share: 'A key grants access to the same projects as your account. Do not share keys.',
    pro: 'API keys are a Pro feature. Upgrade to create keys.', fresh: 'New key - only visible now!', hide: 'Hide', show: 'Show', copy: 'Copy', copied: 'Copied!',
    saveNow: 'Save the key now - it will never be shown again.', namePh: 'Key name, e.g. "CI Pipeline"', create: 'Create', none: 'No API keys created yet.',
    created: (d: string) => `Created ${d}`, lastUsed: (d: string) => ` · Last used ${d}`, revoke: 'Revoke', endpoints: 'Available endpoints', docs: 'Full API docs',
    ep: { sbom: 'Upload SBOM', vulns: 'List vulnerabilities', status: 'Set status', csaf: 'Export VEX / CSAF' },
    createFailed: 'Could not create the key.', network: 'Network error.',
  },
  danger: { intro: 'Permanently delete your account and all associated data. This cannot be undone.', del: 'Delete My Account', warn: 'This will delete all your projects, diagrams, and data permanently.', typePre: 'Type ', typePost: ' to confirm', confirm: 'Permanently Delete Account', cancel: 'Cancel' },
};

const de: typeof en = {
  account: 'Kontoeinstellungen', back: 'Zurück zum Dashboard',
  nav: { profile: 'Profil', logo: 'White-Label-Logo', organisation: 'Organisation', password: 'Passwort', team: 'Team', api: 'API-Keys', danger: 'Gefahrenzone' },
  profile: { intro: 'Ihr Name und Ihre Firma erscheinen in Berichten.', name: 'Anzeigename', email: 'E-Mail', emailFixed: 'Die E-Mail-Adresse kann nicht geändert werden.', company: 'Firmenname', optional: 'Optional', save: 'Änderungen speichern', updated: 'Profil aktualisiert.', failed: 'Aktualisierung fehlgeschlagen.' },
  logo: { intro: 'Erscheint auf exportierten PDF-Berichten. Max. 200 KB (PNG, SVG, JPG).', upload: 'Klicken, um ein Logo hochzuladen', save: 'Logo speichern', remove: 'Entfernen', tooLarge: 'Datei zu groß. Max. 200 KB.', saved: 'Logo gespeichert.', failed: 'Upload fehlgeschlagen.' },
  org: {
    title: 'Organisation',
    intro: 'Was zu Ihrem Unternehmen gehört und nicht zu einem Produkt: einmal festlegen, jedes Produkt nutzt es.',
    readOnly: 'Nur Administratoren können die Organisation ändern. Sie sehen, was hinterlegt ist.',
    updatedBy: (n: string) => `Zuletzt geändert von ${n}`,
    profile: 'Profil und CSAF-Publisher',
    profileIntro: 'Erscheint in Advisories (CSAF-Publisher), in der EU-Konformitätserklärung und als Hersteller in den Dokumenten.',
    orgName: 'Firmenname', orgNamePh: 'z.B. ACME Security GmbH',
    category: 'Kategorie', name: 'Publisher-Name', namePh: 'z.B. ACME Security GmbH', ns: 'Namespace / URL', nsHint: 'Eindeutige URL der ausgebenden Organisation.',
    authority: 'Issuing Authority', authorityPh: 'z.B. ACME PSIRT', authorityHint: 'Verantwortliche Stelle. Wenn leer, wird der Publisher-Name verwendet.',
    categories: { vendor: 'Vendor - Hersteller des Produkts', coordinator: 'Coordinator - CERT / Koordinator', discoverer: 'Discoverer - Entdecker', other: 'Other - Sonstige' },
    contact: 'Kontakt für Schwachstellenmeldungen', contactPh: 'E-Mail, PGP-Fingerprint, Webformular-URL…',
    save: 'Speichern', saved: 'Gespeichert.', failed: 'Fehler beim Speichern.',
    txt: 'Sicherheitskontakt (security.txt und CVD-Policy)',
    txtIntro: 'Einmal für die Organisation gespeichert. Dateien herunterladen und auf Ihrer Website veröffentlichen (RFC 9116, BSI TR-03183-3).',
    txtFields: { domain: 'Website-Domain', psirtEmail: 'PSIRT-E-Mail (Kontakt 1)', csirtEmail: 'CSIRT-E-Mail (Kontakt 2)', reportWebUri: 'Meldeseite / Webformular (Kontakt 3)', openPgpKeyUri: 'OpenPGP-Public-Key-URI (.asc)', policyUri: 'CVD-Policy-URL', csafProviderUri: 'CSAF-Provider-Metadata-URI', expiresDays: 'Gültigkeit in Tagen (30-365)' },
    downloadTxt: 'security.txt herunterladen', downloadCvd: 'CVD-Policy herunterladen', needDomain: 'Domain und PSIRT-E-Mail setzen, um die Dateien herunterzuladen.',
    reqs: 'Anforderungen, die für die ganze Organisation gelten',
    reqsIntro: 'Einmal entscheiden. Jedes Produkt erbt die Entscheidung und kann sie in seiner eigenen Checkliste überschreiben.',
    status: { compliant: 'Erfüllt', partial: 'Teilweise', 'non-compliant': 'Nicht erfüllt', 'not-applicable': 'Nicht anwendbar' },
    note: 'Begründung / Nachweis', clear: 'Zurücksetzen',
  },
  pw: {
    title: 'Passwort ändern', set: 'Ändern Sie Ihr Login-Passwort.', unset: 'Sie haben sich per Magic Link angemeldet - für Ihr Konto ist kein Passwort gesetzt.',
    current: 'Aktuelles Passwort', next: 'Neues Passwort', confirm: 'Neues Passwort bestätigen', submit: 'Passwort ändern', disabled: 'Die Anmeldung per Passwort ist für dieses Konto nicht aktiviert.',
    mismatch: 'Die neuen Passwörter stimmen nicht überein.', ok: 'Passwort erfolgreich geändert.', failed: 'Passwortänderung fehlgeschlagen.',
  },
  team: { title: 'Team-Mitgliedschaften', none: 'Du bist aktuell keinem Team zugewiesen.', product: 'Produktteam', review: 'Review-Team', lead: 'Lead', member: 'Mitglied', adminNote: 'Als Administrator kannst du Teams und Mitglieder im Admin-Portal verwalten.', adminOpen: 'Admin-Portal öffnen' },
  api: {
    intro: 'Erstelle API-Keys für programmatischen Zugriff auf deine Projekte.', auth: 'Authentifiziere Anfragen mit ', share: 'Ein Key gewährt Zugriff auf dieselben Projekte wie dein Account. Gib Keys nicht weiter.',
    pro: 'API-Keys sind ein Pro-Feature. Upgrade dein Konto, um Keys zu erstellen.', fresh: 'Neuer Key - nur jetzt sichtbar!', hide: 'Verbergen', show: 'Anzeigen', copy: 'Kopieren', copied: 'Kopiert!',
    saveNow: 'Speichere den Key jetzt - er wird nie wieder angezeigt.', namePh: 'Key-Name, z.B. "CI Pipeline"', create: 'Erstellen', none: 'Noch keine API-Keys erstellt.',
    created: (d) => `Erstellt ${d}`, lastUsed: (d) => ` · Zuletzt verwendet ${d}`, revoke: 'Widerrufen', endpoints: 'Verfügbare Endpunkte', docs: 'Vollständige API-Docs',
    ep: { sbom: 'SBOM hochladen', vulns: 'Schwachstellen abrufen', status: 'Status setzen', csaf: 'VEX / CSAF exportieren' },
    createFailed: 'Fehler beim Erstellen.', network: 'Netzwerkfehler.',
  },
  danger: { intro: 'Löscht Ihr Konto und alle zugehörigen Daten dauerhaft. Das kann nicht rückgängig gemacht werden.', del: 'Mein Konto löschen', warn: 'Damit werden alle Ihre Projekte, Diagramme und Daten dauerhaft gelöscht.', typePre: 'Geben Sie ', typePost: ' zur Bestätigung ein', confirm: 'Konto endgültig löschen', cancel: 'Abbrechen' },
};

export function useSettingsT() {
  const lang = useLanguageStore((s) => s.lang);
  return { t: { en, de }[lang], lang };
}
