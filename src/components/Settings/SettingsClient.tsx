'use client';

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
    csafPublisherName: string;
    csafPublisherNamespace: string;
    csafPublisherCategory: string;
    csafIssuingAuthority: string;
    csafContactDetails: string;
  };
  apiKeys: ApiKeyMeta[];
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

export default function SettingsClient({ user, apiKeys: initialApiKeys }: Props) {
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

  // Organisation / CSAF publisher
  const [csafPublisherName, setCsafPublisherName] = useState(user.csafPublisherName);
  const [csafPublisherNamespace, setCsafPublisherNamespace] = useState(user.csafPublisherNamespace);
  const [csafPublisherCategory, setCsafPublisherCategory] = useState(user.csafPublisherCategory);
  const [csafIssuingAuthority, setCsafIssuingAuthority] = useState(user.csafIssuingAuthority);
  const [csafContactDetails, setCsafContactDetails] = useState(user.csafContactDetails);
  const [orgMsg, setOrgMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKeyMeta[]>(initialApiKeys);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [keyMsg, setKeyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [keyVisible, setKeyVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const [section, setSection] = useState<Section>('profile');

  const handleProfileSave = () => {
    if (!name.trim()) return;
    setProfileMsg(null);
    startTransition(async () => {
      try {
        await updateUserProfile({ name: name.trim(), companyName: companyName.trim() || undefined });
        await updateSession({ name: name.trim() });
        setProfileMsg({ type: 'success', text: 'Profile updated.' });
      } catch (e) {
        setProfileMsg({ type: 'error', text: e instanceof Error ? e.message : 'Update failed.' });
      }
    });
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 250_000) {
      setLogoMsg({ type: 'error', text: 'File too large. Max 200 KB.' });
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
        setLogoMsg({ type: 'success', text: 'Logo saved.' });
      } catch (e) {
        setLogoMsg({ type: 'error', text: e instanceof Error ? e.message : 'Upload failed.' });
      }
    });
  };

  const handleLogoRemove = () => {
    setLogoPreview('');
    setLogoMsg(null);
  };

  const handlePasswordChange = () => {
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setPwMsg(null);
    startTransition(async () => {
      try {
        await changePassword(currentPw, newPw);
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
        setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      } catch (e) {
        setPwMsg({ type: 'error', text: e instanceof Error ? e.message : 'Password change failed.' });
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

  const handleOrgSave = () => {
    setOrgMsg(null);
    startTransition(async () => {
      try {
        await updateUserProfile({
          csafPublisherName,
          csafPublisherNamespace,
          csafPublisherCategory,
          csafIssuingAuthority,
          csafContactDetails,
        });
        setOrgMsg({ type: 'success', text: 'Organisation gespeichert.' });
      } catch (e) {
        setOrgMsg({ type: 'error', text: e instanceof Error ? e.message : 'Fehler beim Speichern.' });
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
      if (!res.ok) { setKeyMsg({ type: 'error', text: data.error ?? 'Fehler beim Erstellen.' }); return; }
      setApiKeys((prev) => [{ id: data.id, name: data.name, prefix: data.prefix, lastUsedAt: null, createdAt: data.createdAt }, ...prev]);
      setNewlyCreatedKey(data.key);
      setNewKeyName('');
      setKeyVisible(true);
    } catch {
      setKeyMsg({ type: 'error', text: 'Netzwerkfehler.' });
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
    void navigator.clipboard.writeText(newlyCreatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'profile',      label: 'Profile',          icon: <User size={16} /> },
    { id: 'logo',         label: 'White-Label Logo',  icon: <ImageIcon size={16} /> },
    { id: 'organisation', label: 'Organisation',      icon: <Building2 size={16} /> },
    { id: 'password',     label: 'Password',          icon: <Lock size={16} /> },
    { id: 'team',         label: 'Team',              icon: <Users size={16} /> },
    { id: 'api',          label: 'API Keys',          icon: <Key size={16} /> },
    { id: 'danger',       label: 'Danger Zone',       icon: <Trash2 size={16} /> },
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
              <p className="text-[11px] text-gray-500">Account Settings</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft size={15} /> Back to Dashboard
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
                    onClick={() => setSection(item.id)}
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
                <h2 className="mb-1 text-base font-semibold text-white">Profile</h2>
                <p className="mb-6 text-sm text-gray-500">Your name and company shown in reports.</p>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Display Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Email</label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                    />
                    <p className="mt-1 text-[11px] text-gray-600">Email cannot be changed.</p>
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
                      <Building2 size={12} /> Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Optional"
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
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* ── Logo ── */}
            {section === 'logo' && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                <h2 className="mb-1 text-base font-semibold text-white">White-Label Logo</h2>
                <p className="mb-6 text-sm text-gray-500">Appears on exported PDF reports. Max 200 KB (PNG, SVG, JPG).</p>

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
                        <span className="text-xs">Click to upload logo</span>
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
                      Save Logo
                    </button>
                    {logoPreview && (
                      <button
                        onClick={handleLogoRemove}
                        className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Organisation / CSAF Publisher ── */}
            {section === 'organisation' && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                <h2 className="mb-1 text-base font-semibold text-white">Organisation &amp; CSAF-Publisher</h2>
                <p className="mb-6 text-sm text-gray-500">
                  Diese Angaben werden automatisch in den CSAF Advisory Wizard übernommen und im generierten CSAF 2.0 Dokument als <code className="rounded bg-gray-800 px-1 text-xs text-indigo-300">publisher</code>-Block eingetragen.
                </p>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">
                        Publisher Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={csafPublisherName}
                        onChange={(e) => setCsafPublisherName(e.target.value)}
                        placeholder="z.B. ACME Security GmbH"
                        maxLength={256}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">
                        Namespace / URL <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="url"
                        value={csafPublisherNamespace}
                        onChange={(e) => setCsafPublisherNamespace(e.target.value)}
                        placeholder="https://security.example.com"
                        maxLength={512}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                      />
                      <p className="mt-1 text-[11px] text-gray-600">Eindeutige URL der ausgebenden Organisation.</p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">
                        Issuing Authority
                      </label>
                      <input
                        type="text"
                        value={csafIssuingAuthority}
                        onChange={(e) => setCsafIssuingAuthority(e.target.value)}
                        placeholder="z.B. ACME PSIRT"
                        maxLength={512}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                      />
                      <p className="mt-1 text-[11px] text-gray-600">Verantwortliche Stelle. Wenn leer, wird Publisher Name verwendet.</p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">Kategorie <span className="text-red-400">*</span></label>
                      <select
                        value={csafPublisherCategory}
                        onChange={(e) => setCsafPublisherCategory(e.target.value)}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      >
                        {[
                          { value: 'vendor',      label: 'Vendor - Hersteller des Produkts' },
                          { value: 'coordinator', label: 'Coordinator - CERT / Koordinator' },
                          { value: 'discoverer',  label: 'Discoverer - Entdecker' },
                          { value: 'other',       label: 'Other - Sonstige' },
                        ].map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Kontaktdaten (optional)</label>
                    <textarea
                      value={csafContactDetails}
                      onChange={(e) => setCsafContactDetails(e.target.value)}
                      rows={3}
                      maxLength={1024}
                      placeholder="E-Mail, PGP-Fingerprint, Webformular-URL…"
                      className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                    />
                    <p className="mt-1 text-right text-[11px] text-gray-600">{csafContactDetails.length}/1024</p>
                  </div>

                  {orgMsg && <Alert type={orgMsg.type} message={orgMsg.text} />}

                  <button
                    onClick={handleOrgSave}
                    disabled={isPending}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                  >
                    {isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                    Speichern
                  </button>
                </div>
              </div>
            )}

            {/* ── Password ── */}
            {section === 'password' && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                <h2 className="mb-1 text-base font-semibold text-white">Change Password</h2>
                <p className="mb-6 text-sm text-gray-500">
                  {user.hasPassword
                    ? 'Update your login password.'
                    : 'You signed in with a magic link - no password is set on your account.'}
                </p>

                {user.hasPassword ? (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">Current Password</label>
                      <input
                        type="password"
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">New Password</label>
                      <input
                        type="password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">Confirm New Password</label>
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
                      Change Password
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm text-gray-500">
                    Password login is not enabled for this account.
                  </div>
                )}
              </div>
            )}

            {/* ── Team ── */}
            {section === 'team' && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                <h2 className="mb-4 text-base font-semibold text-white">Team-Mitgliedschaften</h2>

                {user.memberships.length === 0 ? (
                  <p className="text-sm text-gray-500">Du bist aktuell keinem Team zugewiesen.</p>
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
                            {m.team.type === 'product' ? 'Produktteam' : 'Review-Team'}
                          </span>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          m.role === 'lead'
                            ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700'
                            : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                        }`}>
                          {m.role === 'lead' ? 'Lead' : 'Mitglied'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {user.role === 'admin' && (
                  <div className="mt-6 pt-5 border-t border-gray-800">
                    <p className="mb-3 text-xs text-gray-500">Als Administrator kannst du Teams und Mitglieder im Admin-Portal verwalten.</p>
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-2 rounded-lg border border-indigo-700 bg-indigo-900/30 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-900/50 transition-colors"
                    >
                      <Shield size={14} /> Admin-Portal öffnen <ExternalLink size={13} />
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
                  Erstelle API-Keys für programmatischen Zugriff auf deine Projekte.
                  Authentifiziere Anfragen mit <code className="rounded bg-gray-800 px-1 text-xs text-indigo-300">Authorization: Bearer &lt;key&gt;</code>.
                </p>
                <p className="mb-6 text-xs text-gray-600">
                  Ein Key gewährt Zugriff auf dieselben Projekte wie dein Account. Gib Keys nicht weiter.
                </p>

                {!user.isPro && (
                  <div className="mb-6 flex items-center gap-2 rounded-lg border border-indigo-900/50 bg-indigo-900/20 px-4 py-3 text-sm text-indigo-300">
                    <Shield size={14} className="shrink-0" />
                    API-Keys sind ein Pro-Feature. Upgrade dein Konto um Keys zu erstellen.
                  </div>
                )}

                {/* Newly created key - show once */}
                {newlyCreatedKey && (
                  <div className="mb-6 rounded-lg border border-green-800 bg-green-900/20 p-4 space-y-3">
                    <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">
                      Neuer Key - nur jetzt sichtbar!
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-gray-800 px-3 py-2 font-mono text-xs text-white break-all">
                        {keyVisible ? newlyCreatedKey : '•'.repeat(newlyCreatedKey.length)}
                      </code>
                      <button
                        onClick={() => setKeyVisible((v) => !v)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-700"
                        title={keyVisible ? 'Verbergen' : 'Anzeigen'}
                      >
                        {keyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={handleCopyKey}
                        className="flex items-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700"
                      >
                        <Copy size={13} />
                        {copied ? 'Kopiert!' : 'Kopieren'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Speichere den Key jetzt - er wird nie wieder angezeigt.
                    </p>
                  </div>
                )}

                {/* Create form */}
                {user.isPro && (
                  <div className="mb-6 flex gap-2">
                    <input
                      type="text"
                      placeholder="Key-Name, z.B. &quot;CI Pipeline&quot;"
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
                      Erstellen
                    </button>
                  </div>
                )}

                {keyMsg && <Alert type={keyMsg.type} message={keyMsg.text} />}

                {/* Key list */}
                {apiKeys.length === 0 ? (
                  <p className="text-sm text-gray-600">Noch keine API-Keys erstellt.</p>
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
                              Erstellt {new Date(k.createdAt).toLocaleDateString('de-DE')}
                              {k.lastUsedAt && (
                                <> · Zuletzt verwendet {new Date(k.lastUsedAt).toLocaleDateString('de-DE')}</>
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
                          Widerrufen
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Endpoint reference */}
                <div className="mt-6 rounded-lg border border-gray-800 bg-gray-800/30 p-4 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Verfügbare Endpunkte</p>
                    <a
                      href="/api/api-docs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      <ExternalLink size={11} /> Vollständige API-Docs
                    </a>
                  </div>
                  {[
                    { method: 'POST', path: '/api/projects/{id}/sbom', label: 'SBOM hochladen' },
                    { method: 'GET',  path: '/api/projects/{id}/vulnerabilities', label: 'Schwachstellen abrufen' },
                    { method: 'PATCH', path: '/api/projects/{id}/vulnerabilities/{vulnId}', label: 'Status setzen' },
                    { method: 'GET',  path: '/api/projects/{id}/csaf', label: 'VEX / CSAF exportieren' },
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
                <h2 className="mb-1 text-base font-semibold text-red-400">Danger Zone</h2>
                <p className="mb-6 text-sm text-gray-500">Permanently delete your account and all associated data. This cannot be undone.</p>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/20 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-900/40 transition-colors"
                  >
                    <Trash2 size={15} /> Delete My Account
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                      This will delete all your projects, diagrams, and data permanently.
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">
                        Type <span className="font-mono text-white">{user.email}</span> to confirm
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
                        Permanently Delete Account
                      </button>
                      <button
                        onClick={() => { setShowDeleteConfirm(false); setDeleteConfirm(''); }}
                        className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 transition-colors"
                      >
                        Cancel
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
