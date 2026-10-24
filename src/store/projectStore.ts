import { create } from 'zustand';

interface VersionState {
  id: string;
  number: number;
  status: 'active' | 'frozen';
  label: string;
  frozenAt: string | null;
  frozenByName: string | null;
}

interface ProjectStore {
  projectId: string | null;
  activeVersion: VersionState | null;
  /** Also assess against IEC 62443 (Security Level, IEC part, IEC tab, IEC page in the PDF). */
  iec62443: boolean;

  setProject: (state: {
    projectId: string;
    activeVersion: VersionState | null;
    iec62443?: boolean;
  }) => void;
  setIec62443: (enabled: boolean) => void;

  setVersionFrozen: (frozenVersion: VersionState, newActiveVersion: VersionState) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projectId: null,
  activeVersion: null,
  iec62443: false,

  setProject: (state) => set(state),
  setIec62443: (iec62443) => set({ iec62443 }),

  setVersionFrozen: (_frozenVersion, newActiveVersion) =>
    set({ activeVersion: newActiveVersion }),
}));

// ─── Convenience selectors ────────────────────────────────────────────────────

export function selectIsLocked(store: ProjectStore) {
  return store.activeVersion?.status === 'frozen';
}
