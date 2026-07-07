'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useClientCalendar } from '@/lib/ClientCalendarContext';
import { PillarBadge } from '@/components/content/ContentBadges';
import type { Campaign, ContentPillar } from '@/lib/content-types';

function PillarForm({ clientId, onSaved }: { clientId: string; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post(`/api/content/clients/${clientId}/pillars`, { name: name.trim(), color, description });
      setName('');
      setDescription('');
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create pillar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card mb-4 space-y-2">
      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">New content pillar</p>
      <div className="flex flex-wrap gap-2">
        <input className="input flex-1" placeholder="e.g. Behind the Scenes" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="color" className="input h-[38px] w-16 p-1" value={color} onChange={(e) => setColor(e.target.value)} />
      </div>
      <input className="input" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
      {error && <p className="text-xs text-status-flagged">{error}</p>}
      <button className="btn-primary" disabled={saving} onClick={handleSubmit}>
        {saving ? 'Adding…' : 'Add pillar'}
      </button>
    </div>
  );
}

function CampaignForm({ clientId, onSaved }: { clientId: string; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [phase, setPhase] = useState('');
  const [color, setColor] = useState('#10B981');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post(`/api/content/clients/${clientId}/campaigns`, {
        name: name.trim(),
        phase,
        color,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setName('');
      setPhase('');
      setStartDate('');
      setEndDate('');
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card mb-4 space-y-2">
      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">New campaign / phase</p>
      <div className="flex flex-wrap gap-2">
        <input className="input flex-1" placeholder="e.g. Summer Launch" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="color" className="input h-[38px] w-16 p-1" value={color} onChange={(e) => setColor(e.target.value)} />
      </div>
      <input className="input" placeholder="Phase label (optional, e.g. Phase 1: Awareness)" value={phase} onChange={(e) => setPhase(e.target.value)} />
      <div className="flex gap-2">
        <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      {error && <p className="text-xs text-status-flagged">{error}</p>}
      <button className="btn-primary" disabled={saving} onClick={handleSubmit}>
        {saving ? 'Adding…' : 'Add campaign'}
      </button>
    </div>
  );
}

export default function PillarsCampaignsPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const { client, pillars, campaigns, refreshPillars, refreshCampaigns } = useClientCalendar();
  const canManage = client.myRole === 'owner';
  const [tab, setTab] = useState<'pillars' | 'campaigns'>('pillars');
  const [error, setError] = useState('');

  async function deletePillar(p: ContentPillar) {
    if (!window.confirm(`Delete pillar "${p.name}"? Entries using it will keep their history but lose the pillar link.`)) return;
    try {
      await api.delete(`/api/content/clients/${clientId}/pillars/${p.id}`);
      await refreshPillars();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete pillar');
    }
  }

  async function deleteCampaign(c: Campaign) {
    if (!window.confirm(`Delete campaign "${c.name}"?`)) return;
    try {
      await api.delete(`/api/content/clients/${clientId}/campaigns/${c.id}`);
      await refreshCampaigns();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete campaign');
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-gray-200 dark:border-white/10">
        {(['pillars', 'campaigns'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm capitalize transition ${
              tab === t ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-brand dark:text-gray-400'
            }`}
          >
            {t === 'pillars' ? 'Content Pillars' : 'Campaigns & Phases'}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-status-flagged">{error}</p>}

      {tab === 'pillars' ? (
        <div>
          {canManage && <PillarForm clientId={clientId} onSaved={refreshPillars} />}
          {pillars.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No content pillars yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pillars.map((p) => (
                <div key={p.id} className="card flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <PillarBadge name={p.name} color={p.color} />
                    {p.description && <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{p.description}</p>}
                  </div>
                  {canManage && (
                    <button className="text-gray-400 hover:text-status-flagged" onClick={() => deletePillar(p)}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {canManage && <CampaignForm clientId={clientId} onSaved={refreshCampaigns} />}
          {campaigns.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No campaigns yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {campaigns.map((c) => (
                <div key={c.id} className="card flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {c.phase && `${c.phase} · `}
                      {c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'}
                      {c.endDate ? ` – ${new Date(c.endDate).toLocaleDateString()}` : ''} · {c.status}
                    </p>
                  </div>
                  {canManage && (
                    <button className="text-gray-400 hover:text-status-flagged" onClick={() => deleteCampaign(c)}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
