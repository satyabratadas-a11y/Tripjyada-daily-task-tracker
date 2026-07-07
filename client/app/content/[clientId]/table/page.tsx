'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useClientCalendar } from '@/lib/ClientCalendarContext';
import { buildEntryQuery } from '@/lib/contentQuery';
import FilterBar, { emptyFilters, type EntryFilters } from '@/components/content/FilterBar';
import BulkToolbar from '@/components/content/BulkToolbar';
import ExportMenu from '@/components/content/ExportMenu';
import NewEntryModal from '@/components/content/NewEntryModal';
import ContentEntryDrawer from '@/components/content/ContentEntryDrawer';
import AIPanel from '@/components/content/AIPanel';
import { ApprovalStatusBadge, PillarBadge } from '@/components/content/ContentBadges';
import {
  CONTENT_FORMATS,
  CONTENT_STATUSES,
  PLATFORMS,
  type Campaign,
  type ContentEntry,
  type ContentFormat,
  type ContentStatus,
  type Platform,
} from '@/lib/content-types';

const GHOST_SELECT =
  'rounded border border-transparent bg-transparent px-1 py-0.5 text-xs hover:border-gray-300 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:hover:border-white/20';

const FORMAT_PLURAL: Record<ContentFormat, string> = {
  Creative: 'creatives',
  Carousel: 'carousels',
  Reel: 'reels',
  Story: 'stories',
  Video: 'videos',
  Blog: 'blog posts',
};

