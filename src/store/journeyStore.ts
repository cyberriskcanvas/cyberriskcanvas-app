import { create } from 'zustand';
import { getJourneyData } from '@/actions/productInfo';
import { getModelCheckDismissed } from '@/actions/modelCheck';
import type { JourneyData, StationId } from '@/utils/deriveJourney';
import type { CraChecklist } from '@/lib/craChecklist';

export type JourneyLoaded = JourneyData & { sdl: { done: number }; projectName: string; orgChecklist: CraChecklist };
export type CiState = { latest: Array<{ source: string; result: string }>; reasons: Array<{ code: string; message: string }> } | null;

interface JourneyStore {
  projectId: string | null;
  data: JourneyLoaded | null;
  ci: CiState;
  dismissed: Record<string, string>;
  /** Station the roadmap should show when it opens (set by the next-step bar). */
  focus: StationId | null;
  load: (projectId: string) => void;
  setData: (fn: (d: JourneyLoaded | null) => JourneyLoaded | null) => void;
  setFocus: (id: StationId | null) => void;
}

/** The roadmap's data, shared by the roadmap tab and the next-step bar in the other tabs. */
export const useJourneyStore = create<JourneyStore>((set, get) => ({
  projectId: null,
  data: null,
  ci: null,
  dismissed: {},
  focus: null,
  load: (projectId) => {
    if (get().projectId !== projectId) set({ projectId, data: null, ci: null, dismissed: {} });
    getJourneyData(projectId).then((data) => get().projectId === projectId && set({ data })).catch(() => {});
    getModelCheckDismissed(projectId).then((dismissed) => get().projectId === projectId && set({ dismissed })).catch(() => {});
    // Free tier or no access: 403/404, then CI-based checks stay open with a hint
    fetch(`/api/projects/${projectId}/ci/runs`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => get().projectId === projectId && set({ ci: d ? { latest: d.latest ?? [], reasons: d.gate?.reasons ?? [] } : null }))
      .catch(() => set({ ci: null }));
  },
  setData: (fn) => set((s) => ({ data: fn(s.data) })),
  setFocus: (focus) => set({ focus }),
}));
