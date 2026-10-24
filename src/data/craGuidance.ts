/**
 * Plain-language implementation guidance per CRA requirement (Annex I Part I and II,
 * Annex II user information, Annex VII technical documentation).
 *
 * Own wording, written from the text of Regulation (EU) 2024/2847 (OJ L of 20.11.2024) and
 * common engineering practice. It deliberately contains no text from BSI technical
 * guidelines (their terms of use do not allow commercial reuse without consent) and is
 * keyed by the CRA requirement ids of src/data/cra.ts, not by BSI control ids.
 *
 * Every entry is a draft and has not been reviewed by a security expert or lawyer yet:
 * the UI says so. Set GUIDANCE_REVIEWED to true only after a real review.
 */
export const GUIDANCE_REVIEWED = false;

export interface CraGuidance {
  /** Warum das Gesetz das verlangt, in ein bis zwei Sätzen. */
  why: string;
  steps: string[];
  /** Was einer Prüferin oder einem Prüfer gezeigt werden kann. */
  evidence: string[];
  /** CI-Ergebnis, das die Anforderung (teilweise) automatisch belegt, siehe Operations > CI/CD. */
  ciSource?: 'sbom' | 'sast' | 'secrets' | 'vulnscan' | 'dast' | 'tls' | 'ports';
}

