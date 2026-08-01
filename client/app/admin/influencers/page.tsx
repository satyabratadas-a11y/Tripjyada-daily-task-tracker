'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Influencer } from '@/lib/types';

const EMPTY_FORM = { name: '', influencerId: '', niche: '', phone: '', remarks: '' };

function InfluencerRow({ influencer, onSaved, onDeleted }: { influencer: Influencer; onSaved: (updated: Influencer) => void; onDeleted: (id: string) => void }) {
  const [name, setName] = useState(influencer.name);
  const [influencerId, setInfluencerId] = useState(influencer.influencerId);
  const [niche, setNiche] = useState(influencer.niche);
  const [phone, setPhone] = useState(influencer.phone);
  const [remarks, setRemarks] = useState(influencer.remarks);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');

  const isDirty =
    name !== influencer.name ||
    influencerId !== influencer.influencerId ||
    niche !== influencer.niche ||
    phone !== influencer.phone ||
    remarks !== influencer.remarks;

  async function save() {
    setSaving(true);
    setError('');
    try {
      const { influencer: updated } = await api.patch<{ influencer: Influencer }>(`/api/influencers/${influencer.id}`, {
        name,
        influencerId,
        niche,
        phone,
        remarks,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${influencer.name || 'this influencer'}? This cannot be undone.`)) return;
    setRemoving(true);
    setError('');
    try {
      await api.delete(`/api/influencers/${influencer.id}`);
      onDeleted(influencer.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
      setRemoving(false);
    }
  }

  return (
    <tr>
      <td data-label="Name">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Influencer name" />
      </td>
      <td data-label="Influencer ID">
        <input className="input" value={influencerId} onChange={(e) => setInfluencerId(e.target.value)} placeholder="e.g. @handle" />
      </td>
      <td data-label="Niche">
        <input className="input" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. Fashion" />
      </td>
      <td data-label="Phone">
        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
      </td>
      <td data-label="Remarks">
        <input className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks" />
      </td>
      <td data-label="Actions">
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={saving || removing || !isDirty} onClick={save}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn-secondary" disabled={saving || removing} onClick={remove}>
            {removing ? 'Removing…' : 'Delete'}
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-status-flagged">{error}</p>}
      </td>
    </tr>
  );
}

export default function InfluencersAdminPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  async function load(q?: string) {
    setLoading(true);
    setError('');
    try {
      const query = q ? `?q=${encodeURIComponent(q)}` : '';
      const { influencers } = await api.get<{ influencers: Influencer[] }>(`/api/influencers${query}`);
      setInfluencers(influencers);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load influencers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    load(search);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setAddError('Influencer name is required');
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      const { influencer } = await api.post<{ influencer: Influencer }>('/api/influencers', form);
      setInfluencers((prev) => [influencer, ...prev]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : 'Failed to add influencer');
    } finally {
      setAdding(false);
    }
  }

  function handleSaved(updated: Influencer) {
    setInfluencers((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  function handleDeleted(id: string) {
    setInfluencers((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Influencers</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Track influencer contacts — name, ID, niche, phone number, and remarks.
        </p>
      </div>

      <form onSubmit={handleAdd} className="card space-y-3">
        <h2 className="text-sm font-semibold">Add influencer</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            className="input"
            placeholder="Influencer name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Influencer ID (e.g. @handle)"
            value={form.influencerId}
            onChange={(e) => setForm((f) => ({ ...f, influencerId: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Niche"
            value={form.niche}
            onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Phone number"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Remarks"
            value={form.remarks}
            onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
          />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={adding}>
            {adding ? 'Adding…' : 'Add influencer'}
          </button>
          {addError && <p className="text-xs text-status-flagged">{addError}</p>}
        </div>
      </form>

      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <input
          className="input max-w-xs"
          placeholder="Search name, ID, niche, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      {error && <p className="text-sm text-status-flagged">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : influencers.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No influencers added yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
          <table className="tracker w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Influencer ID</th>
                <th>Niche</th>
                <th>Phone</th>
                <th>Remarks</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {influencers.map((influencer) => (
                <InfluencerRow key={influencer.id} influencer={influencer} onSaved={handleSaved} onDeleted={handleDeleted} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
