'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import type { AuditLogEntry } from '@/lib/types';

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('.', ' ')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function actionVerb(action: string) {
  const parts = action.split('.');
  return parts[parts.length - 1] || action;
}

const ACTION_TONE: Record<string, string> = {
  approved: 'border-status-completed/30 bg-status-completed/10 text-green-800',
  assigned: 'border-brand/30 bg-brand/5 text-brand',
  reviewed: 'border-status-progress/40 bg-status-progress/15 text-amber-900',
  updated: 'border-blue-300 bg-blue-50 text-blue-800',
  deleted: 'border-status-flagged/30 bg-status-flagged/10 text-red-800',
  disabled: 'border-status-flagged/30 bg-status-flagged/10 text-red-800',
};

const ACTION_DOT: Record<string, string> = {
  approved: 'bg-status-completed',
  assigned: 'bg-brand',
  reviewed: 'bg-status-progress',
  updated: 'bg-blue-500',
  deleted: 'bg-status-flagged',
  disabled: 'bg-status-flagged',
};

function ActionBadge({ action }: { action: string }) {
  const tone = ACTION_TONE[actionVerb(action)] || 'border-gray-300 bg-gray-50 text-gray-600';
  return (
    <span
      className={`inline-flex w-fit items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none sm:text-xs ${tone}`}
    >
      {formatLabel(action)}
    </span>
  );
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toInputDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromInputDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

type PresetKey = 'today' | '7d' | '30d' | 'month' | 'all' | 'custom';

const PRESETS: { key: Exclude<PresetKey, 'custom'>; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'all', label: 'All time' },
];

function presetRange(key: Exclude<PresetKey, 'custom'>): { from: string; to: string } {
  const now = new Date();
  const today = toInputDate(now);
  switch (key) {
    case 'today':
      return { from: today, to: today };
    case '7d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: toInputDate(d), to: today };
    }
    case '30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: toInputDate(d), to: today };
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toInputDate(d), to: today };
    }
    case 'all':
    default:
      return { from: '', to: '' };
  }
}

