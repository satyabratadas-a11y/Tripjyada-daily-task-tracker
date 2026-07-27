'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { ProjectStatusBadge, OverdueBadge } from '@/components/StatusBadge';
import SummaryBar from '@/components/SummaryBar';
import type { Project } from '@/lib/types';

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function sortProjects(projects: Project[]) {
  return [...projects].sort((a, b) => a.endDate.localeCompare(b.endDate));
}

function AddProjectForm({ onAdded }: { onAdded: (project: Project) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd() {
    setSaving(true);
    setError('');
    try {
      const { project } = await api.post<{ project: Project }>('/api/projects/self', {
        title,
        brief,
        startDate,
        endDate,
      });
      setTitle('');
      setBrief('');
      setOpen(false);
      onAdded(project);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add project');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="btn-primary w-full sm:w-auto" onClick={() => setOpen(true)}>
        + New project
      </button>
    );
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:min-w-[180px] sm:flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="w-full sm:min-w-[180px] sm:flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Brief (optional)</label>
          <input className="input" value={brief} onChange={(e) => setBrief(e.target.value)} />
        </div>
        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Start date</label>
          <input type="date" className="input" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">End date</label>
          <input type="date" className="input" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button className="btn-primary w-full sm:w-auto" disabled={saving || !title.trim()} onClick={handleAdd}>
          {saving ? 'Adding…' : 'Add project'}
        </button>
        <button className="btn-secondary w-full sm:w-auto" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-status-flagged">{error}</p>}
    </div>
  );
}

function OwnProjectRow({
  project,
  onSaved,
  onDeleted,
}: {
  project: Project;
  onSaved: (p: Project) => void;
  onDeleted: (id: string) => void;
}) {
  const editableTerms = project.createdBy === 'employee';
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [brief, setBrief] = useState(project.brief);
  const [startDate, setStartDate] = useState(project.startDate.slice(0, 10));
  const [endDate, setEndDate] = useState(project.endDate.slice(0, 10));
  const [status, setStatus] = useState(project.status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const body: Record<string, string> = { status };
      if (editableTerms) {
        body.title = title;
        body.brief = brief;
        body.startDate = startDate;
        body.endDate = endDate;
      }
      const { project: updated } = await api.patch<{ project: Project }>(`/api/projects/${project._id}`, body);
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
      await api.delete(`/api/projects/${project._id}`);
      onDeleted(project._id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  if (!editing) {
    return (
      <tr className={project.overdue ? 'bg-status-flagged/10' : undefined}>
        <td data-label="Title">{project.title}</td>
        <td data-label="Brief">{project.brief || <span className="text-gray-400">—</span>}</td>
        <td data-label="Start">{formatDate(project.startDate)}</td>
        <td data-label="End">
          <div className="flex flex-wrap items-center gap-1.5">
            {formatDate(project.endDate)}
            {project.overdue && <OverdueBadge />}
          </div>
        </td>
        <td data-label="Status">
          <ProjectStatusBadge value={project.status} />
        </td>
        <td data-label="Reviewer notes">{project.reviewerNotes || <span className="text-gray-400">—</span>}</td>
        <td data-label="Actions" className="flex flex-wrap gap-2">
          <Link href={`/employee/projects/${project._id}`} className="btn-secondary">
            Open
          </Link>
          <button className="btn-secondary" onClick={() => setEditing(true)}>
            Update
          </button>
          {editableTerms && (
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
      <td colSpan={7}>
        <div className="flex flex-wrap items-end gap-2 py-2">
          {editableTerms && (
            <>
              <input className="input w-full sm:flex-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
              <input className="input w-full sm:flex-1" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Brief" />
              <input type="date" className="input w-full sm:w-auto" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} />
              <input type="date" className="input w-full sm:w-auto" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </>
          )}
          <select className="input w-full sm:w-auto" value={status} onChange={(e) => setStatus(e.target.value as Project['status'])}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
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

/** Shows the current user's own projects (self-added or admin-assigned) and lets them add one. */
export default function OwnProjectsView() {
  const { refresh } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ projects: Project[] }>('/api/projects');
      setProjects(sortProjects(data.projects));
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(
    () => [
      { label: 'Projects', value: projects.length, color: 'bg-gray-400' },
      { label: 'Active', value: projects.filter((p) => p.status === 'active').length, color: 'bg-status-progress' },
      { label: 'Completed', value: projects.filter((p) => p.status === 'completed').length, color: 'bg-status-completed' },
      { label: 'Overdue', value: projects.filter((p) => p.overdue).length, color: 'bg-status-flagged' },
    ],
    [projects]
  );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title">My Projects</h1>
        <AddProjectForm onAdded={(project) => setProjects((prev) => sortProjects([...prev, project]))} />
      </div>

      {error && <p className="mb-4 text-sm text-status-flagged">{error}</p>}

      {!loading && <SummaryBar stats={stats} />}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No projects yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
          <table className="tracker w-full">
            <thead>
              <tr>
                <th>Title</th>
                <th>Brief</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th>Reviewer notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <OwnProjectRow
                  key={p._id}
                  project={p}
                  onSaved={(updated) => setProjects((prev) => sortProjects(prev.map((x) => (x._id === updated._id ? updated : x))))}
                  onDeleted={(id) => setProjects((prev) => prev.filter((x) => x._id !== id))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
