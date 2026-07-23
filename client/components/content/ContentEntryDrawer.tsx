'use client';

import { useEffect, useRef, useState } from 'react';
import { api, ApiError, API_URL } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { isAdminLike } from '@/lib/roles';
import { cloudinaryThumb } from '@/lib/cloudinaryUrl';
import EntryFormFields, { type EntryFormValue } from './EntryFormFields';
import { ContentStatusBadge, ApprovalStatusBadge } from './ContentBadges';
import type { Campaign, ClientMember, ClientRole, ContentComment, ContentEntry, ContentPillar } from '@/lib/content-types';

function toFormValue(entry: ContentEntry): EntryFormValue {
  return {
    date: entry.date.slice(0, 10),
    time: entry.time,
    format: entry.format,
    pillar: entry.pillar?.id || '',
    campaign: entry.campaign?.id || '',
    idea: entry.idea,
    hook: entry.hook,
    caption: entry.caption,
    cta: entry.cta,
    platform: entry.platform,
    assignee: entry.assignee?.id || '',
    status: entry.status,
  };
}

export default function ContentEntryDrawer({
  clientId,
  entryId,
  myRole,
  pillars,
  campaigns,
  members,
  onClose,
  onChanged,
  onDeleted,
}: {
  clientId: string;
  entryId: string;
  myRole: ClientRole | null;
  pillars: ContentPillar[];
  campaigns: Campaign[];
  members: ClientMember[];
  onClose: () => void;
  onChanged: (entry: ContentEntry) => void;
  onDeleted: (id: string) => void;
}) {
  const { user } = useAuth();
  const canEdit = myRole === 'owner' || myRole === 'editor' || myRole === 'viewer';
  const canApprove = myRole === 'owner';

  const [entry, setEntry] = useState<ContentEntry | null>(null);
  const [form, setForm] = useState<EntryFormValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<ContentComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [entryData, commentData] = await Promise.all([
        api.get<{ entry: ContentEntry }>(`/api/content/clients/${clientId}/entries/${entryId}`),
        api.get<{ comments: ContentComment[] }>(`/api/content/clients/${clientId}/entries/${entryId}/comments`),
      ]);
      setEntry(entryData.entry);
      setForm(toFormValue(entryData.entry));
      setComments(commentData.comments);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load content entry');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId]);

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setError('');
    try {
      const { entry: updated } = await api.patch<{ entry: ContentEntry }>(`/api/content/clients/${clientId}/entries/${entryId}`, {
        date: form.date,
        time: form.time,
        format: form.format,
        pillar: form.pillar || null,
        campaign: form.campaign || null,
        idea: form.idea,
        hook: form.hook,
        caption: form.caption,
        cta: form.cta,
        platform: form.platform,
        assignee: form.assignee || null,
        status: form.status,
      });
      setEntry(updated);
      setForm(toFormValue(updated));
      onChanged(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function handleApproval(approvalStatus: 'Approved' | 'Rejected' | 'Changes Requested') {
    setSaving(true);
    setError('');
    try {
      const { entry: updated } = await api.patch<{ entry: ContentEntry }>(
        `/api/content/clients/${clientId}/entries/${entryId}/approval`,
        { approvalStatus, reviewNote }
      );
      setEntry(updated);
      setForm(toFormValue(updated));
      setReviewNote('');
      onChanged(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update approval');
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate() {
    try {
      await api.post(`/api/content/clients/${clientId}/entries/${entryId}/duplicate`, {});
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to duplicate');
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this content entry? This cannot be undone.')) return;
    try {
      await api.delete(`/api/content/clients/${clientId}/entries/${entryId}`);
      onDeleted(entryId);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
    }
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    try {
      const { comment } = await api.post<{ comment: ContentComment }>(`/api/content/clients/${clientId}/entries/${entryId}/comments`, {
        text: commentText.trim(),
      });
      setComments((prev) => [...prev, comment]);
      setCommentText('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add comment');
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await api.delete(`/api/content/clients/${clientId}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete comment');
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/api/content/clients/${clientId}/entries/${entryId}/attachments`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(body.error || 'Upload failed', res.status);
      }
      const data: { entry: ContentEntry } = await res.json();
      setEntry(data.entry);
      onChanged(data.entry);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    try {
      const { entry: updated } = await api.delete<{ entry: ContentEntry }>(
        `/api/content/clients/${clientId}/entries/${entryId}/attachments/${attachmentId}`
      );
      setEntry(updated);
      onChanged(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete attachment');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl dark:bg-ink-light">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-ink-light">
          <div className="flex items-center gap-2">
            {entry && <ContentStatusBadge value={entry.status} />}
            {entry && <ApprovalStatusBadge value={entry.approvalStatus} />}
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="flex-1 space-y-6 px-5 py-5">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : !entry || !form ? (
            <p className="text-sm text-status-flagged">{error || 'Not found'}</p>
          ) : (
            <>
              {error && <p className="text-xs text-status-flagged">{error}</p>}

              <fieldset disabled={!canEdit} className={!canEdit ? 'opacity-70' : ''}>
                <EntryFormFields
                  clientId={clientId}
                  value={form}
                  onChange={(patch) => setForm((prev) => (prev ? { ...prev, ...patch } : prev))}
                  pillars={pillars}
                  campaigns={campaigns}
                  members={members}
                  aiEnabled={canEdit}
                />
              </fieldset>

              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <button className="btn-primary" disabled={saving} onClick={handleSave}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                  <button className="btn-secondary" onClick={handleDuplicate}>
                    <i className="fa-solid fa-copy" /> Duplicate
                  </button>
                  <button className="btn-secondary text-status-flagged" onClick={handleDelete}>
                    <i className="fa-solid fa-trash" /> Delete
                  </button>
                </div>
              )}

              {canApprove && entry.status === 'Review' && (
                <div className="card space-y-2 border-amber-300 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <p className="text-xs font-semibold uppercase text-amber-800 dark:text-amber-300">Approval decision</p>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Optional note for the creator…"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-primary" disabled={saving} onClick={() => handleApproval('Approved')}>
                      Approve
                    </button>
                    <button className="btn-secondary" disabled={saving} onClick={() => handleApproval('Changes Requested')}>
                      Request changes
                    </button>
                    <button className="btn-secondary text-status-flagged" disabled={saving} onClick={() => handleApproval('Rejected')}>
                      Reject
                    </button>
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Attachments</p>
                  {canEdit && (
                    <label className="cursor-pointer text-xs text-brand hover:underline">
                      {uploading ? 'Uploading…' : '+ Upload creative / reel'}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*,video/*"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(file);
                        }}
                      />
                    </label>
                  )}
                </div>
                {entry.attachments.length === 0 ? (
                  <p className="text-xs text-gray-400">No files uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {entry.attachments.map((a) => (
                      <div key={a.id} className="group relative overflow-hidden rounded-md border border-gray-200 dark:border-white/10">
                        {a.resourceType === 'image' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cloudinaryThumb(a.url, 80)} alt={a.name} className="h-20 w-full object-cover" />
                        ) : (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-20 w-full items-center justify-center bg-gray-100 text-2xl text-gray-400 dark:bg-white/5"
                          >
                            <i className="fa-solid fa-file" />
                          </a>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(a.id)}
                            className="absolute right-1 top-1 hidden rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white group-hover:block"
                          >
                            <i className="fa-solid fa-xmark" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Comments & feedback</p>
                <div className="mb-3 space-y-2">
                  {comments.length === 0 ? (
                    <p className="text-xs text-gray-400">No comments yet.</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="rounded-md border border-gray-100 p-2 text-sm dark:border-white/10">
                        <div className="mb-0.5 flex items-center justify-between">
                          <span className="font-medium">{c.author?.name || 'Unknown'}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                            {(c.author?.id === user?.id || isAdminLike(user?.role)) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c.id)}
                                className="text-[10px] text-gray-400 hover:text-status-flagged"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input"
                    placeholder="Add a comment…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComment();
                    }}
                  />
                  <button className="btn-secondary" onClick={handleAddComment}>
                    Post
                  </button>
                </div>
              </div>

              {entry.history.length > 0 && (
                <div>
                  <button
                    type="button"
                    className="text-xs font-semibold uppercase text-gray-500 hover:text-brand dark:text-gray-400"
                    onClick={() => setShowHistory((v) => !v)}
                  >
                    <i className={`fa-solid ${showHistory ? 'fa-chevron-down' : 'fa-chevron-right'} mr-1`} />
                    History ({entry.history.length})
                  </button>
                  {showHistory && (
                    <ul className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                      {[...entry.history].reverse().map((h, i) => (
                        <li key={i}>
                          <span className="font-medium">{h.field}</span>: {String(h.before ?? '—')} → {String(h.after ?? '—')} ·{' '}
                          {new Date(h.changedAt).toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
