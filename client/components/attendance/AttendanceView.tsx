'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import SummaryBar from '@/components/SummaryBar';
import type { Role } from '@/lib/types';

interface AttendanceRow {
  employee: { id: string; name: string; jobTitle: string; role: Role };
  checkedIn: boolean;
  loginAt: string | null;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  locationStatus: string | null;
}

const LOCATION_STATUS_LABELS: Record<string, string> = {
  denied: 'Location permission denied',
  unsupported: "Device doesn't support location",
  unavailable: 'Location not yet available',
  error: 'Could not determine location',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function LocationCell({ row }: { row: AttendanceRow }) {
  if (row.lat !== null && row.lng !== null) {
    return (
      <a
        href={`https://www.google.com/maps?q=${row.lat},${row.lng}`}
        target="_blank"
        rel="noreferrer"
        className="text-brand hover:underline"
        title={row.accuracy ? `Accurate to ~${Math.round(row.accuracy)}m` : undefined}
      >
        <i className="fa-solid fa-location-dot mr-1" />
        View on map
      </a>
    );
  }
  if (!row.checkedIn) return <span className="text-gray-400">—</span>;
  return <span className="text-xs text-gray-400">{LOCATION_STATUS_LABELS[row.locationStatus || ''] || 'No location'}</span>;
}

export default function AttendanceView() {
  const { refresh } = useAuth();
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.get<{ date: string; rows: AttendanceRow[] }>('/api/attendance/today');
      setRows(data.rows);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await refresh();
      } else {
        setError(err instanceof ApiError ? err.message : 'Failed to load attendance');
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  const filteredRows = useMemo(
    () => rows.filter((r) => r.employee.name.toLowerCase().includes(nameFilter.trim().toLowerCase())),
    [rows, nameFilter]
  );

  const stats = useMemo(
    () => [
      { label: 'Team members', value: filteredRows.length, color: 'bg-gray-400' },
      { label: 'Logged in today', value: filteredRows.filter((r) => r.checkedIn).length, color: 'bg-status-completed' },
      { label: 'Not logged in yet', value: filteredRows.filter((r) => !r.checkedIn).length, color: 'bg-status-flagged' },
    ],
    [filteredRows]
  );

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Who has logged in today, at what time, and from where — captured automatically once per day when
            someone opens the app.
          </p>
        </div>
        <input
          className="input w-full sm:w-64"
          placeholder="Search employees…"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
        />
      </div>

      {!loading && <SummaryBar stats={stats} />}
      {error && <p className="mb-4 text-sm text-status-flagged">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : filteredRows.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No employees match &ldquo;{nameFilter}&rdquo;.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
          <table className="tracker w-full">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Status</th>
                <th>Login time</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.employee.id} className={!r.checkedIn ? 'bg-status-flagged/10' : undefined}>
                  <td data-label="Employee">
                    <p className="font-medium">{r.employee.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{r.employee.jobTitle || r.employee.role}</p>
                  </td>
                  <td data-label="Status">
                    <span
                      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none sm:text-xs ${
                        r.checkedIn
                          ? 'border-status-completed bg-status-completed/15 text-green-800 dark:border-status-completed/50 dark:bg-status-completed/20 dark:text-green-300'
                          : 'border-status-flagged bg-status-flagged/15 text-red-800 dark:border-status-flagged/50 dark:bg-status-flagged/20 dark:text-red-300'
                      }`}
                    >
                      {r.checkedIn ? 'Logged in' : 'Not logged in'}
                    </span>
                  </td>
                  <td data-label="Login time">{r.loginAt ? formatTime(r.loginAt) : <span className="text-gray-400">—</span>}</td>
                  <td data-label="Location">
                    <LocationCell row={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
