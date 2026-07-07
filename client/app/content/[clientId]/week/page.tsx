'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { api, ApiError } from '@/lib/api';
import { useClientCalendar } from '@/lib/ClientCalendarContext';
import { buildEntryQuery } from '@/lib/contentQuery';
import FilterBar, { emptyFilters, type EntryFilters } from '@/components/content/FilterBar';
import NewEntryModal from '@/components/content/NewEntryModal';
import ContentEntryDrawer from '@/components/content/ContentEntryDrawer';
import { ContentStatusBadge, FormatBadge } from '@/components/content/ContentBadges';
import type { ContentEntry } from '@/lib/content-types';

function toKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

function WeekEntryCard({ entry, onClick }: { entry: ContentEntry; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: entry.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`card w-full space-y-1.5 p-2.5 text-left text-xs transition ${isDragging ? 'z-50 opacity-60 shadow-lg' : ''}`}
    >
      <div className="flex items-center justify-between gap-1">
        <FormatBadge value={entry.format} />
        {entry.time && <span className="font-mono text-[10px] text-gray-400">{entry.time}</span>}
      </div>
      <p className="line-clamp-2 font-medium text-gray-800 dark:text-gray-200">{entry.idea || 'Untitled idea'}</p>
      <ContentStatusBadge value={entry.status} />
    </button>
  );
}

function WeekDayColumn({
  date,
  entries,
  onOpenEntry,
  onAddEntry,
}: {
  date: Date;
  entries: ContentEntry[];
  onOpenEntry: (id: string) => void;
  onAddEntry: (dateKey: string) => void;
}) {
  const dateKey = toKey(date);
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  const isToday = dateKey === toKey(new Date());

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[420px] flex-col gap-2 rounded-lg border border-gray-100 p-2 transition dark:border-white/5 ${
        isOver ? 'bg-brand/10' : 'bg-gray-50/50 dark:bg-black/10'
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase ${isToday ? 'text-brand' : 'text-gray-500 dark:text-gray-400'}`}>
            {date.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })}
          </p>
          <p className="text-sm font-semibold">{date.getUTCDate()}</p>
        </div>
        <button type="button" onClick={() => onAddEntry(dateKey)} className="text-gray-300 hover:text-brand dark:text-gray-600">
          <i className="fa-solid fa-plus" />
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {entries.map((e) => (
          <WeekEntryCard key={e.id} entry={e} onClick={() => onOpenEntry(e.id)} />
        ))}
      </div>
    </div>
  );
}

export default function WeeklyPlannerPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const { client, pillars, campaigns } = useClientCalendar();
  const members = client.members;
  const canEdit = client.myRole === 'owner' || client.myRole === 'editor';

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [filters, setFilters] = useState<EntryFilters>(emptyFilters());
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [newEntryDate, setNewEntryDate] = useState<string | null>(null);

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
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

  function shiftWeek(delta: number) {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + delta * 7);
    setWeekStart(d);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => shiftWeek(-1)}>
            <i className="fa-solid fa-chevron-left" />
          </button>
          <p className="min-w-[220px] text-center text-sm font-semibold">
            {days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })} –{' '}
            {days[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
          </p>
          <button className="btn-secondary" onClick={() => shiftWeek(1)}>
            <i className="fa-solid fa-chevron-right" />
          </button>
          <button className="btn-secondary" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            This week
          </button>
        </div>
      </div>

      <FilterBar value={filters} onChange={setFilters} pillars={pillars} campaigns={campaigns} members={members} />

      {error && <p className="mb-3 text-sm text-status-flagged">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
            {days.map((d) => {
              const key = toKey(d);
              return (
                <WeekDayColumn
                  key={key}
                  date={d}
                  entries={entriesByDate.get(key) || []}
                  onOpenEntry={setOpenEntryId}
                  onAddEntry={canEdit ? setNewEntryDate : () => {}}
                />
              );
            })}
          </div>
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
