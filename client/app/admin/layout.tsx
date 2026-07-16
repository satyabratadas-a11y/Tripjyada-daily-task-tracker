'use client';

import RoleGuard from '@/components/RoleGuard';
import AppShell from '@/components/AppShell';
import NotificationBell from '@/components/content/NotificationBell';
import RefreshButton from '@/components/content/RefreshButton';
import ThemeScope from '@/components/content/ThemeScope';
import ThemeToggle from '@/components/content/ThemeToggle';
import { ThemeProvider } from '@/lib/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import { getNavItemsForRole } from '@/lib/navItems';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <ThemeProvider>
      <ThemeScope>
        <RoleGuard role={['admin', 'super_admin']}>
          <AppShell
            navItems={getNavItemsForRole(user?.role)}
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
