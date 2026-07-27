'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { ProjectStatusBadge, OverdueBadge, DayTypeCell, SourceBadge, MemberStatusBadge, AdminStatusBadge } from '@/components/StatusBadge';
import MonthCalendar from '@/components/MonthCalendar';
import SummaryBar from '@/components/SummaryBar';
import type { Task } from '@/lib/types';

interface ProjectWithEmployee {
  _id: string;
  title: string;
  brief: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed';
  createdBy: 'admin' | 'employee';
  reviewerNotes: string;
  overdue: boolean;
  employee: { id: string; name: string; jobTitle: string; role: string };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function AddEntryForm({
  projectId,
  employeeId,
  isOwner,
  onAdded,
}: {
  projectId: string;
  employeeId: string;
  isOwner: boolean;
  onAdded: (task: Task) => void;
}) {
  const [date, setDate] = useState(todayStr());
  const [assignedTask, setAssignedTask] = useState('');
  const [brief, setBrief] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd() {
    setSaving(true);
    setError('');
    try {
      const body = { date, assignedTask, brief, project: projectId };
      const { task } = isOwner
        ? await api.post<{ task: Task }>('/api/tasks/self', { ...body, memberStatus: 'on_progress' })
        : await api.post<{ task: Task }>('/api/tasks', { ...body, employeeId });
      setAssignedTask('');
      setBrief('');
      onAdded(task);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to log progress');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card mb-6">
      <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Log progress for a day</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Date</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="w-full sm:min-w-[180px] sm:flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">What was done</label>
          <input className="input" value={assignedTask} onChange={(e) => setAssignedTask(e.target.value)} />
        </div>
        <div className="w-full sm:min-w-[180px] sm:flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Brief (optional)</label>
          <input className="input" value={brief} onChange={(e) => setBrief(e.target.value)} />
        </div>
        <button className="btn-primary w-full sm:w-auto" disabled={saving || !assignedTask.trim()} onClick={handleAdd}>
          {saving ? 'Adding…' : 'Add entry'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-status-flagged">{error}</p>}
    </div>
  );
}

export default function ProjectDetailView() {
  const params = useParams<{ id: string }>();
  const { user, refresh } = useAuth();
  const [project, setProject] = useState<ProjectWithEmployee | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ project: ProjectWithEmployee; tasks: Task[] }>(`/api/projects/${params.id}`);
      setProject(data.project);
      setTasks(data.tasks);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await refresh();
      } else {
        setError(err instanceof ApiError ? err.message : 'Failed to load project');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const now = new Date();
  const inRangeMonth = project && now >= new Date(project.startDate) && now <= new Date(project.endDate);
  const initial = project ? new Date(inRangeMonth ? now : project.startDate) : now;
  const [month] = useState(initial.getMonth() + 1);
  const [year] = useState(initial.getFullYear());

  const filteredTasks = useMemo(
    () => (selectedDate ? tasks.filter((t) => t.date.slice(0, 10) === selectedDate) : tasks),
    [tasks, selectedDate]
  );

  const stats = useMemo(
    () => [
      { label: 'Entries', value: filteredTasks.length, color: 'bg-gray-400' },
      { label: 'Done', value: filteredTasks.filter((t) => t.memberStatus === 'done').length, color: 'bg-status-completed' },
      { label: 'On progress', value: filteredTasks.filter((t) => t.memberStatus === 'on_progress').length, color: 'bg-status-progress' },
      { label: 'Flagged', value: filteredTasks.filter((t) => t.adminStatus === 'flagged').length, color: 'bg-status-flagged' },
    ],
    [filteredTasks]
  );

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;
  if (error) return <p className="text-sm text-status-flagged">{error}</p>;
  if (!project) return null;

  const isOwner = user?.id === project.employee.id;
  const backHref = isOwner && user?.role === 'employee' ? '/employee/projects' : '/admin/projects';

  return (
    <div>
      <p className="mb-2 text-sm">
        <Link href={backHref} className="text-brand hover:underline">
          ← Back to projects
        </Link>
      </p>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{project.title}</h1>
          <p className="page-subtitle">
            {project.employee.name} · {formatDate(project.startDate)} — {formatDate(project.endDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {project.overdue && <OverdueBadge />}
          <ProjectStatusBadge value={project.status} />
          <SourceBadge value={project.createdBy} />
        </div>
      </div>

      {project.brief && <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">{project.brief}</p>}
      {project.reviewerNotes && (
        <p className="mb-4 rounded-lg border border-status-flagged/30 bg-status-flagged/5 p-3 text-sm text-gray-700 dark:text-gray-200">
          <span className="font-medium">Reviewer notes:</span> {project.reviewerNotes}
        </p>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <MonthCalendar month={month} year={year} tasks={tasks} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        <div className="min-w-0">
          <SummaryBar stats={stats} />
          <AddEntryForm
            projectId={project._id}
            employeeId={project.employee.id}
            isOwner={isOwner}
            onAdded={(task) => setTasks((prev) => [...prev, task])}
          />
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {selectedDate ? 'No entries on this day.' : 'No progress logged for this project yet.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
          <table className="tracker w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day type</th>
                <th>Source</th>
                <th>Entry</th>
                <th>Brief</th>
                <th>My status</th>
                <th>Verified status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((t) => (
                <tr key={t._id} className={t.adminStatus === 'flagged' ? 'bg-status-flagged/10' : undefined}>
                  <td data-label="Date">
                    {new Date(t.date).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })}
                  </td>
                  <td data-label="Day type">
                    <DayTypeCell value={t.dayType} />
                  </td>
                  <td data-label="Source">
                    <SourceBadge value={t.createdBy} />
                  </td>
                  <td data-label="Entry">{t.assignedTask || <span className="text-gray-400">—</span>}</td>
                  <td data-label="Brief">{t.brief || <span className="text-gray-400">—</span>}</td>
                  <td data-label="My status">
                    <MemberStatusBadge value={t.memberStatus} />
                  </td>
                  <td data-label="Verified status">
                    <AdminStatusBadge value={t.adminStatus} />
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
