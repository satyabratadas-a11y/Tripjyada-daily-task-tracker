'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { AdminStatusBadge, SourceBadge } from '@/components/StatusBadge';
import SummaryBar from '@/components/SummaryBar';
import type { Task } from '@/lib/types';

interface TodayRow {
  employee: { id: string; name: string; jobTitle: string };
  tasks: Task[];
}

function formatTaskDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function AddTaskForm({ onAdded }: { onAdded: () => void }) {
  const [assignedTask, setAssignedTask] = useState('');
  const [brief, setBrief] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  async function handleAdd() {
    setSaving(true);
    setError('');
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.post('/api/tasks/self', { date: today, assignedTask, brief, memberStatus: 'on_progress' });
      setAssignedTask('');
      setBrief('');
      setOpen(false);
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add task');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="btn-primary mb-6 w-full sm:w-auto" onClick={() => setOpen(true)}>
        + Add a task for today
      </button>
    );
  }

  return (
    <div className="card mb-6 max-w-xl space-y-2">
      <p className="text-xs font-medium uppercase text-gray-500">New task</p>
      <input
        className="input"
        placeholder="What are you working on?"
        value={assignedTask}
        onChange={(e) => setAssignedTask(e.target.value)}
        autoFocus
      />
      <input className="input" placeholder="Brief / details (optional)" value={brief} onChange={(e) => setBrief(e.target.value)} />
      {error && <p className="text-xs text-status-flagged">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary w-full sm:w-auto" disabled={saving || !assignedTask} onClick={handleAdd}>
          {saving ? 'Adding…' : 'Add task'}
        </button>
        <button className="btn-secondary w-full sm:w-auto" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function TaskCard({ task, onSaved, onDeleted }: { task: Task; onSaved: (t: Task) => void; onDeleted: (id: string) => void }) {
  const editableTitle = task.createdBy === 'employee';
  const [assignedTask, setAssignedTask] = useState(task.assignedTask);
  const [brief, setBrief] = useState(task.brief);
  const [proofLink, setProofLink] = useState(task.proofLink);
  const [memberStatus, setMemberStatus] = useState(task.memberStatus);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const dirty =
    proofLink !== task.proofLink ||
    memberStatus !== task.memberStatus ||
    (editableTitle && (assignedTask !== task.assignedTask || brief !== task.brief));
  const selectValue = memberStatus === 'not_started' ? '' : memberStatus;
  const isFlagged = task.adminStatus === 'flagged';

  async function handleSave() {
    setSaving(true);
    setError('');
    setSavedMsg('');
    try {
      const body: Record<string, string> = { proofLink, memberStatus };
      if (editableTitle) {
        body.assignedTask = assignedTask;
        body.brief = brief;
      }
      const { task: updated } = await api.patch<{ task: Task }>(`/api/tasks/${task._id}/employee`, body);
      onSaved(updated);
      setSavedMsg('Saved');
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

  return (
    <div className={`card space-y-3 ${isFlagged ? 'border-status-flagged bg-status-flagged/5' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        {editableTitle ? (
          <input className="input flex-1 font-medium" value={assignedTask} onChange={(e) => setAssignedTask(e.target.value)} />
        ) : (
          <p className="flex-1 text-sm font-medium">{task.assignedTask}</p>
        )}
        <SourceBadge value={task.createdBy} />
      </div>

      {editableTitle ? (
        <input className="input" placeholder="Brief / details" value={brief} onChange={(e) => setBrief(e.target.value)} />
      ) : (
        task.brief && <p className="text-sm text-gray-600">{task.brief}</p>
      )}

      {isFlagged && (
        <div className="rounded-md border border-status-flagged/40 bg-status-flagged/10 p-3 text-sm text-red-900">
          <p className="font-semibold">Flagged for {formatTaskDate(task.date)}</p>
          <p>This task was marked red by admin for this date. Please review the remark and follow up.</p>
          {task.reviewerNotes && <p className="mt-1">Remark: {task.reviewerNotes}</p>}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase text-gray-500">Verified status</span>
        <AdminStatusBadge value={task.adminStatus} />
      </div>
      {task.reviewerNotes && !isFlagged && (
        <p className="text-xs text-gray-500">
          <span className="font-medium">Reviewer note: </span>
          {task.reviewerNotes}
        </p>
      )}

      <hr />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Proof link</label>
          <input className="input" value={proofLink} onChange={(e) => setProofLink(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Your status</label>
          <select className="input" value={selectValue} onChange={(e) => setMemberStatus(e.target.value as Task['memberStatus'])}>
            <option value="" disabled>
              Select your update
            </option>
            <option value="on_progress">On Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      {error && <p className="text-xs text-status-flagged">{error}</p>}
      {savedMsg && !dirty && <p className="text-xs text-status-completed">{savedMsg}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-primary w-full sm:w-auto" disabled={saving || !dirty} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {editableTitle && (
          <button className="btn-secondary w-full text-status-flagged sm:w-auto" disabled={deleting} onClick={handleDelete}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function EmployeeTodayPage() {
  const { refresh } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ rows: TodayRow[] }>('/api/tasks/today');
      setTasks(data.rows[0]?.tasks || []);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(
    () => [
      { label: 'Total today', value: tasks.length, color: 'bg-gray-400' },
      { label: 'Marked done by you', value: tasks.filter((t) => t.memberStatus === 'done').length, color: 'bg-status-completed' },
      { label: 'Verified completed', value: tasks.filter((t) => t.adminStatus === 'completed').length, color: 'bg-status-completed' },
      { label: 'Flagged', value: tasks.filter((t) => t.adminStatus === 'flagged').length, color: 'bg-status-flagged' },
    ],
    [tasks]
  );

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">Today&apos;s Tasks</h1>
      <p className="mb-4 text-sm text-gray-500">
        {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
      <p className="mb-4 text-sm text-gray-500">
        Your update is only `On Progress` or `Done`. Team progress is calculated from the admin&apos;s verified status.
      </p>

      {!loading && <SummaryBar stats={stats} />}
      {error && <p className="mb-4 text-sm text-status-flagged">{error}</p>}
      <AddTaskForm onAdded={load} />

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : tasks.length === 0 ? (
        <div className="card text-sm text-gray-500">
          No tasks yet for today — an admin can assign one, or add your own above.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {tasks.map((t) => (
            <TaskCard
              key={t._id}
              task={t}
              onSaved={(updated) => setTasks((prev) => prev.map((x) => (x._id === updated._id ? updated : x)))}
              onDeleted={(id) => setTasks((prev) => prev.filter((x) => x._id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
