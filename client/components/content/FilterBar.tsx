'use client';

import { useEffect, useState } from 'react';
import { useDebounce } from '@/lib/useDebounce';
import { CONTENT_STATUSES, PLATFORMS, type Campaign, type ClientMember, type ContentPillar } from '@/lib/content-types';

export interface EntryFilters {
  q: string;
  status: string[];
  platform: string[];
  pillar: string;
  campaign: string;
  assignee: string;
}

export function emptyFilters(): EntryFilters {
  return { q: '', status: [], platform: [], pillar: '', campaign: '', assignee: '' };
}

function MultiSelect({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);

  function toggle(option: string) {
    onChange(selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option]);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center justify-between gap-2 text-left"
      >
        <span className="truncate">{selected.length > 0 ? `${label}: ${selected.length}` : label}</span>
        <i className="fa-solid fa-chevron-down text-xs text-gray-400" />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-label="Close" />
          <div className="absolute z-20 mt-1 w-48 rounded-md border border-gray-200 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-ink-light">
            {options.map((option) => (
              <label key={option} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-white/5">
                <input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} />
                {option}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function FilterBar({
  value,
  onChange,
  pillars,
  campaigns,
  members,
}: {
  value: EntryFilters;
  onChange: (v: EntryFilters) => void;
  pillars: ContentPillar[];
  campaigns: Campaign[];
  members: ClientMember[];
}) {
  const [q, setQ] = useState(value.q);
  const debouncedQ = useDebounce(q, 300);

  useEffect(() => {
    if (debouncedQ !== value.q) onChange({ ...value, q: debouncedQ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  return (
    <div className="mb-4 space-y-2.5">
      <div className="grid gap-2 lg:grid-cols-[minmax(220px,1.4fr)_repeat(2,minmax(0,144px))]">
        <div className="relative min-w-0">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
          <input className="input pl-8" placeholder="Search content…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="min-w-0">
          <MultiSelect
            label="Status"
            options={CONTENT_STATUSES}
            selected={value.status}
            onChange={(status) => onChange({ ...value, status })}
          />
        </div>
        <div className="min-w-0">
          <MultiSelect
            label="Platform"
            options={PLATFORMS}
            selected={value.platform}
            onChange={(platform) => onChange({ ...value, platform })}
          />
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-center">
        <div className="min-w-0">
          <select className="input" value={value.pillar} onChange={(e) => onChange({ ...value, pillar: e.target.value })}>
            <option value="">All pillars</option>
            {pillars.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <select className="input" value={value.campaign} onChange={(e) => onChange({ ...value, campaign: e.target.value })}>
            <option value="">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <select className="input" value={value.assignee} onChange={(e) => onChange({ ...value, assignee: e.target.value })}>
            <option value="">Everyone</option>
            {members.map((m) => (
              <option key={m.user} value={m.user}>
                {m.name || m.email || m.user}
              </option>
            ))}
          </select>
        </div>
        {(value.q || value.status.length > 0 || value.platform.length > 0 || value.pillar || value.campaign || value.assignee) && (
          <button
            type="button"
            className="justify-self-start text-xs text-gray-400 hover:text-brand lg:justify-self-end"
            onClick={() => {
              setQ('');
              onChange(emptyFilters());
            }}
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
