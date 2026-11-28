'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import {
  createAlertChannel, updateAlertChannel, deleteAlertChannel, testAlertChannel,
  type AlertChannelDTO,
} from '@/actions/alertChannels';
import { SEVERITIES } from '@/lib/cvss';

// ─── Alert Channels Section ───────────────────────────────────────────────────

export function AlertChannelsSection({ initialChannels }: { initialChannels: AlertChannelDTO[] }) {
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
