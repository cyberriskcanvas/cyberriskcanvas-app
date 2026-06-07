'use client';

import { useState } from 'react';
import { useLicense } from '@/lib/licenseContext';
import { UpgradeBanner } from './UpgradeBanner';

interface Props {
  /** Human-readable label shown in the upgrade banner (e.g. "PDF Export"). */
  featureLabel?: string;
  children: React.ReactNode;
  /**
   * What to render when unlicensed.
   * - "hide"   → render nothing (default)
   * - "dim"    → render grayed-out children; click shows inline banner
   * - "banner" → render children + a static banner below them
   * - ReactNode → render that node directly
   */
  fallback?: 'hide' | 'dim' | 'banner' | React.ReactNode;
}

export function FeatureGate({ featureLabel, children, fallback = 'hide' }: Props) {
  const { isPro } = useLicense();
  const [bannerVisible, setBannerVisible] = useState(false);

  if (isPro) return <>{children}</>;

  if (fallback === 'hide') return null;

  if (fallback === 'dim') {
    return (
      <div className="contents">
        <div
          className="cursor-not-allowed opacity-50 select-none"
          title={featureLabel ? `${featureLabel} requires a Pro license` : 'Requires Pro license'}
          onClick={() => setBannerVisible(true)}
        >
          {children}
        </div>
        {bannerVisible && (
          <UpgradeBanner featureLabel={featureLabel} onDismiss={() => setBannerVisible(false)} />
        )}
      </div>
    );
  }

  if (fallback === 'banner') {
    return (
      <div className="contents">
        <div className="cursor-not-allowed opacity-50 select-none">
          {children}
        </div>
        <UpgradeBanner featureLabel={featureLabel} />
      </div>
    );
  }

  // Custom fallback ReactNode
  return <>{fallback}</>;
}
