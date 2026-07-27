'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import PasswordInput from '@/components/PasswordInput';

const fieldClass =
  'mb-3 rounded-md border-0 bg-gray-100 p-2 text-gray-900 transition duration-150 ease-in-out focus:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-brand';
const passwordFieldClass = 'mb-3 rounded-md border-0 bg-gray-100 focus:bg-gray-200 focus:ring-1 focus:ring-brand';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    email.trim().length > 0 && phone.trim().length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.post('/api/auth/forgot-password', { email, phone, newPassword });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset password');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <Image src="/logo.webp" alt="Tripjyada" width={56} height={56} unoptimized className="rounded-xl" />
            <h2 className="text-2xl font-bold text-gray-900">Password updated</h2>
          </div>
          <p className="mt-2 text-sm text-gray-500">You can now log in with your new password.</p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-md bg-gradient-to-r from-brand-dark to-brand-light px-4 py-2 text-sm font-bold text-white transition duration-150 ease-in-out hover:from-brand hover:to-brand-light"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <Image src="/logo.webp" alt="Tripjyada" width={56} height={56} unoptimized className="rounded-xl" />
          <h2 className="text-2xl font-bold text-gray-900">Forgot password</h2>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Enter the email and phone number on your account, then choose a new password.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
          <input
            type="email"
            required
            placeholder="Email address"
            className={fieldClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            type="tel"
            required
            placeholder="Phone number"
            className={fieldClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            placeholder="New password"
            required
            minLength={8}
            autoComplete="new-password"
            className={passwordFieldClass}
          />
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm new password"
            required
            autoComplete="new-password"
            className={passwordFieldClass}
          />
          {confirmPassword.length > 0 && confirmPassword !== newPassword && (
            <p className="-mt-2 mb-3 text-xs text-red-600">Passwords do not match.</p>
          )}

          {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="mt-1 rounded-md bg-gradient-to-r from-brand-dark to-brand-light px-4 py-2 font-bold text-white transition duration-150 ease-in-out hover:from-brand hover:to-brand-light disabled:opacity-50"
          >
            {submitting ? 'Updating…' : 'Reset password'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-900">
          <Link href="/login" className="text-brand hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
