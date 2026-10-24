import { useMemo } from 'react';
import { useDiagramStore } from '@/store/diagramStore';
import { useJourneyStore } from '@/store/journeyStore';
import { applyDismissals, checkModel } from '@/utils/modelCheck';
import { deriveJourney } from '@/utils/deriveJourney';

/** Roadmap stations of the open project, computed from the shared journey data and the live diagram. */
export function useJourneyStations() {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const data = useJourneyStore((s) => s.data);
  const ci = useJourneyStore((s) => s.ci);
  const dismissed = useJourneyStore((s) => s.dismissed);
  const modelOpen = useMemo(() => {
    const decided = new Set(Object.keys(data?.checklist ?? {}));
    return applyDismissals(checkModel({ nodes, edges, decidedRequirements: decided }), dismissed).open;
  }, [nodes, edges, dismissed, data]);
  const stations = useMemo(
    () => (data ? deriveJourney({ nodes, ciLatest: ci?.latest ?? null, gateReasons: ci?.reasons ?? null, data, modelFindings: modelOpen }) : []),
    [nodes, ci, data, modelOpen],
  );
  return { data, ci, modelOpen, stations };
}
