'use client';

import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { ProjectStatusBadge, OverdueBadge, SourceBadge } from '@/components/StatusBadge';
import SummaryBar from '@/components/SummaryBar';
import type { DashboardRow, Project, ProjectStatus } from '@/lib/types';

interface ReviewProject extends Omit<Project, 'employee'> {
  employee: { id: string; name: string; jobTitle: string; role?: string };
}

interface EmployeeOption {
  id: string;
  name: string;
  jobTitle: string;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function AssignProjectForm({ employees, onAssigned }: { employees: EmployeeOption[]; onAssigned: () => void }) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleAssign() {
    setSaving(true);
    setError('');
    try {
      await api.post('/api/projects', { employeeId, title, brief, startDate, endDate });
      setTitle('');
      setBrief('');
      setOpen(false);
      onAssigned();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to assign project');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button className="btn-primary w-full sm:w-auto" onClick={() => setOpen(true)}>
        + Assign project
      </button>
      {open && (
        <Modal title="Assign project" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Employee</label>
              <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} autoFocus>
                <option value="" disabled>
                  Select employee
                </option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.jobTitle ? ` — ${e.jobTitle}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Title</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Brief (optional)</label>
              <input className="input" value={brief} onChange={(e) => setBrief(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Start date</label>
                <input type="date" className="input" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">End date</label>
                <input type="date" className="input" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>
          {error && <p className="mt-3 text-xs text-status-flagged">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" disabled={saving || !employeeId || !title.trim()} onClick={handleAssign}>
              {saving ? 'Assigning…' : 'Assign'}
            </button>
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function ProjectReviewCard({
  project,
  onSaved,
  onDeleted,
}: {
  project: ReviewProject;
  onSaved: (p: ReviewProject) => void;
  onDeleted: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [reviewerNotes, setReviewerNotes] = useState(project.reviewerNotes);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const dirty = status !== project.status || reviewerNotes !== project.reviewerNotes;

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const { project: updated } = await api.patch<{ project: Project }>(`/api/projects/${project._id}`, {
        status,
        reviewerNotes,
      });
      onSaved({ ...updated, employee: project.employee });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${project.title || 'this project'}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/api/projects/${project._id}`);
      onDeleted(project._id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className={`rounded-lg border ${
        project.overdue ? 'border-status-flagged bg-status-flagged/5' : 'border-gray-200 bg-white dark:border-white/10 dark:bg-ink-light'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <i className={`fa-solid fa-chevron-${expanded ? 'down' : 'right'} shrink-0 text-xs text-gray-400`} />
          <div className="min-w-0">
            <span className="block truncate font-medium">{project.title || 'Untitled project'}</span>
            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{project.employee.name}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {project.overdue && <OverdueBadge />}
          <ProjectStatusBadge value={project.status} />
          <SourceBadge value={project.createdBy} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4 dark:border-white/10">
          <div className="mb-3 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            <p className="text-gray-500 dark:text-gray-400">
              Brief: <span className="text-gray-800 dark:text-gray-200">{project.brief || '—'}</span>
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              {formatDate(project.startDate)} — {formatDate(project.endDate)}
            </p>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Status</span>
            <select className="input w-full sm:max-w-[220px]" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
            <ProjectStatusBadge value={status} />
          </div>

          <textarea
            className="input min-h-[92px]"
            placeholder="Reviewer notes / remarks"
            value={reviewerNotes}
            onChange={(e) => setReviewerNotes(e.target.value)}
          />

          {error && <p className="mt-2 text-xs text-status-flagged">{error}</p>}

          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button className="btn-secondary w-full text-status-flagged sm:w-auto" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <Link href={`/admin/projects/${project._id}`} className="btn-secondary w-full sm:w-auto">
              Open
            </Link>
            <button className="btn-primary w-full sm:w-auto" disabled={saving || !dirty} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminProjectsView() {
  const { refresh } = useAuth();
  const [projects, setProjects] = useState<ReviewProject[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams();
      if (statusFilter) query.set('status', statusFilter);
      if (overdueOnly) query.set('overdueOnly', 'true');
      const data = await api.get<{ projects: ReviewProject[] }>(`/api/projects/review?${query.toString()}`);
      setProjects(data.projects);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await refresh();
      } else {
        setError(err instanceof ApiError ? err.message : 'Failed to load projects');
      }
    } finally {
      setLoading(false);
    }
  }

  // Reuses the dashboard roster (already scoped to what this admin is allowed to see) just to
  // populate the assign-project employee dropdown — there's no dedicated employee-list endpoint
  // for a plain admin, and the dashboard one already exists and is cheap to call.
  async function loadEmployees() {
    try {
      const now = new Date();
      const data = await api.get<{ rows: DashboardRow[] }>(`/api/dashboard?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
      setEmployees(data.rows.filter((r) => (r.employee.role || 'employee') === 'employee').map((r) => r.employee));
    } catch {
      // Non-fatal — the assign form just shows an empty dropdown if this fails.
    }
  }

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, overdueOnly]);

  const filteredProjects = useMemo(
    () => projects.filter((p) => p.employee.name.toLowerCase().includes(nameFilter.trim().toLowerCase())),
    [projects, nameFilter]
  );

  const stats = useMemo(
    () => [
      { label: 'Projects', value: filteredProjects.length, color: 'bg-gray-400' },
      { label: 'Active', value: filteredProjects.filter((p) => p.status === 'active').length, color: 'bg-status-progress' },
      { label: 'Completed', value: filteredProjects.filter((p) => p.status === 'completed').length, color: 'bg-status-completed' },
      { label: 'Overdue', value: filteredProjects.filter((p) => p.overdue).length, color: 'bg-status-flagged' },
    ],
    [filteredProjects]
  );

  function handleSaved(updated: ReviewProject) {
    setProjects((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  }

  function handleDeleted(id: string) {
    setProjects((prev) => prev.filter((p) => p._id !== id));
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Assign and review every visible employee&apos;s projects. A project is overdue once its end date has passed
            without being marked completed.
          </p>
        </div>
        <AssignProjectForm employees={employees} onAssigned={load} />
      </div>

      <div className="card mb-6 flex flex-wrap items-end gap-3">
        <div className="w-full sm:min-w-[220px] sm:flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Filter by employee</label>
          <input className="input" placeholder="Search employees…" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-gray-700 dark:text-gray-200">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
          Overdue only
        </label>
      </div>

      {!loading && <SummaryBar stats={stats} />}
      {error && <p className="mb-4 text-sm text-status-flagged">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : filteredProjects.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No projects match these filters.</p>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((p) => (
            <ProjectReviewCard key={p._id} project={p} onSaved={handleSaved} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}
