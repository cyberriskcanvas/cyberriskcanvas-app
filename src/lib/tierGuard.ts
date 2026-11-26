import { requireSession } from '@/lib/auth';
import { TIER_CONFIG, getTier, type Tier, type TierConfig } from '@/lib/tierLimits';
import { tierBlock, type TierBlock } from '@/lib/tierBlock';

export class TierError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TierError';
  }
}

type BooleanFeature = {
  [K in keyof TierConfig]: TierConfig[K] extends boolean ? K : never;
}[keyof TierConfig];

export async function getSessionTier(): Promise<{ userId: string; tier: Tier }> {
  const session = await requireSession();
  const tier = await getTier();
  return { userId: session.user.id, tier };
}

export async function requireTierFeature(
  feature: BooleanFeature,
): Promise<{ userId: string; tier: Tier }> {
  const { userId, tier } = await getSessionTier();
  if (TIER_CONFIG[tier][feature] !== true) {
    throw new TierError('This feature requires a valid Pro license.');
  }
  return { userId, tier };
}

export async function checkTierFeature(
  feature: BooleanFeature,
): Promise<{ ok: true; userId: string; tier: Tier } | TierBlock> {
  const { userId, tier } = await getSessionTier();
  if (TIER_CONFIG[tier][feature] === true) return { ok: true, userId, tier };
  return tierBlock('pro', 'This feature requires a valid Pro license.');
}
