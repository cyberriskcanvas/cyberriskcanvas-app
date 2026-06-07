import { create } from 'zustand';

interface TourStore {
  panelTab: string | null;
  setPanelTab: (tab: string | null) => void;
}

export const useTourStore = create<TourStore>((set) => ({
  panelTab: null,
  setPanelTab: (panelTab) => set({ panelTab }),
}));
