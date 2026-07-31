'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { api, ApiError, API_URL } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { isAdminLike } from '@/lib/roles';
import type { Department } from '@/lib/types';

const DOC_ICONS: Record<string, string> = {
  raw: 'fa-solid fa-file-lines',
  image: 'fa-solid fa-file-image',
  video: 'fa-solid fa-file-video',
};

function docIconFor(department: Department) {
  if (!department.document) return 'fa-solid fa-file';
  if (department.document.type === 'link') return 'fa-solid fa-link';
  return DOC_ICONS[department.document.resourceType || 'raw'] || 'fa-solid fa-file-lines';
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

function DocumentPanel({
  department,
  onSaveLink,
  onUploadFile,
  onRemoveDocument,
}: {
  department: Department;
  onSaveLink: (url: string, name: string) => Promise<void>;
  onUploadFile: (file: File) => Promise<void>;
  onRemoveDocument: () => Promise<void>;
}) {
  const [url, setUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSaveLink() {
    if (!url.trim()) {
      setError('Paste a link to save it');
      return;
    }
    setSavingLink(true);
    setError('');
    try {
      await onSaveLink(url.trim(), linkName.trim());
      setUrl('');
      setLinkName('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save link');
    } finally {
      setSavingLink(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await onUploadFile(file);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemove() {
    if (!window.confirm('Remove this department’s document?')) return;
    setRemoving(true);
    setError('');
    try {
      await onRemoveDocument();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove document');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-gray-300 p-3 dark:border-white/10">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Share or upload document</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="input"
          placeholder="Paste a Google Sheet / doc link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          className="input sm:w-40"
          placeholder="Label (optional)"
          value={linkName}
          onChange={(e) => setLinkName(e.target.value)}
        />
        <button className="btn-secondary shrink-0" disabled={savingLink} onClick={handleSaveLink}>
          {savingLink ? 'Saving…' : 'Save link'}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-secondary" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          <i className={uploading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-upload'} />
          {uploading ? 'Uploading…' : 'Upload Excel / file'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.ppt,.pptx"
          onChange={handleFileChange}
        />
        {department.document && (
          <button type="button" className="btn-secondary text-status-flagged" disabled={removing} onClick={handleRemove}>
            <i className="fa-solid fa-trash" /> {removing ? 'Removing…' : 'Remove'}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-status-flagged">{error}</p>}
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

  async function handleSaveLink(id: string, url: string, name: string) {
    await api.post(`/api/departments/${id}/document/link`, { url, name: name || undefined });
    await load();
  }

  async function handleUploadFile(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/api/departments/${id}/document/upload`, {
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

  async function handleRemoveDocument(id: string) {
    await api.delete(`/api/departments/${id}/document`);
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

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-title">Department List</h2>
          <p className="page-subtitle">
            {view === 'manage'
              ? 'Share a link or upload a file for each department.'
              : 'Quick access to every active department report.'}
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

      {error && <p className="mb-4 text-sm text-status-flagged">{error}</p>}
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
                      href={department.document.url}
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

                {view === 'manage' && canManage ? (
                  <DocumentPanel
                    department={department}
                    onSaveLink={(url, name) => handleSaveLink(department.id, url, name)}
                    onUploadFile={(file) => handleUploadFile(department.id, file)}
                    onRemoveDocument={() => handleRemoveDocument(department.id)}
                  />
                ) : department.document ? (
                  <a
                    href={department.document.url}
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
