'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { AdminStatusBadge, MemberStatusBadge, DayTypeCell, SourceBadge } from '@/components/StatusBadge';
import MonthCalendar from '@/components/MonthCalendar';
import SummaryBar from '@/components/SummaryBar';
import TrendChart, { type TrendPoint } from '@/components/TrendChart';
import type { Task } from '@/lib/types';

const ADMIN_STATUS_OPTIONS = ['pending', 'completed', 'on_progress', 'incomplete', 'flagged'];

function formatTaskDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function AddDayForm({ employeeId, defaultDate, onAdded }: { employeeId: string; defaultDate: string; onAdded: () => void }) {
  const [date, setDate] = useState(defaultDate);
  const [assignedTask, setAssignedTask] = useState('');
  const [brief, setBrief] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setDate(defaultDate), [defaultDate]);

  async function handleAdd() {
    setSaving(true);
    setError('');
    try {
      await api.post('/api/tasks', { employeeId, date, assignedTask, brief });
      setAssignedTask('');
      setBrief('');
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to assign');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card mb-6 flex flex-wrap items-end gap-3">
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Date</label>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="w-full sm:min-w-[180px] sm:flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Assigned task</label>
        <input className="input" value={assignedTask} onChange={(e) => setAssignedTask(e.target.value)} />
      </div>
      <div className="w-full sm:min-w-[180px] sm:flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Brief</label>
        <input className="input" value={brief} onChange={(e) => setBrief(e.target.value)} />
      </div>
      <button className="btn-primary w-full sm:w-auto" disabled={saving || !assignedTask} onClick={handleAdd}>
        {saving ? 'Saving…' : 'Assign'}
      </button>
      {error && <p className="w-full text-xs text-status-flagged">{error}</p>}
    </div>
  );
}

