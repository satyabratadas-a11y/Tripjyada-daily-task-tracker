'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { AdminStatusBadge, MemberStatusBadge, DayTypeCell, SourceBadge } from '@/components/StatusBadge';
import MonthCalendar from '@/components/MonthCalendar';
import SummaryBar from '@/components/SummaryBar';
import type { Task } from '@/lib/types';

function formatTaskDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function sortTasksByDate(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

function AddTaskSection({
  date,
  label,
  hint,
  divider,
  onAdded,
}: {
  date: string;
  label: string;
  hint?: string;
  divider?: boolean;
  onAdded: (task: Task) => void;
}) {
  const [assignedTask, setAssignedTask] = useState('');
  const [brief, setBrief] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd() {
    setSaving(true);
    setError('');
    try {
      const { task } = await api.post<{ task: Task }>('/api/tasks/self', {
        date,
        assignedTask,
        brief,
        memberStatus: 'on_progress',
      });
      setAssignedTask('');
      setBrief('');
      onAdded(task);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add task');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={divider ? 'mt-4 border-t border-gray-100 pt-4 dark:border-white/10' : ''}>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</p>
        {hint && <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:min-w-[180px] sm:flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Task</label>
          <input className="input" value={assignedTask} onChange={(e) => setAssignedTask(e.target.value)} />
        </div>
        <div className="w-full sm:min-w-[180px] sm:flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Brief (optional)</label>
          <input className="input" value={brief} onChange={(e) => setBrief(e.target.value)} />
        </div>
        <button className="btn-primary w-full sm:w-auto" disabled={saving || !assignedTask} onClick={handleAdd}>
          {saving ? 'Adding…' : 'Add task'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-status-flagged">{error}</p>}
    </div>
  );
}

function OwnRow({
  task,
  selected,
  onToggleSelect,
  onSaved,
  onDeleted,
}: {
  task: Task;
  selected: boolean;
  onToggleSelect: () => void;
  onSaved: (t: Task) => void;
  onDeleted: (id: string) => void;
}) {
  const editableTitle = task.createdBy === 'employee';
  const [editing, setEditing] = useState(false);
  const [assignedTask, setAssignedTask] = useState(task.assignedTask);
  const [brief, setBrief] = useState(task.brief);
  const [proofLink, setProofLink] = useState(task.proofLink);
  const [memberStatus, setMemberStatus] = useState(task.memberStatus);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const selectValue = memberStatus === 'not_started' ? '' : memberStatus;

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const body: Record<string, string> = { proofLink, memberStatus };
      if (editableTitle) {
        body.assignedTask = assignedTask;
        body.brief = brief;
      }
      const { task: updated } = await api.patch<{ task: Task }>(`/api/tasks/${task._id}/employee`, body);
      onSaved(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/api/tasks/${task._id}`);
      onDeleted(task._id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  const dateLabel = new Date(task.date).toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });

  if (!editing) {
    const rowClass =
      task.adminStatus === 'flagged'
        ? 'bg-status-flagged/10'
        : task.dayType === 'optional_sunday'
          ? 'bg-status-sunday/30'
          : undefined;

    return (
      <tr className={rowClass}>
        <td data-label="Select">
          <input type="checkbox" checked={selected} onChange={onToggleSelect} aria-label={`Select ${task.assignedTask}`} />
        </td>
        <td data-label="Date">{dateLabel}</td>
        <td data-label="Day type">
          <DayTypeCell value={task.dayType} />
        </td>
        <td data-label="Source">
          <SourceBadge value={task.createdBy} />
        </td>
        <td data-label="Task">{task.assignedTask || <span className="text-gray-400">—</span>}</td>
        <td data-label="Brief">{task.brief || <span className="text-gray-400">—</span>}</td>
        <td data-label="Proof link">
          {task.proofLink ? (
            <a href={task.proofLink} target="_blank" rel="noreferrer" className="text-brand hover:underline">
              Link
            </a>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>
        <td data-label="My status">
          <MemberStatusBadge value={task.memberStatus} />
        </td>
        <td data-label="Verified status">
          <AdminStatusBadge value={task.adminStatus} />
        </td>
        <td data-label="Reviewer notes">
          {task.reviewerNotes ? (
            task.reviewerNotes
          ) : task.adminStatus === 'flagged' ? (
            <span className="font-medium text-status-flagged">Flagged</span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>
        <td data-label="Actions" className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setEditing(true)}>
            Update
          </button>
          {editableTitle && (
            <button className="btn-secondary text-status-flagged" disabled={deleting} onClick={handleDelete}>
              {deleting ? '…' : 'Delete'}
            </button>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={11}>
        <div className="flex flex-wrap items-end gap-2 py-2">
          {editableTitle && (
            <>
              <input className="input w-full sm:flex-1" value={assignedTask} onChange={(e) => setAssignedTask(e.target.value)} placeholder="Task" />
              <input className="input w-full sm:flex-1" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Brief" />
            </>
          )}
          <input className="input w-full sm:flex-1" value={proofLink} onChange={(e) => setProofLink(e.target.value)} placeholder="Proof link" />
          <select className="input w-full sm:w-auto" value={selectValue} onChange={(e) => setMemberStatus(e.target.value as Task['memberStatus'])}>
            <option value="" disabled>
              Select your update
            </option>
            <option value="on_progress">On Progress</option>
            <option value="done">Done</option>
            <option value="not_done">Not Done</option>
          </select>
          <button className="btn-primary w-full sm:w-auto" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn-secondary w-full sm:w-auto" onClick={() => setEditing(false)}>
            Cancel
          </button>
          {error && <p className="w-full text-xs text-status-flagged">{error}</p>}
        </div>
      </td>
    </tr>
  );
}

/**
 * Shows the current user's own monthly task log (self-added, calling /api/tasks without an
 * employeeId so the backend defaults to "my own tasks"). Used by employees and, identically, by
 * admins logging their own daily work for a super admin to review.
 */
export default function OwnLogView() {
  const { refresh } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<Task['memberStatus']>('done');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc'>('asc');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ tasks: Task[] }>(`/api/tasks?month=${month}&year=${year}`);
      setTasks(data.tasks);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await refresh();
      } else {
        setError(err instanceof ApiError ? err.message : 'Failed to load tasks');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    setSelectedDate(null);
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const filteredTasks = useMemo(() => {
    const base = selectedDate ? tasks.filter((t) => t.date.slice(0, 10) === selectedDate) : tasks;
    return [...base].sort((a, b) => {
      const compare = a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
      return dateSortOrder === 'asc' ? compare : -compare;
    });
  }, [tasks, selectedDate, dateSortOrder]);

  const stats = useMemo(
    () => [
      { label: 'Tasks', value: filteredTasks.length, color: 'bg-gray-400' },
      { label: 'Completed', value: filteredTasks.filter((t) => t.adminStatus === 'completed').length, color: 'bg-status-completed' },
      { label: 'On progress', value: filteredTasks.filter((t) => t.adminStatus === 'on_progress').length, color: 'bg-status-progress' },
      { label: 'Flagged', value: filteredTasks.filter((t) => t.adminStatus === 'flagged').length, color: 'bg-status-flagged' },
    ],
    [filteredTasks]
  );

  const flaggedTasks = filteredTasks.filter((t) => t.adminStatus === 'flagged');
  const todayKey = now.toISOString().slice(0, 10);

  function handleTaskAdded(task: Task) {
    const taskDateKey = task.date.slice(0, 10);
    const [taskYear, taskMonth] = taskDateKey.split('-').map(Number);

    if (taskYear === year && taskMonth === month) {
      setTasks((prev) => sortTasksByDate([...prev, task]));
      return;
    }

    setSelectedDate(taskDateKey);
    setMonth(taskMonth);
    setYear(taskYear);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === filteredTasks.length ? new Set() : new Set(filteredTasks.map((t) => t._id))));
  }

  async function handleBulkUpdate() {
    setBulkSaving(true);
    setBulkError('');
    try {
      const { updated, skipped } = await api.patch<{ updated: Task[]; skipped: { id: string; reason: string }[] }>(
        '/api/tasks/bulk/employee',
        { taskIds: [...selectedIds], memberStatus: bulkStatus }
      );
      const updatedById = new Map(updated.map((t) => [t._id, t]));
      setTasks((prev) => sortTasksByDate(prev.map((t) => updatedById.get(t._id) ?? t)));
      setSelectedIds(new Set());
      if (skipped.length > 0) setBulkError(`${skipped.length} task(s) could not be updated.`);
    } catch (err) {
      setBulkError(err instanceof ApiError ? err.message : 'Failed to update selected tasks');
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title">My Monthly Log</h1>
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
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Your reviewer&apos;s remarks and verified status control the progress view. Your update is `On Progress`, `Done`, or
        `Not Done`. Every task appears here on the day it was added, whatever its status — so nothing gets lost if you
        forget to mark it done.
      </p>

      {error && <p className="mb-4 text-sm text-status-flagged">{error}</p>}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <MonthCalendar month={month} year={year} tasks={tasks} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        <div className="min-w-0">
          <SummaryBar stats={stats} />
          <div className="card mb-6">
            <AddTaskSection date={todayKey} label="Task for today" onAdded={handleTaskAdded} />
            {selectedDate && (
              <AddTaskSection
                key={selectedDate}
                date={selectedDate}
                label={`Task for ${formatTaskDate(selectedDate)}`}
                hint={selectedDate !== todayKey ? 'Backfilling a day you forgot to log.' : undefined}
                divider
                onAdded={handleTaskAdded}
              />
            )}
          </div>
        </div>
      </div>

      {flaggedTasks.length > 0 && (
        <div className="mb-4 rounded-lg border border-status-flagged/40 bg-status-flagged/10 p-4 text-sm text-red-900">
          <p className="font-semibold">Flagged task alert</p>
          <p>
            {flaggedTasks.length === 1
              ? `A task was flagged for ${formatTaskDate(flaggedTasks[0].date)}.`
              : `${flaggedTasks.length} tasks in this view have been flagged.`}
          </p>
          <p>Flagged dates are highlighted red in the calendar and table.</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : filteredTasks.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {selectedDate ? 'No tasks on this day.' : 'No tasks logged this month yet.'}
        </p>
      ) : (
        <>
          {selectedIds.size > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 p-3">
              <p className="text-sm font-medium">{selectedIds.size} selected</p>
              <select
                className="input w-full sm:w-auto"
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as Task['memberStatus'])}
              >
                <option value="on_progress">On Progress</option>
                <option value="done">Done</option>
                <option value="not_done">Not Done</option>
              </select>
              <button className="btn-primary w-full sm:w-auto" disabled={bulkSaving} onClick={handleBulkUpdate}>
                {bulkSaving ? 'Updating…' : `Mark as ${bulkStatus === 'on_progress' ? 'On Progress' : bulkStatus === 'done' ? 'Done' : 'Not Done'}`}
              </button>
              <button className="btn-secondary w-full sm:w-auto" onClick={() => setSelectedIds(new Set())}>
                Clear selection
              </button>
              {bulkError && <p className="w-full text-xs text-status-flagged">{bulkError}</p>}
            </div>
          )}

          <div className="max-h-[600px] overflow-y-auto rounded-lg border border-gray-200 dark:border-white/10">
            <table className="tracker w-full">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === filteredTasks.length}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-brand"
                      onClick={() => setDateSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                      title={`Sort by date ${dateSortOrder === 'asc' ? 'descending' : 'ascending'}`}
                    >
                      Date
                      <i className={`fa-solid fa-arrow-${dateSortOrder === 'asc' ? 'up' : 'down'} text-[10px]`} />
                    </button>
                  </th>
                  <th>Day type</th>
                  <th>Source</th>
                  <th>Task</th>
                  <th>Brief</th>
                  <th>Proof link</th>
                  <th>My status</th>
                  <th>Verified status</th>
                  <th>Reviewer notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => (
                  <OwnRow
                    key={t._id}
                    task={t}
                    selected={selectedIds.has(t._id)}
                    onToggleSelect={() => toggleSelected(t._id)}
                    onSaved={(updated) =>
                      setTasks((prev) => sortTasksByDate(prev.map((x) => (x._id === updated._id ? updated : x))))
                    }
                    onDeleted={(id) => setTasks((prev) => prev.filter((x) => x._id !== id))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