function dayLabel(dateKey: string, date: Date) {
  const now = new Date();
  const today = toInputDate(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toInputDate(yesterdayDate);

  if (dateKey === today) return 'Today';
  if (dateKey === yesterday) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export default function AdminAuditPage() {
  const { refresh } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [activePreset, setActivePreset] = useState<PresetKey>('all');

  const load = useCallback(
    async (showLoader: boolean, range: { from: string; to: string }) => {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError('');
      try {
        const query = new URLSearchParams({ limit: '100' });
        if (range.from) query.set('from', range.from);
        if (range.to) query.set('to', range.to);
        const data = await api.get<{ logs: AuditLogEntry[] }>(`/api/admin/audit-logs?${query.toString()}`);
        setLogs(data.logs);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          await refresh();
        } else {
          setError(err instanceof ApiError ? err.message : 'Failed to load audit log');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [refresh]
  );

  useEffect(() => {
    load(true, { from, to });
    const timer = window.setInterval(() => {
      load(false, { from, to });
    }, 15000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, from, to]);

  const applyPreset = (key: Exclude<PresetKey, 'custom'>) => {
    const range = presetRange(key);
    setActivePreset(key);
    setFrom(range.from);
    setTo(range.to);
  };

  const clearFilters = () => {
    setActivePreset('all');
    setFrom('');
    setTo('');
  };

  const hasFilters = Boolean(from || to);

  const rangeLabel = useMemo(() => {
    if (!from && !to) return null;
    const fmt = (s: string) => fromInputDate(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    if (from && to) return from === to ? fmt(from) : `${fmt(from)} – ${fmt(to)}`;
    if (from) return `Since ${fmt(from)}`;
    return `Through ${fmt(to)}`;
  }, [from, to]);

  const groups = useMemo(() => {
    const map = new Map<string, { date: Date; entries: AuditLogEntry[] }>();
    for (const log of logs) {
      const date = new Date(log.createdAt);
      const key = toInputDate(date);
      if (!map.has(key)) map.set(key, { date, entries: [] });
      map.get(key)!.entries.push(log);
    }
    return Array.from(map.entries()).map(([key, value]) => ({ key, ...value }));
  }, [logs]);

  return (
    <div className="mx-auto w-full max-w-[1320px]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Audit Log</h1>
          <p className="text-sm text-gray-500">Recent admin actions across users and tasks.</p>
          <p className="text-xs text-gray-400">Refreshes automatically every 15 seconds.</p>
        </div>
        <button className="btn-secondary" disabled={loading || refreshing} onClick={() => load(false, { from, to })}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="card mb-6 space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase text-gray-400">Filter by date</p>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activePreset === p.key
                    ? 'border-brand bg-brand text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-gray-400" htmlFor="audit-from">
              From
            </label>
            <input
              id="audit-from"
              type="date"
              className="input"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
                setActivePreset('custom');
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-gray-400" htmlFor="audit-to">
              To
            </label>
            <input
              id="audit-to"
              type="date"
              className="input"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
                setActivePreset('custom');
              }}
            />
          </div>
          {hasFilters && (
            <button type="button" className="btn-secondary" onClick={clearFilters}>
              Clear filters
            </button>
          )}

          <div className="ml-auto text-sm text-gray-500">
            {!loading && (
              <>
                <span className="font-medium text-gray-700">{logs.length}</span> {logs.length === 1 ? 'entry' : 'entries'}
                {rangeLabel && <span> · {rangeLabel}</span>}
              </>
            )}
          </div>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-status-flagged">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-gray-500">The audit log could not be loaded right now.</p>
      ) : logs.length === 0 ? (
        <div className="card text-center">
          <p className="text-sm text-gray-500">
            {hasFilters ? 'No audit entries match this date range.' : 'No audit entries yet.'}
          </p>
          {hasFilters && (
            <button type="button" className="btn-secondary mt-3" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="sticky top-0 z-10 mb-3 flex items-center gap-3 bg-gray-50 py-2">
                <h2 className="text-sm font-semibold text-gray-700">{dayLabel(group.key, group.date)}</h2>
                <span className="text-xs text-gray-400">
                  {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="space-y-4 border-l-2 border-gray-100 pl-5 sm:pl-6">
                {group.entries.map((log) => {
                  const changes = Object.entries(log.changes || {});
                  const metadataEntries = Object.entries(log.metadata || {}).filter(
                    ([, value]) => value !== null && value !== undefined && value !== ''
                  );

                  return (
                    <div key={log.id} className="relative">
                      <span
                        className={`absolute -left-[27px] top-6 h-3 w-3 rounded-full ring-4 ring-gray-50 sm:-left-[31px] ${
                          ACTION_DOT[actionVerb(log.action)] || 'bg-gray-400'
                        }`}
                      />
                      <div className="card space-y-5">
                        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
                          <div className="min-w-0 space-y-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="break-words text-lg font-semibold leading-tight text-gray-900">{log.summary}</p>
                                <div className="xl:hidden">
                                  <ActionBadge action={log.action} />
                                </div>
                              </div>
                              <p className="mt-2 text-sm text-gray-500">
                                {log.actor.name} ({formatLabel(log.actor.role)}) · {new Date(log.createdAt).toLocaleString()}
                              </p>
                            </div>

                            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:max-w-2xl">
                              <div>
                                <p className="text-xs font-medium uppercase text-gray-400">Target</p>
                                <p className="break-words text-gray-900">{log.targetLabel || log.targetId}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium uppercase text-gray-400">Type</p>
                                <p className="capitalize text-gray-900">{log.targetType}</p>
                              </div>
                            </div>

                            {metadataEntries.length > 0 && (
                              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:max-w-2xl">
                                {metadataEntries.slice(0, 4).map(([key, value]) => (
                                  <div key={key}>
                                    <p className="text-xs font-medium uppercase text-gray-400">{formatLabel(key)}</p>
                                    <p className="break-words text-gray-900">{formatValue(value)}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Event</p>
                            <div className="mt-1.5">
                              <ActionBadge action={log.action} />
                            </div>

                            <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Actor</p>
                            <p className="mt-1 text-sm text-gray-700">{log.actor.name}</p>

                            <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Time</p>
                            <p className="mt-1 text-sm text-gray-700">{new Date(log.createdAt).toLocaleString()}</p>
                          </div>
                        </div>

                        {changes.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-medium uppercase text-gray-400">Field changes</p>
                            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                              <table className="tracker w-full">
                                <thead>
                                  <tr>
                                    <th>Field</th>
                                    <th>Before</th>
                                    <th>After</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {changes.map(([field, change]) => (
                                    <tr key={field}>
                                      <td data-label="Field" className="break-words">{field}</td>
                                      <td data-label="Before" className="break-words">{formatValue(change.before)}</td>
                                      <td data-label="After" className="break-words">{formatValue(change.after)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {logs.length === 100 && (
            <p className="text-center text-xs text-gray-400">
              Showing the most recent 100 entries — narrow the date range to see more.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
