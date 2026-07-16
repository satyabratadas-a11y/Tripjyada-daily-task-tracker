'use client';

import AuthGuard from '@/components/AuthGuard';
import AppShell from '@/components/AppShell';
import NotificationBell from '@/components/content/NotificationBell';
import RefreshButton from '@/components/content/RefreshButton';
import ThemeToggle from '@/components/content/ThemeToggle';
import ThemeScope from '@/components/content/ThemeScope';
import { ThemeProvider } from '@/lib/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import { getNavItemsForRole } from '@/lib/navItems';

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navItems = getNavItemsForRole(user?.role);

  return (
    <ThemeProvider>
      <ThemeScope>
        <AuthGuard>
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
        </AuthGuard>
      </ThemeScope>
    </ThemeProvider>
  );
}
