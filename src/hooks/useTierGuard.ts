import { useState, useCallback } from 'react';
import { useLicense } from '@/lib/licenseContext';
import { TIER_CONFIG, type Tier, type TierConfig } from '@/lib/tierConfig';

type BooleanFeature = {
  [K in keyof TierConfig]: TierConfig[K] extends boolean ? K : never;
}[keyof TierConfig];

export interface TierGuardResult {
  allowed: boolean;
  tier: Tier;
  requiredTier: Tier;
  showPaywall: () => void;
  paywallVisible: boolean;
  hidePaywall: () => void;
}

export function useTierGuard(feature: BooleanFeature | string): TierGuardResult {
  const { isPro } = useLicense();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const tier: Tier = isPro ? 'pro' : 'free';
  const cfg = TIER_CONFIG[tier];
  const allowed = (cfg as unknown as Record<string, boolean>)[feature] === true;

  const showPaywall = useCallback(() => {
    if (!allowed) setPaywallVisible(true);
  }, [allowed]);

  const hidePaywall = useCallback(() => setPaywallVisible(false), []);

  return { allowed, tier, requiredTier: 'pro' as Tier, showPaywall, paywallVisible, hidePaywall };
}
