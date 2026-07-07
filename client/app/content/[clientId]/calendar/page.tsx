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
import type { ContentEntry } from '@/lib/content-types';

const STATUS_CHIP: Record<string, string> = {
  Idea: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300',
  Draft: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
  Designing: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  Review: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  Approved: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  Scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  Published: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
};

function toKey(d: Date) {
  return d.toISOString().slice(0, 10);
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
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`block w-full truncate rounded px-1.5 py-1 text-left text-[11px] font-medium transition ${
        STATUS_CHIP[entry.status] || STATUS_CHIP.Idea
      } ${isDragging ? 'z-50 opacity-60 shadow-lg' : ''}`}
      title={entry.idea}
    >
      {entry.time && <span className="mr-1 font-mono text-[10px] opacity-70">{entry.time}</span>}
      {entry.idea || `${entry.format} · ${entry.platform}`}
    </button>
  );
}

function DayCell({
  date,
  isCurrentMonth,
  entries,
  onOpenEntry,
  onAddEntry,
}: {
  date: Date;
  isCurrentMonth: boolean;
  entries: ContentEntry[];
  onOpenEntry: (id: string) => void;
  onAddEntry: (dateKey: string) => void;
}) {
  const dateKey = toKey(date);
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  const todayKey = toKey(new Date());
  const isToday = dateKey === todayKey;
  const visible = entries.slice(0, 3);
  const overflow = entries.length - visible.length;

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[112px] border border-gray-100 p-1.5 transition dark:border-white/5 ${
        isOver ? 'bg-brand/10' : isCurrentMonth ? 'bg-white dark:bg-ink-light' : 'bg-gray-50 dark:bg-black/20'
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <span
          className={`text-xs ${
            isToday
              ? 'flex h-5 w-5 items-center justify-center rounded-full bg-brand font-semibold text-white'
              : isCurrentMonth
                ? 'text-gray-600 dark:text-gray-300'
                : 'text-gray-300 dark:text-gray-600'
          }`}
        >
          {date.getUTCDate()}
        </span>
        <button
          type="button"
          onClick={() => onAddEntry(dateKey)}
          className="text-xs text-gray-300 hover:text-brand dark:text-gray-600"
        >
          <i className="fa-solid fa-plus" />
        </button>
      </div>
      <div className="space-y-1">
        {visible.map((e) => (
          <EntryChip key={e.id} entry={e} onClick={() => onOpenEntry(e.id)} />
        ))}
        {overflow > 0 && <p className="px-1 text-[10px] text-gray-400">+{overflow} more</p>}
      </div>
    </div>
  );
}

export default function MonthlyCalendarPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const { client, pillars, campaigns } = useClientCalendar();
  const members = client.members;
  const canEdit = client.myRole === 'owner' || client.myRole === 'editor';

  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [filters, setFilters] = useState<EntryFilters>(emptyFilters());
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [newEntryDate, setNewEntryDate] = useState<string | null>(null);

  const days = useMemo(() => buildGridDays(year, month), [year, month]);
  const from = toKey(days[0]);
  const to = toKey(days[days.length - 1]);
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => shiftMonth(-1)}>
            <i className="fa-solid fa-chevron-left" />
          </button>
          <p className="min-w-[140px] text-center text-sm font-semibold">
            {new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}
          </p>
          <button className="btn-secondary" onClick={() => shiftMonth(1)}>
            <i className="fa-solid fa-chevron-right" />
          </button>
          <button className="btn-secondary" onClick={goToday}>
            Today
          </button>
        </div>
      </div>

      <FilterBar value={filters} onChange={setFilters} pillars={pillars} campaigns={campaigns} members={members} />

      {error && <p className="mb-3 text-sm text-status-flagged">{error}</p>}

      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-gray-100 dark:border-white/5">
            {days.map((d) => {
              const key = toKey(d);
              return (
                <DayCell
                  key={key}
                  date={d}
                  isCurrentMonth={d.getUTCMonth() + 1 === month}
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
