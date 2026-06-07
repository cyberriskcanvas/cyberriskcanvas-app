'use client';

// PaywallHost is no longer needed - upgrade prompts are rendered inline by FeatureGate / useTierGuard.
// Kept as a no-op export so any remaining imports don't break during migration.
export function PaywallHost() {
  return null;
}
