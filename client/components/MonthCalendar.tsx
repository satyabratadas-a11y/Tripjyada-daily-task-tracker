'use client';

import type { Task } from '@/lib/types';

interface DaySummary {
  count: number;
  completed: number;
  flagged: number;
  onProgress: number;
  unreviewed: number;
}

function summarize(tasks: Task[]): Map<string, DaySummary> {
  const map = new Map<string, DaySummary>();
  for (const t of tasks) {
    const key = t.date.slice(0, 10);
    const entry = map.get(key) || { count: 0, completed: 0, flagged: 0, onProgress: 0, unreviewed: 0 };
    entry.count += 1;
    if (t.adminStatus === 'flagged') entry.flagged += 1;
    else if (t.adminStatus === 'completed') entry.completed += 1;
    else if (t.adminStatus === 'on_progress' || t.adminStatus === 'pending') entry.onProgress += 1;
    if (t.adminStatus === 'pending') entry.unreviewed += 1;
    map.set(key, entry);
  }
  return map;
}

// Dots are deliberately sparse: today gets a green marker so it's easy to spot at a glance, a day
// with an unreviewed task gets red as the one actionable state, and every other day stays plain —
// no dot at all.
function dotColor(summary: DaySummary | undefined, isToday: boolean) {
  if (summary && summary.unreviewed > 0) return 'bg-status-flagged';
  if (isToday) return 'bg-status-completed';
  return null;
}

function cellClass({
  summary,
  isSelected,
  isToday,
  isSunday,
}: {
  summary: DaySummary | undefined;
  isSelected: boolean;
  isToday: boolean;
  isSunday: boolean;
}) {
  const hasFlag = Boolean(summary && summary.flagged > 0);
  if (isSelected && hasFlag) return 'border-status-flagged bg-status-flagged text-white';
  if (isSelected) return 'border-brand bg-brand text-white';
  if (hasFlag) return 'border-status-flagged/50 bg-status-flagged/10 text-red-900 hover:border-status-flagged dark:text-red-300 dark:hover:border-status-flagged/70';
  if (isToday) return 'border-brand text-brand dark:border-brand-light/50 dark:text-brand-light';
  if (isSunday) return 'border-transparent bg-status-sunday/30 text-gray-700 hover:border-gray-300 dark:bg-status-sunday/10 dark:text-gray-300 dark:hover:border-white/15';
  return 'border-transparent text-gray-700 hover:border-gray-300 dark:text-gray-300 dark:hover:border-white/15';
}

export default function MonthCalendar({
  month,
  year,
  tasks,
  selectedDate,
  onSelectDate,
}: {
  month: number;
  year: number;
  tasks: Task[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}) {
  const summaries = summarize(tasks);
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingBlanks = firstOfMonth.getUTCDay(); // 0 = Sunday
  const todayKey = new Date().toISOString().slice(0, 10);

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="card">
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-gray-400 dark:text-gray-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />;
          const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const summary = summaries.get(dateKey);
          const isSelected = selectedDate === dateKey;
          const isToday = dateKey === todayKey;
          const isSunday = i % 7 === 0;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(isSelected ? null : dateKey)}
              className={`flex flex-col items-center rounded-md border py-1.5 text-xs transition ${cellClass({
                summary,
                isSelected,
                isToday,
                isSunday,
              })}`}
            >
              <span>{day}</span>
              {(() => {
                const color = isSelected ? 'bg-white' : dotColor(summary, isToday);
                return color ? <span className={`mt-1 h-1.5 w-1.5 rounded-full ${color}`} /> : <span className="mt-1 h-1.5 w-1.5" />;
              })()}
              {summary && summary.count > 1 && (
                <span className={`mt-0.5 text-[9px] ${isSelected ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                  {summary.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {selectedDate && (
        <button className="btn-secondary mt-3 w-full text-xs" onClick={() => onSelectDate(null)}>
          Clear date filter ({selectedDate})
        </button>
      )}
    </div>
  );
}
