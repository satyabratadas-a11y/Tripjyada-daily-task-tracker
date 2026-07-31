'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { api, ApiError, API_URL, downloadUrl } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { isAdminLike } from '@/lib/roles';
import type { Department } from '@/lib/types';

// Legacy fallback for documents uploaded before the GridFS migration, which only recorded a
// Cloudinary resourceType (raw/image/video) rather than a real mimeType.
const LEGACY_RESOURCE_ICONS: Record<string, string> = {
  raw: 'fa-solid fa-file-lines',
  image: 'fa-solid fa-file-image',
  video: 'fa-solid fa-file-video',
};

function docIconFor(department: Department) {
  const doc = department.document;
  if (!doc) return 'fa-solid fa-file';
  if (doc.mimeType) {
    if (doc.mimeType.startsWith('image/')) return 'fa-solid fa-file-image';
    if (doc.mimeType.startsWith('video/')) return 'fa-solid fa-file-video';
    if (doc.mimeType === 'application/pdf') return 'fa-solid fa-file-pdf';
    if (doc.mimeType.includes('spreadsheet') || doc.mimeType.includes('excel') || doc.mimeType === 'text/csv') {
      return 'fa-solid fa-file-excel';
    }
    if (doc.mimeType.includes('word')) return 'fa-solid fa-file-word';
    if (doc.mimeType.includes('presentation') || doc.mimeType.includes('powerpoint')) return 'fa-solid fa-file-powerpoint';
    return 'fa-solid fa-file-lines';
  }
  if (doc.type === 'link') return 'fa-solid fa-link';
  return LEGACY_RESOURCE_ICONS[doc.resourceType || 'raw'] || 'fa-solid fa-file-lines';
}

/** A GridFS-backed document's url is our own relative streaming route; a shared link (or a
 * pre-migration Cloudinary upload) is already an absolute url and must be left as-is. */
function resolveDocUrl(url: string) {
  return url.startsWith('/') ? downloadUrl(url) : url;
}

interface DeptFormData {
  name: string;
  tag: string;
  description: string;
}

function DepartmentForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Department>;
  onSave: (data: DeptFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [tag, setTag] = useState(initial?.tag || 'Team');
  const [description, setDescription] = useState(initial?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Department name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ name: name.trim(), tag: tag.trim() || 'Team', description: description.trim() });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card space-y-3">
      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
        {initial?.name ? 'Edit department' : 'New department'}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Department name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Leads report" autoFocus />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Tag</label>
          <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="TEAM" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Description</label>
        <textarea
          className="input"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Open the latest department file and manage access from here."
        />
      </div>
      {error && <p className="text-xs text-status-flagged">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={saving} onClick={handleSubmit}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddReportPanel({
  departments,
  onSaveLink,
  onUploadFile,
}: {
  departments: Department[];
  onSaveLink: (departmentId: string, url: string, title: string) => Promise<void>;
  onUploadFile: (departmentId: string, file: File, title: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<'file' | 'link'>('file');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!departmentId && departments.length > 0) setDepartmentId(departments[0].id);
  }, [departments, departmentId]);

  function resolveTitle() {
    return title.trim() || departments.find((d) => d.id === departmentId)?.name || '';
  }

  async function handleUpload() {
    if (!departmentId) {
      setError('Choose a department first');
      return;
    }
    if (!file) {
      setError('Choose a file to upload');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onUploadFile(departmentId, file, resolveTitle());
      setFile(null);
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to upload file');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLink() {
    if (!departmentId) {
      setError('Choose a department first');
      return;
    }
    if (!url.trim()) {
      setError('Paste a link to save it');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSaveLink(departmentId, url.trim(), resolveTitle());
      setUrl('');
      setTitle('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save link');
    } finally {
      setSaving(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  return (
    <div className="card mb-6 space-y-4">
      <p className="text-sm font-semibold">Add Report</p>

      <div className="inline-flex rounded-lg border border-gray-300 p-1 dark:border-white/10">
        <button
          type="button"
          onClick={() => setMode('file')}
          className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition ${
            mode === 'file'
              ? 'bg-gradient-to-b from-brand to-brand-dark text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <i className="fa-solid fa-folder-open mr-1.5" /> Upload File
        </button>
        <button
          type="button"
          onClick={() => setMode('link')}
          className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition ${
            mode === 'link'
              ? 'bg-gradient-to-b from-brand to-brand-dark text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <i className="fa-solid fa-link mr-1.5" /> Add Link
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Department</label>
          <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            {departments.length === 0 && <option value="">No departments yet</option>}
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Title (shown on the card)</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. May 2026 Sales Report"
          />
        </div>
      </div>

      {mode === 'file' ? (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition ${
              dragOver ? 'border-brand bg-brand/5' : 'border-gray-300 dark:border-white/10'
            }`}
          >
            <i className="fa-solid fa-folder-open text-2xl text-brand dark:text-brand-light" />
            <p className="text-sm text-gray-600 dark:text-gray-300">{file ? file.name : 'Drop file here or click to browse'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">PDF, Excel, Word, Image — any format</p>
          </div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {error && <p className="text-xs text-status-flagged">{error}</p>}
          <button className="btn-primary" disabled={saving || departments.length === 0} onClick={handleUpload}>
            <i className={saving ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-upload'} />
            {saving ? 'Uploading…' : 'Upload File'}
          </button>
        </>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Link</label>
            <input
              className="input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a Google Sheet / doc link"
            />
          </div>
          {error && <p className="text-xs text-status-flagged">{error}</p>}
          <button className="btn-primary" disabled={saving || departments.length === 0} onClick={handleSaveLink}>
            <i className={saving ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-link'} />
            {saving ? 'Saving…' : 'Save Link'}
          </button>
        </>
      )}
    </div>
  );
}

function AllUploadedFiles({
  departments,
  onRefresh,
  onRemove,
}: {
  departments: Department[];
  onRefresh: () => void;
  onRemove: (departmentId: string) => Promise<void>;
}) {
  const withDocs = departments.filter((d) => d.document);

  return (
    <div className="card mb-6 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">All Uploaded Files</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Click Open to view any file directly.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={onRefresh}>
          <i className="fa-solid fa-arrows-rotate" /> Refresh
        </button>
      </div>

      {withDocs.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No files uploaded yet.</p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-white/10">
          {withDocs.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <i className={`${docIconFor(d)} shrink-0 text-brand dark:text-brand-light`} />
                <div className="min-w-0">
                  <p className="truncate text-sm">{d.document!.name}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{d.name}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a href={resolveDocUrl(d.document!.url)} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  Open
                </a>
                <button
                  type="button"
                  className="rounded-md p-1.5 text-status-flagged hover:bg-gray-100 dark:hover:bg-white/10"
                  title="Remove document"
                  onClick={() => onRemove(d.id)}
                >
                  <i className="fa-solid fa-trash text-xs" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const canManage = isAdminLike(user?.role);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'list' | 'manage'>('list');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ departments: Department[] }>('/api/departments');
      setDepartments(data.departments);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(data: DeptFormData) {
    await api.post('/api/departments', data);
    setShowCreate(false);
    await load();
  }

  async function handleUpdate(id: string, data: DeptFormData) {
    await api.patch(`/api/departments/${id}`, data);
    setEditingId(null);
    await load();
  }

  async function handleDelete(department: Department) {
    if (!window.confirm(`Delete "${department.name}"? This also removes its shared document, if any.`)) return;
    await api.delete(`/api/departments/${department.id}`);
    await load();
  }

  async function handleSaveLink(departmentId: string, url: string, title: string) {
    await api.post(`/api/departments/${departmentId}/document/link`, { url, name: title || undefined });
    await load();
  }

  async function handleUploadFile(departmentId: string, file: File, title: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('name', title);
    const res = await fetch(`${API_URL}/api/departments/${departmentId}/document/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(body.error || 'Upload failed', res.status);
    }
    await load();
  }

  async function handleRemoveDocument(departmentId: string) {
    await api.delete(`/api/departments/${departmentId}/document`);
    await load();
  }

  return (
    <div>
      <div className="card mx-auto mb-6 max-w-2xl space-y-4 text-center">
        <span className="inline-flex items-center rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-brand dark:border-brand-light/30 dark:bg-brand/10 dark:text-brand-light">
          Office Portal
        </span>
        <div className="flex flex-col items-center gap-1">
          <Image src="/logo.webp" alt="Tripjyada" width={40} height={40} className="rounded-lg" />
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">TRIPJYADA</h1>
          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
            One stop for all your travel needs
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setView('list')}
            className={
              view === 'list'
                ? 'inline-flex items-center gap-1.5 rounded-full border border-brand bg-brand/10 px-3.5 py-1.5 text-xs font-medium text-brand dark:border-brand-light/60 dark:text-brand-light'
                : 'inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-600 dark:border-white/10 dark:bg-ink-light dark:text-gray-300'
            }
          >
            {departments.length} Departments
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => setView('manage')}
              className={
                view === 'manage'
                  ? 'inline-flex items-center gap-1.5 rounded-full border border-brand bg-brand/10 px-3.5 py-1.5 text-xs font-medium text-brand dark:border-brand-light/60 dark:text-brand-light'
                  : 'inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-600 dark:border-white/10 dark:bg-ink-light dark:text-gray-300'
              }
            >
              Reports &amp; uploads
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-status-flagged">{error}</p>}

      {view === 'manage' && canManage && (
        <>
          <AddReportPanel departments={departments} onSaveLink={handleSaveLink} onUploadFile={handleUploadFile} />
          <AllUploadedFiles departments={departments} onRefresh={load} onRemove={handleRemoveDocument} />
        </>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-title">Department List</h2>
          <p className="page-subtitle">
            {view === 'manage' ? 'Add, edit, or remove departments.' : 'Quick access to every active department report.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
            {departments.length} total
          </span>
          {canManage && view === 'manage' && (
            <button className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
              <i className="fa-solid fa-plus" /> New department
            </button>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="mb-6">
          <DepartmentForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : departments.length === 0 ? (
        <div className="card text-sm text-gray-500 dark:text-gray-400">
          No departments yet.{' '}
          {canManage ? 'Switch to "Reports & uploads" to add the first one.' : 'Check back once an admin sets one up.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {departments.map((department) =>
            editingId === department.id ? (
              <DepartmentForm
                key={department.id}
                initial={department}
                onSave={(data) => handleUpdate(department.id, data)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div key={department.id} className="card flex flex-col space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand/5 px-2.5 py-1 text-[11px] font-medium uppercase leading-none text-brand dark:border-brand-light/30 dark:bg-brand/10 dark:text-brand-light">
                    {department.tag}
                  </span>
                  {canManage && view === 'manage' && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                        title="Edit department"
                        onClick={() => setEditingId(department.id)}
                      >
                        <i className="fa-solid fa-pen text-xs" />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-status-flagged hover:bg-gray-100 dark:hover:bg-white/10"
                        title="Delete department"
                        onClick={() => handleDelete(department)}
                      >
                        <i className="fa-solid fa-trash text-xs" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-semibold">{department.name}</p>
                  {department.document ? (
                    <a
                      href={resolveDocUrl(department.document.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1.5 truncate text-xs italic text-brand hover:underline dark:text-brand-light"
                    >
                      <i className={`${docIconFor(department)} shrink-0`} />
                      <span className="truncate">{department.document.name}</span>
                    </a>
                  ) : (
                    <p className="mt-1 text-xs italic text-gray-400 dark:text-gray-500">No document shared yet</p>
                  )}
                </div>

                <p className="flex-1 text-xs text-gray-500 dark:text-gray-400">{department.description}</p>

                {department.document ? (
                  <a
                    href={resolveDocUrl(department.document.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full justify-center"
                  >
                    Open
                  </a>
                ) : (
                  <button type="button" disabled className="btn-secondary w-full justify-center opacity-50">
                    Open
                  </button>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
