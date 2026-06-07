'use client';

import { useEffect, useState, useCallback } from 'react';
import { Joyride, STATUS, EVENTS, type EventData, type Controls, type Step } from 'react-joyride';
import { useDiagramStore } from '@/store/diagramStore';
import { useTourStore } from '@/store/tourStore';

const STORAGE_KEY = 'cyberrisk_tour_done';
const TOUR_NODE_ID = '__tour_demo__';

// Step index → detail panel tab mapping (steps 1–4 = indices 1–4)
const STEP_TAB: Record<number, string> = {
  1: 'threats',
  2: 'iec62443',
  3: 'risks',
  4: 'measures',
};

const STEPS: Step[] = [
  {
    target: '[data-tour="canvas"]',
    placement: 'center',
    skipBeacon: true,
    title: 'Schritt 1: Das System zeichnen',
    content: (
      <div style={{ textAlign: 'left', lineHeight: '1.6' }}>
        <p style={{ marginBottom: 6 }}><strong>Was siehst du hier?</strong> Eine große Zeichenfläche und eine Leiste mit Bauteilen.</p>
        <p style={{ marginBottom: 6 }}><strong>Wozu ist es gedacht?</strong> Hier baust du dein technisches System nach. Du machst sichtbar, wie Bauteile kommunizieren.</p>
        <p style={{ marginBottom: 6 }}><strong>Was muss getan werden?</strong> Ziehe die Boxen auf die Fläche und verbinde sie mit Linien.</p>
        <p style={{ color: '#6b6460', fontSize: 12, fontStyle: 'italic', margin: 0 }}>Beispiel: Du planst ein smartes Garagentor. Ziehe die Box „Motor" und „Handy-App" auf die Fläche. Verbinde beide.</p>
      </div>
    ),
  },
  {
    target: '[data-tour="threats-list"]',
    placement: 'left',
    skipBeacon: true,
    beforeTimeout: 500,
    title: 'Schritt 2: Schwachstellen finden',
    content: (
      <div style={{ textAlign: 'left', lineHeight: '1.6' }}>
        <p style={{ marginBottom: 6 }}><strong>Was siehst du hier?</strong> Eine Liste für Bedrohungen.</p>
        <p style={{ marginBottom: 6 }}><strong>Wozu ist es gedacht?</strong> Hier trägst du ein, wo dein System angreifbar ist.</p>
        <p style={{ marginBottom: 6 }}><strong>Was muss getan werden?</strong> Klicke auf ein Bauteil. Überlege, was schiefgehen kann, und schreibe die Schwachstelle auf.</p>
        <p style={{ color: '#6b6460', fontSize: 12, fontStyle: 'italic', margin: 0 }}>Beispiel: Das Signal der Funkverbindung hat kein Passwort. Jemand könnte es abfangen.</p>
      </div>
    ),
  },
  {
    target: '[data-tour="iec-dropdown"]',
    placement: 'left',
    skipBeacon: true,
    beforeTimeout: 300,
    title: 'Schritt 3: Die Norm IEC 62443 anwenden',
    content: (
      <div style={{ textAlign: 'left', lineHeight: '1.6' }}>
        <p style={{ marginBottom: 6 }}><strong>Was siehst du hier?</strong> Ein Auswahlfeld für „IEC 62443" und das „Security Level".</p>
        <p style={{ marginBottom: 6 }}><strong>Wozu ist es gedacht?</strong> Damit zeigst du, dass du dich an offizielle Regeln hältst.</p>
        <p style={{ marginBottom: 6 }}><strong>Was muss getan werden?</strong> Wähle für deine Schwachstelle die passende Regel aus. Lege fest, wie stark der Schutz sein muss.</p>
        <p style={{ color: '#6b6460', fontSize: 12, fontStyle: 'italic', margin: 0 }}>Beispiel: Die Norm fordert eine Anmeldung. Du wählst diese Regel für deine App aus.</p>
      </div>
    ),
  },
  {
    target: '[data-tour="risk-matrix"]',
    placement: 'left',
    skipBeacon: true,
    beforeTimeout: 300,
    title: 'Schritt 4: Das Risiko bewerten',
    content: (
      <div style={{ textAlign: 'left', lineHeight: '1.6' }}>
        <p style={{ marginBottom: 6 }}><strong>Was siehst du hier?</strong> Die Risiko-Matrix. Das ist ein Raster mit grünen, gelben und roten Feldern.</p>
        <p style={{ marginBottom: 6 }}><strong>Wozu ist es gedacht?</strong> Hier ordnest du ein, wie gefährlich eine Schwachstelle wirklich ist.</p>
        <p style={{ marginBottom: 6 }}><strong>Was muss getan werden?</strong> Wie leicht ist der Angriff? Wie groß ist der Schaden? Klicke auf das passende Feld.</p>
        <p style={{ color: '#6b6460', fontSize: 12, fontStyle: 'italic', margin: 0 }}>Beispiel: Leicht zu öffnen und hoher Schaden. Du wählst ein rotes Feld.</p>
      </div>
    ),
  },
  {
    target: '[data-tour="measures-tracker"]',
    placement: 'left',
    skipBeacon: true,
    beforeTimeout: 300,
    title: 'Schritt 5: Das Problem lösen',
    content: (
      <div style={{ textAlign: 'left', lineHeight: '1.6' }}>
        <p style={{ marginBottom: 6 }}><strong>Was siehst du hier?</strong> Den Maßnahmen-Tracker.</p>
        <p style={{ marginBottom: 6 }}><strong>Wozu ist es gedacht?</strong> Hier planst du den Schutz für dein System.</p>
        <p style={{ marginBottom: 6 }}><strong>Was muss getan werden?</strong> Schreibe eine Lösung auf. Wähle eine Person aus. Setze den Status auf „in Arbeit".</p>
        <p style={{ color: '#6b6460', fontSize: 12, fontStyle: 'italic', margin: 0 }}>Beispiel: „Die App muss ein Passwort abfragen." Danach rutscht das Risiko in den grünen Bereich.</p>
      </div>
    ),
  },
  {
    target: '[data-tour="export-btn"]',
    placement: 'bottom',
    skipBeacon: true,
    title: 'Schritt 6: Den Bericht erstellen',
    content: (
      <div style={{ textAlign: 'left', lineHeight: '1.6' }}>
        <p style={{ marginBottom: 6 }}><strong>Was siehst du hier?</strong> Den Knopf „PDF-Bericht exportieren".</p>
        <p style={{ marginBottom: 6 }}><strong>Wozu ist es gedacht?</strong> Das fasst deine Zeichnung und Risiken zusammen. Das ist dein Nachweis.</p>
        <p style={{ marginBottom: 6 }}><strong>Was muss getan werden?</strong> Klicke auf den Knopf und speichere die Datei.</p>
        <p style={{ fontWeight: 600, color: '#1a1917', margin: 0 }}>Du bist fertig.</p>
      </div>
    ),
  },
];

