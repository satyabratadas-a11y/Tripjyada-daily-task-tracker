'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import EntryFormFields, { emptyEntryFormValue, type EntryFormValue } from './EntryFormFields';
import type { Campaign, ClientMember, ContentEntry, ContentPillar } from '@/lib/content-types';

export default function NewEntryModal({
  clientId,
  defaultDate,
  pillars,
  campaigns,
  members,
  onClose,
  onCreated,
}: {
  clientId: string;
  defaultDate: string;
  pillars: ContentPillar[];
  campaigns: Campaign[];
  members: ClientMember[];
  onClose: () => void;
  onCreated: (entry: ContentEntry) => void;
}) {
  const [form, setForm] = useState<EntryFormValue>(emptyEntryFormValue(defaultDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    setSaving(true);
    setError('');
    try {
      const { entry } = await api.post<{ entry: ContentEntry }>(`/api/content/clients/${clientId}/entries`, {
        date: form.date,
        time: form.time,
        format: form.format,
        pillar: form.pillar || undefined,
        campaign: form.campaign || undefined,
        idea: form.idea,
        hook: form.hook,
        caption: form.caption,
        cta: form.cta,
        platform: form.platform,
        assignee: form.assignee || undefined,
        status: form.status,
      });
      onCreated(entry);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create entry');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-2xl dark:bg-ink-light">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">New content entry</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <EntryFormFields
          clientId={clientId}
          value={form}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          pillars={pillars}
          campaigns={campaigns}
          members={members}
        />
        {error && <p className="mt-3 text-xs text-status-flagged">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" disabled={saving} onClick={handleCreate}>
            {saving ? 'Creating…' : 'Create entry'}
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
