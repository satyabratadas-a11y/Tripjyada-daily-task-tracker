'use client';

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

export default function EntryFormFields({
  value,
  onChange,
  pillars,
  campaigns,
  members,
}: {
  value: EntryFormValue;
  onChange: (patch: Partial<EntryFormValue>) => void;
  pillars: ContentPillar[];
  campaigns: Campaign[];
  members: ClientMember[];
}) {
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
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Content idea</label>
        <textarea className="input" rows={2} value={value.idea} onChange={(e) => onChange({ idea: e.target.value })} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Hook / Angle</label>
        <textarea className="input" rows={2} value={value.hook} onChange={(e) => onChange({ hook: e.target.value })} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Caption</label>
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
    </div>
  );
}
