'use client';

import RoleGuard from '@/components/RoleGuard';
import AppShell from '@/components/AppShell';
import NotificationBell from '@/components/content/NotificationBell';
import RefreshButton from '@/components/content/RefreshButton';
import ThemeToggle from '@/components/content/ThemeToggle';
import ThemeScope from '@/components/content/ThemeScope';
import { ThemeProvider } from '@/lib/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import { getNavItemsForRole } from '@/lib/navItems';

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navItems = getNavItemsForRole(user?.role);

  return (
    <ThemeProvider>
      <ThemeScope>
        <RoleGuard role={['admin', 'super_admin']}>
          <AppShell
            navItems={navItems}
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
