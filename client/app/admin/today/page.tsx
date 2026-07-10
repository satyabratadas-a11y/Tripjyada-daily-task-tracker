'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { AdminStatusBadge, MemberStatusBadge, SourceBadge } from '@/components/StatusBadge';
import SummaryBar from '@/components/SummaryBar';
import type { Task } from '@/lib/types';

interface TodayRow {
  employee: { id: string; name: string; jobTitle: string };
  tasks: Task[];
}

const ADMIN_STATUS_OPTIONS: Task['adminStatus'][] = [
  'pending',
  'completed',
  'on_progress',
  'incomplete',
  'flagged',
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatTaskDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatStatusLabel(status: Task['adminStatus']) {
  return status.replaceAll('_', ' ');
}

function AssignForm({ employeeId, date, onAssigned }: { employeeId: string; date: string; onAssigned: () => void }) {
  const [open, setOpen] = useState(false);
  const [assignedTask, setAssignedTask] = useState('');
  const [brief, setBrief] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleAssign() {
    setSaving(true);
    setError('');
    try {
      await api.post('/api/tasks', { employeeId, date, assignedTask, brief });
      setAssignedTask('');
      setBrief('');
      setOpen(false);
      onAssigned();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to assign task');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="btn-secondary w-full" onClick={() => setOpen(true)}>
        + Assign another task
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-gray-300 p-3 dark:border-white/10">
      <input
        className="input"
        placeholder="Task to assign"
        value={assignedTask}
        onChange={(e) => setAssignedTask(e.target.value)}
        autoFocus
      />
      <input
        className="input"
        placeholder="Brief / details"
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
      />
      {error && <p className="text-xs text-status-flagged">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary w-full sm:w-auto" disabled={saving || !assignedTask.trim()} onClick={handleAssign}>
          {saving ? 'Assigning…' : 'Assign'}
        </button>
        <button className="btn-secondary w-full sm:w-auto" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function TaskReviewCard({ task, onSaved }: { task: Task; onSaved: (task: Task) => void }) {
  const [assignedTask, setAssignedTask] = useState(task.assignedTask);
  const [brief, setBrief] = useState(task.brief);
  const [adminStatus, setAdminStatus] = useState(task.adminStatus);
  const [reviewerNotes, setReviewerNotes] = useState(task.reviewerNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const dirty =
    assignedTask !== task.assignedTask ||
    brief !== task.brief ||
    adminStatus !== task.adminStatus ||
    reviewerNotes !== task.reviewerNotes;

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const { task: updated } = await api.patch<{ task: Task }>(`/api/tasks/${task._id}/admin`, {
        assignedTask,
        brief,
        adminStatus,
        reviewerNotes,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`rounded-lg border p-4 ${
        adminStatus === 'flagged'
          ? 'border-status-flagged bg-status-flagged/5'
          : 'border-gray-200 bg-white dark:border-white/10 dark:bg-ink-light'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <input
            className="input mb-2 font-medium"
            value={assignedTask}
            onChange={(e) => setAssignedTask(e.target.value)}
          />
          <input
            className="input"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Brief / details"
          />
        </div>
        <SourceBadge value={task.createdBy} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium uppercase text-gray-500 dark:text-gray-400">Employee update</span>
        <MemberStatusBadge value={task.memberStatus} />
        {task.proofLink && (
          <a href={task.proofLink} target="_blank" rel="noreferrer" className="text-brand hover:underline">
            Proof link
          </a>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Admin status</span>
        <select
          className="input w-full sm:max-w-[220px]"
          value={adminStatus}
          onChange={(e) => setAdminStatus(e.target.value as Task['adminStatus'])}
        >
          {ADMIN_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {formatStatusLabel(status)}
            </option>
          ))}
        </select>
        <AdminStatusBadge value={adminStatus} />
      </div>

      <textarea
        className="input min-h-[92px]"
        placeholder="Reviewer notes / remarks"
        value={reviewerNotes}
        onChange={(e) => setReviewerNotes(e.target.value)}
      />

      {error && <p className="mt-2 text-xs text-status-flagged">{error}</p>}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          This admin status affects progress reports and graphs.
        </p>
        <button className="btn-primary w-full sm:w-auto" disabled={saving || !dirty} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function EmployeeSection({
  row,
  date,
  month,
  year,
  onTaskSaved,
  onAssigned,
}: {
  row: TodayRow;
  date: string;
  month: number;
  year: number;
  onTaskSaved: (employeeId: string, task: Task) => void;
  onAssigned: () => void;
}) {
  const completed = row.tasks.filter((task) => task.adminStatus === 'completed').length;
  const pending = row.tasks.filter((task) => task.adminStatus === 'pending').length;
  const flagged = row.tasks.filter((task) => task.adminStatus === 'flagged').length;
  const reviewHref = `/admin/employees/${row.employee.id}?month=${month}&year=${year}&date=${date}`;

  return (
    <div className="card h-full">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xl font-semibold text-brand">{row.employee.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{row.employee.jobTitle || 'Employee'}</p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 lg:text-right">
          <p>{row.tasks.length} task(s)</p>
          <Link href={reviewHref} className="mt-1 inline-block font-medium text-brand hover:underline">
            Open review
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
          Completed: {completed}
        </span>
        <span className="rounded-full border border-status-progress/40 bg-status-progress/10 px-3 py-1 text-amber-900">
          Awaiting review: {pending}
        </span>
        <span className="rounded-full border border-status-flagged/40 bg-status-flagged/10 px-3 py-1 text-red-900">
          Flagged: {flagged}
        </span>
      </div>

      <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 dark:border-white/10 dark:bg-white/5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Tasks for {formatTaskDate(date)}</p>
          {row.tasks.length > 3 && <p className="text-xs text-gray-500 dark:text-gray-400">Scroll to review all tasks</p>}
        </div>

        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
          {row.tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500 dark:border-white/10 dark:bg-ink-light dark:text-gray-400">
              No tasks yet for this date.
            </div>
          ) : (
            row.tasks.map((task) => (
              <TaskReviewCard
                key={task._id}
                task={task}
                onSaved={(updated) => onTaskSaved(row.employee.id, updated)}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-4">
        <AssignForm employeeId={row.employee.id} date={date} onAssigned={onAssigned} />
      </div>
    </div>
  );
}

export default function AdminTodayPage() {
  const { refresh } = useAuth();
  const [date, setDate] = useState(todayStr());
  const [nameFilter, setNameFilter] = useState('');
  const [rows, setRows] = useState<TodayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ rows: TodayRow[] }>(`/api/tasks/today?date=${date}`);
      setRows(data.rows);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await refresh();
      } else {
        setError(err instanceof ApiError ? err.message : 'Failed to load');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const filteredRows = useMemo(
    () => rows.filter((row) => row.employee.name.toLowerCase().includes(nameFilter.trim().toLowerCase())),
    [rows, nameFilter]
  );

  const allTasks = useMemo(() => filteredRows.flatMap((row) => row.tasks), [filteredRows]);
  const stats = useMemo(
    () => [
      { label: 'Team members', value: filteredRows.length, color: 'bg-gray-400' },
      { label: 'Tasks', value: allTasks.length, color: 'bg-brand' },
      {
        label: 'Completed',
        value: allTasks.filter((task) => task.adminStatus === 'completed').length,
        color: 'bg-status-completed',
      },
      {
        label: 'Awaiting review',
        value: allTasks.filter((task) => task.adminStatus === 'pending').length,
        color: 'bg-status-progress',
      },
      {
        label: 'Flagged',
        value: allTasks.filter((task) => task.adminStatus === 'flagged').length,
        color: 'bg-status-flagged',
      },
    ],
    [filteredRows, allTasks]
  );

  const isToday = date === todayStr();
  const reviewMonth = Number(date.slice(5, 7));
  const reviewYear = Number(date.slice(0, 4));

  function handleTaskSaved(employeeId: string, updated: Task) {
    setRows((current) =>
      current.map((row) =>
        row.employee.id === employeeId
          ? { ...row, tasks: row.tasks.map((task) => (task._id === updated._id ? updated : task)) }
          : row
      )
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1680px]">
      <div className="mb-6 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_360px] 2xl:items-end">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Team Tasks — Live Panel</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatTaskDate(date)}
            {isToday && <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">Today</span>}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Admin status and remarks here directly affect the progress graph and progress bars in Reports.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
          <div className="w-full">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {!isToday && (
            <button className="btn-secondary w-full" onClick={() => setDate(todayStr())}>
              Jump to today
            </button>
          )}
          <div className="w-full">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Filter by name</label>
            <input
              className="input"
              placeholder="Search employees…"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {!loading && <SummaryBar stats={stats} />}
      {error && <p className="text-sm text-status-flagged">{error}</p>}
      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}

      {!loading && filteredRows.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No employees match &ldquo;{nameFilter}&rdquo;.</p>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {filteredRows.map((row) => (
          <EmployeeSection
            key={row.employee.id}
            row={row}
            date={date}
            month={reviewMonth}
            year={reviewYear}
            onTaskSaved={handleTaskSaved}
            onAssigned={load}
          />
        ))}
      </div>
    </div>
  );
}
