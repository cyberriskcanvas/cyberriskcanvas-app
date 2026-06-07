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

  setProject: (state: {
    projectId: string;
    activeVersion: VersionState | null;
  }) => void;

  setVersionFrozen: (frozenVersion: VersionState, newActiveVersion: VersionState) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projectId: null,
  activeVersion: null,

  setProject: (state) => set(state),

  setVersionFrozen: (_frozenVersion, newActiveVersion) =>
    set({ activeVersion: newActiveVersion }),
}));

// ─── Convenience selectors ────────────────────────────────────────────────────

export function selectIsLocked(store: ProjectStore) {
  return store.activeVersion?.status === 'frozen';
}
