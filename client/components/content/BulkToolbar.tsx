'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { CONTENT_STATUSES, type ClientMember, type ContentStatus } from '@/lib/content-types';

export default function BulkToolbar({
  clientId,
  selectedIds,
  members,
  onDone,
  onClear,
}: {
  clientId: string;
  selectedIds: string[];
  members: ClientMember[];
  onDone: () => void;
  onClear: () => void;
}) {
  const [status, setStatus] = useState<ContentStatus | ''>('');
  const [assignee, setAssignee] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function applyUpdate(update: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      await api.patch(`/api/content/clients/${clientId}/entries/bulk`, { ids: selectedIds, update });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Bulk update failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${selectedIds.length} selected entries? This cannot be undone.`)) return;
    setBusy(true);
    setError('');
    try {
      await api.delete(`/api/content/clients/${clientId}/entries/bulk`, { ids: selectedIds });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Bulk delete failed');
    } finally {
      setBusy(false);
    }
  }

  if (selectedIds.length === 0) return null;

  return (
    <div className="sticky top-0 z-30 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 dark:border-brand-light/30 dark:bg-brand/10">
      <span className="text-sm font-medium text-brand dark:text-brand-light">{selectedIds.length} selected</span>

      <select
        className="input w-40"
        value={status}
        onChange={(e) => {
          const v = e.target.value as ContentStatus | '';
          setStatus(v);
          if (v) applyUpdate({ status: v });
        }}
        disabled={busy}
      >
        <option value="">Set status…</option>
        {CONTENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        className="input w-44"
        value={assignee}
        onChange={(e) => {
          const v = e.target.value;
          setAssignee(v);
          if (v) applyUpdate({ assignee: v });
        }}
        disabled={busy}
      >
        <option value="">Assign to…</option>
        {members.map((m) => (
          <option key={m.user} value={m.user}>
            {m.name || m.email || m.user}
          </option>
        ))}
      </select>

      <input
        type="date"
        className="input w-40"
        value={date}
        onChange={(e) => {
          const v = e.target.value;
          setDate(v);
          if (v) applyUpdate({ date: v });
        }}
        disabled={busy}
        title="Bulk schedule to a date"
      />

      <button className="btn-secondary text-status-flagged" disabled={busy} onClick={handleDelete}>
        <i className="fa-solid fa-trash" /> Delete
      </button>

      <button type="button" className="ml-auto text-xs text-gray-500 hover:text-brand" onClick={onClear}>
        Clear selection
      </button>

      {error && <p className="w-full text-xs text-status-flagged">{error}</p>}
    </div>
  );
}
