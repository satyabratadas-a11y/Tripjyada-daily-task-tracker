'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import PasswordInput from '@/components/PasswordInput';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fieldClass =
  'mb-3 rounded-md border-0 bg-gray-100 p-2 text-gray-900 transition duration-150 ease-in-out focus:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-brand';
const passwordFieldClass = 'mb-3 rounded-md border-0 bg-gray-100 focus:bg-gray-200 focus:ring-1 focus:ring-brand';

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', jobTitle: '', employeeCode: '', password: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const emailValid = form.email.length === 0 || EMAIL_REGEX.test(form.email);
  const passwordsMatch = confirmPassword.length === 0 || confirmPassword === form.password;
  const canSubmit =
    form.name.trim().length > 0 &&
    form.employeeCode.trim().length > 0 &&
    EMAIL_REGEX.test(form.email) &&
    form.password.length >= 8 &&
    confirmPassword === form.password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError('');
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.post('/api/auth/signup', form);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Signup failed');
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
            <h2 className="text-2xl font-bold text-gray-900">Account created</h2>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            A super admin needs to approve your account before you can log in. Check back soon.
          </p>
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
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <Image src="/logo.webp" alt="Tripjyada" width={56} height={56} unoptimized className="rounded-xl" />
          <h2 className="text-2xl font-bold text-gray-900">Create account</h2>
        </div>
        <p className="mb-4 text-sm text-gray-500">Requests are approved by a super admin</p>

        <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
          <input
            required
            placeholder="Full name"
            className={fieldClass}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            autoComplete="name"
          />
          <input
            required
            placeholder="Employee ID, e.g. EMP1023"
            className={fieldClass}
            value={form.employeeCode}
            onChange={(e) => update('employeeCode', e.target.value)}
          />
          {touched && form.employeeCode.trim().length === 0 && (
            <p className="-mt-2 mb-3 text-xs text-red-600">Employee ID is required.</p>
          )}
          <input
            placeholder="Job title, e.g. Video Editor"
            className={fieldClass}
            value={form.jobTitle}
            onChange={(e) => update('jobTitle', e.target.value)}
          />
          <input
            type="email"
            required
            placeholder="Email address"
            className={fieldClass}
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            autoComplete="email"
          />
          {touched && !emailValid && <p className="-mt-2 mb-3 text-xs text-red-600">Enter a valid email address.</p>}
          <PasswordInput
            value={form.password}
            onChange={(v) => update('password', v)}
            placeholder="Password"
            required
            minLength={8}
            autoComplete="new-password"
            className={passwordFieldClass}
          />
          {touched && form.password.length > 0 && form.password.length < 8 && (
            <p className="-mt-2 mb-3 text-xs text-red-600">Password must be at least 8 characters.</p>
          )}
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm password"
            required
            autoComplete="new-password"
            className={passwordFieldClass}
          />
          {touched && !passwordsMatch && <p className="-mt-2 mb-3 text-xs text-red-600">Passwords do not match.</p>}

          {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-md bg-gradient-to-r from-brand-dark to-brand-light px-4 py-2 font-bold text-white transition duration-150 ease-in-out hover:from-brand hover:to-brand-light disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-900">
          Already have an account?{' '}
          <Link href="/login" className="text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
