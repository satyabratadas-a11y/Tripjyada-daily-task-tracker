'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'admin') {
      router.replace('/admin/today');
    } else {
      router.replace('/employee/today');
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Loading…</div>
  );
}
