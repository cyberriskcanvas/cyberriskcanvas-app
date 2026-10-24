'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Joyride, STATUS, EVENTS, type EventData, type Controls, type Step } from 'react-joyride';
import { useDiagramStore } from '@/store/diagramStore';
import { useTourStore } from '@/store/tourStore';
import { getTourT, useTourT } from '@/i18n/tour';

const STORAGE_KEY = 'cyberrisk_tour_done';
const TOUR_NODE_ID = '__tour_demo__';

// Step index → detail panel tab mapping: threats, rating and measures all live in the risks tab
const STEP_TAB: Record<number, string> = {
  1: 'risks',
  2: 'risks',
  3: 'risks',
};

const STEP_PROPS: Pick<Step, 'target' | 'placement' | 'beforeTimeout'>[] = [
  { target: '[data-tour="canvas"]', placement: 'center' },
  { target: '[data-tour="threats-list"]', placement: 'left', beforeTimeout: 500 },
  { target: '[data-tour="risk-matrix"]', placement: 'left', beforeTimeout: 300 },
  { target: '[data-tour="measures-tracker"]', placement: 'left', beforeTimeout: 300 },
  { target: '[data-tour="export-btn"]', placement: 'bottom' },
];

function buildSteps(t: ReturnType<typeof getTourT>): Step[] {
  const p = { marginBottom: 6 } as const;
  return STEP_PROPS.map((props, i) => {
    const st = t.steps[i];
    return {
      ...props,
      skipBeacon: true,
      title: st.title,
      content: (
        <div style={{ textAlign: 'left', lineHeight: '1.6' }}>
          <p style={p}><strong>{t.labels.see}</strong> {st.see}</p>
          <p style={p}><strong>{t.labels.why}</strong> {st.why}</p>
          <p style={p}><strong>{t.labels.todo}</strong> {st.todo}</p>
          {st.example && <p style={{ color: '#6b6460', fontSize: 12, fontStyle: 'italic', margin: 0 }}>{st.example}</p>}
          {st.done && <p style={{ fontWeight: 600, color: '#1a1917', margin: 0 }}>{st.done}</p>}
        </div>
      ),
    };
  });
}

interface Props {
  userId: string;
  /** The tour points at the canvas: it only runs while the canvas (Design tab) is shown. */
  active: boolean;
}

/** Lets the tour start again the next time the canvas is shown. */
export function resetOnboardingTour(userId: string) {
  try { localStorage.removeItem(`${STORAGE_KEY}_${userId}`); } catch { /* storage blocked: the tour shows anyway */ }
}

export function OnboardingTour({ userId, active }: Props) {
  const storageKey = `${STORAGE_KEY}_${userId}`;
  const [run, setRun] = useState(false);
  const t = useTourT();
  const steps = useMemo(() => buildSteps(t), [t]);
  const { selectNode, addNode, deleteNode, closeDetailPanel } = useDiagramStore();
  const { setPanelTab } = useTourStore();

  const cleanup = useCallback(() => {
    closeDetailPanel();
    setPanelTab(null);
    const { nodes } = useDiagramStore.getState();
    if (nodes.find((n) => n.id === TOUR_NODE_ID)) {
      deleteNode(TOUR_NODE_ID);
    }
  }, [closeDetailPanel, deleteNode, setPanelTab]);

  // Start the first time the canvas is shown; stop (without marking it done) when the user leaves the canvas
  useEffect(() => {
    if (!active) {
      setRun(false);
      cleanup();
      return;
    }
    let done = false;
    try { done = !!localStorage.getItem(storageKey); } catch { /* storage blocked: show the tour */ }
    if (done) return;
    const timer = setTimeout(() => setRun(true), 800);
    return () => clearTimeout(timer);
  }, [active, storageKey, cleanup]);

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
          data: { label: t.demoNode, componentType: 'ecu' },
        });
      }
      selectNode(TOUR_NODE_ID);
    }

    setPanelTab(tab);
  }, [selectNode, addNode, setPanelTab, t.demoNode]);

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
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep={false}
      onEvent={handleEvent}
      options={{
        // The overlay swallows pointer events on everything outside the spotlight,
        // which blocked dragging components from the sidebar while the tour ran.
        hideOverlay: true,
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
      locale={t.locale}
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
