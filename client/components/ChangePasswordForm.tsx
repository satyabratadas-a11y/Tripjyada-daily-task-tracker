'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import PasswordInput from '@/components/PasswordInput';

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const passwordsMatch = confirmPassword.length === 0 || confirmPassword === newPassword;
  const canSubmit = currentPassword.length > 0 && newPassword.length >= 8 && confirmPassword === newPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError('');
    setSuccess('');
    if (!canSubmit) return;
    setSaving(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword, newPassword });
      setSuccess('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTouched(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
      <div>
        <label className="mb-1 block text-sm font-medium">Current password</label>
        <PasswordInput value={currentPassword} onChange={setCurrentPassword} required autoComplete="current-password" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">New password</label>
        <PasswordInput value={newPassword} onChange={setNewPassword} required minLength={8} autoComplete="new-password" />
        {touched && newPassword.length > 0 && newPassword.length < 8 && (
          <p className="mt-1 text-xs text-status-flagged">Password must be at least 8 characters.</p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Confirm new password</label>
        <PasswordInput value={confirmPassword} onChange={setConfirmPassword} required autoComplete="new-password" />
        {touched && !passwordsMatch && <p className="mt-1 text-xs text-status-flagged">Passwords do not match.</p>}
      </div>
      {error && <p className="text-sm text-status-flagged">{error}</p>}
      {success && <p className="text-sm text-status-completed">{success}</p>}
      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? 'Saving…' : 'Update password'}
      </button>
    </form>
  );
}
