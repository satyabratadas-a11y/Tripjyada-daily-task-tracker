'use client';

import { useEffect, useRef, useState } from 'react';
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
  // Shown immediately on file select so the photo feels instant instead of waiting on the
  // Cloudinary round trip; swapped out for the real URL (or dropped) once the request settles.
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
    setPreviewUrl(URL.createObjectURL(file));
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
      setPreviewUrl('');
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
    <div className="max-w-lg space-y-5">
      <div>
        <h1 className="text-lg font-semibold dark:text-gray-100">My profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Update your photo and personal details.</p>
      </div>

      <div className="card flex items-center gap-5">
        <div className="relative shrink-0">
          <Avatar name={user.name} avatarUrl={previewUrl || user.avatarUrl} size={88} />
          <label
            title="Change photo"
            className={`absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-brand text-white shadow-sm transition hover:bg-brand-dark dark:border-ink-light ${
              uploading ? 'pointer-events-none opacity-80' : ''
            }`}
          >
            <i className={uploading ? 'fa-solid fa-circle-notch fa-spin text-xs' : 'fa-solid fa-camera text-xs'} />
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
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="truncate font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">JPG or PNG, up to 5MB</p>
          {user.avatarUrl && !uploading && (
            <button type="button" onClick={handleRemovePhoto} className="block text-xs text-status-flagged hover:underline">
              Remove photo
            </button>
          )}
          {photoError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {photoError}
            </p>
          )}
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
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Used to log in — must be unique.</p>
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

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
            {success}
          </p>
        )}

        <button type="submit" disabled={saving || !dirty} className="btn-primary w-full">
          <i className={saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-floppy-disk'} />
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