function EditableRow({
  task,
  onSaved,
  onDeleted,
  selected,
  onToggleSelected,
}: {
  task: Task;
  onSaved: (t: Task) => void;
  onDeleted: (id: string) => void;
  selected: boolean;
  onToggleSelected: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [assignedTask, setAssignedTask] = useState(task.assignedTask);
  const [brief, setBrief] = useState(task.brief);
  const [adminStatus, setAdminStatus] = useState(task.adminStatus);
  const [reviewerNotes, setReviewerNotes] = useState(task.reviewerNotes);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

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
        <td data-label="">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelected(task._id)}
            aria-label={`Select ${task.assignedTask || 'task'} on ${dateLabel}`}
          />
        </td>
        <td data-label="Date">{dateLabel}</td>
        <td data-label="Day type">
          <DayTypeCell value={task.dayType} />
        </td>
        <td data-label="Source">
          <SourceBadge value={task.createdBy} />
        </td>
        <td data-label="Assigned task">{task.assignedTask || <span className="text-gray-400">—</span>}</td>
        <td data-label="Brief">{task.brief || <span className="text-gray-400">—</span>}</td>
        <td data-label="Member status">
          <MemberStatusBadge value={task.memberStatus} />
        </td>
        <td data-label="Proof link">
          {task.proofLink ? (
            <a href={task.proofLink} target="_blank" rel="noreferrer" className="text-brand hover:underline">
              Link
            </a>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>
        <td data-label="Verified status">
          <AdminStatusBadge value={task.adminStatus} />
        </td>
        <td data-label="Reviewer notes">{task.reviewerNotes || <span className="text-gray-400">—</span>}</td>
        <td data-label="Actions" className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button className="btn-secondary text-status-flagged" disabled={deleting} onClick={handleDelete}>
            {deleting ? '…' : 'Delete'}
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={11}>
        <div className="flex flex-wrap items-end gap-2 py-2">
          <input className="input w-full sm:flex-1" value={assignedTask} onChange={(e) => setAssignedTask(e.target.value)} placeholder="Assigned task" />
          <input className="input w-full sm:flex-1" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Brief" />
          <select
            className="input w-full sm:w-auto"
            value={adminStatus}
            onChange={(e) => setAdminStatus(e.target.value as Task['adminStatus'])}
          >
            {ADMIN_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            className="input w-full sm:flex-1"
            value={reviewerNotes}
            onChange={(e) => setReviewerNotes(e.target.value)}
            placeholder="Reviewer notes"
          />
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

function BulkReviewBar({
  selectedIds,
  onApplied,
  onClear,
}: {
  selectedIds: string[];
  onApplied: (updated: Task[], skippedCount: number) => void;
  onClear: () => void;
}) {
  const [adminStatus, setAdminStatus] = useState<Task['adminStatus']>('completed');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleApply() {
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = { taskIds: selectedIds, adminStatus };
      if (reviewerNotes) body.reviewerNotes = reviewerNotes;
      const { updated, skipped } = await api.patch<{ updated: Task[]; skipped: { id: string; reason: string }[] }>(
        '/api/tasks/bulk/admin',
        body
      );
      onApplied(updated, skipped.length);
      setReviewerNotes('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update selected tasks');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-brand/30 bg-brand/5 p-3">
      <p className="mr-2 text-sm font-medium">{selectedIds.length} selected</p>
      <select
        className="input w-full sm:w-auto"
        value={adminStatus}
        onChange={(e) => setAdminStatus(e.target.value as Task['adminStatus'])}
      >
        {ADMIN_STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <input
        className="input w-full sm:flex-1"
        placeholder="Reviewer notes (optional, applied to all selected)"
        value={reviewerNotes}
        onChange={(e) => setReviewerNotes(e.target.value)}
      />
      <button className="btn-primary w-full sm:w-auto" disabled={saving} onClick={handleApply}>
        {saving ? 'Applying…' : `Apply to ${selectedIds.length}`}
      </button>
      <button className="btn-secondary w-full sm:w-auto" onClick={onClear}>
        Clear selection
      </button>
      {error && <p className="w-full text-xs text-status-flagged">{error}</p>}
    </div>
  );
}

export default function EmployeeMonthlyLogPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const now = new Date();
  const [month, setMonth] = useState(Number(searchParams.get('month')) || now.getMonth() + 1);
  const [year, setYear] = useState(Number(searchParams.get('year')) || now.getFullYear());
  const queryDate = searchParams.get('date');
  // Admins only ever self-add their tasks (there's no "assign" concept above employee level), so
  // the assign-a-task form only makes sense when reviewing an employee's log.
  const canAssignTasks = (searchParams.get('targetRole') || 'employee') === 'employee';
  const { refresh } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employee, setEmployee] = useState<{ name: string; jobTitle: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkNotice, setBulkNotice] = useState('');
  const [trendPoints, setTrendPoints] = useState<TrendPoint[] | null>(null);
  const [trendExpanded, setTrendExpanded] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ tasks: Task[]; employee?: { name: string; jobTitle: string } }>(
        `/api/tasks?employeeId=${params.id}&month=${month}&year=${year}`
      );
      setTasks(data.tasks);
      if (data.employee) setEmployee(data.employee);
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
    setSelectedDate((current) => {
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      if (queryDate && queryDate.startsWith(monthKey)) return queryDate;
      if (current && current.startsWith(monthKey)) return current;
      return null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, month, year, queryDate]);

  useEffect(() => {
    api
      .get<{ points: TrendPoint[] }>(`/api/dashboard/trend?employeeId=${params.id}&months=6`)
      .then((data) => setTrendPoints(data.points))
      .catch(() => setTrendPoints(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const filteredTasks = useMemo(
    () => (selectedDate ? tasks.filter((t) => t.date.slice(0, 10) === selectedDate) : tasks),
    [tasks, selectedDate]
  );

  // Selection is scoped to what's currently visible — switching month/day shouldn't carry a
  // hidden selection along that the admin can no longer see or reason about.
  useEffect(() => {
    setSelectedIds([]);
  }, [selectedDate, month, year]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.length === filteredTasks.length ? [] : filteredTasks.map((t) => t._id)));
  }

  function handleBulkApplied(updated: Task[], skippedCount: number) {
    const updatedById = new Map(updated.map((t) => [t._id, t]));
    setTasks((prev) => prev.map((t) => updatedById.get(t._id) || t));
    setSelectedIds([]);
    setBulkNotice(
      skippedCount > 0
        ? `Updated ${updated.length} task(s); skipped ${skippedCount} you're not allowed to review.`
        : `Updated ${updated.length} task(s).`
    );
  }

  const stats = useMemo(
    () => [
      { label: 'Tasks', value: filteredTasks.length, color: 'bg-gray-400' },
      { label: 'Completed', value: filteredTasks.filter((t) => t.adminStatus === 'completed').length, color: 'bg-status-completed' },
      { label: 'On progress', value: filteredTasks.filter((t) => t.adminStatus === 'on_progress').length, color: 'bg-status-progress' },
      { label: 'Flagged', value: filteredTasks.filter((t) => t.adminStatus === 'flagged').length, color: 'bg-status-flagged' },
    ],
    [filteredTasks]
  );

  const defaultAddDate = selectedDate || new Date().toISOString().slice(0, 10);
  const flaggedTasks = filteredTasks.filter((t) => t.adminStatus === 'flagged');

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">
          Task review{employee ? ` — ${employee.name}'s Monthly Log` : ''}
        </h1>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1, 1).toLocaleString(undefined, { month: 'long' })}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="input w-full sm:w-24"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Review the employee&apos;s reported status here, add remarks, and set the verified result. Progress bars use the admin
        status only. Showing every task this month, regardless of status.
      </p>

      {error && <p className="mb-4 text-sm text-status-flagged">{error}</p>}

      {trendPoints && (
        <div className="card mb-6">
          <button
            type="button"
            onClick={() => setTrendExpanded((v) => !v)}
            className="flex w-full items-center gap-2.5 text-left"
          >
            <i className={`fa-solid fa-chevron-${trendExpanded ? 'down' : 'right'} shrink-0 text-xs text-gray-400`} />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Progress trend — last {trendPoints.length} months
            </h2>
          </button>
          {trendExpanded && (
            <div className="mt-3">
              <TrendChart points={trendPoints} />
            </div>
          )}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <MonthCalendar month={month} year={year} tasks={tasks} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        <div className="min-w-0">
          <SummaryBar stats={stats} />
          {canAssignTasks ? (
            <AddDayForm employeeId={params.id} defaultDate={defaultAddDate} onAdded={load} />
          ) : (
            <p className="card mb-6 text-sm text-gray-500 dark:text-gray-400">
              Admins add their own tasks — there&apos;s nothing to assign here, only to review below.
            </p>
          )}
        </div>
      </div>

      {flaggedTasks.length > 0 && (
        <div className="mb-4 rounded-lg border border-status-flagged/40 bg-status-flagged/10 p-4 text-sm text-red-900">
          <p className="font-semibold">Flagged in this review</p>
          <p>
            {flaggedTasks.length === 1
              ? `A task is flagged for ${formatTaskDate(flaggedTasks[0].date)}.`
              : `${flaggedTasks.length} tasks are flagged in the current view.`}
          </p>
        </div>
      )}

      {bulkNotice && <p className="mb-4 text-sm text-status-completed">{bulkNotice}</p>}

      {selectedIds.length > 0 && (
        <BulkReviewBar
          selectedIds={selectedIds}
          onApplied={handleBulkApplied}
          onClear={() => setSelectedIds([])}
        />
      )}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : filteredTasks.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{selectedDate ? 'No tasks on this day.' : 'No tasks this month yet.'}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
          <table className="tracker w-full">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredTasks.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all tasks in view"
                  />
                </th>
                <th>Date</th>
                <th>Day type</th>
                <th>Source</th>
                <th>Assigned task</th>
                <th>Brief</th>
                <th>Member status</th>
                <th>Proof link</th>
                <th>Verified status</th>
                <th>Reviewer notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((t) => (
                <EditableRow
                  key={t._id}
                  task={t}
                  selected={selectedIds.includes(t._id)}
                  onToggleSelected={toggleSelected}
                  onSaved={(updated) => setTasks((prev) => prev.map((x) => (x._id === updated._id ? updated : x)))}
                  onDeleted={(id) => setTasks((prev) => prev.filter((x) => x._id !== id))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
