'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import RoleGuard from '@/components/RoleGuard';
import type { DashboardRow } from '@/lib/types';

interface DashboardResponse {
  month: number;
  year: number;
  rows: DashboardRow[];
}

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-status-completed' : pct >= 50 ? 'bg-status-progress' : 'bg-status-flagged';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-300">{pct}%</span>
    </div>
  );
}

export default function MonthlyReviewPage() {
  const { refresh } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [nameFilter, setNameFilter] = useState('');
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get<DashboardResponse>(`/api/dashboard?month=${month}&year=${year}`)
      .then((data) => setRows(data.rows))
      .catch(async (err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          await refresh();
        } else {
          setError(err instanceof ApiError ? err.message : 'Failed to load employees');
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const filteredRows = useMemo(() => {
    const q = nameFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.employee.name.toLowerCase().includes(q) || row.employee.jobTitle.toLowerCase().includes(q));
  }, [rows, nameFilter]);

  return (
    <RoleGuard role="super_admin">
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Monthly Review</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Every employee&apos;s month at a glance — flagged and in-progress work included, not just what&apos;s Done.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleString(undefined, { month: 'long' })}
                </option>
              ))}
            </select>
            <input type="number" className="input w-full sm:w-24" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
        </div>

        <div className="mb-4">
          <input
            className="input max-w-sm"
            placeholder="Filter by name or job title…"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
        </div>

        {error && <p className="mb-4 text-sm text-status-flagged">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {nameFilter ? `No employees match "${nameFilter}".` : 'No employees found.'}
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
            <table className="tracker w-full">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Assigned</th>
                  <th>Completed</th>
                  <th>On progress</th>
                  <th>Flagged</th>
                  <th>Progress</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.employee.id}>
                    <td data-label="Employee">{row.employee.name}</td>
                    <td data-label="Role">{row.employee.jobTitle}</td>
                    <td data-label="Assigned">{row.assignedDays}</td>
                    <td data-label="Completed">{row.completed}</td>
                    <td data-label="On progress">{row.onProgress}</td>
                    <td data-label="Flagged">{row.flags}</td>
                    <td data-label="Progress">
                      <ProgressBar pct={row.progressPct} />
                    </td>
                    <td data-label="Actions">
                      <Link
                        href={`/admin/employees/${row.employee.id}?month=${month}&year=${year}&targetRole=employee`}
                        className="btn-secondary"
                      >
                        View month
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
