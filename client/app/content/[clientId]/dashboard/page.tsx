'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useClientCalendar } from '@/lib/ClientCalendarContext';
import { CONTENT_STATUSES, PLATFORMS, type ContentEntry, type ContentStatus, type Platform } from '@/lib/content-types';

// Ordinal sequential ramp (blue, light→dark) for the 7 ordered content stages — see the
// dataviz skill's palette reference. Reused as-is across themes: these mid-tone blues read
// fine on both the light card surface and the dark ink-light surface.
const STATUS_RAMP: Record<ContentStatus, string> = {
  Idea: '#86b6ef',
  Draft: '#6da7ec',
  Designing: '#5598e7',
  Review: '#3987e5',
  Approved: '#2a78d6',
  Scheduled: '#256abf',
  Published: '#1c5cab',
};

// Categorical palette slots 1-5 (fixed order, light/dark pair) for the 5 platforms.
const PLATFORM_COLORS: Record<Platform, { light: string; dark: string }> = {
  Instagram: { light: '#2a78d6', dark: '#3987e5' },
  Facebook: { light: '#1baf7a', dark: '#199e70' },
  LinkedIn: { light: '#eda100', dark: '#c98500' },
  YouTube: { light: '#008300', dark: '#008300' },
  X: { light: '#4a3aa7', dark: '#9085e9' },
};

function StatTile({ label, value, icon, colorClass }: { label: string; value: number; icon: string; colorClass: string }) {
  return (
    <div className="card flex items-center gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${colorClass}`}>
        <i className={icon} />
      </span>
      <div>
        <p className="text-xl font-semibold leading-none">{value}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function BreakdownBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.round((count / max) * 100);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 shrink-0 truncate text-gray-600 dark:text-gray-300">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-6 shrink-0 text-right text-xs text-gray-500 dark:text-gray-400">{count}</span>
    </div>
  );
}

function summarizeChange(entry: ContentEntry) {
  const last = entry.history[entry.history.length - 1];
  if (!last) return 'Created';
  return `${last.field.replace(/_/g, ' ')} → ${String(last.after ?? '—')}`;
}

export default function ClientDashboardPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const { client } = useClientCalendar();

  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await api.get<{ entries: ContentEntry[] }>(`/api/content/clients/${clientId}/entries`);
        if (!cancelled) setEntries(data.entries);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load dashboard data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const stats = useMemo(() => {
    const now = new Date();
    const total = entries.length;
    const published = entries.filter((e) => e.status === 'Published').length;
    const scheduled = entries.filter((e) => e.status === 'Scheduled').length;
    const pendingReview = entries.filter((e) => e.status === 'Review').length;
    const overdue = entries.filter((e) => new Date(e.date) < now && !['Scheduled', 'Published'].includes(e.status)).length;
    return { total, published, scheduled, pendingReview, overdue };
  }, [entries]);

  const statusCounts = useMemo(() => {
    const map = new Map<ContentStatus, number>();
    for (const s of CONTENT_STATUSES) map.set(s, 0);
    for (const e of entries) map.set(e.status, (map.get(e.status) || 0) + 1);
    return map;
  }, [entries]);

  const platformCounts = useMemo(() => {
    const map = new Map<Platform, number>();
    for (const p of PLATFORMS) map.set(p, 0);
    for (const e of entries) map.set(e.platform, (map.get(e.platform) || 0) + 1);
    return map;
  }, [entries]);

  const maxStatus = Math.max(1, ...Array.from(statusCounts.values()));
  const maxPlatform = Math.max(1, ...Array.from(platformCounts.values()));

  const recentActivity = useMemo(
    () => [...entries].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6),
    [entries]
  );

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading dashboard…</p>;
  if (error) return <p className="text-sm text-status-flagged">{error}</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="This month" value={stats.total} icon="fa-solid fa-note-sticky" colorClass="bg-brand/10 text-brand" />
        <StatTile label="Published" value={stats.published} icon="fa-solid fa-circle-check" colorClass="bg-[#0ca30c]/10 text-[#0ca30c]" />
        <StatTile label="Scheduled" value={stats.scheduled} icon="fa-solid fa-clock" colorClass="bg-[#2a78d6]/10 text-[#2a78d6] dark:text-[#3987e5]" />
        <StatTile
          label="Pending review"
          value={stats.pendingReview}
          icon="fa-solid fa-hourglass-half"
          colorClass="bg-[#fab219]/10 text-amber-600 dark:text-[#fab219]"
        />
        <StatTile label="Overdue" value={stats.overdue} icon="fa-solid fa-triangle-exclamation" colorClass="bg-[#d03b3b]/10 text-[#d03b3b]" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card space-y-2.5">
          <p className="mb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Content by stage</p>
          {CONTENT_STATUSES.map((s) => (
            <BreakdownBar key={s} label={s} count={statusCounts.get(s) || 0} max={maxStatus} color={STATUS_RAMP[s]} />
          ))}
        </div>
        <div className="card space-y-2.5">
          <p className="mb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Content by platform</p>
          {PLATFORMS.map((p) => (
            <BreakdownBar
              key={p}
              label={p}
              count={platformCounts.get(p) || 0}
              max={maxPlatform}
              color={PLATFORM_COLORS[p].light}
            />
          ))}
        </div>
      </div>

      <div className="card">
        <p className="mb-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Recent activity</p>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No activity yet this month.</p>
        ) : (
          <ul className="space-y-2">
            {recentActivity.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={`/content/${clientId}/table`} className="min-w-0 flex-1 truncate hover:text-brand">
                  {e.idea || `${e.format} · ${e.platform}`}
                </Link>
                <span className="shrink-0 text-xs text-gray-400">{summarizeChange(e)}</span>
                <span className="shrink-0 text-xs text-gray-400">{new Date(e.updatedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {client.myRole === 'owner' && stats.pendingReview > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <i className="fa-solid fa-hourglass-half mr-2" />
          {stats.pendingReview} {stats.pendingReview === 1 ? 'post needs' : 'posts need'} your review.{' '}
          <Link href={`/content/${clientId}/table`} className="underline">
            Review now
          </Link>
        </div>
      )}
    </div>
  );
}
