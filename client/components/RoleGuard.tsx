'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import type { Role } from '@/lib/types';
import { homeRouteForRole } from '@/lib/roles';

export default function RoleGuard({
  role,
  children,
}: {
  role: Role | Role[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const allowedRoleKey = Array.isArray(role) ? role.join('|') : role;
  const allowedRoles = allowedRoleKey.split('|') as Role[];
  const hasAccess = !!user && allowedRoles.includes(user.role);

  useEffect(() => {
    const roles = allowedRoleKey.split('|');
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (!roles.includes(user.role)) {
      router.replace(homeRouteForRole(user.role));
    }
  }, [allowedRoleKey, user, loading, router]);

  if (loading || !user || !hasAccess) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Loading…</div>;
  }

  return <>{children}</>;
}
