import type { Tier } from '@/lib/tierConfig';

export interface TierBlock {
  __tierBlocked: true;
  requiredTier: Tier;
  message: string;
}

export function tierBlock(requiredTier: Tier, message: string): TierBlock {
  return { __tierBlocked: true, requiredTier, message };
}

export function isTierBlock(value: unknown): value is TierBlock {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { __tierBlocked?: unknown }).__tierBlocked === true
  );
}
