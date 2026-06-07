import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Lang = 'en' | 'de';

interface LanguageState {
  lang: Lang;
  toggleLang: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      lang: 'en',
      toggleLang: () => set({ lang: get().lang === 'en' ? 'de' : 'en' }),
    }),
    { name: 'diagram-language' }
  )
);
