import { X, Key, Check } from 'lucide-react';
import { type Tier, TIER_LABELS } from '@/store/subscriptionStore';

const PRO_FEATURES = [
  'Audit-Ready PDF export with company logo',
  'Version history & version freeze',
  'AI threat analysis & CWE suggestions',
  'SBOM import (CycloneDX + SPDX)',
  'Attack path visualization',
  'Approval workflow for review teams',
  'API access & webhooks',
  'Single Sign-On (OIDC, Microsoft Entra ID, Keycloak)',
  'Custom risk frameworks & templates',
];

interface Props {
  currentTier: Tier;
  requiredTier: Tier;
  onClose: () => void;
}

export function PaywallModal({ requiredTier, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl">
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-indigo-900/60 to-violet-900/60 p-6 border-b border-gray-800">
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-500 hover:text-white">
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-900/50">
              <Key size={22} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">License required</p>
              <h2 className="text-lg font-bold text-white">{TIER_LABELS[requiredTier]} feature</h2>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-400">
            This feature requires a valid <span className="font-semibold text-white">Pro license</span>.
            Contact your administrator or purchase a license.
          </p>
        </div>

        {/* Features */}
        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Pro includes</p>
          <ul className="space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                <Check size={14} className="mt-0.5 shrink-0 text-green-400" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-700 py-2.5 text-sm text-gray-400 hover:bg-gray-800"
          >
            Close
          </button>
          <a
            href={process.env.NEXT_PUBLIC_LICENSE_URL ?? 'https://cyberriskcanvas.com/pricing'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Get a license
          </a>
        </div>
      </div>
    </div>
  );
}
