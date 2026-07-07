'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError, downloadUrl } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import SummaryBar from '@/components/SummaryBar';

interface ReportRow {
  employee: { id: string; name: string; jobTitle: string };
  assignedDays: number;
  completed: number;
  onProgress: number;
  incomplete: number;
  flags: number;
  progressPct: number;
  integrity: string;
}

interface ReportResponse {
  month: number;
  year: number;
  rows: ReportRow[];
  team: Omit<ReportRow, 'employee' | 'integrity'> & { flags: number };
}

interface Tier {
  key: string;
  label: string;
  min: number;
  fill: string;
  track: string;
  dot: string;
}

const TIERS: Tier[] = [
  { key: 'healthy', label: 'Healthy (≥80%)', min: 80, fill: 'bg-status-completed', track: 'bg-status-completed/15', dot: 'bg-status-completed' },
  { key: 'onTrack', label: 'On track (50–79%)', min: 50, fill: 'bg-status-progress', track: 'bg-status-progress/15', dot: 'bg-status-progress' },
  { key: 'attention', label: 'Needs attention (<50%)', min: 0, fill: 'bg-status-flagged', track: 'bg-status-flagged/15', dot: 'bg-status-flagged' },
];

function tierFor(pct: number): Tier {
  return TIERS.find((t) => pct >= t.min) ?? TIERS[TIERS.length - 1];
}

function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {TIERS.map((t) => (
        <span key={t.key} className="inline-flex items-center gap-1.5 text-xs text-gray-500">
          <span className={`h-2 w-2 shrink-0 rounded-full ${t.dot}`} />
          {t.label}
        </span>
      ))}
    </div>
  );
}

