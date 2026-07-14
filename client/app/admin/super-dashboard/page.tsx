'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import RoleGuard from '@/components/RoleGuard';
import type { SuperAdminDashboardResponse, SuperAdminEmployeeWatchRow, SuperAdminRow } from '@/lib/types';

function formatWhen(value?: string | null) {
  if (!value) return 'No activity yet';
  return new Date(value).toLocaleString();
}

function attentionStyles(state: SuperAdminRow['attentionState']) {
  switch (state) {
    case 'active':
      return {
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200',
        ring: 'border-emerald-200/80 dark:border-emerald-400/20',
        label: 'Active now',
      };
    case 'watch':
      return {
        badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200',
        ring: 'border-amber-200/80 dark:border-amber-400/20',
        label: 'Moderate',
      };
    case 'disabled':
      return {
        badge: 'border-gray-200 bg-gray-100 text-gray-600 dark:border-white/10 dark:bg-white/10 dark:text-gray-300',
        ring: 'border-gray-200 dark:border-white/10',
        label: 'Disabled',
      };
    default:
      return {
        badge: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200',
        ring: 'border-rose-200/80 dark:border-rose-400/20',
        label: 'Needs follow-up',
      };
  }
}

function MetricCard({
  title,
  value,
  hint,
  icon,
  tone,
}: {
  title: string;
  value: number;
  hint: string;
  icon: string;
  tone: 'brand' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';
}) {
  const toneClasses = {
    brand: 'from-brand/15 to-brand-light/10 text-brand dark:text-brand-light',
    emerald: 'from-emerald-500/15 to-emerald-300/10 text-emerald-700 dark:text-emerald-200',
    amber: 'from-amber-500/15 to-amber-300/10 text-amber-700 dark:text-amber-200',
    rose: 'from-rose-500/15 to-rose-300/10 text-rose-700 dark:text-rose-200',
    sky: 'from-sky-500/15 to-sky-300/10 text-sky-700 dark:text-sky-200',
    violet: 'from-violet-500/15 to-violet-300/10 text-violet-700 dark:text-violet-200',
  } as const;

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-ink-light">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{hint}</p>
        </div>
        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClasses[tone]}`}>
          <i className={`${icon} text-lg`} />
        </div>
      </div>
    </div>
  );
}

function AdminOversightCard({ row }: { row: SuperAdminRow }) {
  const tone = attentionStyles(row.attentionState);

  return (
    <div className={`rounded-3xl border bg-white p-5 shadow-sm dark:bg-ink-light ${tone.ring}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{row.admin.name}</h3>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${tone.badge}`}>{tone.label}</span>
            <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500 dark:border-white/10 dark:text-gray-300">
              {row.admin.role.replaceAll('_', ' ')}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {row.admin.jobTitle || 'No title set'} · {row.admin.email}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl bg-gray-50 px-3 py-3 dark:bg-white/5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Today</p>
            <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{row.reviewsToday}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-3 py-3 dark:bg-white/5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Reviews</p>
            <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{row.reviewsThisMonth}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-3 py-3 dark:bg-white/5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Assigned</p>
            <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{row.assignmentsThisMonth}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-3 py-3 dark:bg-white/5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Approved</p>
            <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{row.approvalsThisMonth}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-3 py-3 dark:bg-white/5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Score</p>
            <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{row.activityScore}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm dark:border-white/10 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-1">
          <p className="text-gray-600 dark:text-gray-300">
            <span className="font-medium text-gray-900 dark:text-white">Last action:</span> {row.lastActionSummary || 'No recent action'}
          </p>
          <p className="text-gray-500 dark:text-gray-400">{formatWhen(row.lastActionAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/users" className="btn-secondary">
            <i className="fa-solid fa-user-gear text-xs" />
            Manage users
          </Link>
          <Link href="/admin/audit" className="btn-secondary">
            <i className="fa-solid fa-clock-rotate-left text-xs" />
            Open audit
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmployeeAttentionRow({ row }: { row: SuperAdminEmployeeWatchRow }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{row.employee.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{row.employee.jobTitle || 'Employee'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Progress</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{row.progressPct}%</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
          Pending: {row.pendingCount}
        </span>
        <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
          Flagged: {row.flaggedCount}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-gray-300">
          Incomplete: {row.incompleteCount}
        </span>
        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-200">
          Tasks: {row.taskCount}
        </span>
      </div>

      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Last update: {formatWhen(row.lastUpdateAt)}</p>
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  const { refresh } = useAuth();
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<SuperAdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await api.get<SuperAdminDashboardResponse>(`/api/admin/super-dashboard?month=${month}&year=${year}`);
        if (!cancelled) setData(response);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          await refresh();
        }
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load super admin dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [month, year, refresh]);

  return (
    <RoleGuard role="super_admin">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-gray-200 bg-[radial-gradient(circle_at_top_left,#fff2e6,transparent_30%),linear-gradient(135deg,#ffffff_0%,#fff8f3_40%,#fff1e5_100%)] p-6 shadow-sm dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,rgba(242,112,28,0.24),transparent_25%),linear-gradient(135deg,#151210_0%,#1d1612_45%,#15110f_100%)] md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-brand dark:border-brand-light/20 dark:bg-brand/15 dark:text-brand-light">
                <i className="fa-solid fa-shield-halved" />
                Super Admin Oversight
              </div>
              <h1 className="mt-5 text-3xl font-semibold text-gray-900 dark:text-white md:text-5xl">
                Monitor the platform, admins, and team delivery from one control center.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300">
                This panel is separate from the normal admin dashboard. Use it to check whether admins are reviewing work on time, watch pending approvals, and spot employees who need attention.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select className="input min-w-[11rem]" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1, 1).toLocaleString(undefined, { month: 'long' })}
                  </option>
                ))}
              </select>
              <input type="number" className="input w-28" value={year} onChange={(e) => setYear(Number(e.target.value))} />
              <Link href="/admin/users" className="btn-primary">
                <i className="fa-solid fa-users-gear text-xs" />
                User control
              </Link>
              <Link href="/admin/audit" className="btn-secondary">
                <i className="fa-solid fa-timeline text-xs" />
                Audit log
              </Link>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        )}

        {loading || !data ? (
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-10 text-sm text-gray-500 shadow-sm dark:border-white/10 dark:bg-ink-light dark:text-gray-400">
            Loading super admin dashboard...
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <MetricCard title="Active Users" value={data.platform.activeUsers} hint={`${data.platform.totalUsers} total accounts`} icon="fa-solid fa-users" tone="brand" />
              <MetricCard title="Pending Approvals" value={data.platform.pendingUsers} hint="Accounts waiting for activation" icon="fa-solid fa-user-clock" tone="amber" />
              <MetricCard title="Admin Reviews" value={data.platform.reviewsThisMonth} hint="Task reviews completed this month" icon="fa-solid fa-clipboard-check" tone="emerald" />
              <MetricCard title="Pending Reviews" value={data.platform.pendingReviewThisMonth} hint="Tasks still waiting for admin verdict" icon="fa-solid fa-hourglass-half" tone="sky" />
              <MetricCard title="Flagged Work" value={data.platform.flaggedThisMonth} hint="Flagged tasks in the selected month" icon="fa-solid fa-flag" tone="rose" />
              <MetricCard title="Active Clients" value={data.platform.activeClients} hint={`${data.platform.archivedClients} archived client spaces`} icon="fa-solid fa-layer-group" tone="violet" />
            </section>

            <section className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-ink-light md:p-6">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">Admin Oversight</p>
                  <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">Are admins actually checking work?</h2>
                </div>
                <p className="max-w-xl text-sm text-gray-500 dark:text-gray-400">
                  Review volume, assignments, approvals, and the latest action history for every admin-level account.
                </p>
              </div>

              <div className="space-y-4">
                {data.adminRows.map((row) => (
                  <AdminOversightCard key={row.admin.id} row={row} />
                ))}
              </div>
            </section>

            <section className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-ink-light md:p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">Employee Attention</p>
                    <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">Employees who need admin follow-up</h2>
                  </div>
                  <Link href="/admin/today" className="text-sm font-medium text-brand hover:underline">
                    Open today&apos;s tasks
                  </Link>
                </div>

                <div className="mt-5 space-y-4">
                  {data.employeeWatch.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
                      No employee watch items for this month. Admin review looks clean right now.
                    </div>
                  ) : (
                    data.employeeWatch.map((row) => <EmployeeAttentionRow key={row.employee.id} row={row} />)
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-ink-light md:p-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">Recent Oversight Activity</p>
                  <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">Latest admin and super admin actions</h2>
                </div>

                <div className="mt-5 space-y-3">
                  {data.recentActions.map((log) => (
                    <div key={log.id} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">{log.actor.name}</p>
                        <span className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:border-white/10 dark:text-gray-400">
                          {log.actor.role.replaceAll('_', ' ')}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{log.summary}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">{formatWhen(log.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
