import { create } from 'zustand';
import type { Tier } from '@/store/subscriptionStore';

interface PaywallStore {
  requiredTier: Tier | null;
  showPaywall: (requiredTier?: Tier) => void;
  hidePaywall: () => void;
}

export const usePaywallStore = create<PaywallStore>((set) => ({
  requiredTier: null,
  showPaywall: (requiredTier = 'pro') => set({ requiredTier }),
  hidePaywall: () => set({ requiredTier: null }),
}));
