'use client';

import { useRef, useState } from 'react';
import { api, ApiError, API_URL } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import Avatar from '@/components/Avatar';
import type { User } from '@/lib/types';

export default function ProfileForm() {
  const { user, completeLogin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [employeeCode, setEmployeeCode] = useState(user?.employeeCode ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  if (!user) return null;

  const dirty = name.trim() !== user.name || email.trim() !== user.email || employeeCode.trim() !== user.employeeCode;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!dirty) return;
    setSaving(true);
    try {
      const { user: updated } = await api.patch<{ user: User }>('/api/auth/me', { name, email, employeeCode });
      completeLogin(updated);
      setSuccess('Profile updated');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoSelect(file: File) {
    setPhotoError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch(`${API_URL}/api/auth/me/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(body.error || 'Upload failed', res.status);
      }
      const data: { user: User } = await res.json();
      completeLogin(data.user);
    } catch (err) {
      setPhotoError(err instanceof ApiError ? err.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemovePhoto() {
    setPhotoError('');
    setUploading(true);
    try {
      const { user: updated } = await api.delete<{ user: User }>('/api/auth/me/avatar');
      completeLogin(updated);
    } catch (err) {
      setPhotoError(err instanceof ApiError ? err.message : 'Failed to remove photo');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-sm space-y-4">
      <div className="card flex items-center gap-4">
        <Avatar name={user.name} avatarUrl={user.avatarUrl} size={64} />
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <label className="btn-secondary cursor-pointer text-xs">
              {uploading ? 'Uploading…' : 'Change photo'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoSelect(file);
                }}
              />
            </label>
            {user.avatarUrl && (
              <button type="button" onClick={handleRemovePhoto} disabled={uploading} className="btn-secondary text-xs">
                Remove
              </button>
            )}
          </div>
          {photoError && <p className="text-xs text-status-flagged">{photoError}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Employee ID</label>
          <input
            type="text"
            required
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
            className="input"
          />
        </div>
        {error && <p className="text-sm text-status-flagged">{error}</p>}
        {success && <p className="text-sm text-status-completed">{success}</p>}
        <button type="submit" disabled={saving || !dirty} className="btn-primary w-full">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
