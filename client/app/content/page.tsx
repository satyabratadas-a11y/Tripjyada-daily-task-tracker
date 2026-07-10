'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { isAdminLike } from '@/lib/roles';
import type { ContentClient } from '@/lib/content-types';

interface ClientStats {
  total: number;
  needsReview: number;
}

interface ClientFormData {
  name: string;
  brandColor: string;
  industry: string;
  businessType: string;
  description: string;
}

function ClientForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<ContentClient>;
  onSave: (data: ClientFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [brandColor, setBrandColor] = useState(initial?.brandColor || '#F2701C');
  const [industry, setIndustry] = useState(initial?.industry || '');
  const [businessType, setBusinessType] = useState(initial?.businessType || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Client name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ name: name.trim(), brandColor, industry, businessType, description });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card space-y-3">
      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
        {initial?.name ? 'Edit client' : 'New client / brand'}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Client / brand name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Brand color</label>
          <input type="color" className="input h-[38px] p-1" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Industry</label>
          <input className="input" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Food & Beverage" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Business type</label>
          <input className="input" value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="e.g. D2C retail" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Description</label>
        <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {error && <p className="text-xs text-status-flagged">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={saving} onClick={handleSubmit}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ContentHubPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ContentClient[]>([]);
  const [stats, setStats] = useState<Record<string, ClientStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ clients: ContentClient[] }>(
        `/api/content/clients${includeArchived ? '?includeArchived=true' : ''}`
      );
      setClients(data.clients);
      const entries = await Promise.all(
        data.clients.map(async (c) => {
          try {
            const res = await api.get<{ entries: { status: string }[] }>(`/api/content/clients/${c.id}/entries`);
            return [
              c.id,
              { total: res.entries.length, needsReview: res.entries.filter((e) => e.status === 'Review').length },
            ] as const;
          } catch {
            return [c.id, { total: 0, needsReview: 0 }] as const;
          }
        })
      );
      setStats(Object.fromEntries(entries));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeArchived]);

  async function handleCreate(data: ClientFormData) {
    await api.post('/api/content/clients', data);
    setShowCreate(false);
    await load();
  }

  async function handleUpdate(id: string, data: ClientFormData) {
    await api.patch(`/api/content/clients/${id}`, data);
    setEditingId(null);
    await load();
  }

  async function handleArchiveToggle(client: ContentClient) {
    await api.patch(`/api/content/clients/${client.id}`, { status: client.status === 'archived' ? 'active' : 'archived' });
    await load();
  }

  const canManage = (c: ContentClient) =>
    isAdminLike(user?.role) || c.myRole === 'owner' || c.myRole === 'editor' || c.myRole === 'viewer';
  const canArchive = (c: ContentClient) => isAdminLike(user?.role) || c.myRole === 'owner';

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Content Calendars</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage independent content calendars for every client or brand.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
            Show archived
          </label>
          <button className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
            <i className="fa-solid fa-plus" /> New calendar
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-status-flagged">{error}</p>}
      {showCreate && (
        <div className="mb-6">
          <ClientForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : clients.length === 0 ? (
        <div className="card text-sm text-gray-500 dark:text-gray-400">
          No content calendars yet. Create one to start planning content for a client or brand.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map((c) =>
            editingId === c.id ? (
              <ClientForm key={c.id} initial={c} onSave={(data) => handleUpdate(c.id, data)} onCancel={() => setEditingId(null)} />
            ) : (
              <div key={c.id} className={`card space-y-3 ${c.status === 'archived' ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="h-8 w-8 shrink-0 rounded-lg" style={{ backgroundColor: c.brandColor }} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{c.name}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {c.industry || 'Industry not set'}
                        {c.businessType ? ` · ${c.businessType}` : ''}
                      </p>
                    </div>
                  </div>
                  {c.status === 'archived' && (
                    <span className="shrink-0 rounded-full border border-gray-300 px-2 py-0.5 text-[10px] uppercase text-gray-500 dark:border-white/10 dark:text-gray-400">
                      Archived
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    <i className="fa-solid fa-note-sticky mr-1" />
                    {stats[c.id]?.total ?? 0} this month
                  </span>
                  <span>
                    <i className="fa-solid fa-hourglass-half mr-1" />
                    {stats[c.id]?.needsReview ?? 0} need review
                  </span>
                  <span className="capitalize">
                    <i className="fa-solid fa-user mr-1" />
                    {c.myRole || 'admin'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href={`/content/${c.id}/dashboard`} className="btn-primary flex-1 justify-center sm:flex-none">
                    Open
                  </Link>
                  {canManage(c) && (
                    <>
                      <button className="btn-secondary" onClick={() => setEditingId(c.id)}>
                        <i className="fa-solid fa-pen" />
                      </button>
                      {canArchive(c) && (
                        <button className="btn-secondary" onClick={() => handleArchiveToggle(c)}>
                          <i className={c.status === 'archived' ? 'fa-solid fa-box-open' : 'fa-solid fa-box-archive'} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
