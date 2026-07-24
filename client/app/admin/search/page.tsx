'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { AdminStatusBadge, DayTypeCell, SourceBadge } from '@/components/StatusBadge';
import type { Task, Role } from '@/lib/types';

interface SearchResult extends Omit<Task, 'employee'> {
  employee: { id: string; name: string; jobTitle: string; role: Role };
}

const ADMIN_STATUS_OPTIONS = ['pending', 'completed', 'on_progress', 'incomplete', 'flagged'];

export default function AdminTaskSearchPage() {
  const { refresh } = useAuth();
  const [q, setQ] = useState('');
  const [adminStatus, setAdminStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams();
      if (q.trim()) query.set('q', q.trim());
      if (adminStatus) query.set('adminStatus', adminStatus);
      if (from) query.set('from', from);
      if (to) query.set('to', to);
      const data = await api.get<{ tasks: SearchResult[] }>(`/api/tasks/search?${query.toString()}`);
      setResults(data.tasks);
      setSearched(true);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await refresh();
      } else {
        setError(err instanceof ApiError ? err.message : 'Search failed');
      }
    } finally {
      setLoading(false);
    }
  }, [q, adminStatus, from, to, refresh]);

  // An empty search (no keyword/status/date) still returns the most recent tasks across the
  // team, so landing on this page shows something useful right away.
  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch();
  }

  function clearFilters() {
    setQ('');
    setAdminStatus('');
    setFrom('');
    setTo('');
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Task Search</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Search across every visible employee&apos;s tasks by keyword, status, or date — not just one person&apos;s
          monthly log.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card mb-6 flex flex-wrap items-end gap-3">
        <div className="w-full sm:min-w-[220px] sm:flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Keyword</label>
          <input
            className="input"
            placeholder="Search assigned task or brief…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Verified status</label>
          <select className="input w-full sm:w-auto" value={adminStatus} onChange={(e) => setAdminStatus(e.target.value)}>
            <option value="">Any status</option>
            {ADMIN_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">From</label>
          <input type="date" className="input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">To</label>
          <input type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
        {(q || adminStatus || from || to) && (
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={clearFilters}>
            Clear
          </button>
        )}
      </form>

      {error && <p className="mb-4 text-sm text-status-flagged">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Searching…</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {searched ? 'No tasks match your search.' : ''}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
          <table className="tracker w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Day type</th>
                <th>Source</th>
                <th>Assigned task</th>
                <th>Verified status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {results.map((t) => {
                const day = t.date.slice(0, 10);
                return (
                  <tr key={t._id} className={t.adminStatus === 'flagged' ? 'bg-status-flagged/10' : undefined}>
                    <td data-label="Date">
                      {new Date(t.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td data-label="Employee">{t.employee.name}</td>
                    <td data-label="Day type">
                      <DayTypeCell value={t.dayType} />
                    </td>
                    <td data-label="Source">
                      <SourceBadge value={t.createdBy} />
                    </td>
                    <td data-label="Assigned task">{t.assignedTask || <span className="text-gray-400">—</span>}</td>
                    <td data-label="Verified status">
                      <AdminStatusBadge value={t.adminStatus} />
                    </td>
                    <td data-label="Actions">
                      <Link
                        href={`/admin/employees/${t.employee.id}?month=${Number(day.slice(5, 7))}&year=${Number(day.slice(0, 4))}&date=${day}&targetRole=${t.employee.role}`}
                        className="btn-secondary"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