function dayName(date: string) {
  return new Date(date).toLocaleDateString(undefined, { weekday: 'long', timeZone: 'UTC' });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function formatTime12h(time: string) {
  if (!time) return '—';
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h %= 12;
  if (h === 0) h = 12;
  return m === 0 ? `${h} ${ampm}` : `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

function monthRangeDefault() {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  return { from, to };
}

function rangeTitle(range: { from: string; to: string }) {
  const start = new Date(range.from);
  const end = new Date(range.to);
  if (start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth()) {
    return start.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  return `${formatDateShort(range.from)} – ${formatDateShort(range.to)}`;
}

function buildSummary(entries: ContentEntry[]) {
  if (entries.length === 0) return 'No content planned in this range yet.';

  const formatCounts = new Map<string, number>();
  for (const e of entries) formatCounts.set(e.format, (formatCounts.get(e.format) || 0) + 1);
  const formatPart = [...formatCounts.entries()]
    .map(([f, c]) => `${c} ${FORMAT_PLURAL[f as ContentFormat] || f.toLowerCase()}`)
    .join(' + ');

  const pillarCounts = new Map<string, number>();
  for (const e of entries) {
    if (e.pillar) pillarCounts.set(e.pillar.name, (pillarCounts.get(e.pillar.name) || 0) + 1);
  }
  const pillarPart = [...pillarCounts.entries()].map(([name, c]) => `${name} ×${c}`).join(' · ');

  return `${entries.length} ${entries.length === 1 ? 'piece' : 'pieces'} total: ${formatPart}${
    pillarPart ? ` | Pillars: ${pillarPart}` : ''
  }`;
}

function sortByDate(entries: ContentEntry[]) {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
}

function groupByCampaign(entries: ContentEntry[], campaigns: Campaign[]) {
  const byCampaignId = new Map<string, ContentEntry[]>();
  const uncategorized: ContentEntry[] = [];
  for (const e of entries) {
    if (e.campaign?.id) {
      const list = byCampaignId.get(e.campaign.id) || [];
      list.push(e);
      byCampaignId.set(e.campaign.id, list);
    } else {
      uncategorized.push(e);
    }
  }

  const orderedCampaigns = [...campaigns].sort((a, b) => {
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  const groups: { campaign: Campaign | null; entries: ContentEntry[] }[] = [];
  for (const c of orderedCampaigns) {
    const list = byCampaignId.get(c.id);
    if (list && list.length > 0) groups.push({ campaign: c, entries: sortByDate(list) });
  }
  if (uncategorized.length > 0) groups.push({ campaign: null, entries: sortByDate(uncategorized) });
  return groups;
}

function campaignDividerLabel(c: Campaign) {
  const dateRange =
    c.startDate && c.endDate
      ? `${formatDateShort(c.startDate)}–${formatDateShort(c.endDate)}`
      : c.startDate
        ? `from ${formatDateShort(c.startDate)}`
        : '';
  const heading = c.phase || c.name;
  const parts = [heading, dateRange].filter(Boolean);
  const label = parts.join(' | ');
  return c.phase && c.phase !== c.name ? `${label} — ${c.name}` : label;
}

function rowClass(entry: ContentEntry, indexInGroup: number) {
  if (entry.format === 'Reel') {
    return 'border-b border-gray-100 bg-amber-50 hover:bg-amber-100 dark:border-white/5 dark:bg-amber-500/10 dark:hover:bg-amber-500/20';
  }
  const stripe = indexInGroup % 2 === 0 ? 'bg-blue-50/50 dark:bg-white/[0.03]' : 'bg-white dark:bg-transparent';
  return `border-b border-gray-100 dark:border-white/5 hover:bg-blue-50 dark:hover:bg-white/5 ${stripe}`;
}

export default function TableViewPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const { client, pillars, campaigns } = useClientCalendar();
  const members = client.members;

  const [range, setRange] = useState(monthRangeDefault());
  const [filters, setFilters] = useState<EntryFilters>(emptyFilters());
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);

  const query = useMemo(() => buildEntryQuery(filters, range.from, range.to), [filters, range]);
  const canEdit = client.myRole === 'owner' || client.myRole === 'editor';
  const columnCount = (canEdit ? 1 : 0) + 14;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ entries: ContentEntry[] }>(`/api/content/clients/${clientId}/entries?${query}`);
      setEntries(data.entries);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load content entries');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const groups = useMemo(() => groupByCampaign(entries, campaigns), [entries, campaigns]);
  const summary = useMemo(() => buildSummary(entries), [entries]);

  function updateEntryLocal(updated: ContentEntry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  async function handleInlineUpdate(entryId: string, patch: Record<string, unknown>) {
    try {
      const { entry } = await api.patch<{ entry: ContentEntry }>(`/api/content/clients/${clientId}/entries/${entryId}`, patch);
      updateEntryLocal(entry);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update entry');
    }
  }

  async function handleDuplicate(entryId: string) {
    try {
      await api.post(`/api/content/clients/${clientId}/entries/${entryId}/duplicate`, {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to duplicate');
    }
  }

  async function handleDelete(entryId: string) {
    if (!window.confirm('Delete this content entry?')) return;
    try {
      await api.delete(`/api/content/clients/${clientId}/entries/${entryId}`);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === entries.length ? new Set() : new Set(entries.map((e) => e.id))));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" className="input w-40" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" className="input w-40" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
          <button className="btn-secondary" onClick={() => setRange(monthRangeDefault())}>
            This month
          </button>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu clientId={clientId} queryString={query} />
          {canEdit && (
            <button className="btn-secondary" onClick={() => setShowAIPanel(true)}>
              <i className="fa-solid fa-wand-magic-sparkles" /> AI 30-day plan
            </button>
          )}
          {canEdit && (
            <button className="btn-primary" onClick={() => setShowNewEntry(true)}>
              <i className="fa-solid fa-plus" /> Add row
            </button>
          )}
        </div>
      </div>

      <FilterBar value={filters} onChange={setFilters} pillars={pillars} campaigns={campaigns} members={members} />

      {canEdit && (
        <BulkToolbar
          clientId={clientId}
          selectedIds={[...selected]}
          members={members}
          onDone={load}
          onClear={() => setSelected(new Set())}
        />
      )}

      {error && <p className="mb-3 text-sm text-status-flagged">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
        <div className="bg-ink px-4 py-2.5 text-center text-sm font-semibold text-white">
          {client.name} — {rangeTitle(range)}
        </div>
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-center text-xs italic text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
          {summary}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#3730a3] text-left text-[11px] font-semibold uppercase tracking-wide text-white">
                {canEdit && (
                  <th className="px-3 py-3">
                    <input type="checkbox" checked={entries.length > 0 && selected.size === entries.length} onChange={toggleSelectAll} />
                  </th>
                )}
                <th className="whitespace-nowrap px-3 py-3">Date</th>
                <th className="whitespace-nowrap px-3 py-3">Day</th>
                <th className="whitespace-nowrap px-3 py-3">Time</th>
                <th className="whitespace-nowrap px-3 py-3">Format</th>
                <th className="whitespace-nowrap px-3 py-3">Pillar</th>
                <th className="whitespace-nowrap px-3 py-3">Content Idea</th>
                <th className="whitespace-nowrap px-3 py-3">Hook / Angle</th>
                <th className="whitespace-nowrap px-3 py-3">CTA</th>
                <th className="whitespace-nowrap px-3 py-3">Status</th>
                <th className="whitespace-nowrap px-3 py-3">Caption</th>
                <th className="whitespace-nowrap px-3 py-3">Platform</th>
                <th className="whitespace-nowrap px-3 py-3">Assigned</th>
                <th className="whitespace-nowrap px-3 py-3">Approval</th>
                <th className="whitespace-nowrap px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-ink-light">
              {loading ? (
                <tr>
                  <td colSpan={columnCount} className="px-3 py-6 text-center text-sm text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="px-3 py-6 text-center text-sm text-gray-500">
                    No content entries in this range. Add one to get started.
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <Fragment key={group.campaign?.id || 'uncategorized'}>
                    {group.campaign && (
                      <tr>
                        <td
                          colSpan={columnCount}
                          className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
                          style={{ backgroundColor: group.campaign.color }}
                        >
                          {campaignDividerLabel(group.campaign)}
                        </td>
                      </tr>
                    )}
                    {group.entries.map((entry, idx) => (
                      <tr key={entry.id} className={rowClass(entry, idx)}>
                        {canEdit && (
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={selected.has(entry.id)} onChange={() => toggleSelect(entry.id)} />
                          </td>
                        )}
                        <td className="whitespace-nowrap px-3 py-2 font-medium">{formatDateShort(entry.date)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-500 dark:text-gray-400">{dayName(entry.date)}</td>
                        <td className="whitespace-nowrap px-3 py-2">{formatTime12h(entry.time)}</td>
                        <td className="px-3 py-2">
                          <select
                            className={`${GHOST_SELECT} ${entry.format === 'Reel' ? 'font-bold text-amber-800 dark:text-amber-300' : ''}`}
                            value={entry.format}
                            disabled={!canEdit}
                            onChange={(e) => handleInlineUpdate(entry.id, { format: e.target.value as ContentFormat })}
                          >
                            {CONTENT_FORMATS.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {entry.pillar ? <PillarBadge name={entry.pillar.name} color={entry.pillar.color} /> : '—'}
                        </td>
                        <td className="min-w-[220px] max-w-[280px] px-3 py-2" title={entry.idea}>
                          <button type="button" className="text-left hover:text-brand" onClick={() => setOpenEntryId(entry.id)}>
                            {entry.idea || <span className="text-gray-400">Add idea…</span>}
                          </button>
                        </td>
                        <td className="min-w-[180px] max-w-[240px] px-3 py-2 text-gray-600 dark:text-gray-300" title={entry.hook}>
                          {entry.hook || '—'}
                        </td>
                        <td className="max-w-[160px] truncate px-3 py-2" title={entry.cta}>
                          {entry.cta || '—'}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className={GHOST_SELECT}
                            value={entry.status}
                            disabled={!canEdit}
                            onChange={(e) => handleInlineUpdate(entry.id, { status: e.target.value as ContentStatus })}
                          >
                            {CONTENT_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="max-w-[220px] truncate px-3 py-2 text-gray-500 dark:text-gray-400" title={entry.caption}>
                          {entry.caption || '—'}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className={GHOST_SELECT}
                            value={entry.platform}
                            disabled={!canEdit}
                            onChange={(e) => handleInlineUpdate(entry.id, { platform: e.target.value as Platform })}
                          >
                            {PLATFORMS.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">{entry.assignee?.name || 'Unassigned'}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <ApprovalStatusBadge value={entry.approvalStatus} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button className="text-gray-400 hover:text-brand" title="Open" onClick={() => setOpenEntryId(entry.id)}>
                              <i className="fa-solid fa-expand" />
                            </button>
                            {canEdit && (
                              <>
                                <button className="text-gray-400 hover:text-brand" title="Duplicate" onClick={() => handleDuplicate(entry.id)}>
                                  <i className="fa-solid fa-copy" />
                                </button>
                                <button className="text-gray-400 hover:text-status-flagged" title="Delete" onClick={() => handleDelete(entry.id)}>
                                  <i className="fa-solid fa-trash" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
      </p>

      {showNewEntry && (
        <NewEntryModal
          clientId={clientId}
          defaultDate={range.from}
          pillars={pillars}
          campaigns={campaigns}
          members={members}
          onClose={() => setShowNewEntry(false)}
          onCreated={() => load()}
        />
      )}

      {openEntryId && (
        <ContentEntryDrawer
          clientId={clientId}
          entryId={openEntryId}
          myRole={client.myRole}
          pillars={pillars}
          campaigns={campaigns}
          members={members}
          onClose={() => setOpenEntryId(null)}
          onChanged={updateEntryLocal}
          onDeleted={(id) => setEntries((prev) => prev.filter((e) => e.id !== id))}
        />
      )}

      {showAIPanel && (
        <AIPanel
          clientId={clientId}
          pillars={pillars}
          campaigns={campaigns}
          onClose={() => setShowAIPanel(false)}
          onImported={() => load()}
        />
      )}
    </div>
  );
}
