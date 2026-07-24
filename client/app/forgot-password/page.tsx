'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

const fieldClass =
  'mb-3 rounded-md border-0 bg-gray-100 p-2 text-gray-900 transition duration-150 ease-in-out focus:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-brand';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send reset link');
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
            <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            If an account exists for that email, a password reset link has been sent to it. The link is valid for 1
            hour.
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
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <Image src="/logo.webp" alt="Tripjyada" width={56} height={56} unoptimized className="rounded-xl" />
          <h2 className="text-2xl font-bold text-gray-900">Forgot password</h2>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Enter the email on your account and we&apos;ll send you a link to reset your password.
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
            autoFocus
          />

          {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="mt-1 rounded-md bg-gradient-to-r from-brand-dark to-brand-light px-4 py-2 font-bold text-white transition duration-150 ease-in-out hover:from-brand hover:to-brand-light disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Send reset link'}
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