function ProgressBar({
  label,
  pct,
  detail,
  compact,
}: {
  label: string;
  pct: number;
  detail?: string;
  compact?: boolean;
}) {
  const tier = tierFor(pct);
  const width = Math.max(0, Math.min(pct, 100));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        {!compact && (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{label}</p>
            {detail && <p className="text-xs text-gray-500">{detail}</p>}
          </div>
        )}
        <p className="text-sm font-semibold text-gray-700">{pct}%</p>
      </div>
      <div className={`h-2.5 overflow-hidden rounded-full ${tier.track}`}>
        <div className={`h-full rounded-full ${tier.fill}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

const AXIS_TICKS = [100, 75, 50, 25, 0];

function ProgressGraph({ rows }: { rows: ReportRow[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="card">
      <div className="mb-1">
        <h2 className="text-base font-semibold">Progress Graph</h2>
        <p className="text-sm text-gray-500">Each bar is calculated from the admin&apos;s verified task status.</p>
      </div>
      <div className="mb-5">
        <StatusLegend />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        <div className="flex h-56 shrink-0 flex-col justify-between text-right text-[11px] leading-none text-gray-400">
          {AXIS_TICKS.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>

        <div className="flex-1">
          <div className="relative h-56 border-l border-gray-200">
            {AXIS_TICKS.map((t) => (
              <div key={t} className="absolute inset-x-0 border-t border-gray-100" style={{ bottom: `${t}%` }} />
            ))}

            <div className="relative flex h-full items-end gap-5 pl-4">
              {rows.map((row) => {
                const tier = tierFor(row.progressPct);
                const pct = Math.min(Math.max(row.progressPct, 0), 100);
                const isActive = hovered === row.employee.id;

                return (
                  <button
                    key={row.employee.id}
                    type="button"
                    className="relative flex h-full min-w-[56px] flex-1 items-end justify-center"
                    onMouseEnter={() => setHovered(row.employee.id)}
                    onMouseLeave={() => setHovered((cur) => (cur === row.employee.id ? null : cur))}
                    onFocus={() => setHovered(row.employee.id)}
                    onBlur={() => setHovered((cur) => (cur === row.employee.id ? null : cur))}
                  >
                    {isActive && (
                      <div className="absolute bottom-full z-10 mb-3 w-44 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-lg">
                        <p className="truncate text-xs font-semibold text-gray-900">{row.employee.name}</p>
                        <p className="mb-2 mt-0.5 text-[11px] text-gray-500">{row.progressPct}% overall</p>
                        <dl className="space-y-1 text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <dt className="text-gray-500">Completed</dt>
                            <dd className="font-medium text-gray-900">{row.completed}</dd>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <dt className="text-gray-500">On progress</dt>
                            <dd className="font-medium text-gray-900">{row.onProgress}</dd>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <dt className="text-gray-500">Incomplete</dt>
                            <dd className="font-medium text-gray-900">{row.incomplete}</dd>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <dt className="text-gray-500">Flagged</dt>
                            <dd className="font-medium text-gray-900">{row.flags}</dd>
                          </div>
                        </dl>
                      </div>
                    )}

                    <span
                      className="absolute whitespace-nowrap text-[11px] font-medium text-gray-700"
                      style={{ bottom: `calc(${pct}% + 6px)` }}
                    >
                      {row.progressPct}%
                    </span>

                    <div
                      className={`w-5 rounded-t-[4px] ${tier.fill} ${isActive ? 'brightness-110' : ''}`}
                      style={{ height: pct === 0 ? '2px' : `${pct}%` }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-5 pl-4 pt-2">
            {rows.map((row) => (
              <p key={row.employee.id} className="min-w-[56px] flex-1 truncate text-center text-xs font-medium text-gray-700">
                {row.employee.name}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { refresh } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get<ReportResponse>(`/api/reports/monthly?month=${month}&year=${year}`)
      .then(setData)
      .catch(async (err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          await refresh();
        } else {
          setError(err instanceof ApiError ? err.message : 'Failed to load report');
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const summaryStats = useMemo(
    () =>
      data
        ? [
            { label: 'Assigned', value: data.team.assignedDays, color: 'bg-gray-400' },
            { label: 'Completed', value: data.team.completed, color: 'bg-status-completed' },
            { label: 'On progress', value: data.team.onProgress, color: 'bg-status-progress' },
            { label: 'Incomplete', value: data.team.incomplete, color: 'bg-gray-400' },
            { label: 'Flagged', value: data.team.flags, color: 'bg-status-flagged' },
            { label: 'Team progress %', value: Math.round(data.team.progressPct), color: 'bg-brand' },
          ]
        : [],
    [data]
  );

  const teamIntegrity = data && data.team.flags > 0 ? `${data.team.flags} flag(s)` : 'All clear';

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Reports</h1>
          <p className="text-sm text-gray-500">Progress graph and progress bars based on admin task status.</p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1, 1).toLocaleString(undefined, { month: 'long' })}
              </option>
            ))}
          </select>
          <input type="number" className="input w-full sm:w-24" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          <a
            className="btn-primary w-full sm:w-auto"
            href={downloadUrl(`/api/reports/monthly/download?month=${month}&year=${year}`)}
          >
            Download report (.xlsx)
          </a>
          <a
            className="btn-secondary w-full sm:w-auto"
            href={downloadUrl(`/api/reports/monthly/download-pdf?month=${month}&year=${year}`)}
          >
            Download report (.pdf)
          </a>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-status-flagged">{error}</p>}

      {loading || !data ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          <SummaryBar stats={summaryStats} />

          <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <ProgressGraph rows={data.rows} />

            <div className="card">
              <div className="mb-4">
                <h2 className="text-base font-semibold">Progress Bars</h2>
                <p className="text-sm text-gray-500">These bars update when admin changes task status.</p>
              </div>

              <div className="space-y-4">
                <ProgressBar
                  label="Team overall"
                  pct={data.team.progressPct}
                  detail={`${data.team.completed} completed · ${data.team.onProgress} on progress · ${data.team.flags} flagged`}
                />

                {data.rows.map((row) => (
                  <ProgressBar
                    key={row.employee.id}
                    label={row.employee.name}
                    pct={row.progressPct}
                    detail={`${row.completed} completed · ${row.onProgress} on progress · ${row.incomplete} incomplete · ${row.flags} flagged`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
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
                  <th>Integrity</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.employee.id}>
                    <td data-label="Team member">{row.employee.name}</td>
                    <td data-label="Role">{row.employee.jobTitle}</td>
                    <td data-label="Assigned">{row.assignedDays}</td>
                    <td data-label="Completed">{row.completed}</td>
                    <td data-label="On progress">{row.onProgress}</td>
                    <td data-label="Incomplete">{row.incomplete}</td>
                    <td data-label="Flags">{row.flags}</td>
                    <td data-label="Progress" className="min-w-[200px]">
                      <ProgressBar label={row.employee.name} pct={row.progressPct} compact />
                    </td>
                    <td data-label="Integrity">{row.integrity}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-medium">
                  <td data-label="Team member">TEAM AVERAGE</td>
                  <td data-label="Role"></td>
                  <td data-label="Assigned">{data.team.assignedDays}</td>
                  <td data-label="Completed">{data.team.completed}</td>
                  <td data-label="On progress">{data.team.onProgress}</td>
                  <td data-label="Incomplete">{data.team.incomplete}</td>
                  <td data-label="Flags">{data.team.flags}</td>
                  <td data-label="Progress" className="min-w-[200px]">
                    <ProgressBar label="Team overall" pct={data.team.progressPct} compact />
                  </td>
                  <td data-label="Integrity">{teamIntegrity}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 space-y-2 text-sm text-gray-600">
            <p>Manager sign-off: ____________________</p>
            <p>HR sign-off: ____________________</p>
          </div>
        </>
      )}
    </div>
  );
}