export const CRA_GUIDANCE: Record<string, CraGuidance> = {
  // ── Anhang I Teil I: Produkteigenschaften ─────────────────────────────────
  'ER.0': {
    why: 'Alle anderen Anforderungen werden auf Basis Ihrer Risikobewertung ausgewählt. Ohne aktuelle Bewertung lässt sich nicht begründen, dass eine Maßnahme „angemessen" ist.',
    steps: ['Beschreiben, was das Produkt schützt (Assets) und wer es angreifen könnte.', 'Jedes Risiko nach Wahrscheinlichkeit und Auswirkung bewerten und entscheiden: akzeptieren oder behandeln.', 'Für jede Entscheidung den Grund festhalten.'],
    evidence: ['Exportierte Risikobewertung (PDF-Dossier)', 'Entscheidungen zur Risikoakzeptanz mit Name und Begründung'],
  },
  'ER.1': {
    why: 'Ein Produkt darf nicht in Verkehr gebracht werden, solange Ihnen ausnutzbare Schwachstellen bekannt sind.',
    steps: ['Produkt und Abhängigkeiten vor jedem Release auf bekannte Schwachstellen prüfen.', 'Ausnutzbare Funde beheben, für die übrigen festhalten, warum sie nicht ausnutzbar sind.', 'Ergebnis je Release aufbewahren.'],
    evidence: ['Schwachstellenscan der freigegebenen Version', 'Triage-Entscheidungen (VEX) für verbleibende Funde'],
    ciSource: 'vulnscan',
  },
  'ER.2': {
    why: 'Die meisten Nutzer ändern keine Einstellungen, deshalb muss der Auslieferungszustand sicher sein.',
    steps: ['Alle sicherheitsrelevanten Einstellungen auflisten und den sichersten Wert als Voreinstellung wählen.', 'Standardpasswörter und gemeinsame Schlüssel entfernen, beim ersten Start eine Wahl erzwingen.', 'Eine frische Installation gegen diese Liste prüfen.'],
    evidence: ['Liste der Einstellungen mit Voreinstellungen', 'Prüfprotokoll einer frischen Installation'],
  },
  'ER.3a': {
    why: 'Nutzer brauchen einen Weg zurück in den sicheren Ausgangszustand, z. B. nach einem Vorfall oder bei Weitergabe des Geräts.',
    steps: ['Ein Zurücksetzen anbieten, das die sicheren Voreinstellungen wiederherstellt und Nutzerdaten sowie Zugangsdaten entfernt.', 'Dokumentieren, wie es ausgelöst wird und was es löscht.'],
    evidence: ['Beschreibung der Rücksetzfunktion', 'Prüfprotokoll: Zustand nach dem Zurücksetzen entspricht einer Neuinstallation'],
  },
  'ER.4': {
    why: 'Schwachstellen werden auch nach dem Release gefunden, das Produkt muss Korrekturen erhalten können.',
    steps: ['Sicherstellen, dass jeder Softwarebestandteil (auch Firmware und Container) aktualisiert werden kann.', 'Den Update-Weg testen, auch ein fehlgeschlagenes Update (das Produkt muss nutzbar bleiben).'],
    evidence: ['Update-Konzept', 'Prüfprotokoll eines erfolgreichen und eines fehlgeschlagenen Updates'],
  },
  'ER.4a': {
    why: 'Wo es zum Produkt passt, sollen Sicherheitsupdates ohne Zutun der Nutzer ankommen.',
    steps: ['Regelmäßig nach Updates suchen und Sicherheitsupdates standardmäßig automatisch installieren.', 'Wenn automatische Updates nicht passen (z. B. in Industrieanlagen), begründen, warum.'],
    evidence: ['Voreinstellung der automatischen Updates', 'Begründung, falls nicht anwendbar'],
  },
  'ER.4b': {
    why: 'Automatische Updates dürfen den Nutzern nicht die Kontrolle nehmen.',
    steps: ['Einen klaren Schalter zum Abschalten automatischer Updates anbieten.', 'Das Risiko direkt neben dem Schalter erklären.'],
    evidence: ['Screenshot oder Beschreibung der Einstellung'],
  },
  'ER.4c': {
    why: 'Installiert werden kann nur, wovon die Nutzer wissen.',
    steps: ['Nutzer über verfügbare Updates informieren, im Produkt oder über einen Kanal, den sie tatsächlich sehen.'],
    evidence: ['Beschreibung der Benachrichtigung', 'Prüfprotokoll'],
  },
  'ER.4d': {
    why: 'Ein erzwungenes Update im falschen Moment kann mehr schaden als eine kurze Verzögerung.',
    steps: ['Nutzer ein Update vorübergehend verschieben lassen.', 'Später erneut daran erinnern.'],
    evidence: ['Beschreibung der Verschiebefunktion'],
  },
  'ER.5': {
    why: 'Nur berechtigte Personen und Systeme dürfen Funktionen und Daten des Produkts erreichen.',
    steps: ['Alle Schnittstellen auflisten (UI, API, USB, seriell, Netzwerk) und auf jeder eine Anmeldung verlangen.', 'Rollen festlegen und Berechtigungen bei jedem Zugriff prüfen, nicht nur in der Oberfläche.', 'Neuen Nutzern nur die nötigsten Rechte geben.'],
    evidence: ['Schnittstellenliste mit Anmeldung je Schnittstelle', 'Berechtigungsmatrix', 'Prüfprotokoll unberechtigter Zugriffsversuche'],
  },
  'ER.5a': {
    why: 'Anmeldung und Kontoverwaltung sind die übliche Schwachstelle.',
    steps: ['Bewährte Verfahren nutzen (gesalzene Passwort-Hashes, Standardprotokolle, optional Mehr-Faktor).', 'Fehlversuche bei der Anmeldung begrenzen.', 'Admins Konten anlegen, sperren und löschen lassen.'],
    evidence: ['Konzept der Authentifizierung', 'Prüfprotokoll zu Sperre und Passwortbehandlung'],
  },
  'ER.5b': {
    why: 'Unberechtigte Zugriffe müssen sichtbar werden, damit jemand reagieren kann.',
    steps: ['Erfolgreiche und fehlgeschlagene Anmeldungen mit Zeit, Ziel und Ergebnis protokollieren.', 'Wo sinnvoll, bei wiederholten Fehlversuchen den Betreiber benachrichtigen.'],
    evidence: ['Beispielhafte Protokolleinträge', 'Beschreibung der Benachrichtigungen'],
  },
  'ER.6': {
    why: 'Vertrauliche Daten müssen vertraulich bleiben, auf dem Gerät, in der Cloud und auf dem Übertragungsweg.',
    steps: ['Festlegen, welche Daten vertraulich sind.', 'Sie gespeichert und bei der Übertragung mit aktuellen, gepflegten Verfahren und Bibliotheken verschlüsseln, keine eigene Kryptografie bauen.', 'Keinen unverschlüsselten Ausweg anbieten.'],
    evidence: ['Datenklassifizierung', 'Übersicht der Kryptografie (Verfahren, Bibliotheken, Schlüsselverwaltung)', 'Protokoll-Scan oder Prüfprotokoll'],

    ciSource: 'tls',
  },
  'ER.7': {
    why: 'Software, Konfiguration und Daten dürfen nicht unbefugt verändert werden, und Veränderungen sollen auffallen.',
    steps: ['Firmware und Updates signieren und die Signatur vor der Installation prüfen.', 'Wo die Plattform es erlaubt, die Integrität beim Start prüfen.', 'Erkannte Manipulationen dem Nutzer melden.'],
    evidence: ['Konzept für Signatur und Prüfung', 'Prüfprotokoll mit einem manipulierten Update'],
  },
  'ER.8': {
    why: 'Daten, die Sie nicht erheben, können nicht abfließen.',
    steps: ['Für jedes Datum, das das Produkt erhebt, den Zweck festhalten.', 'Daten ohne Zweck streichen und nicht mehr benötigte Daten löschen.'],
    evidence: ['Dateninventar mit Zweck je Datum'],
  },
  'ER.9': {
    why: 'Wesentliche Funktionen müssen unter Angriff und nach einem Vorfall weiterlaufen oder sicher ausfallen.',
    steps: ['Die wesentlichen Funktionen benennen.', 'Festlegen und testen, was nach einem Netz- oder Stromausfall noch funktionieren muss.', 'Das Produkt selbstständig in einen sicheren Zustand zurückkehren lassen.'],
    evidence: ['Liste der wesentlichen Funktionen', 'Prüfprotokolle zu Ausfall und Wiederanlauf'],
  },
  'ER.9a': {
    why: 'Denial-of-Service ist ein billiger Angriff, das Produkt soll kontrolliert nachlassen statt auszufallen.',
    steps: ['Für jeden erreichbaren Dienst Grenzen setzen (Rate, Größe, Verbindungen).', 'Mit Last oberhalb der Grenzen testen.', 'Bei selbst betriebenen Diensten vorgelagerten Schutz nutzen (Lastverteiler, DDoS-Schutz).'],
    evidence: ['Konfigurierte Grenzwerte', 'Lasttest-Protokoll'],

    ciSource: 'dast',
  },
  'ER.10': {
    why: 'Ein fehlerhaftes oder kompromittiertes Gerät darf Netze und andere Geräte in seiner Umgebung nicht lahmlegen.',
    steps: ['Den vom Produkt erzeugten Verkehr begrenzen (Wiederholungen mit Wartezeit, keine Lastspitzen).', 'Netzwerkfehler geordnet behandeln.'],
    evidence: ['Beschreibung des Wiederholungsverhaltens', 'Prüfprotokoll'],
  },
  'ER.11': {
    why: 'Jeder offene Port, jeder Dienst und jede Schnittstelle ist ein Angriffspunkt.',
    steps: ['Alle Schnittstellen und Dienste abschalten, die der Einsatzzweck nicht braucht.', 'Debug-Schnittstellen aus dem Release entfernen oder so schützen, dass sie keine Sicherheitsfunktion umgehen.', 'Den Port-Scan bei jedem Release wiederholen.'],
    evidence: ['Port- und Dienstliste des Releases', 'Aussage zu Debug-Schnittstellen'],

    ciSource: 'ports',
  },
  'ER.11a': {
    why: 'Externe Schnittstellen sind der erste Kontaktpunkt von Angreifern.',
    steps: ['Alle Eingaben an diesen Schnittstellen prüfen und ablehnen, was nicht passt.', 'Parser und Protokollverarbeitung mit statischer Analyse und Fuzzing prüfen.'],
    evidence: ['Schnittstellenspezifikation', 'SAST- und Testergebnisse'],
    ciSource: 'sast',
  },
  'ER.12': {
    why: 'Wird ein Bestandteil kompromittiert, soll der Angreifer möglichst wenig weiter erreichen.',
    steps: ['Bestandteile mit minimalen Rechten betreiben und voneinander trennen (Prozesse, Container, Netzzonen).', 'Schutzfunktionen der Plattform nutzen, z. B. Speicherschutz und Sandboxing.'],
    evidence: ['Architektur mit Rechte- und Zonengrenzen'],
  },
  'ER.13': {
    why: 'Ohne Aufzeichnungen kann niemand einen Angriff erkennen oder analysieren.',
    steps: ['Sicherheitsrelevante Ereignisse protokollieren (Anmeldungen, Rechte- und Konfigurationsänderungen, Update-Ergebnisse).', 'Zeit, Art und Ergebnis festhalten, nur das Nötige speichern.', 'Lesezugriff auf Protokolle beschränken und sie lange genug für eine Untersuchung aufbewahren.'],
    evidence: ['Liste der protokollierten Ereignisse', 'Beschreibung von Aufbewahrung und Zugriff'],
  },
  'ER.13a': {
    why: 'Zugriffe auf sensible Daten und Funktionen sind das Wichtigste, was sich nachvollziehen lassen muss.',
    steps: ['Lesen und Ändern sensibler Daten sowie Aufrufe sensibler Funktionen protokollieren.'],
    evidence: ['Beispielhafte Protokolleinträge'],
  },
  'ER.13b': {
    why: 'Das Gesetz verlangt, dass Nutzer die Aufzeichnung abschalten können.',
    steps: ['Eine geschützte Einstellung zum Abschalten von Protokollierung oder Telemetrie anbieten.', 'Sie standardmäßig eingeschaltet lassen, wo die Risikobewertung das verlangt.'],
    evidence: ['Beschreibung der Einstellung und wer sie ändern darf'],
  },
  'ER.14': {
    why: 'Nutzer müssen ihre Daten und Einstellungen dauerhaft entfernen können.',
    steps: ['Eine Funktion anbieten, die alle Nutzerdaten und Zugangsdaten löscht oder unlesbar macht.', 'Prüfen, dass Sicherungen und Zwischenspeicher mit erfasst sind.'],
    evidence: ['Beschreibung der Löschfunktion', 'Prüfprotokoll (Daten nicht wiederherstellbar)'],
  },
  'ER.14a': {
    why: 'Wechselt ein Nutzer zu einem anderen Produkt, müssen seine Daten übertragbar sein, ohne dabei offenzuliegen.',
    steps: ['Einen Export in einem gängigen Format anbieten.', 'Die Übertragung schützen (Verschlüsselung, Authentifizierung).'],
    evidence: ['Beschreibung von Export und Übertragung'],
  },

  // ── Anhang I Teil II: Schwachstellenbehandlung ────────────────────────────
  'VH.1': {
    why: 'Was Sie nicht kennen, können Sie nicht reparieren.',
    steps: ['Alle Software- und Hardwarebestandteile auflisten, auch Open Source und zugekaufte Teile.', 'Die Liste für jede veröffentlichte Version aktualisieren.'],
    evidence: ['Komponentenliste je Version'],
    ciSource: 'sbom',
  },
  'VH.1a': {
    why: 'Die SBOM ist die maschinenlesbare Form dieser Liste und die Grundlage der Schwachstellenüberwachung. Marktüberwachungsbehörden können sie anfordern (Anhang VII Nr. 8).',
    steps: ['Die SBOM im Build erzeugen (CycloneDX 1.6 oder SPDX 3.0.1 für BSI TR-03183-2), mit Name und Version jedes Bestandteils.', 'Sie aus der Pipeline hochladen und je Release aufbewahren.'],
    evidence: ['SBOM je veröffentlichter Version'],
    ciSource: 'sbom',
  },
  'VH.2': {
    why: 'Bekannte Schwachstellen müssen unverzüglich mit einem Sicherheitsupdate behoben werden.',
    steps: ['Jeden Fund bewerten: im Produkt ausnutzbar oder nicht, Schweregrad, Frist.', 'Korrektur entwickeln, testen und als Update veröffentlichen.', 'Dauert die Korrektur, eine Umgehung bereitstellen.'],
    evidence: ['Schwachstellenregister mit Entscheidungen und Daten', 'Release Notes der Sicherheitsupdates'],
    ciSource: 'vulnscan',
  },
  'VH.2a': {
    why: 'Nutzer sollen eine Sicherheitskorrektur installieren können, ohne neue Funktionen mitzunehmen.',
    steps: ['Wo technisch möglich, Sicherheitsupdates getrennt von Funktionsupdates ausliefern.'],
    evidence: ['Release-Schema'],
  },
  'VH.3': {
    why: 'Sicherheitstests finden Probleme vor den Angreifern, und sie müssen wiederholt werden.',
    steps: ['Bei jedem Build automatisch prüfen (Abhängigkeitsscan, statische Analyse, Secret-Scan).', 'Für wichtige Releases manuelle Tests ergänzen, z. B. einen Penetrationstest.', 'Die Berichte aufbewahren.'],
    evidence: ['Berichte je Release', 'Testplan'],
    ciSource: 'sast',
  },
  'VH.4': {
    why: 'Sobald eine Korrektur verfügbar ist, müssen Nutzer erfahren, was behoben wurde und was zu tun ist.',
    steps: ['Ein Security Advisory veröffentlichen: Beschreibung, betroffene Versionen, Schweregrad, korrigierte Version.', 'Es zusätzlich maschinenlesbar veröffentlichen (CSAF 2.0, künftig 2.1, sobald es ein OASIS-Standard ist).'],
    evidence: ['Veröffentlichte Advisories'],
  },
  'VH.5': {
    why: 'Wer eine Schwachstelle findet, muss wissen, wie er sie Ihnen meldet und was danach passiert.',
    steps: ['Eine Richtlinie zur koordinierten Offenlegung schreiben (Kontakt, Reaktionszeiten, Ablauf).', 'Sie auf Ihrer Website veröffentlichen.'],
    evidence: ['Veröffentlichte CVD-Richtlinie'],
  },
  'VH.6': {
    why: 'Schwachstellen in Fremdkomponenten betreffen Sie, und relevante Funde müssen Sie an deren Entwickler weitergeben.',
    steps: ['Advisories für die Bestandteile Ihrer SBOM beobachten.', 'Schwachstellen, die Sie in einem Bestandteil finden, an dessen Entwickler melden.'],
    evidence: ['Einrichtung der Überwachung', 'Beispiel einer weitergeleiteten Meldung'],
    ciSource: 'vulnscan',
  },
  'VH.6a': {
    why: 'Meldende müssen eine funktionierende Kontaktadresse finden.',
    steps: ['Eine security.txt (RFC 9116) mit Kontakt und Link zur CVD-Richtlinie veröffentlichen.', 'Jährlich prüfen, ob sie noch gültig ist.'],
    evidence: ['security.txt auf der Hersteller-Website'],
  },
  'VH.7': {
    why: 'Ein missbrauchbarer Update-Kanal ist selbst ein Angriffsweg.',
    steps: ['Updates über einen geschützten Kanal verteilen und signieren.', 'Das Produkt nur Updates mit Ihrem Signaturschlüssel annehmen lassen.'],
    evidence: ['Konzept für Verteilung und Signatur'],
  },
  'VH.7a': {
    why: 'Automatische Verteilung bringt Korrekturen auch zu Nutzern, die nie danach suchen würden.',
    steps: ['Das Produkt oder seinen Update-Dienst selbst nach Updates suchen und sie laden lassen.'],
    evidence: ['Beschreibung der Update-Prüfung'],
  },
  'VH.8': {
    why: 'Eine Korrektur hilft erst, wenn sie bei den Nutzern ankommt.',
    steps: ['Sicherheitsupdates veröffentlichen, sobald sie getestet sind.', 'Interne Zielzeiten je Schweregrad festlegen.'],
    evidence: ['Zielzeiten', 'Veröffentlichungsdaten bisheriger Sicherheitsupdates'],
  },
  'VH.8a': {
    why: 'Sicherheitskorrekturen müssen im Unterstützungszeitraum kostenlos sein und mit Informationen darüber kommen, was sie beheben.',
    steps: ['Für Sicherheitskorrekturen nichts berechnen.', 'Das Advisory zusammen mit dem Update ausliefern.'],
    evidence: ['Aussage zum Support', 'Advisory zu jedem Update'],
  },

  // ── Anhang II: Informationen und Anleitungen für Nutzer ───────────────────
  'UT.1': {
    why: 'Nutzer können ein Produkt nur sicher betreiben, wenn sie wissen, von wem es stammt, was genau sie haben und wie sie es sicher einrichten, aktualisieren und außer Betrieb nehmen.',
    steps: [
      'Herstellerangaben aufnehmen: Name oder Marke, Postanschrift, E-Mail oder anderer digitaler Kontakt, Website (Anhang II Nr. 1).',
      'Das Produkt eindeutig benennen: Name, Typ und weitere Merkmale wie Version oder Seriennummer (Nr. 3).',
      'Anleitungen schreiben oder verlinken zu: sicherer Inbetriebnahme und Nutzung über die Lebensdauer, Auswirkungen von Änderungen auf die Datensicherheit, Installation von Sicherheitsupdates, sicherer Außerbetriebnahme mit Datenlöschung, Abschalten automatischer Updates (Nr. 8 a–e).',
      'Ist das Produkt zum Einbau in andere Produkte gedacht: festhalten, was der Integrator für Anhang I und Anhang VII braucht (Nr. 8 f).',
      'Falls Sie die SBOM für Nutzer bereitstellen: angeben, wo sie zu finden ist (Nr. 9).',
    ],
    evidence: ['Nutzerdokumentation mit allen Punkten aus Anhang II Nr. 1, 3, 8 und 9', 'Ort der Dokumentation (Produkt, Verpackung oder Internetadresse)'],
  },
  'UT.2': {
    why: 'Nutzer müssen wissen, wofür das Produkt gedacht ist und unter welchen Bedingungen es riskant wird, um es richtig einzusetzen.',
    steps: [
      'Den bestimmungsgemäßen Zweck beschreiben, mit der vorgesehenen Sicherheitsumgebung, den wesentlichen Funktionen und den Sicherheitseigenschaften (Anhang II Nr. 4).',
      'Bekannte oder vorhersehbare Umstände nennen, die zu erheblichen Cybersicherheitsrisiken führen können, auch bei vernünftigerweise vorhersehbarer Fehlanwendung (Nr. 5).',
      'Diese Umstände aus der Risikobewertung ableiten, damit beides zusammenpasst.',
    ],
    evidence: ['Abschnitt „Bestimmungsgemäße Verwendung und Sicherheitsumgebung" in der Nutzerdokumentation', 'Abgleich mit der Risikobewertung'],
  },
  'UT.3': {
    why: 'Wer eine Schwachstelle findet, muss eine zentrale Stelle zum Melden finden, sonst bleibt sie unbehandelt.',
    steps: [
      'Eine zentrale Anlaufstelle für Schwachstellenmeldungen benennen, über die auch Informationen empfangen werden können (Anhang II Nr. 2).',
      'Angeben, wo die Richtlinie zur koordinierten Offenlegung zu finden ist.',
      'Dieselbe Adresse in security.txt und im CSAF-Herausgeberprofil verwenden.',
    ],
    evidence: ['Kontaktstelle in der Nutzerdokumentation', 'Link auf die CVD-Richtlinie'],
  },
  'UT.4': {
    why: 'Käufer müssen wissen, wie lange sie Sicherheitsupdates bekommen. Der Zeitraum muss die erwartete Nutzungsdauer widerspiegeln und beträgt in der Regel mindestens fünf Jahre (Art. 13(8)).',
    steps: [
      'Den Unterstützungszeitraum festlegen und begründen, z. B. mit der erwarteten Nutzungsdauer und den Zeiträumen vergleichbarer Produkte.',
      'Art der Sicherheitsunterstützung und das Enddatum angeben, bis zu dem Schwachstellen behandelt und Updates bereitgestellt werden (Anhang II Nr. 7).',
      'Die Begründung in die technische Dokumentation aufnehmen (Anhang VII Nr. 4).',
    ],
    evidence: ['Enddatum des Supports in Nutzerdokumentation und Produktinformation', 'Begründung des Zeitraums in der technischen Dokumentation'],
  },
  'UT.5': {
    why: 'Mit der EU-Konformitätserklärung übernehmen Sie die Verantwortung dafür, dass das Produkt die CRA-Anforderungen erfüllt. Erst dann darf die CE-Kennzeichnung angebracht werden.',
    steps: [
      'Die EU-Konformitätserklärung mit den Angaben aus Anhang V erstellen (Produkt, Hersteller, angewandte Normen, ggf. benannte Stelle).',
      'Die CE-Kennzeichnung anbringen.',
      'Falls zutreffend: die Internetadresse der Konformitätserklärung in den Nutzerinformationen angeben (Anhang II Nr. 6).',
      'Eine Kopie in die technische Dokumentation aufnehmen (Anhang VII Nr. 7).',
    ],
    evidence: ['Unterzeichnete EU-Konformitätserklärung', 'CE-Kennzeichnung am Produkt oder auf der Verpackung'],
  },

  // ── Anhang VII: Technische Dokumentation ──────────────────────────────────
  'TD.1': {
    why: 'Die Bewertung der Cybersicherheitsrisiken ist Pflichtbestandteil der technischen Dokumentation und muss zeigen, wie die Anforderungen aus Anhang I Teil I anwendbar sind (Anhang VII Nr. 3).',
    steps: [
      'Die Risikobewertung aus dem Canvas als Dossier exportieren.',
      'Für jede Anforderung aus Anhang I Teil I angeben, ob sie anwendbar ist und warum (Statement of Applicability).',
      'Die Bewertung bei jeder relevanten Änderung aktualisieren und die Version einfrieren.',
    ],
    evidence: ['PDF-Dossier mit Risikobewertung und Statement of Applicability', 'Eingefrorene Version je Release'],
  },
  'TD.2': {
    why: 'Prüfer müssen verstehen, was das Produkt ist und wie es aufgebaut ist, sonst können sie die übrigen Nachweise nicht einordnen (Anhang VII Nr. 1 und 2).',
    steps: [
      'Allgemeine Beschreibung: Zweck, compliance-relevante Softwareversionen und bei Hardware Fotos oder Abbildungen von Außenansicht, Kennzeichnung und innerem Aufbau.',
      'Design und Entwicklung beschreiben, mit Systemarchitektur und dem Zusammenspiel der Softwarebestandteile.',
      'Produktions- und Überwachungsprozesse sowie deren Validierung beschreiben.',
    ],
    evidence: ['Architekturmodell und Komponentenliste aus dem Canvas', 'Produktbeschreibung mit Versionen und Abbildungen', 'Beschreibung der Produktionsprozesse'],
  },
  'TD.3': {
    why: 'Die technische Dokumentation muss Berichte der Prüfungen enthalten, mit denen die Konformität von Produkt und Schwachstellenbehandlung nachgewiesen wurde (Anhang VII Nr. 6).',
    steps: [
      'Für jede Anforderung festlegen, wie sie geprüft wird (Test, Analyse, Review).',
      'Automatische Prüfungen in der CI laufen lassen und die Ergebnisse je Release aufbewahren.',
      'Manuelle Prüfberichte (z. B. Penetrationstest) dem Dossier beilegen.',
    ],
    evidence: ['Prüfberichte je Release', 'CI-Läufe und Release-Gate-Ergebnis (Operations > CI/CD)'],
    ciSource: 'sast',
  },
  'TD.4': {
    why: 'Prüfer müssen für jede grundlegende Anforderung sehen, wie sie umgesetzt ist, und welche Normen oder anderen Lösungen dafür verwendet wurden (Anhang VII Nr. 3 und 5).',
    steps: [
      'Jedes Risiko mit den Maßnahmen verknüpfen, die es mindern, und Restrisiken formal akzeptieren.',
      'Die angewandten harmonisierten Normen, gemeinsamen Spezifikationen oder Zertifizierungsschemata auflisten, bei teilweiser Anwendung mit den angewandten Teilen.',
      'Wo keine Norm angewandt wurde, die gewählte Lösung beschreiben.',
    ],
    evidence: ['Rückverfolgbarkeitsmatrix im PDF-Dossier', 'Liste der angewandten Normen und Spezifikationen'],
  },
  'TD.5': {
    why: 'Eine wesentliche Änderung nach dem Inverkehrbringen (Art. 3(30)) kann die Konformität berühren. Die technische Dokumentation muss während des Unterstützungszeitraums aktuell gehalten werden (Art. 31).',
    steps: [
      'Festlegen, wann eine Änderung wesentlich ist: wenn sie die Erfüllung von Anhang I Teil I berührt oder den bestimmungsgemäßen Zweck verändert.',
      'Bei jeder solchen Änderung die Risikobewertung erneut durchführen und die technische Dokumentation aktualisieren.',
      'Prüfen, ob eine erneute Konformitätsbewertung nötig ist.',
    ],
    evidence: ['Änderungsprozess mit Kriterien für „wesentlich"', 'Versionierte Risikobewertungen je Release'],
  },
};
