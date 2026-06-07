import { hasValidLicense } from './license';

export type { Tier, TierConfig } from './tierConfig';
export { TIER_CONFIG } from './tierConfig';

export async function getTier(): Promise<'free' | 'pro'> {
  return (await hasValidLicense()) ? 'pro' : 'free';
}
