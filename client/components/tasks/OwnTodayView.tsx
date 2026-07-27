'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { AdminStatusBadge, SourceBadge, ProjectStatusBadge, OverdueBadge } from '@/components/StatusBadge';
import SummaryBar from '@/components/SummaryBar';
import type { Task, Project } from '@/lib/types';

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
      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">New task</p>
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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function NewProjectForm({ onAdded }: { onAdded: (project: Project) => void }) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd() {
    setSaving(true);
    setError('');
    try {
      const { project } = await api.post<{ project: Project }>('/api/projects/self', { title, startDate, endDate });
      setTitle('');
      onAdded(project);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add project');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 p-3 dark:border-white/10">
      <div className="w-full sm:min-w-[200px] sm:flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Start</label>
        <input type="date" className="input" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Deadline</label>
        <input type="date" className="input" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      <button className="btn-primary w-full sm:w-auto" disabled={saving || !title.trim()} onClick={handleAdd}>
        {saving ? 'Adding…' : 'Add project'}
      </button>
      {error && <p className="w-full text-xs text-status-flagged">{error}</p>}
    </div>
  );
}

function ProjectQuickRow({
  project,
  projectsBase,
  onLogged,
  onDeleted,
}: {
  project: Project;
  projectsBase: string;
  onLogged: () => void;
  onDeleted: (id: string) => void;
}) {
  const [logging, setLogging] = useState(false);
  const [assignedTask, setAssignedTask] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleLog() {
    setSaving(true);
    setError('');
    try {
      await api.post('/api/tasks/self', {
        date: todayStr(),
        assignedTask,
        project: project._id,
        memberStatus: 'on_progress',
      });
      setAssignedTask('');
      setLogging(false);
      onLogged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to log progress');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/api/projects/${project._id}`);
      onDeleted(project._id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete project');
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{project.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Due {formatDate(project.endDate)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {project.overdue && <OverdueBadge />}
          <ProjectStatusBadge value={project.status} />
          <Link href={`${projectsBase}/${project._id}`} className="btn-secondary text-xs">
            Open
          </Link>
          {project.createdBy === 'employee' && (
            <button className="btn-secondary text-xs text-status-flagged" disabled={deleting} onClick={handleDelete}>
              {deleting ? '…' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {logging ? (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <input
            className="input flex-1"
            placeholder="What did you do today on this?"
            value={assignedTask}
            onChange={(e) => setAssignedTask(e.target.value)}
            autoFocus
          />
          <button className="btn-primary w-full sm:w-auto" disabled={saving || !assignedTask.trim()} onClick={handleLog}>
            {saving ? 'Adding…' : 'Add'}
          </button>
          <button className="btn-secondary w-full sm:w-auto" onClick={() => setLogging(false)}>
            Cancel
          </button>
          {error && <p className="w-full text-xs text-status-flagged">{error}</p>}
        </div>
      ) : (
        <button className="btn-secondary mt-2 text-xs" onClick={() => setLogging(true)}>
          + Log today&apos;s progress
        </button>
      )}
    </div>
  );
}

/** Lets the user create a deadline-bound project and log today's progress against it, right
 * where their daily tasks already live — the full history/calendar view is one click away via
 * each project's "Open" link. */
function TodayProjectsPanel({ projectsBase, onLoggedEntry }: { projectsBase: string; onLoggedEntry: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<{ projects: Project[] }>('/api/projects');
      setProjects(data.projects.filter((p) => p.status === 'active'));
    } catch {
      // Non-fatal — the rest of Today's Tasks still works without this panel.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="card mb-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">My Projects</p>
        <button className="btn-secondary text-xs" onClick={() => setShowNewForm((v) => !v)}>
          {showNewForm ? 'Cancel' : '+ New project'}
        </button>
      </div>

      {showNewForm && (
        <NewProjectForm
          onAdded={(project) => {
            setProjects((prev) => [...prev, project]);
            setShowNewForm(false);
          }}
        />
      )}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No active projects yet. Start one above — set a title and a deadline, then log progress here each day.
        </p>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => (
            <ProjectQuickRow
              key={p._id}
              project={p}
              projectsBase={projectsBase}
              onLogged={() => {
                onLoggedEntry();
                load();
              }}
              onDeleted={(id) => setProjects((prev) => prev.filter((x) => x._id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, onSaved, onDeleted }: { task: Task; onSaved: (t: Task) => void; onDeleted: (id: string) => void }) {
  const editableTitle = task.createdBy === 'employee';
  const isFlagged = task.adminStatus === 'flagged';
  // Flagged tasks open by default so the reviewer's remark isn't hidden behind a click.
  const [expanded, setExpanded] = useState(isFlagged);
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
    <div
      className={`min-w-0 rounded-xl border shadow-sm transition-shadow duration-200 hover:shadow-md ${
        isFlagged
          ? 'border-status-flagged bg-status-flagged/5'
          : 'border-gray-200 bg-white dark:border-white/10 dark:bg-ink-light'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2.5 p-4 text-left sm:p-5"
      >
        <i className={`fa-solid fa-chevron-${expanded ? 'down' : 'right'} shrink-0 text-xs text-gray-400`} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.assignedTask || 'Untitled task'}</span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-gray-100 p-4 dark:border-white/10 sm:p-5">
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
            task.brief && <p className="text-sm text-gray-600 dark:text-gray-300">{task.brief}</p>
          )}

          {isFlagged && (
            <div className="rounded-md border border-status-flagged/40 bg-status-flagged/10 p-3 text-sm text-red-900">
              <p className="font-semibold">Flagged for {formatTaskDate(task.date)}</p>
              <p>This task was marked red by your reviewer for this date. Please review the remark and follow up.</p>
              {task.reviewerNotes && <p className="mt-1">Remark: {task.reviewerNotes}</p>}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Verified status</span>
            <AdminStatusBadge value={task.adminStatus} />
          </div>
          {task.reviewerNotes && !isFlagged && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">Reviewer note: </span>
              {task.reviewerNotes}
            </p>
          )}

          <hr />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Proof link</label>
              <input className="input" value={proofLink} onChange={(e) => setProofLink(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Your status</label>
              <select className="input" value={selectValue} onChange={(e) => setMemberStatus(e.target.value as Task['memberStatus'])}>
                <option value="" disabled>
                  Select your update
                </option>
                <option value="on_progress">On Progress</option>
                <option value="done">Done</option>
                <option value="not_done">Not Done</option>
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
      )}
    </div>
  );
}

/**
 * Shows the current user's own tasks for today, with a form to add one. Used by employees and
 * (via /api/tasks/today/mine) by admins logging their own daily task rather than the
 * cross-employee oversight grid admins otherwise see at /api/tasks/today.
 */
export default function OwnTodayView() {
  const { user, refresh } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ rows: TodayRow[] }>('/api/tasks/today/mine');
      // Never assume the first row belongs to the signed-in user. Older API deployments returned
      // every employee row to admins even on this endpoint, which made an admin see someone else's
      // tasks here and then receive "You can only update your own task" when saving.
      const ownRow = data.rows.find((row) => String(row.employee.id) === String(user?.id));
      setTasks(ownRow?.tasks || []);
      if (!ownRow && data.rows.length > 0) {
        setError('Your task row was not returned by the server. Please refresh and try again.');
      }
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
    // `load` closes over `user` from this render, and AuthContext resolves `/api/auth/me`
    // asynchronously — firing on every mount regardless of `user` raced the two requests: on a
    // slower connection, the tasks fetch could resolve before `user` was populated, so the
    // "does this row belong to me" check below compared against `undefined` and always missed,
    // showing the "task row was not returned" error for a user whose data was actually fine.
    // Waiting for `user` guarantees the closure has the real id by the time rows come back.
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const stats = useMemo(
    () => [
      { label: 'Active tasks', value: tasks.length, color: 'bg-gray-400' },
      {
        label: 'Carried from earlier',
        value: tasks.filter((t) => t.date.slice(0, 10) !== todayKey).length,
        color: 'bg-status-progress',
      },
      { label: 'Verified completed', value: tasks.filter((t) => t.adminStatus === 'completed').length, color: 'bg-status-completed' },
      { label: 'Flagged', value: tasks.filter((t) => t.adminStatus === 'flagged').length, color: 'bg-status-flagged' },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks]
  );

  return (
    <div>
      <h1 className="mb-1 page-title">Today&apos;s Tasks</h1>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Your update is `On Progress`, `Done`, or `Not Done`. Progress is calculated from your reviewer&apos;s verified status.
        Any task still `On Progress` — including one you reopen from an older day in your monthly log — stays listed here.
        Marking it Done or Not Done keeps it listed here until your admin or super admin reviews it; it only moves to
        your Monthly Log once they&apos;ve verified it.
      </p>

      {!loading && <SummaryBar stats={stats} />}
      {error && <p className="mb-4 text-sm text-status-flagged">{error}</p>}

      <TodayProjectsPanel projectsBase={user?.role === 'employee' ? '/employee/projects' : '/admin/projects'} onLoggedEntry={load} />

      <AddTaskForm onAdded={load} />

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : tasks.length === 0 ? (
        <div className="card text-sm text-gray-500 dark:text-gray-400">No tasks yet for today — add your own above.</div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
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
