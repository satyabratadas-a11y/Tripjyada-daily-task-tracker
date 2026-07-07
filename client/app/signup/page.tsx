'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import PasswordInput from '@/components/PasswordInput';
import InputIcon from '@/components/InputIcon';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      <div className="auth-backdrop">
        <div className="glass-card w-full max-w-sm text-center">
          <i className="fa-solid fa-circle-check mb-3 text-4xl text-brand-light" />
          <h1 className="mb-2 text-xl font-semibold text-white">Account created</h1>
          <p className="text-sm text-white/60">
            An admin needs to approve your account before you can log in. Check back soon.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
          >
            <i className="fa-solid fa-arrow-left" />
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-backdrop">
      <div className="glass-card w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 rounded-2xl bg-white/15 p-2 shadow-lg backdrop-blur">
            <Image src="/logo.webp" alt="Tripjyada" width={52} height={52} className="rounded-xl" />
          </div>
          <h1 className="text-xl font-semibold text-white">Create account</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/60">
            <i className="fa-solid fa-user-check text-xs" />
            Requests are approved by an admin
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">Full name</label>
            <div className="relative">
              <InputIcon icon="fa-solid fa-user" variant="glass" />
              <input
                required
                className="glass-input pl-9"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">Employee ID</label>
            <div className="relative">
              <InputIcon icon="fa-solid fa-id-badge" variant="glass" />
              <input
                required
                placeholder="e.g. EMP1023"
                className="glass-input pl-9"
                value={form.employeeCode}
                onChange={(e) => update('employeeCode', e.target.value)}
              />
            </div>
            {touched && form.employeeCode.trim().length === 0 && (
              <p className="mt-1 text-xs text-red-300">Employee ID is required.</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">Job title</label>
            <div className="relative">
              <InputIcon icon="fa-solid fa-briefcase" variant="glass" />
              <input
                placeholder="e.g. Video Editor"
                className="glass-input pl-9"
                value={form.jobTitle}
                onChange={(e) => update('jobTitle', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">Email</label>
            <div className="relative">
              <InputIcon icon="fa-solid fa-envelope" variant="glass" />
              <input
                type="email"
                required
                className="glass-input pl-9"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </div>
            {touched && !emailValid && <p className="mt-1 text-xs text-red-300">Enter a valid email address.</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">Password</label>
            <PasswordInput
              value={form.password}
              onChange={(v) => update('password', v)}
              required
              minLength={8}
              autoComplete="new-password"
              variant="glass"
            />
            {touched && form.password.length > 0 && form.password.length < 8 && (
              <p className="mt-1 text-xs text-red-300">Password must be at least 8 characters.</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">Confirm password</label>
            <PasswordInput value={confirmPassword} onChange={setConfirmPassword} required autoComplete="new-password" variant="glass" />
            {touched && !passwordsMatch && <p className="mt-1 text-xs text-red-300">Passwords do not match.</p>}
          </div>
          {error && (
            <p className="flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              <i className="fa-solid fa-circle-exclamation" />
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark hover:shadow-brand/40 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin" />
                Creating…
              </>
            ) : (
              <>
                <i className="fa-solid fa-user-plus" />
                Sign up
              </>
            )}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-white/60">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand-light hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
