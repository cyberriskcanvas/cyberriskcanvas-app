'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Shield, Eye, EyeOff, AlertCircle, KeyRound } from 'lucide-react';

const SSO_ERROR_MESSAGES: Record<string, string> = {
  SsoRequiresPro: 'Single sign-on requires a Pro license.',
  SsoNoEmail: 'Your identity provider did not return an e-mail address.',
  SsoEmailUnverified: 'Your e-mail address is not verified at your identity provider.',
  AccessDenied: 'Access denied by the identity provider.',
};

interface Props {
  ssoProviders: { id: string; name: string }[];
}

export default function LoginClient({ ssoProviders }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [ssoPending, setSsoPending] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const code = searchParams.get('error');
    return code ? (SSO_ERROR_MESSAGES[code] ?? 'Single sign-on failed. Please try again.') : null;
  });

  const handleLogin = () => {
    setError(null);
    startTransition(async () => {
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.error) {
        setError('Invalid email or password.');
      } else {
        router.push('/dashboard');
      }
    });
  };

  const handleSsoLogin = (providerId: string) => {
    setError(null);
    setSsoPending(providerId);
    void signIn(providerId, { callbackUrl: '/dashboard' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf9f7] p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1e293b] shadow-sm">
            <Shield size={28} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#1a1917]">CyberRisk Canvas</h1>
            <p className="text-sm text-[#6b6460]">Cybersecurity Platform · IEC 62443</p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-[#e5e1d8] bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-[#1a1917]">Sign in</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#6b6460]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="you@company.com"
                autoComplete="email"
                className="w-full rounded-xl border border-[#e5e1d8] bg-white px-3.5 py-2.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none focus:ring-1 focus:ring-[#1e293b]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#6b6460]">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-[#e5e1d8] bg-white px-3.5 py-2.5 pr-10 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none focus:ring-1 focus:ring-[#1e293b]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c8c0b0] hover:text-[#6b6460]"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isPending || !email || !password}
              className="w-full rounded-xl bg-[#1e293b] py-2.5 text-sm font-semibold text-white hover:bg-[#374151] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Sign in
            </button>

            {ssoProviders.length > 0 && (
              <>
                <div className="flex items-center gap-3 pt-1">
                  <div className="h-px flex-1 bg-[#e5e1d8]" />
                  <span className="text-xs text-[#c8c0b0]">or</span>
                  <div className="h-px flex-1 bg-[#e5e1d8]" />
                </div>

                {ssoProviders.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => handleSsoLogin(provider.id)}
                    disabled={ssoPending !== null}
                    className="w-full rounded-xl border border-[#e5e1d8] bg-white py-2.5 text-sm font-semibold text-[#1a1917] hover:bg-[#faf9f7] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {ssoPending === provider.id ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1a1917] border-t-transparent" />
                    ) : (
                      <KeyRound size={15} />
                    )}
                    Sign in with {provider.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#c8c0b0]">
          Contact your administrator to request access.
        </p>
      </div>
    </div>
  );
}
