'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { AdminStatusBadge, MemberStatusBadge, DayTypeCell, SourceBadge } from '@/components/StatusBadge';
import MonthCalendar from '@/components/MonthCalendar';
import SummaryBar from '@/components/SummaryBar';
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
        <label className="mb-1 block text-xs font-medium text-gray-500">Date</label>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="w-full sm:min-w-[180px] sm:flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-500">Assigned task</label>
        <input className="input" value={assignedTask} onChange={(e) => setAssignedTask(e.target.value)} />
      </div>
      <div className="w-full sm:min-w-[180px] sm:flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-500">Brief</label>
        <input className="input" value={brief} onChange={(e) => setBrief(e.target.value)} />
      </div>
      <button className="btn-primary w-full sm:w-auto" disabled={saving || !assignedTask} onClick={handleAdd}>
        {saving ? 'Saving…' : 'Assign'}
      </button>
      {error && <p className="w-full text-xs text-status-flagged">{error}</p>}
    </div>
  );
}

function EditableRow({ task, onSaved, onDeleted }: { task: Task; onSaved: (t: Task) => void; onDeleted: (id: string) => void }) {
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
      <td colSpan={10}>
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

export default function EmployeeMonthlyLogPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const now = new Date();
  const [month, setMonth] = useState(Number(searchParams.get('month')) || now.getMonth() + 1);
  const [year, setYear] = useState(Number(searchParams.get('year')) || now.getFullYear());
  const queryDate = searchParams.get('date');
  const { refresh } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ tasks: Task[] }>(
        `/api/tasks?employeeId=${params.id}&month=${month}&year=${year}`
      );
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
    setSelectedDate((current) => {
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      if (queryDate && queryDate.startsWith(monthKey)) return queryDate;
      if (current && current.startsWith(monthKey)) return current;
      return null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, month, year, queryDate]);

  const filteredTasks = useMemo(
    () => (selectedDate ? tasks.filter((t) => t.date.slice(0, 10) === selectedDate) : tasks),
    [tasks, selectedDate]
  );

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
        <h1 className="text-lg font-semibold">Employee task review</h1>
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
      <p className="mb-4 text-sm text-gray-500">
        Review the employee&apos;s reported status here, add remarks, and set the verified result. Progress bars use the admin status only.
      </p>

      {error && <p className="mb-4 text-sm text-status-flagged">{error}</p>}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <MonthCalendar month={month} year={year} tasks={tasks} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        <div className="min-w-0">
          <SummaryBar stats={stats} />
          <AddDayForm employeeId={params.id} defaultDate={defaultAddDate} onAdded={load} />
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

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : filteredTasks.length === 0 ? (
        <p className="text-sm text-gray-500">{selectedDate ? 'No tasks on this day.' : 'No tasks this month yet.'}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="tracker w-full">
            <thead>
              <tr>
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
