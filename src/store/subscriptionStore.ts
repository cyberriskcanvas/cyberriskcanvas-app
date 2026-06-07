import { create } from 'zustand';

export type Tier = 'free' | 'pro';

interface LicenseStore {
  tier: Tier;
  setTier: (tier: Tier) => void;
}

export const useSubscriptionStore = create<LicenseStore>()((set) => ({
  tier: 'free',
  setTier: (tier) => set({ tier }),
}));

export const TIER_LABELS: Record<Tier, string> = {
  free: 'Community',
  pro: 'Pro',
};

export const TIER_COLORS: Record<Tier, string> = {
  free: 'bg-gray-700 text-gray-300',
  pro: 'bg-indigo-700 text-indigo-200',
};
