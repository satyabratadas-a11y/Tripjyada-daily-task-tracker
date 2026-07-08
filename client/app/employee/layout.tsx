'use client';

import RoleGuard from '@/components/RoleGuard';
import AppShell from '@/components/AppShell';
import NotificationBell from '@/components/content/NotificationBell';
import { EMPLOYEE_NAV_ITEMS } from '@/lib/navItems';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="employee">
      <AppShell navItems={EMPLOYEE_NAV_ITEMS} headerActions={<NotificationBell />}>
        {children}
      </AppShell>
    </RoleGuard>
  );
}
