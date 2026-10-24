'use client';

import { useSettingsT } from '@/i18n/settings';
import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Shield, User, Lock, Trash2, Upload, X, ChevronLeft,
  CheckCircle, AlertCircle, Building2, Image as ImageIcon, Users, ExternalLink,
  Key, Plus, Copy, Eye, EyeOff, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { updateUserProfile, changePassword, deleteAccount } from '@/actions/auth';
import { copyText } from '@/lib/insecureContext';

interface TeamMembership {
  id: string;
  role: string;
  team: { id: string; name: string; type: string };
}

interface ApiKeyMeta {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface Props {
  user: {
    id: string;
    name: string;
    email: string;
    companyName: string;
    companyLogo: string;
    hasPassword: boolean;
    role: string;
    memberships: TeamMembership[];
    isPro: boolean;
  };
  apiKeys: ApiKeyMeta[];
  initialSection?: string;
}

type Section = 'profile' | 'logo' | 'organisation' | 'password' | 'team' | 'api' | 'danger';

function Alert({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
      type === 'success'
        ? 'border border-green-800 bg-green-900/30 text-green-400'
        : 'border border-red-800 bg-red-900/30 text-red-400'
    }`}>
      {type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
      {message}
    </div>
  );
}

export default function SettingsClient({ user, apiKeys: initialApiKeys, initialSection }: Props) {
  const { t, lang } = useSettingsT();
  const loc = lang === 'de' ? 'de-DE' : 'en-GB';
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // Profile
  const [name, setName] = useState(user.name);
  const [companyName, setCompanyName] = useState(user.companyName);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Logo
  const [logoPreview, setLogoPreview] = useState<string>(user.companyLogo);
  const [logoMsg, setLogoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKeyMeta[]>(initialApiKeys);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [keyMsg, setKeyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [keyVisible, setKeyVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const [section, setSection] = useState<Section>(() => (['profile', 'logo', 'organisation', 'password', 'team', 'api', 'danger'] as const).find((s) => s === initialSection) ?? 'profile');

  const handleProfileSave = () => {
    if (!name.trim()) return;
    setProfileMsg(null);
    startTransition(async () => {
      try {
        await updateUserProfile({ name: name.trim(), companyName: companyName.trim() || undefined });
        await updateSession({ name: name.trim() });
        setProfileMsg({ type: 'success', text: t.profile.updated });
      } catch (e) {
        setProfileMsg({ type: 'error', text: e instanceof Error ? e.message : t.profile.failed });
      }
    });
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 250_000) {
      setLogoMsg({ type: 'error', text: t.logo.tooLarge });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoSave = () => {
    setLogoMsg(null);
    startTransition(async () => {
      try {
        await updateUserProfile({ companyLogo: logoPreview || undefined });
        await updateSession({ companyLogo: logoPreview || null });
        setLogoMsg({ type: 'success', text: t.logo.saved });
      } catch (e) {
        setLogoMsg({ type: 'error', text: e instanceof Error ? e.message : t.logo.failed });
      }
    });
  };

  const handleLogoRemove = () => {
    setLogoPreview('');
    setLogoMsg(null);
  };

  const handlePasswordChange = () => {
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: t.pw.mismatch });
      return;
    }
    setPwMsg(null);
    startTransition(async () => {
      try {
        await changePassword(currentPw, newPw);
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
        setPwMsg({ type: 'success', text: t.pw.ok });
      } catch (e) {
        setPwMsg({ type: 'error', text: e instanceof Error ? e.message : t.pw.failed });
      }
    });
  };

  const handleDeleteAccount = () => {
    if (deleteConfirm !== user.email) return;
    startTransition(async () => {
      try {
        await deleteAccount();
        await signOut({ callbackUrl: '/' });
      } catch {
        setShowDeleteConfirm(false);
      }
    });
  };

  async function handleCreateKey() {
    const name = newKeyName.trim();
    if (!name) return;
    setCreatingKey(true);
    setKeyMsg(null);
    setNewlyCreatedKey(null);
    try {
      const res = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) { setKeyMsg({ type: 'error', text: data.error ?? t.api.createFailed }); return; }
      setApiKeys((prev) => [{ id: data.id, name: data.name, prefix: data.prefix, lastUsedAt: null, createdAt: data.createdAt }, ...prev]);
      setNewlyCreatedKey(data.key);
      setNewKeyName('');
      setKeyVisible(true);
    } catch {
      setKeyMsg({ type: 'error', text: t.api.network });
    } finally {
      setCreatingKey(false);
    }
  }

  async function handleRevokeKey(id: string) {
    setRevokingId(id);
    try {
      const res = await fetch(`/api/user/api-keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== id));
        if (newlyCreatedKey) setNewlyCreatedKey(null);
      }
    } finally {
      setRevokingId(null);
    }
  }

  function handleCopyKey() {
    if (!newlyCreatedKey) return;
    void copyText(newlyCreatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'profile',      label: t.nav.profile,      icon: <User size={16} /> },
    { id: 'logo',         label: t.nav.logo,         icon: <ImageIcon size={16} /> },
    { id: 'organisation', label: t.nav.organisation, icon: <Building2 size={16} /> },
    { id: 'password',     label: t.nav.password,     icon: <Lock size={16} /> },
    { id: 'team',         label: t.nav.team,         icon: <Users size={16} /> },
    { id: 'api',          label: t.nav.api,          icon: <Key size={16} /> },
    { id: 'danger',       label: t.nav.danger,       icon: <Trash2 size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-900/50">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">CyberRisk Canvas</h1>
              <p className="text-[11px] text-gray-500">{t.account}</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft size={15} /> {t.back}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar nav */}
          <nav className="w-48 shrink-0">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => (item.id === 'organisation' ? router.push('/organisation') : setSection(item.id))}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left ${
                      section === item.id
                        ? 'bg-indigo-600 text-white'
                        : item.id === 'danger'
                        ? 'text-red-400 hover:bg-red-900/20'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">

            {/* ── Profile ── */}
            {section === 'profile' && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                <h2 className="mb-1 text-base font-semibold text-white">{t.nav.profile}</h2>
                <p className="mb-6 text-sm text-gray-500">{t.profile.intro}</p>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">{t.profile.name}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">{t.profile.email}</label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                    />
                    <p className="mt-1 text-[11px] text-gray-600">{t.profile.emailFixed}</p>
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
                      <Building2 size={12} /> {t.profile.company}
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder={t.profile.optional}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {profileMsg && <Alert type={profileMsg.type} message={profileMsg.text} />}

                  <button
                    onClick={handleProfileSave}
                    disabled={isPending || !name.trim()}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                  >
                    {isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                    {t.profile.save}
                  </button>
                </div>
              </div>
            )}

            {/* ── Logo ── */}
            {section === 'logo' && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                <h2 className="mb-1 text-base font-semibold text-white">{t.nav.logo}</h2>
                <p className="mb-6 text-sm text-gray-500">{t.logo.intro}</p>

                <div className="space-y-5">
                  {/* Preview */}
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="relative flex h-36 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/50 hover:border-indigo-600 transition-colors"
                  >
                    {logoPreview ? (
                      <>
                        <img src={logoPreview} alt="Company logo" className="max-h-28 max-w-xs object-contain" />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleLogoRemove(); }}
                          className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 text-gray-400 hover:bg-red-900/60 hover:text-red-400"
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-600">
                        <Upload size={24} />
                        <span className="text-xs">{t.logo.upload}</span>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleLogoFile} />

                  {logoMsg && <Alert type={logoMsg.type} message={logoMsg.text} />}

                  <div className="flex gap-2">
                    <button
                      onClick={handleLogoSave}
                      disabled={isPending}
                      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      {isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                      {t.logo.save}
                    </button>
                    {logoPreview && (
                      <button
                        onClick={handleLogoRemove}
                        className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 transition-colors"
                      >
                        {t.logo.remove}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {section === 'password' && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                <h2 className="mb-1 text-base font-semibold text-white">{t.pw.title}</h2>
                <p className="mb-6 text-sm text-gray-500">
                  {user.hasPassword
                    ? t.pw.set
                    : t.pw.unset}
                </p>

                {user.hasPassword ? (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">{t.pw.current}</label>
                      <input
                        type="password"
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">{t.pw.next}</label>
                      <input
                        type="password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">{t.pw.confirm}</label>
                      <input
                        type="password"
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    {pwMsg && <Alert type={pwMsg.type} message={pwMsg.text} />}

                    <button
                      onClick={handlePasswordChange}
                      disabled={isPending || !currentPw || !newPw || !confirmPw}
                      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      {isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                      {t.pw.submit}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm text-gray-500">
                    {t.pw.disabled}
                  </div>
                )}
              </div>
            )}

            {/* ── Team ── */}
            {section === 'team' && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                <h2 className="mb-4 text-base font-semibold text-white">{t.team.title}</h2>

                {user.memberships.length === 0 ? (
                  <p className="text-sm text-gray-500">{t.team.none}</p>
                ) : (
                  <ul className="space-y-2">
                    {user.memberships.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <Users size={15} className="text-gray-400 shrink-0" />
                          <span className="text-sm font-medium text-white">{m.team.name}</span>
                          <span className="text-xs text-gray-500">
                            {m.team.type === 'product' ? t.team.product : t.team.review}
                          </span>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          m.role === 'lead'
                            ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700'
                            : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                        }`}>
                          {m.role === 'lead' ? t.team.lead : t.team.member}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {user.role === 'admin' && (
                  <div className="mt-6 pt-5 border-t border-gray-800">
                    <p className="mb-3 text-xs text-gray-500">{t.team.adminNote}</p>
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-2 rounded-lg border border-indigo-700 bg-indigo-900/30 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-900/50 transition-colors"
                    >
                      <Shield size={14} /> {t.team.adminOpen} <ExternalLink size={13} />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* ── API Keys ── */}
            {section === 'api' && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                <h2 className="mb-1 text-base font-semibold text-white">API Keys</h2>
                <p className="mb-1 text-sm text-gray-500">
                  {t.api.intro}
                  {t.api.auth}<code className="rounded bg-gray-800 px-1 text-xs text-indigo-300">Authorization: Bearer &lt;key&gt;</code>.
                </p>
                <p className="mb-6 text-xs text-gray-600">
                  {t.api.share}
                </p>

                {!user.isPro && (
                  <div className="mb-6 flex items-center gap-2 rounded-lg border border-indigo-900/50 bg-indigo-900/20 px-4 py-3 text-sm text-indigo-300">
                    <Shield size={14} className="shrink-0" />
                    {t.api.pro}
                  </div>
                )}

                {/* Newly created key - show once */}
                {newlyCreatedKey && (
                  <div className="mb-6 rounded-lg border border-green-800 bg-green-900/20 p-4 space-y-3">
                    <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">
                      {t.api.fresh}
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-gray-800 px-3 py-2 font-mono text-xs text-white break-all">
                        {keyVisible ? newlyCreatedKey : '•'.repeat(newlyCreatedKey.length)}
                      </code>
                      <button
                        onClick={() => setKeyVisible((v) => !v)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-700"
                        title={keyVisible ? t.api.hide : t.api.show}
                      >
                        {keyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={handleCopyKey}
                        className="flex items-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700"
                      >
                        <Copy size={13} />
                        {copied ? t.api.copied : t.api.copy}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      {t.api.saveNow}
                    </p>
                  </div>
                )}

                {/* Create form */}
                {user.isPro && (
                  <div className="mb-6 flex gap-2">
                    <input
                      type="text"
                      placeholder={t.api.namePh}
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                      maxLength={100}
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      onClick={handleCreateKey}
                      disabled={creatingKey || !newKeyName.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      {creatingKey ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      {t.api.create}
                    </button>
                  </div>
                )}

                {keyMsg && <Alert type={keyMsg.type} message={keyMsg.text} />}

                {/* Key list */}
                {apiKeys.length === 0 ? (
                  <p className="text-sm text-gray-600">{t.api.none}</p>
                ) : (
                  <ul className="space-y-2">
                    {apiKeys.map((k) => (
                      <li key={k.id} className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Key size={14} className="shrink-0 text-gray-500" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{k.name}</p>
                            <p className="text-xs text-gray-500">
                              <code className="font-mono text-gray-400">crc_{k.prefix}…</code>
                              {' · '}
                              {t.api.created(new Date(k.createdAt).toLocaleDateString(loc))}
                              {k.lastUsedAt && (
                                <>{t.api.lastUsed(new Date(k.lastUsedAt).toLocaleDateString(loc))}</>
                              )}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeKey(k.id)}
                          disabled={revokingId === k.id}
                          className="ml-3 flex items-center gap-1 rounded border border-red-800 bg-red-900/20 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-900/40 disabled:opacity-50 transition-colors shrink-0"
                        >
                          {revokingId === k.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          {t.api.revoke}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Endpoint reference */}
                <div className="mt-6 rounded-lg border border-gray-800 bg-gray-800/30 p-4 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t.api.endpoints}</p>
                    <a
                      href="/api/api-docs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      <ExternalLink size={11} /> {t.api.docs}
                    </a>
                  </div>
                  {[
                    { method: 'POST', path: '/api/projects/{id}/sbom', label: t.api.ep.sbom },
                    { method: 'GET',  path: '/api/projects/{id}/vulnerabilities', label: t.api.ep.vulns },
                    { method: 'PATCH', path: '/api/projects/{id}/vulnerabilities/{vulnId}', label: t.api.ep.status },
                    { method: 'GET',  path: '/api/projects/{id}/csaf', label: t.api.ep.csaf },
                  ].map((e) => (
                    <div key={e.path} className="flex items-baseline gap-2 text-xs">
                      <span className={`font-mono font-bold w-10 shrink-0 ${e.method === 'GET' ? 'text-green-400' : e.method === 'POST' ? 'text-blue-400' : 'text-yellow-400'}`}>
                        {e.method}
                      </span>
                      <code className="text-gray-300">{e.path}</code>
                      <span className="text-gray-600">- {e.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Danger Zone ── */}
            {section === 'danger' && (
              <div className="rounded-xl border border-red-900/50 bg-gray-900 p-6">
                <h2 className="mb-1 text-base font-semibold text-red-400">{t.nav.danger}</h2>
                <p className="mb-6 text-sm text-gray-500">{t.danger.intro}</p>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/20 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-900/40 transition-colors"
                  >
                    <Trash2 size={15} /> {t.danger.del}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                      {t.danger.warn}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">
                        {t.danger.typePre}<span className="font-mono text-white">{user.email}</span>{t.danger.typePost}
                      </label>
                      <input
                        type="text"
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder={user.email}
                        className="w-full rounded-lg border border-red-800 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-red-600 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={isPending || deleteConfirm !== user.email}
                        className="flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-40 transition-colors"
                      >
                        {isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                        {t.danger.confirm}
                      </button>
                      <button
                        onClick={() => { setShowDeleteConfirm(false); setDeleteConfirm(''); }}
                        className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 transition-colors"
                      >
                        {t.danger.cancel}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
