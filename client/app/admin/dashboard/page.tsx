'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import type { DashboardRow } from '@/lib/types';

interface DashboardResponse {
  month: number;
  year: number;
  rows: DashboardRow[];
  team: Omit<DashboardRow, 'employee'>;
}

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-status-completed' : pct >= 50 ? 'bg-status-progress' : 'bg-status-flagged';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-300">{pct}%</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { refresh } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get<DashboardResponse>(`/api/dashboard?month=${month}&year=${year}`)
      .then(setData)
      .catch(async (err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          await refresh();
        } else {
          setError(err instanceof ApiError ? err.message : 'Failed to load dashboard');
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">Progress Dashboard</h1>
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

      {error && <p className="mb-4 text-sm text-status-flagged">{error}</p>}

      {loading || !data ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
          <table className="tracker w-full">
            <thead>
              <tr>
                <th>Team member</th>
                <th>Role</th>
                <th>Assigned</th>
                <th>Completed</th>
                <th>On progress</th>
                <th>Incomplete</th>
                <th>Flags</th>
                <th>Progress</th>
              </tr>
            </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.employee.id}>
                    <td data-label="Team member">
                      <Link
                        href={`/admin/employees/${row.employee.id}?month=${month}&year=${year}`}
                        className="text-brand hover:underline"
                    >
                        {row.employee.name}
                      </Link>
                    </td>
                    <td data-label="Role">{row.employee.jobTitle}</td>
                    <td data-label="Assigned">{row.assignedDays}</td>
                    <td data-label="Completed">{row.completed}</td>
                    <td data-label="On progress">{row.onProgress}</td>
                    <td data-label="Incomplete">{row.incomplete}</td>
                    <td data-label="Flags">{row.flags}</td>
                    <td data-label="Progress">
                      <ProgressBar pct={row.progressPct} />
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-medium dark:bg-white/5">
                  <td data-label="Team member">TEAM TOTAL</td>
                  <td data-label="Role"></td>
                  <td data-label="Assigned">{data.team.assignedDays}</td>
                  <td data-label="Completed">{data.team.completed}</td>
                  <td data-label="On progress">{data.team.onProgress}</td>
                  <td data-label="Incomplete">{data.team.incomplete}</td>
                  <td data-label="Flags">{data.team.flags}</td>
                  <td data-label="Progress">
                    <ProgressBar pct={data.team.progressPct} />
                  </td>
                </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
