import { useSession } from 'next-auth/react';
import { TIER_LABELS, TIER_COLORS, type Tier } from '@/store/subscriptionStore';
import { cn } from '@/utils/cn';

export function SubscriptionBadge() {
  const { data: session } = useSession();
  const tier = ((session?.user as { tier?: string } | undefined)?.tier ?? 'free') as Tier;

  return (
    <span className={cn('rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', TIER_COLORS[tier])}>
      {TIER_LABELS[tier]}
    </span>
  );
}
