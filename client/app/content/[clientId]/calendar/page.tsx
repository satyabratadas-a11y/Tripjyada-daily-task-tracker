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
import type { ContentEntry } from '@/lib/content-types';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const STATUS_CHIP: Record<string, string> = {
  Idea: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300',
  Draft: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
  Designing: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  Review: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  Approved: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  Scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  Published: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
};

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

function monthTitle(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatShortDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function buildGridDays(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const leading = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const gridStart = new Date(first);
  gridStart.setUTCDate(gridStart.getUTCDate() - leading);

  return Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(gridStart);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
}

function EntryChip({ entry, onClick }: { entry: ContentEntry; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: entry.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, touchAction: 'none' as const } : { touchAction: 'none' as const };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`block w-full rounded-xl border border-white/70 px-2 py-1.5 text-left text-[11px] font-medium shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:ring-white/10 ${
        STATUS_CHIP[entry.status] || STATUS_CHIP.Idea
      } ${isDragging ? 'opacity-20 shadow-none ring-0' : ''}`}
      title={entry.idea}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${PLATFORM_DOT[entry.platform] || 'bg-brand'}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{entry.idea || `${entry.format} · ${entry.platform}`}</p>
          <div className="mt-1 flex items-center justify-between gap-2 text-[10px] opacity-75">
            <span className="truncate font-mono">{entry.time || entry.platform}</span>
            <span className="truncate uppercase tracking-wide">{entry.format}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function DragEntryOverlay({ entry }: { entry: ContentEntry }) {
  return (
    <div
      className={`w-[220px] max-w-[28vw] rounded-xl border border-white/80 px-2 py-1.5 text-left text-[11px] font-medium shadow-2xl ring-1 ring-black/10 backdrop-blur-sm dark:border-white/15 dark:ring-white/10 ${
        STATUS_CHIP[entry.status] || STATUS_CHIP.Idea
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${PLATFORM_DOT[entry.platform] || 'bg-brand'}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{entry.idea || `${entry.format} · ${entry.platform}`}</p>
          <div className="mt-1 flex items-center justify-between gap-2 text-[10px] opacity-75">
            <span className="truncate font-mono">{entry.time || entry.platform}</span>
            <span className="truncate uppercase tracking-wide">{entry.format}</span>
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

function DayCell({
  date,
  isCurrentMonth,
  entries,
  canEdit,
  onOpenEntry,
  onAddEntry,
}: {
  date: Date;
  isCurrentMonth: boolean;
  entries: ContentEntry[];
  canEdit: boolean;
  onOpenEntry: (id: string) => void;
  onAddEntry: (dateKey: string) => void;
}) {
  const dateKey = toKey(date);
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  const todayKey = toKey(new Date());
  const isToday = dateKey === todayKey;
  const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
  const visible = entries.slice(0, 3);
  const overflow = entries.length - visible.length;
  const countLabel = entries.length === 1 ? '1 post' : `${entries.length} posts`;

  return (
    <div
      ref={setNodeRef}
      className={`group relative min-h-[152px] overflow-hidden rounded-2xl border p-2.5 transition duration-200 ${
        isOver
          ? 'border-brand/50 bg-brand/10 shadow-lg shadow-brand/10'
          : isToday
            ? 'border-brand/30 bg-gradient-to-br from-brand/10 via-white to-orange-50 shadow-sm dark:border-brand/30 dark:from-brand/10 dark:via-ink-light dark:to-orange-500/10'
            : isCurrentMonth
              ? isWeekend
                ? 'border-orange-100 bg-gradient-to-br from-orange-50/70 via-white to-white shadow-sm hover:-translate-y-0.5 hover:shadow-md dark:border-orange-500/10 dark:from-orange-500/5 dark:via-ink-light dark:to-ink-light'
                : 'border-gray-200 bg-white shadow-sm hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-ink-light'
              : 'border-gray-100 bg-gray-50/80 dark:border-white/5 dark:bg-black/20'
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

      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${
              isCurrentMonth ? 'text-gray-400 dark:text-gray-500' : 'text-gray-300 dark:text-gray-600'
            }`}
          >
            {WEEKDAY_LABELS[date.getUTCDay()]}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`text-sm font-semibold ${
                isToday
                  ? 'flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white shadow-sm'
                  : isCurrentMonth
                    ? 'text-gray-700 dark:text-gray-200'
                    : 'text-gray-300 dark:text-gray-600'
              }`}
            >
              {date.getUTCDate()}
            </span>
            {entries.length > 0 && (
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
                {countLabel}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onAddEntry(dateKey)}
          disabled={!canEdit}
          title={canEdit ? 'Add content to this day' : 'You can view content for this day'}
          className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs transition ${
            canEdit
              ? 'border-gray-200 bg-white text-gray-400 shadow-sm hover:border-brand hover:bg-brand hover:text-white dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:border-brand dark:hover:bg-brand'
              : 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 dark:border-white/5 dark:bg-white/5 dark:text-gray-600'
          }`}
        >
          <i className="fa-solid fa-plus" />
        </button>
      </div>

      {visible.length > 0 ? (
        <div className="space-y-1.5">
          {visible.map((e) => (
            <EntryChip key={e.id} entry={e} onClick={() => onOpenEntry(e.id)} />
          ))}
          {overflow > 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white/70 px-2 py-1 text-[10px] font-medium text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
              +{overflow} more planned for this day
            </div>
          )}
        </div>
      ) : isCurrentMonth ? (
        <div className="mt-5 rounded-xl border border-dashed border-gray-200/80 bg-white/55 px-3 py-3 text-center text-[11px] text-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-gray-500">
          {canEdit ? 'Click + to plan a post here' : 'No content planned'}
        </div>
      ) : null}
    </div>
  );
}

export default function MonthlyCalendarPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const { client, pillars, campaigns } = useClientCalendar();
  const members = client.members;
  const canEdit = client.myRole === 'owner' || client.myRole === 'editor' || client.myRole === 'viewer';

  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [filters, setFilters] = useState<EntryFilters>(emptyFilters());
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [newEntryDate, setNewEntryDate] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const days = useMemo(() => buildGridDays(year, month), [year, month]);
  const from = toKey(days[0]);
  const to = toKey(days[days.length - 1]);
  const query = useMemo(() => buildEntryQuery(filters, from, to), [filters, from, to]);
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const currentMonthLabel = useMemo(() => monthTitle(year, month), [year, month]);

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
    return map;
  }, [entries]);

  const monthInsights = useMemo(() => {
    const monthEntries = entries.filter((entry) => entry.date.slice(0, 7) === monthKey);
    const activeDays = new Set(monthEntries.map((entry) => entry.date.slice(0, 10))).size;
    const reviewCount = monthEntries.filter((entry) => entry.status === 'Review').length;
    const publishedCount = monthEntries.filter((entry) => entry.status === 'Published').length;

    const busiestDayMap = new Map<string, number>();
    const platformMap = new Map<string, number>();

    for (const entry of monthEntries) {
      const key = entry.date.slice(0, 10);
      busiestDayMap.set(key, (busiestDayMap.get(key) || 0) + 1);
      platformMap.set(entry.platform, (platformMap.get(entry.platform) || 0) + 1);
    }

    let busiestDay = '';
    let busiestCount = 0;
    for (const [dayKey, count] of busiestDayMap.entries()) {
      if (count > busiestCount) {
        busiestDay = dayKey;
        busiestCount = count;
      }
    }

    let focusPlatform = 'Not set';
    let focusPlatformCount = 0;
    for (const [platform, count] of platformMap.entries()) {
      if (count > focusPlatformCount) {
        focusPlatform = platform;
        focusPlatformCount = count;
      }
    }

    return {
      total: monthEntries.length,
      activeDays,
      reviewCount,
      publishedCount,
      focusPlatform,
      focusPlatformCount,
      busiestDay,
      busiestCount,
    };
  }, [entries, monthKey]);

  const activeDragEntry = useMemo(
    () => (activeDragId ? entries.find((entry) => entry.id === activeDragId) || null : null),
    [activeDragId, entries]
  );

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

  function goToday() {
    setYear(now.getUTCFullYear());
    setMonth(now.getUTCMonth() + 1);
  }

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  return (
    <div>
      <div className="mb-4 overflow-hidden rounded-[28px] border border-brand/10 bg-gradient-to-br from-orange-50 via-white to-amber-50 shadow-sm dark:border-brand/20 dark:from-[#25170f] dark:via-ink-light dark:to-[#20150e]">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand/70">Monthly Content Planner</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{currentMonthLabel}</h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
              {monthInsights.total > 0
                ? `${monthInsights.total} planned pieces across ${monthInsights.activeDays} active day${monthInsights.activeDays === 1 ? '' : 's'}. Drag any card to reschedule it, or click the plus button to add new content.`
                : canEdit
                  ? 'This month is still open. Start by clicking any plus button to add a post, reel, carousel, or campaign idea.'
                  : 'No content is planned for this month yet. Open a day to review entries once they are added.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-secondary rounded-2xl px-3" onClick={() => shiftMonth(-1)}>
              <i className="fa-solid fa-chevron-left" />
            </button>
            <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-2 text-sm font-semibold shadow-sm dark:border-white/10 dark:bg-white/5">
              {currentMonthLabel}
            </div>
            <button className="btn-secondary rounded-2xl px-3" onClick={() => shiftMonth(1)}>
              <i className="fa-solid fa-chevron-right" />
            </button>
            <button className="btn-primary rounded-2xl" onClick={goToday}>
              <i className="fa-solid fa-location-crosshairs" /> Today
            </button>
          </div>
        </div>

        <div className="grid gap-3 border-t border-white/60 px-5 py-4 dark:border-white/10 sm:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            label="Planned posts"
            value={monthInsights.total}
            note={monthInsights.total === 0 ? 'Your month is currently empty.' : 'Everything scheduled in this month view.'}
            icon="fa-solid fa-calendar-check"
            tone="bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
          />
          <InsightCard
            label="Active days"
            value={monthInsights.activeDays}
            note={monthInsights.activeDays === 0 ? 'No publishing rhythm yet.' : 'Days with at least one planned item.'}
            icon="fa-solid fa-bolt"
            tone="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
          />
          <InsightCard
            label="Needs review"
            value={monthInsights.reviewCount}
            note={monthInsights.reviewCount > 0 ? 'Content waiting for approval.' : 'Nothing is blocked in review.'}
            icon="fa-solid fa-hourglass-half"
            tone="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
          />
          <InsightCard
            label="Focus"
            value={monthInsights.focusPlatform}
            note={
              monthInsights.busiestDay
                ? `${monthInsights.focusPlatformCount} planned for ${monthInsights.focusPlatform} · busiest day ${formatShortDate(monthInsights.busiestDay)}`
                : 'No dominant platform yet.'
            }
            icon="fa-solid fa-compass-drafting"
            tone="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 pb-5">
          {(Object.keys(STATUS_CHIP) as Array<keyof typeof STATUS_CHIP>).map((status) => (
            <span
              key={status}
              className={`rounded-full px-3 py-1 text-[11px] font-medium shadow-sm ${STATUS_CHIP[status]}`}
            >
              {status}
            </span>
          ))}
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            <i className="fa-solid fa-hand-pointer mr-1 text-brand" />
            Click a card to edit it. Drag cards to move them between days.
          </span>
        </div>
      </div>

      <FilterBar value={filters} onChange={setFilters} pillars={pillars} campaigns={campaigns} members={members} />

      {error && <p className="mb-3 text-sm text-status-flagged">{error}</p>}

      <div className="mb-1 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
        {WEEKDAY_LABELS.map((d, index) => (
          <div
            key={d}
            className={`rounded-2xl border px-3 py-2 ${
              index === 0 || index === 6
                ? 'border-orange-100 bg-orange-50/70 text-orange-600 dark:border-orange-500/10 dark:bg-orange-500/5 dark:text-orange-300'
                : 'border-gray-200 bg-white/80 dark:border-white/10 dark:bg-white/5'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
          <div className="grid grid-cols-7 gap-2">
            {days.map((d) => {
              const key = toKey(d);
              return (
                <DayCell
                  key={key}
                  date={d}
                  isCurrentMonth={d.getUTCMonth() + 1 === month}
                  entries={entriesByDate.get(key) || []}
                  canEdit={canEdit}
                  onOpenEntry={setOpenEntryId}
                  onAddEntry={canEdit ? setNewEntryDate : () => {}}
                />
              );
            })}
          </div>
          <DragOverlay zIndex={80}>
            {activeDragEntry ? <DragEntryOverlay entry={activeDragEntry} /> : null}
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
