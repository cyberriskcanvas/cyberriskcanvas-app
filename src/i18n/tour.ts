import { useLanguageStore } from '@/store/languageStore';

interface TourStep { title: string; see: string; why: string; todo: string; example?: string; done?: string }

const en = {
  labels: { see: 'What do you see here?', why: 'What is it for?', todo: 'What needs to be done?' },
  locale: { back: 'Back', close: 'Close', last: 'Done', next: 'Next', skip: 'Skip tour' },
  demoNode: 'Demo component',
  steps: [
    { title: 'Step 1: Draw the system', see: 'A large canvas and a bar of components.', why: 'This is where you rebuild your technical system and show how components communicate.', todo: 'Drag the boxes onto the canvas and connect them with lines.', example: 'You are planning a smart garage door. Drag the boxes "Motor" and "Phone app" onto the canvas. Connect them.' },
    { title: 'Step 2: Find weaknesses', see: 'The "Threats & risks" tab: one card per threat. Each card shows what is still to do.', why: 'This is where you note where your system can be attacked.', todo: 'Click a component. Think about what can go wrong and write the weakness down.', example: 'The radio link has no password. Someone could intercept the signal.' },
    { title: 'Step 3: Rate the risk', see: 'The rating inside the same card: two sliders and a coloured result.', why: 'This is where you rank how dangerous a weakness really is.', todo: 'How likely is the attack? How big is the damage? Move the sliders and add the rating.', example: 'Easy to open and high damage. The result turns red.' },
    { title: 'Step 4: Solve the problem', see: 'The measures at the bottom of the card.', why: 'This is where you plan the protection for your system.', todo: 'Write down a solution. Choose a person. Set the status to "in progress".', example: '"The app must ask for a password." The risk then moves into the green area.' },
    { title: 'Step 5: Create the report', see: 'The "Reports & exports" button: PDF dossier, Statement of Applicability, SBOM.', why: 'It summarises your drawing and risks. This is your evidence.', todo: 'Click the button and save the file.', done: 'You are done.' },
  ] as TourStep[],
};

const de: typeof en = {
  labels: { see: 'Was siehst du hier?', why: 'Wozu ist es gedacht?', todo: 'Was muss getan werden?' },
  locale: { back: 'Zurück', close: 'Schließen', last: 'Fertig', next: 'Weiter', skip: 'Tour überspringen' },
  demoNode: 'Demo-Bauteil',
  steps: [
    { title: 'Schritt 1: Das System zeichnen', see: 'Eine große Zeichenfläche und eine Leiste mit Bauteilen.', why: 'Hier baust du dein technisches System nach. Du machst sichtbar, wie Bauteile kommunizieren.', todo: 'Ziehe die Boxen auf die Fläche und verbinde sie mit Linien.', example: 'Du planst ein smartes Garagentor. Ziehe die Box „Motor" und „Handy-App" auf die Fläche. Verbinde beide.' },
    { title: 'Schritt 2: Schwachstellen finden', see: 'Den Tab „Bedrohungen & Risiken“: eine Karte pro Bedrohung. Jede Karte zeigt, was noch zu tun ist.', why: 'Hier trägst du ein, wo dein System angreifbar ist.', todo: 'Klicke auf ein Bauteil. Überlege, was schiefgehen kann, und schreibe die Schwachstelle auf.', example: 'Das Signal der Funkverbindung hat kein Passwort. Jemand könnte es abfangen.' },
    { title: 'Schritt 3: Das Risiko bewerten', see: 'Die Bewertung in derselben Karte: zwei Regler und ein farbiges Ergebnis.', why: 'Hier ordnest du ein, wie gefährlich eine Schwachstelle wirklich ist.', todo: 'Wie wahrscheinlich ist der Angriff? Wie groß ist der Schaden? Stelle die Regler ein und füge die Bewertung hinzu.', example: 'Leicht zu öffnen und hoher Schaden. Das Ergebnis wird rot.' },
    { title: 'Schritt 4: Das Problem lösen', see: 'Die Maßnahmen am Ende der Karte.', why: 'Hier planst du den Schutz für dein System.', todo: 'Schreibe eine Lösung auf. Wähle eine Person aus. Setze den Status auf „in Arbeit".', example: '„Die App muss ein Passwort abfragen." Danach rutscht das Risiko in den grünen Bereich.' },
    { title: 'Schritt 5: Den Bericht erstellen', see: 'Den Knopf „Berichte & Exporte": PDF-Dossier, Statement of Applicability, SBOM.', why: 'Das fasst deine Zeichnung und Risiken zusammen. Das ist dein Nachweis.', todo: 'Klicke auf den Knopf und speichere die Datei.', done: 'Du bist fertig.' },
  ],
};

export function useTourT() {
  const lang = useLanguageStore((s) => s.lang);
  return { en, de }[lang];
}
export function getTourT(lang: 'en' | 'de') {
  return { en, de }[lang];
}
