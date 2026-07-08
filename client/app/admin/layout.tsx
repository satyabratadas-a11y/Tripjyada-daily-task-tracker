'use client';

import RoleGuard from '@/components/RoleGuard';
import AppShell from '@/components/AppShell';
import NotificationBell from '@/components/content/NotificationBell';
import { ADMIN_NAV_ITEMS } from '@/lib/navItems';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="admin">
      <AppShell navItems={ADMIN_NAV_ITEMS} headerActions={<NotificationBell />}>
        {children}
      </AppShell>
    </RoleGuard>
  );
}
