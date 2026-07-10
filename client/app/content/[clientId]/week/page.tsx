'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { api, ApiError } from '@/lib/api';
import { useClientCalendar } from '@/lib/ClientCalendarContext';
import { buildEntryQuery } from '@/lib/contentQuery';
import FilterBar, { emptyFilters, type EntryFilters } from '@/components/content/FilterBar';
import NewEntryModal from '@/components/content/NewEntryModal';
import ContentEntryDrawer from '@/components/content/ContentEntryDrawer';
import { ContentStatusBadge, FormatBadge } from '@/components/content/ContentBadges';
import type { ContentEntry } from '@/lib/content-types';

const PLATFORM_DOT: Record<string, string> = {
  Instagram: 'bg-pink-500',
  Facebook: 'bg-blue-500',
  LinkedIn: 'bg-sky-600',
  YouTube: 'bg-red-500',
  X: 'bg-violet-500',
};

function toKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function WeekEntryCard({ entry, onClick }: { entry: ContentEntry; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: entry.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, touchAction: 'none' as const } : { touchAction: 'none' as const };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`w-full rounded-2xl border border-white/70 bg-white/90 p-3 text-left text-xs shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:ring-white/10 ${
        isDragging ? 'opacity-20 shadow-none ring-0' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${PLATFORM_DOT[entry.platform] || 'bg-brand'}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <FormatBadge value={entry.format} />
            {entry.time && <span className="shrink-0 font-mono text-[10px] text-gray-400">{entry.time}</span>}
          </div>
          <p className="mt-2 line-clamp-2 break-words font-medium text-gray-800 dark:text-gray-200">{entry.idea || 'Untitled idea'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <ContentStatusBadge value={entry.status} />
            <span className="max-w-full truncate text-[10px] font-medium uppercase tracking-wide text-gray-400">
              {entry.platform}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function WeekDragOverlayCard({ entry }: { entry: ContentEntry }) {
  return (
    <div className="w-60 rounded-2xl border border-white/80 bg-white px-3 py-3 text-left text-xs shadow-2xl ring-1 ring-black/10 dark:border-white/10 dark:bg-ink-light dark:ring-white/10">
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${PLATFORM_DOT[entry.platform] || 'bg-brand'}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <FormatBadge value={entry.format} />
            {entry.time && <span className="shrink-0 font-mono text-[10px] text-gray-400">{entry.time}</span>}
          </div>
          <p className="mt-2 line-clamp-2 break-words font-medium text-gray-800 dark:text-gray-200">{entry.idea || 'Untitled idea'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <ContentStatusBadge value={entry.status} />
            <span className="max-w-full truncate text-[10px] font-medium uppercase tracking-wide text-gray-400">
              {entry.platform}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{note}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl text-base ${tone}`}>
          <i className={icon} />
        </span>
      </div>
    </div>
  );
}

