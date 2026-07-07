'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import PasswordInput from '@/components/PasswordInput';
import InputIcon from '@/components/InputIcon';
import type { User } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { user } = await api.post<{ user: User }>('/api/auth/login', { email, password });
      await refresh();
      router.replace(user.role === 'admin' ? '/admin/today' : '/employee/today');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-backdrop">
      <div className="glass-card w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 rounded-2xl bg-white/15 p-2 shadow-lg backdrop-blur">
            <Image src="/logo.webp" alt="Tripjyada" width={52} height={52} className="rounded-xl" />
          </div>
          <h1 className="text-xl font-semibold text-white">Tripjyada Task Tracker</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/60">
            <i className="fa-solid fa-shield-halved text-xs" />
            Sign in to your account
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">Email</label>
            <div className="relative">
              <InputIcon icon="fa-solid fa-envelope" variant="glass" />
              <input
                type="email"
                required
                className="glass-input pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">Password</label>
            <PasswordInput value={password} onChange={setPassword} required autoComplete="current-password" variant="glass" />
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
                Signing in…
              </>
            ) : (
              <>
                <i className="fa-solid fa-right-to-bracket" />
                Sign in
              </>
            )}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-white/60">
          No account?{' '}
          <Link href="/signup" className="font-medium text-brand-light hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
