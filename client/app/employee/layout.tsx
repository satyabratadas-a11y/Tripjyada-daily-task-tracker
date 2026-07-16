'use client';

import RoleGuard from '@/components/RoleGuard';
import AppShell from '@/components/AppShell';
import NotificationBell from '@/components/content/NotificationBell';
import RefreshButton from '@/components/content/RefreshButton';
import ThemeScope from '@/components/content/ThemeScope';
import ThemeToggle from '@/components/content/ThemeToggle';
import { ThemeProvider } from '@/lib/ThemeContext';
import { EMPLOYEE_NAV_ITEMS } from '@/lib/navItems';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ThemeScope>
        <RoleGuard role="employee">
          <AppShell
            navItems={EMPLOYEE_NAV_ITEMS}
            headerActions={
              <div className="flex items-center gap-2">
                <RefreshButton />
                <NotificationBell />
                <ThemeToggle />
              </div>
            }
          >
            {children}
          </AppShell>
        </RoleGuard>
      </ThemeScope>
    </ThemeProvider>
  );
}
