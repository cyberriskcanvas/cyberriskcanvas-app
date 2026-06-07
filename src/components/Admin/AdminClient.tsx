'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, Key, ChevronLeft, Plus, Pencil, Trash2,
  CheckCircle, AlertCircle, X, ChevronDown, ChevronUp, Layers, Bell,
} from 'lucide-react';
import { createUser, updateUser, deleteUser } from '@/actions/auth';
import { saveLicenseKey } from '@/actions/license';
import {
  createAlertChannel, updateAlertChannel, deleteAlertChannel, testAlertChannel,
  type AlertChannelDTO,
} from '@/actions/alertChannels';
import type { LicenseInfo } from '@/lib/license';

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  color: string;
  createdAt: Date;
}

interface Team {
  id: string;
  name: string;
  type: string;
  _count: { members: number };
}

interface Props {
  initialUsers: User[];
  license: LicenseInfo;
  licenseKeyPreview: string | null;
  initialTeams: Team[];
  isPro: boolean;
  initialAlertChannels: AlertChannelDTO[];
}

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Create/Edit User Modal ───────────────────────────────────────────────────

function UserModal({
  user,
  onClose,
  onSaved,
}: {
  user?: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>((user?.role as 'user' | 'admin') ?? 'user');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const isEdit = !!user;

  const handleSave = () => {
    setMsg(null);
    startTransition(async () => {
      try {
        if (isEdit) {
          await updateUser(user.id, { name: name.trim(), role, password: password || undefined });
          setMsg({ type: 'success', text: 'User updated.' });
          setTimeout(onSaved, 800);
        } else {
          const res = await createUser(email.trim(), name.trim(), password, role);
          if ('error' in res) {
            setMsg({ type: 'error', text: res.error });
          } else {
            setMsg({ type: 'success', text: 'User created.' });
            setTimeout(onSaved, 800);
          }
        }
      } catch (e) {
        setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Something went wrong.' });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? 'Edit User' : 'Create User'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {!isEdit && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">
              {isEdit ? 'New Password (leave blank to keep)' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? '••••••••' : 'Min. 8 characters'}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {msg && <Alert type={msg.type} message={msg.text} />}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-700 py-2 text-sm text-gray-400 hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || !name.trim() || (!isEdit && (!email.trim() || !password))}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Section = 'users' | 'teams' | 'license' | 'alerts';

export default function AdminClient({ initialUsers, license, licenseKeyPreview, initialTeams, isPro, initialAlertChannels }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [section, setSection] = useState<Section>('users');
  const [users, setUsers] = useState(initialUsers);
  const [modalUser, setModalUser] = useState<User | null | 'new'>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refresh = () => router.refresh();

  const handleDelete = (userId: string) => {
    startTransition(async () => {
      try {
        await deleteUser(userId);
        setUsers((u) => u.filter((x) => x.id !== userId));
        setDeleteConfirm(null);
        setMsg({ type: 'success', text: 'User deleted.' });
      } catch (e) {
        setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Delete failed.' });
      }
    });
  };

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'users', label: 'Users', icon: <Users size={16} /> },
    { id: 'teams', label: 'Teams', icon: <Layers size={16} /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell size={16} /> },
    { id: 'license', label: 'License', icon: <Key size={16} /> },
  ];

  return (
    <>
      {/* Modals */}
      {modalUser !== null && (
        <UserModal
          user={modalUser === 'new' ? undefined : modalUser}
          onClose={() => setModalUser(null)}
          onSaved={() => { setModalUser(null); refresh(); }}
        />
      )}

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
                <p className="text-[11px] text-gray-500">Administration</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft size={15} /> Dashboard
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-8">
          <div className="flex gap-8">
            {/* Sidebar */}
            <nav className="w-44 shrink-0">
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => setSection(item.id)}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left ${
                        section === item.id
                          ? 'bg-indigo-600 text-white'
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
            <div className="flex-1 min-w-0 space-y-4">
              {msg && (
                <div className="mb-2">
                  <Alert type={msg.type} message={msg.text} />
                </div>
              )}

              {/* ── Users ── */}
              {section === 'users' && (
                <div className="rounded-xl border border-gray-800 bg-gray-900">
                  <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
                    <div>
                      <h2 className="text-base font-semibold text-white">Users</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {users.length} user{users.length !== 1 ? 's' : ''} &middot; unlimited seats
                      </p>
                    </div>
                    <button
                      onClick={() => setModalUser('new')}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
                    >
                      <Plus size={15} /> New User
                    </button>
                  </div>

                  <ul className="divide-y divide-gray-800">
                    {users.map((u) => (
                      <li key={u.id} className="flex items-center gap-4 px-6 py-4">
                        <Avatar name={u.name} color={u.color} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{u.name}</p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          u.role === 'admin'
                            ? 'bg-indigo-900/60 text-indigo-300'
                            : 'bg-gray-800 text-gray-400'
                        }`}>
                          {u.role}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setModalUser(u)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                            title="Edit user"
                          >
                            <Pencil size={14} />
                          </button>
                          {deleteConfirm === u.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleDelete(u.id)}
                                disabled={isPending}
                                className="rounded-lg bg-red-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="rounded-lg border border-gray-700 px-2.5 py-1.5 text-xs text-gray-400 hover:bg-gray-800"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(u.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:border-red-700 hover:bg-red-900/20 hover:text-red-400 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                    {users.length === 0 && (
                      <li className="px-6 py-8 text-center text-sm text-gray-600">No users yet.</li>
                    )}
                  </ul>
                </div>
              )}

              {/* ── Teams ── */}
              {section === 'teams' && (
                <TeamsSection initialTeams={initialTeams} users={users} onRefresh={refresh} />
              )}

              {/* ── License ── */}
              {section === 'alerts' && (
                <AlertChannelsSection isPro={isPro} initialChannels={initialAlertChannels} />
              )}

              {section === 'license' && (
                <LicenseSection license={license} keyPreview={licenseKeyPreview} />
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

// ─── Alert Channels Section ───────────────────────────────────────────────────

function AlertChannelsSection({ isPro, initialChannels }: { isPro: boolean; initialChannels: AlertChannelDTO[] }) {
  const [channels, setChannels] = useState(initialChannels);
  const [form, setForm] = useState({ url: '', type: 'slack', minSeverity: 'HIGH' as string });
  const [testingId, setTestingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreate = () => {
    setMsg(null);
    startTransition(async () => {
      try {
        const created = await createAlertChannel(form);
        setChannels((cs) => [...cs, created]);
        setForm({ url: '', type: 'slack', minSeverity: 'HIGH' });
        setMsg({ type: 'success', text: 'Alert channel added.' });
      } catch (e) {
        setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Failed to add channel.' });
      }
    });
  };

  const handleUpdate = (id: string, input: { active?: boolean; minSeverity?: string }) => {
    setMsg(null);
    startTransition(async () => {
      try {
        const updated = await updateAlertChannel(id, input);
        setChannels((cs) => cs.map((c) => (c.id === id ? updated : c)));
      } catch (e) {
        setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Failed to update channel.' });
      }
    });
  };

  const handleDelete = (id: string) => {
    setMsg(null);
    startTransition(async () => {
      try {
        await deleteAlertChannel(id);
        setChannels((cs) => cs.filter((c) => c.id !== id));
        setMsg({ type: 'success', text: 'Alert channel removed.' });
      } catch (e) {
        setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Failed to remove channel.' });
      }
    });
  };

  const handleTest = (id: string) => {
    setMsg(null);
    setTestingId(id);
    startTransition(async () => {
      try {
        const result = await testAlertChannel(id);
        setMsg(result.ok
          ? { type: 'success', text: `Test alert delivered (HTTP ${result.status}).` }
          : { type: 'error', text: `Test alert failed: ${result.error ?? `HTTP ${result.status}`}` });
      } catch (e) {
        setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Test failed.' });
      } finally {
        setTestingId(null);
      }
    });
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <h2 className="mb-1 text-base font-semibold text-white">Alert Channels</h2>
      <p className="mb-6 text-sm text-gray-500">
        Get notified via Slack, MS Teams, or a generic JSON webhook whenever the periodic CVE
        re-scan finds new vulnerabilities at or above a channel&apos;s severity threshold.
      </p>

      {!isPro && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-indigo-900/50 bg-indigo-900/20 px-4 py-3 text-sm text-indigo-300">
          <Shield size={14} className="shrink-0" />
          Alert channels are part of CVE Monitoring (Pro). Activate a Pro license to configure them.
        </div>
      )}

      {isPro && (
        <div className="space-y-4">
          {channels.length > 0 && (
            <ul className="divide-y divide-gray-800 rounded-xl border border-gray-800 bg-gray-800/50">
              {channels.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${c.active ? 'bg-green-400' : 'bg-gray-600'}`} />
                  <div className="flex-1 min-w-[12rem]">
                    <p className="truncate font-mono text-sm text-white">{c.urlPreview}</p>
                    <p className="text-xs text-gray-500">{c.type} webhook</p>
                  </div>
                  <select
                    value={c.minSeverity}
                    onChange={(e) => handleUpdate(c.id, { minSeverity: e.target.value })}
                    disabled={isPending}
                    className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                  >
                    {SEVERITIES.map((s) => <option key={s} value={s}>{s}+</option>)}
                  </select>
                  <button
                    onClick={() => handleUpdate(c.id, { active: !c.active })}
                    disabled={isPending}
                    className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {c.active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleTest(c.id)}
                    disabled={isPending}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {isPending && testingId === c.id && (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                    )}
                    Send Test
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={isPending}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-red-900/30 hover:text-red-400 disabled:opacity-50 transition-colors"
                    title="Remove channel"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-xl border border-gray-800 bg-gray-800/50 p-5 space-y-3">
            <p className="text-xs font-medium text-gray-400">Add channel</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
              <input
                type="text"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://hooks.slack.com/services/…"
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
              />
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="slack">Slack</option>
                <option value="teams">MS Teams</option>
                <option value="generic">Generic JSON</option>
              </select>
              <select
                value={form.minSeverity}
                onChange={(e) => setForm((f) => ({ ...f, minSeverity: e.target.value }))}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}+</option>)}
              </select>
            </div>
            <button
              onClick={handleCreate}
              disabled={isPending || !form.url.trim()}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              <Plus size={15} /> Add Channel
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
          msg.type === 'success'
            ? 'border border-green-800 bg-green-900/30 text-green-400'
            : 'border border-red-800 bg-red-900/30 text-red-400'
        }`}>
          {msg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      )}
    </div>
  );
}

// ─── License Helpers ──────────────────────────────────────────────────────────

function formatExpiresAt(expiresAt: string): string {
  const date = new Date(expiresAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  if (diffDays < 0) return `${dateStr} (abgelaufen)`;
  if (diffDays === 0) return `${dateStr} (heute)`;
  if (diffDays === 1) return `${dateStr} (noch 1 Tag)`;
  if (diffDays <= 30) return `${dateStr} (noch ${diffDays} Tage)`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${dateStr} (noch ${diffMonths} Monat${diffMonths !== 1 ? 'e' : ''})`;
}

function getExpiryColor(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'text-red-400';
  if (diffDays <= 14) return 'text-yellow-400';
  return 'text-gray-300';
}

// ─── License Section ──────────────────────────────────────────────────────────

function LicenseSection({ license: initialLicense, keyPreview: initialKeyPreview }: {
  license: LicenseInfo;
  keyPreview: string | null;
}) {
  const router = useRouter();
  const [license, setLicense] = useState(initialLicense);
  const [keyPreview, setKeyPreview] = useState(initialKeyPreview);
  const [key, setKey] = useState('');
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = () => {
    setMsg(null);
    startTransition(async () => {
      try {
        const result = await saveLicenseKey(key);
        setLicense(result);
        setKeyPreview(key.trim().length > 4 ? '••••••••••••' + key.trim().slice(-4) : key.trim() ? '••••' : null);
        setKey('');
        setMsg({
          type: result.valid ? 'success' : 'error',
          text: result.valid ? 'Pro license activated.' : 'Key saved but validation failed - check the key.',
        });
        if (result.valid) router.refresh();
      } catch {
        setMsg({ type: 'error', text: 'Failed to save license key.' });
      }
    });
  };

  const handleRemove = () => {
    setMsg(null);
    startTransition(async () => {
      try {
        await saveLicenseKey('');
        setLicense({ valid: false, licensee: null, expiresAt: null });
        setKeyPreview(null);
        setKey('');
        setMsg({ type: 'success', text: 'License key removed.' });
        router.refresh();
      } catch {
        setMsg({ type: 'error', text: 'Failed to remove license key.' });
      }
    });
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <h2 className="mb-1 text-base font-semibold text-white">License</h2>
      <p className="mb-6 text-sm text-gray-500">
        Manage your CyberRisk Canvas Pro license. The key is stored securely in the database
        and validated online against the license server.
      </p>

      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-800/50 px-5 py-4">
          <div className={`h-3 w-3 rounded-full shrink-0 ${license.valid ? 'bg-green-400' : 'bg-red-500'}`} />
          <div>
            <p className="text-sm font-semibold text-white">
              {license.valid ? 'Pro License - Active' : 'No valid license'}
            </p>
            <p className="text-xs text-gray-500">
              {license.valid
                ? 'All Pro features are unlocked.'
                : 'Community edition - Pro features are locked.'}
            </p>
          </div>
        </div>

        {license.valid && license.licensee && (
          <div className="rounded-xl border border-gray-800 bg-gray-800/50 divide-y divide-gray-800">
            {[
              ['Licensee', license.licensee],
              ['Model', 'Flatrate - unlimited users'],
              ...(license.expiresAt
                ? [['Valid until', formatExpiresAt(license.expiresAt)]]
                : []),
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between px-5 py-3">
                <span className="text-xs text-gray-500">{label}</span>
                <span className={`text-xs font-medium ${label === 'Valid until' ? getExpiryColor(license.expiresAt!) : 'text-gray-300'}`}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Key input */}
        <div className="pt-2">
          <label className="mb-1.5 block text-xs font-medium text-gray-400">
            {keyPreview ? 'Replace License Key' : 'License Key'}
          </label>
          {keyPreview && (
            <p className="mb-2 font-mono text-xs text-gray-500">Current: {keyPreview}</p>
          )}
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="crc_pro_••••••••••••••••"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {msg && (
          <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
            msg.type === 'success'
              ? 'border border-green-800 bg-green-900/30 text-green-400'
              : 'border border-red-800 bg-red-900/30 text-red-400'
          }`}>
            {msg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {msg.text}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isPending || !key.trim()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Save & Validate
          </button>
          {keyPreview && (
            <button
              onClick={handleRemove}
              disabled={isPending}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Remove Key
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Teams Section ────────────────────────────────────────────────────────────

function TeamsSection({
  initialTeams,
  users,
  onRefresh,
}: {
  initialTeams: Team[];
  users: User[];
  onRefresh: () => void;
}) {
  const [teams] = useState(initialTeams);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-white">Teams</h2>
          <p className="text-xs text-gray-500 mt-0.5">{teams.length} team{teams.length !== 1 ? 's' : ''}</p>
        </div>
        <TeamCreateButton onCreated={onRefresh} />
      </div>

      <ul className="divide-y divide-gray-800">
        {teams.map((t) => (
          <li key={t.id}>
            <button
              onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              className="flex w-full items-center gap-4 px-6 py-4 hover:bg-gray-800/50 transition-colors text-left"
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                t.type === 'review' ? 'bg-violet-900/60' : 'bg-indigo-900/60'
              }`}>
                <Layers size={15} className={t.type === 'review' ? 'text-violet-400' : 'text-indigo-400'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{t.name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {t.type === 'review' ? 'Review Team (sees all projects)' : 'Product Team'}
                  {' · '}{t._count.members} member{t._count.members !== 1 ? 's' : ''}
                </p>
              </div>
              {expanded === t.id ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
            </button>
            {expanded === t.id && (
              <TeamDetail teamId={t.id} users={users} onRefresh={onRefresh} />
            )}
          </li>
        ))}
        {teams.length === 0 && (
          <li className="px-6 py-8 text-center text-sm text-gray-600">
            No teams yet. Create a product or review team.
          </li>
        )}
      </ul>
    </div>
  );
}

function TeamCreateButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'product' | 'review'>('product');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      const { createTeam } = await import('@/actions/teams');
      try {
        await createTeam(name.trim(), type);
        setOpen(false);
        setName('');
        onCreated();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create team');
      }
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
      >
        <Plus size={15} /> New Team
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Team name"
        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as 'product' | 'review')}
        className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-white focus:outline-none"
      >
        <option value="product">Product</option>
        <option value="review">Review</option>
      </select>
      <button
        onClick={handleCreate}
        disabled={isPending || !name.trim()}
        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
      >
        {isPending ? '…' : 'Create'}
      </button>
      <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">
        <X size={16} />
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

function TeamDetail({
  teamId,
  users,
  onRefresh,
}: {
  teamId: string;
  users: User[];
  onRefresh: () => void;
}) {
  const [members, setMembers] = useState<{ id: string; userId: string; role: string; user: { name: string; email: string; color: string } }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [addUserId, setAddUserId] = useState('');

  const load = () => {
    startTransition(async () => {
      const { getTeamMembers } = await import('@/actions/teams');
      const data = await getTeamMembers(teamId);
      setMembers(data);
      setLoaded(true);
    });
  };

  if (!loaded) {
    // Load on first render of the detail panel
    if (!isPending) load();
    return <div className="px-6 pb-4 text-sm text-gray-600">Loading…</div>;
  }

  const memberUserIds = new Set(members.map((m) => m.userId));
  const nonMembers = users.filter((u) => !memberUserIds.has(u.id));

  const handleAdd = () => {
    if (!addUserId) return;
    startTransition(async () => {
      const { addTeamMember } = await import('@/actions/teams');
      await addTeamMember(teamId, addUserId);
      setAddUserId('');
      load();
      onRefresh();
    });
  };

  const handleRemove = (memberId: string) => {
    startTransition(async () => {
      const { removeTeamMember } = await import('@/actions/teams');
      await removeTeamMember(memberId);
      load();
      onRefresh();
    });
  };

  const handleDeleteTeam = () => {
    if (!confirm('Delete this team? Projects will not be deleted.')) return;
    startTransition(async () => {
      const { deleteTeam } = await import('@/actions/teams');
      await deleteTeam(teamId);
      onRefresh();
    });
  };

  return (
    <div className="border-t border-gray-800 bg-gray-800/30 px-6 py-4">
      {/* Member list */}
      {members.length > 0 ? (
        <ul className="mb-4 space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <Avatar name={m.user.name} color={m.user.color} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{m.user.name}</p>
                <p className="text-xs text-gray-500 truncate">{m.user.email}</p>
              </div>
              <button
                onClick={() => handleRemove(m.id)}
                disabled={isPending}
                className="text-gray-600 hover:text-red-400 transition-colors"
                title="Remove from team"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-xs text-gray-600">No members yet.</p>
      )}

      {/* Add member */}
      {nonMembers.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <select
            value={addUserId}
            onChange={(e) => setAddUserId(e.target.value)}
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:outline-none"
          >
            <option value="">Add user…</option>
            {nonMembers.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={isPending || !addUserId}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            Add
          </button>
        </div>
      )}

      <button
        onClick={handleDeleteTeam}
        disabled={isPending}
        className="text-xs text-red-500 hover:text-red-400 transition-colors"
      >
        Delete team
      </button>
    </div>
  );
}
