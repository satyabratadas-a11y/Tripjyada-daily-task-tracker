'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatRoleLabel } from '@/lib/roles';
import type { Role } from '@/lib/types';

interface Recipient {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  role: Role;
}

const MESSAGE_MAX_LENGTH = 500;

/**
 * Open to every role — anyone signed in can pick any other active teammate (any role) and push
 * them a one-off notification, unlike the rest of the notification system, which only fires
 * automatically from system events (assignment, approval, ...).
 */
export default function PushNotificationPanel() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const data = await api.get<{ users: Recipient[] }>('/api/notifications/recipients');
      setRecipients(data.users);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load teammates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRecipients = useMemo(
    () => recipients.filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase())),
    [recipients, search]
  );

  const allFilteredSelected = filteredRecipients.length > 0 && filteredRecipients.every((r) => selectedIds.has(r.id));

  function toggleRecipient(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredRecipients.forEach((r) => (allFilteredSelected ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  }

  async function handleSend() {
    setSendError('');
    setSuccessMessage('');
    const trimmed = message.trim();
    if (!trimmed) {
      setSendError('Write a message first.');
      return;
    }
    if (selectedIds.size === 0) {
      setSendError('Pick at least one recipient.');
      return;
    }

    setSending(true);
    try {
      const res = await api.post<{ count: number }>('/api/notifications/send', {
        message: trimmed,
        userIds: Array.from(selectedIds),
      });
      setSuccessMessage(`Sent to ${res.count} ${res.count === 1 ? 'person' : 'people'}.`);
      setMessage('');
      setSelectedIds(new Set());
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : 'Failed to send notification');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[900px]">
      <div className="mb-4">
        <h1 className="page-title">Push Notification Panel</h1>
        <p className="page-subtitle">
          Send an instant notification to any teammate — everyone can use this, not just admins.
        </p>
      </div>

      {loadError && <p className="mb-4 text-sm text-status-flagged">{loadError}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="card flex min-h-0 flex-col overflow-hidden !p-0">
          <div className="flex items-center justify-between gap-2 border-b border-gray-200 p-3 dark:border-white/10">
            <input
              className="input flex-1"
              placeholder="Search teammates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              disabled={filteredRecipients.length === 0}
              className="whitespace-nowrap text-xs font-semibold text-brand hover:underline disabled:opacity-40"
            >
              {allFilteredSelected ? 'Clear' : 'Select all'}
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</p>
            ) : filteredRecipients.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No teammates match.</p>
            ) : (
              filteredRecipients.map((r) => (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-2.5 text-sm last:border-b-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r.id)}
                    onChange={() => toggleRecipient(r.id)}
                    className="h-4 w-4 shrink-0 rounded border-gray-300 text-brand focus:ring-brand"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-gray-900 dark:text-gray-100">{r.name}</span>
                    <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                      {r.jobTitle || formatRoleLabel(r.role)}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:border-white/10 dark:text-gray-400">
                    {formatRoleLabel(r.role)}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="card flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {selectedIds.size === 0
              ? 'No recipients selected'
              : `${selectedIds.size} recipient${selectedIds.size === 1 ? '' : 's'} selected`}
          </p>
          <textarea
            className="input min-h-[140px] resize-y"
            placeholder="Write a notification…"
            value={message}
            maxLength={MESSAGE_MAX_LENGTH}
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className="text-right text-xs text-gray-400">
            {message.length}/{MESSAGE_MAX_LENGTH}
          </p>

          {sendError && <p className="text-sm text-status-flagged">{sendError}</p>}
          {successMessage && <p className="text-sm text-status-completed">{successMessage}</p>}

          <button type="button" onClick={handleSend} disabled={sending} className="btn-primary">
            <i className="fa-solid fa-paper-plane text-xs" />
            {sending ? 'Sending…' : 'Send notification'}
          </button>
        </div>
      </div>
    </div>
  );
}
