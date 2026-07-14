'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import GoogleSignInPanel from '@/components/GoogleSignInPanel';
import PasswordInput from '@/components/PasswordInput';
import type { User } from '@/lib/types';
import { homeRouteForRole } from '@/lib/roles';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const { user } = await api.post<{ user: User }>('/api/auth/login', { email, password });
      await refresh();
      router.replace(homeRouteForRole(user.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <Image src="/logo.webp" alt="Tripjyada" width={56} height={56} unoptimized className="rounded-xl" />
          <h2 className="text-2xl font-bold text-gray-900">Login</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
          <input
            type="email"
            required
            placeholder="Email address"
            className="mb-4 rounded-md border-0 bg-gray-100 p-2 text-gray-900 transition duration-150 ease-in-out focus:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-brand"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder="Password"
            required
            autoComplete="current-password"
            className="mb-4 rounded-md border-0 bg-gray-100 focus:bg-gray-200 focus:ring-1 focus:ring-brand"
          />

          {error && <p className="mb-4 rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</p>}
          {notice && <p className="mb-4 rounded-md bg-amber-50 p-2 text-sm text-amber-700">{notice}</p>}

          <div className="flex flex-wrap items-center justify-between">
            <label htmlFor="remember-me" className="cursor-pointer text-sm text-gray-900">
              <input type="checkbox" id="remember-me" className="mr-2 accent-brand" />
              Remember me
            </label>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="mb-0.5 text-sm text-brand hover:underline"
            >
              Forgot password?
            </a>
            <p className="mt-4 text-gray-900">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-sm text-brand hover:underline">
                Signup
              </Link>
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 rounded-md bg-gradient-to-r from-brand-dark to-brand-light px-4 py-2 font-bold text-white transition duration-150 ease-in-out hover:from-brand hover:to-brand-light disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="mt-5">
          <GoogleSignInPanel
            onError={(message) => {
              setNotice('');
              setError(message);
            }}
            onPending={(message) => {
              setError('');
              setNotice(message);
            }}
          />
        </div>
      </div>
    </div>
  );
}