interface Props {
  userId: string;
}

export function OnboardingTour({ userId }: Props) {
  const storageKey = `${STORAGE_KEY}_${userId}`;
  const [run, setRun] = useState(false);
  const { selectNode, addNode, deleteNode, closeDetailPanel } = useDiagramStore();
  const { setPanelTab } = useTourStore();

  useEffect(() => {
    const done = localStorage.getItem(storageKey);
    if (!done) {
      const timer = setTimeout(() => setRun(true), 800);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const cleanup = useCallback(() => {
    closeDetailPanel();
    setPanelTab(null);
    const { nodes } = useDiagramStore.getState();
    if (nodes.find((n) => n.id === TOUR_NODE_ID)) {
      deleteNode(TOUR_NODE_ID);
    }
  }, [closeDetailPanel, deleteNode, setPanelTab]);

  const openPanelForStep = useCallback((index: number) => {
    const tab = STEP_TAB[index];
    if (!tab) return;

    // Find a suitable node to select (prefer existing, otherwise create a demo node)
    const { nodes } = useDiagramStore.getState();
    const realNode = nodes.find((n) => n.type !== 'boundary' && n.id !== TOUR_NODE_ID);

    if (realNode) {
      selectNode(realNode.id);
    } else {
      if (!nodes.find((n) => n.id === TOUR_NODE_ID)) {
        addNode({
          id: TOUR_NODE_ID,
          type: 'hardware',
          position: { x: 160, y: 120 },
          data: { label: 'Demo-Bauteil', componentType: 'ecu' },
        });
      }
      selectNode(TOUR_NODE_ID);
    }

    setPanelTab(tab);
  }, [selectNode, addNode, setPanelTab]);

  const handleEvent = useCallback((data: EventData, _controls: Controls) => {
    const { status, type, index } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem(storageKey, 'true');
      setRun(false);
      cleanup();
      return;
    }

    if (type === EVENTS.STEP_BEFORE) {
      if (index === 0 || index === 5) {
        // Step 1 (canvas) and step 6 (export): no panel needed
        cleanup();
      } else {
        openPanelForStep(index);
      }
    }
  }, [storageKey, cleanup, openPanelForStep]);

  return (
    <Joyride
      steps={STEPS}
      run={run}
      continuous
      scrollToFirstStep={false}
      onEvent={handleEvent}
      options={{
        overlayColor: 'rgba(0, 0, 0, 0.45)',
        overlayClickAction: false,
        skipScroll: true,
        showProgress: true,
        primaryColor: '#1e293b',
        backgroundColor: '#ffffff',
        textColor: '#1a1917',
        arrowColor: '#ffffff',
        zIndex: 10000,
        spotlightRadius: 8,
      }}
      locale={{
        back: 'Zurück',
        close: 'Schließen',
        last: 'Fertig',
        next: 'Weiter',
        skip: 'Tour überspringen',
      }}
      styles={{
        tooltip: {
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
          padding: '20px 24px',
          fontFamily: 'inherit',
          width: 400,
        },
        tooltipTitle: {
          fontSize: '14px',
          fontWeight: '700',
          color: '#1a1917',
          marginBottom: '10px',
          lineHeight: '1.4',
        },
        tooltipContent: {
          fontSize: '13px',
          lineHeight: '1.6',
          color: '#44403c',
          padding: '0',
        },
        tooltipFooter: {
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #e5e1d8',
        },
        buttonPrimary: {
          backgroundColor: '#1e293b',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '7px 16px',
          fontSize: '13px',
          fontWeight: '600',
          border: 'none',
          cursor: 'pointer',
        },
        buttonBack: {
          color: '#6b6460',
          fontSize: '13px',
          fontWeight: '500',
          marginRight: '8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        },
        buttonSkip: {
          color: '#9ca3af',
          fontSize: '12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        },
      }}
    />
  );
}
