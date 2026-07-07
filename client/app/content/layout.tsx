'use client';

import AuthGuard from '@/components/AuthGuard';
import AppShell from '@/components/AppShell';
import NotificationBell from '@/components/content/NotificationBell';
import ThemeToggle from '@/components/content/ThemeToggle';
import ThemeScope from '@/components/content/ThemeScope';
import { ThemeProvider } from '@/lib/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import { ADMIN_NAV_ITEMS, EMPLOYEE_NAV_ITEMS } from '@/lib/navItems';

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navItems = user?.role === 'admin' ? ADMIN_NAV_ITEMS : EMPLOYEE_NAV_ITEMS;

  return (
    <ThemeProvider>
      <ThemeScope>
        <AuthGuard>
          <AppShell
            navItems={navItems}
            headerActions={
              <div className="flex items-center gap-2">
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