function WeekDayColumn({
  date,
  entries,
  canEdit,
  onOpenEntry,
  onAddEntry,
}: {
  date: Date;
  entries: ContentEntry[];
  canEdit: boolean;
  onOpenEntry: (id: string) => void;
  onAddEntry: (dateKey: string) => void;
}) {
  const dateKey = toKey(date);
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  const isToday = dateKey === toKey(new Date());
  const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
  const countLabel = entries.length === 1 ? '1 post' : `${entries.length} posts`;

  return (
    <div
      ref={setNodeRef}
      className={`relative flex min-h-[460px] flex-col gap-3 overflow-hidden rounded-[24px] border p-3 transition duration-200 ${
        isOver
          ? 'border-brand/50 bg-brand/10 shadow-lg shadow-brand/10'
          : isToday
            ? 'border-brand/30 bg-gradient-to-br from-brand/10 via-white to-orange-50 shadow-sm dark:border-brand/30 dark:from-brand/10 dark:via-ink-light dark:to-orange-500/10'
            : isWeekend
              ? 'border-orange-100 bg-gradient-to-br from-orange-50/70 via-white to-white shadow-sm dark:border-orange-500/10 dark:from-orange-500/5 dark:via-ink-light dark:to-ink-light'
              : 'border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-ink-light'
      }`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 ${
          isToday
            ? 'bg-gradient-to-r from-brand via-orange-400 to-amber-300'
            : entries.length > 0
              ? 'bg-gradient-to-r from-brand/60 via-orange-300 to-transparent'
              : 'bg-transparent'
        }`}
      />

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${isToday ? 'text-brand' : 'text-gray-500 dark:text-gray-400'}`}>
            {date.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <p className={`text-sm font-semibold ${isToday ? 'text-brand' : ''}`}>{date.getUTCDate()}</p>
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
              {countLabel}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onAddEntry(dateKey)}
          disabled={!canEdit}
          title={canEdit ? 'Add content to this day' : 'You can view content for this day'}
          className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs transition ${
            canEdit
              ? 'border-gray-200 bg-white text-gray-400 shadow-sm hover:border-brand hover:bg-brand hover:text-white dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:border-brand dark:hover:bg-brand'
              : 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 dark:border-white/5 dark:bg-white/5 dark:text-gray-600'
          }`}
        >
          <i className="fa-solid fa-plus" />
        </button>
      </div>

      {entries.length > 0 ? (
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {entries.map((e) => (
            <WeekEntryCard key={e.id} entry={e} onClick={() => onOpenEntry(e.id)} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-200/80 bg-white/55 px-3 py-4 text-center text-[11px] text-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-gray-500">
          {canEdit ? 'Click + to plan a post here' : 'No content planned'}
        </div>
      )}
    </div>
  );
}

export default function WeeklyPlannerPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const { client, pillars, campaigns } = useClientCalendar();
  const members = client.members;
  const canEdit = client.myRole === 'owner' || client.myRole === 'editor' || client.myRole === 'viewer';

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [filters, setFilters] = useState<EntryFilters>(emptyFilters());
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [newEntryDate, setNewEntryDate] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setUTCDate(d.getUTCDate() + i);
        return d;
      }),
    [weekStart]
  );
  const from = toKey(days[0]);
  const to = toKey(days[6]);
  const query = useMemo(() => buildEntryQuery(filters, from, to), [filters, from, to]);
  const weekLabel = `${formatShortDate(days[0])} – ${days[6].toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })}`;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ entries: ContentEntry[] }>(`/api/content/clients/${clientId}/entries?${query}`);
      setEntries(data.entries);
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

  const entriesByDate = useMemo(() => {
    const map = new Map<string, ContentEntry[]>();
    for (const e of entries) {
      const key = e.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    }
    return map;
  }, [entries]);

  const activeDragEntry = useMemo(
    () => (activeDragId ? entries.find((entry) => entry.id === activeDragId) || null : null),
    [activeDragId, entries]
  );

  const weekInsights = useMemo(() => {
    const reviewCount = entries.filter((entry) => entry.status === 'Review').length;
    const publishedCount = entries.filter((entry) => entry.status === 'Published').length;
    const scheduledCount = entries.filter((entry) => entry.status === 'Scheduled').length;

    const platformMap = new Map<string, number>();
    const busiestDayMap = new Map<string, number>();
    for (const entry of entries) {
      platformMap.set(entry.platform, (platformMap.get(entry.platform) || 0) + 1);
      const dateKey = entry.date.slice(0, 10);
      busiestDayMap.set(dateKey, (busiestDayMap.get(dateKey) || 0) + 1);
    }

    let focusPlatform = 'Not set';
    let focusPlatformCount = 0;
    for (const [platform, count] of platformMap.entries()) {
      if (count > focusPlatformCount) {
        focusPlatform = platform;
        focusPlatformCount = count;
      }
    }

    let busiestDay = '';
    let busiestDayCount = 0;
    for (const [dateKey, count] of busiestDayMap.entries()) {
      if (count > busiestDayCount) {
        busiestDay = dateKey;
        busiestDayCount = count;
      }
    }

    return {
      total: entries.length,
      reviewCount,
      publishedCount,
      scheduledCount,
      focusPlatform,
      focusPlatformCount,
      busiestDay,
      busiestDayCount,
    };
  }, [entries]);

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!canEdit || !over) return;
    const entryId = String(active.id);
    const newDate = String(over.id);
    const entry = entries.find((e) => e.id === entryId);
    if (!entry || entry.date.slice(0, 10) === newDate) return;

    const previous = entries;
    setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, date: newDate } : e)));
    try {
      await api.patch(`/api/content/clients/${clientId}/entries/${entryId}/move`, { date: newDate });
    } catch (err) {
      setEntries(previous);
      setError(err instanceof ApiError ? err.message : 'Failed to move entry');
    }
  }

  function handleDragCancel() {
    setActiveDragId(null);
  }

  function shiftWeek(delta: number) {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + delta * 7);
    setWeekStart(d);
  }

  return (
    <div>
      <div className="mb-4 overflow-hidden rounded-[28px] border border-brand/10 bg-gradient-to-br from-sky-50 via-white to-orange-50 shadow-sm dark:border-brand/20 dark:from-[#111a24] dark:via-ink-light dark:to-[#20150e]">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand/70">Weekly Content Sprint</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{weekLabel}</h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
              {weekInsights.total > 0
                ? `${weekInsights.total} planned pieces for this week. Reorder priorities day by day, drag cards between columns, and keep an eye on the busiest publishing day.`
                : canEdit
                  ? 'Your weekly board is open. Start adding content into any day and shape the week visually.'
                  : 'No content is planned for this week yet. Open a day to review entries once they are added.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-secondary rounded-2xl px-3" onClick={() => shiftWeek(-1)}>
              <i className="fa-solid fa-chevron-left" />
            </button>
            <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-2 text-sm font-semibold shadow-sm dark:border-white/10 dark:bg-white/5">
              {weekLabel}
            </div>
            <button className="btn-secondary rounded-2xl px-3" onClick={() => shiftWeek(1)}>
              <i className="fa-solid fa-chevron-right" />
            </button>
            <button className="btn-primary rounded-2xl" onClick={() => setWeekStart(startOfWeek(new Date()))}>
              <i className="fa-solid fa-calendar-week" /> This week
            </button>
          </div>
        </div>

        <div className="grid gap-3 border-t border-white/60 px-5 py-4 dark:border-white/10 sm:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            label="Planned posts"
            value={weekInsights.total}
            note={weekInsights.total === 0 ? 'No items are scheduled yet.' : 'Everything currently mapped to this week.'}
            icon="fa-solid fa-layer-group"
            tone="bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
          />
          <InsightCard
            label="Queued"
            value={weekInsights.scheduledCount}
            note={weekInsights.scheduledCount > 0 ? 'Ready to go out soon.' : 'Nothing is scheduled yet.'}
            icon="fa-solid fa-clock"
            tone="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
          />
          <InsightCard
            label="Needs review"
            value={weekInsights.reviewCount}
            note={weekInsights.reviewCount > 0 ? 'Content waiting for approval.' : 'No review blockers right now.'}
            icon="fa-solid fa-hourglass-half"
            tone="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
          />
          <InsightCard
            label="Focus"
            value={weekInsights.focusPlatform}
            note={
              weekInsights.busiestDay
                ? `${weekInsights.focusPlatformCount} planned for ${weekInsights.focusPlatform} · busiest day ${formatShortDate(new Date(`${weekInsights.busiestDay}T00:00:00.000Z`))}`
                : 'No dominant platform yet.'
            }
            icon="fa-solid fa-compass-drafting"
            tone="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 pb-5 text-xs text-gray-500 dark:text-gray-400">
          <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm dark:bg-white/5">
            <i className="fa-solid fa-hand-pointer mr-1 text-brand" />
            Click a card to edit it
          </span>
          <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm dark:bg-white/5">
            <i className="fa-solid fa-up-down-left-right mr-1 text-brand" />
            Drag cards between days
          </span>
          <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm dark:bg-white/5">
            <i className="fa-solid fa-circle-check mr-1 text-brand" />
            Track week-by-week flow
          </span>
        </div>
      </div>

      <FilterBar value={filters} onChange={setFilters} pillars={pillars} campaigns={campaigns} members={members} />

      {error && <p className="mb-3 text-sm text-status-flagged">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {days.map((d) => {
              const key = toKey(d);
              return (
                <WeekDayColumn
                  key={key}
                  date={d}
                  entries={entriesByDate.get(key) || []}
                  canEdit={canEdit}
                  onOpenEntry={setOpenEntryId}
                  onAddEntry={canEdit ? setNewEntryDate : () => {}}
                />
              );
            })}
          </div>
          <DragOverlay zIndex={80}>
            {activeDragEntry ? <WeekDragOverlayCard entry={activeDragEntry} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {newEntryDate && (
        <NewEntryModal
          clientId={clientId}
          defaultDate={newEntryDate}
          pillars={pillars}
          campaigns={campaigns}
          members={members}
          onClose={() => setNewEntryDate(null)}
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
          onChanged={(updated) => setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))}
          onDeleted={(id) => setEntries((prev) => prev.filter((e) => e.id !== id))}
        />
      )}
    </div>
  );
}
