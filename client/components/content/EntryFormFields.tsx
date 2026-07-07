'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import {
  CONTENT_FORMATS,
  CONTENT_STATUSES,
  PLATFORMS,
  type Campaign,
  type ClientMember,
  type ContentFormat,
  type ContentPillar,
  type ContentStatus,
  type Platform,
} from '@/lib/content-types';

export interface EntryFormValue {
  date: string;
  time: string;
  format: ContentFormat;
  pillar: string;
  campaign: string;
  idea: string;
  hook: string;
  caption: string;
  cta: string;
  platform: Platform;
  assignee: string;
  status: ContentStatus;
}

export function emptyEntryFormValue(date: string): EntryFormValue {
  return {
    date,
    time: '',
    format: 'Creative',
    pillar: '',
    campaign: '',
    idea: '',
    hook: '',
    caption: '',
    cta: '',
    platform: 'Instagram',
    assignee: '',
    status: 'Idea',
  };
}

function AIButton({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-md border border-brand/30 bg-brand/5 px-2 py-1 text-[11px] font-medium text-brand transition hover:bg-brand/10 disabled:opacity-50 dark:border-brand-light/30 dark:bg-brand/10 dark:text-brand-light"
      title={label}
    >
      <i className={loading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-wand-magic-sparkles'} />
      {loading ? 'Generating…' : label}
    </button>
  );
}

export default function EntryFormFields({
  clientId,
  value,
  onChange,
  pillars,
  campaigns,
  members,
  aiEnabled = true,
}: {
  clientId: string;
  value: EntryFormValue;
  onChange: (patch: Partial<EntryFormValue>) => void;
  pillars: ContentPillar[];
  campaigns: Campaign[];
  members: ClientMember[];
  aiEnabled?: boolean;
}) {
  const [aiError, setAiError] = useState('');
  const [loadingField, setLoadingField] = useState<'idea' | 'hook' | 'caption' | null>(null);

  async function generateIdea() {
    setLoadingField('idea');
    setAiError('');
    try {
      const data = await api.post<{ ideas: string[] }>(`/api/content/clients/${clientId}/ai/ideas`, {
        pillar: value.pillar || undefined,
        platform: value.platform,
        count: 1,
      });
      if (data.ideas?.[0]) onChange({ idea: data.ideas[0] });
    } catch (err) {
      setAiError(err instanceof ApiError ? err.message : 'Failed to generate idea');
    } finally {
      setLoadingField(null);
    }
  }

  async function generateHook() {
    if (!value.idea.trim()) {
      setAiError('Add a content idea first');
      return;
    }
    setLoadingField('hook');
    setAiError('');
    try {
      const data = await api.post<{ hook: string }>(`/api/content/clients/${clientId}/ai/hook`, {
        idea: value.idea,
        platform: value.platform,
      });
      if (data.hook) onChange({ hook: data.hook });
    } catch (err) {
      setAiError(err instanceof ApiError ? err.message : 'Failed to generate hook');
    } finally {
      setLoadingField(null);
    }
  }

  async function generateCaption() {
    if (!value.idea.trim()) {
      setAiError('Add a content idea first');
      return;
    }
    setLoadingField('caption');
    setAiError('');
    try {
      const data = await api.post<{ caption: string }>(`/api/content/clients/${clientId}/ai/caption`, {
        idea: value.idea,
        hook: value.hook,
        platform: value.platform,
        cta: value.cta,
      });
      if (data.caption) onChange({ caption: data.caption });
    } catch (err) {
      setAiError(err instanceof ApiError ? err.message : 'Failed to generate caption');
    } finally {
      setLoadingField(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Date</label>
          <input type="date" className="input" value={value.date} onChange={(e) => onChange({ date: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Time</label>
          <input type="time" className="input" value={value.time} onChange={(e) => onChange({ time: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Format</label>
          <select className="input" value={value.format} onChange={(e) => onChange({ format: e.target.value as ContentFormat })}>
            {CONTENT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Platform</label>
          <select className="input" value={value.platform} onChange={(e) => onChange({ platform: e.target.value as Platform })}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Content pillar</label>
          <select className="input" value={value.pillar} onChange={(e) => onChange({ pillar: e.target.value })}>
            <option value="">None</option>
            {pillars.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Campaign / Phase</label>
          <select className="input" value={value.campaign} onChange={(e) => onChange({ campaign: e.target.value })}>
            <option value="">None</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Assigned team member</label>
          <select className="input" value={value.assignee} onChange={(e) => onChange({ assignee: e.target.value })}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.user} value={m.user}>
                {m.name || m.email || m.user}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Content idea</label>
          {aiEnabled && <AIButton onClick={generateIdea} loading={loadingField === 'idea'} label="Generate idea" />}
        </div>
        <textarea className="input" rows={2} value={value.idea} onChange={(e) => onChange({ idea: e.target.value })} />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Hook / Angle</label>
          {aiEnabled && <AIButton onClick={generateHook} loading={loadingField === 'hook'} label="Generate hook" />}
        </div>
        <textarea className="input" rows={2} value={value.hook} onChange={(e) => onChange({ hook: e.target.value })} />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Caption</label>
          {aiEnabled && <AIButton onClick={generateCaption} loading={loadingField === 'caption'} label="Generate caption" />}
        </div>
        <textarea className="input" rows={4} value={value.caption} onChange={(e) => onChange({ caption: e.target.value })} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">CTA (Call To Action)</label>
        <input className="input" value={value.cta} onChange={(e) => onChange({ cta: e.target.value })} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
        <select className="input" value={value.status} onChange={(e) => onChange({ status: e.target.value as ContentStatus })}>
          {CONTENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {aiError && <p className="text-xs text-status-flagged">{aiError}</p>}
    </div>
  );
}
