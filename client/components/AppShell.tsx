'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { formatRoleLabel, profileRouteForRole } from '@/lib/roles';
import { useAttendanceCheckin } from '@/lib/useAttendanceCheckin';
import { useAppNavigationHistory } from '@/lib/useAppNavigationHistory';
import Avatar from '@/components/Avatar';

interface NavItem {
  href: string;
  label: string;
  icon?: string;
}

export default function AppShell({
  navItems,
  headerActions,
  children,
}: {
  navItems: NavItem[];
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  useAttendanceCheckin(user);
  const { canGoBack, depth, goBack, clearHistory } = useAppNavigationHistory(user?.id);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      clearHistory();
      await logout();
    } finally {
      router.replace('/login');
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 text-gray-900 dark:bg-ink dark:text-gray-100">
      <div className="relative z-50 flex shrink-0 items-center justify-between bg-ink px-4 py-3 md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          {canGoBack && (
            <button
              type="button"
              onClick={goBack}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
              title={`Go back${depth > 1 ? ` (${depth} pages in history)` : ''}`}
              aria-label="Go back"
            >
              <i className="fa-solid fa-arrow-left" />
            </button>
          )}
          <Image src="/logo.webp" alt="Tripjyada" width={28} height={28} className="rounded" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Tripjyada Task Tracker</p>
            {user && <p className="truncate text-xs text-gray-400">{user.name}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerActions}
          {user && (
            <Link href={profileRouteForRole(user.role)} title="My profile">
              <Avatar name={user.name} avatarUrl={user.avatarUrl} size={28} />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-md border border-white/10 px-3 py-2 text-sm text-white"
          >
            <i className={mobileOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'} />
          </button>
        </div>
      </div>

      {mobileOpen && <button type="button" className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 h-screen w-60 max-w-[80vw] shrink-0 overflow-y-auto bg-ink transition-transform md:max-w-none md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-white/[0.08] px-5 py-4">
          <Image src="/logo.webp" alt="Tripjyada" width={32} height={32} className="rounded-lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Tripjyada Task Tracker</p>
            {user && (
              <p className="truncate text-xs text-gray-500">
                {user.name} · {formatRoleLabel(user.role)}
              </p>
            )}
          </div>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                  active ? 'bg-white/10 font-medium text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {active && (
                  <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-brand-light to-brand" />
                )}
                {item.icon && (
                  <i className={`${item.icon} w-4 text-center text-xs ${active ? 'text-brand-light' : ''}`} />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <i className="fa-solid fa-right-from-bracket text-xs" />
            Log out
          </button>
        </div>
      </aside>
      <div className="flex min-h-0 flex-1 flex-col md:ml-60">
        {(headerActions || user) && (
          <div className="hidden shrink-0 items-center justify-between gap-3 bg-ink px-6 py-2.5 md:flex">
            <div>
              {canGoBack && (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
                  title={`Go back${depth > 1 ? ` (${depth} pages in history)` : ''}`}
                  aria-label="Go back"
                >
                  <i className="fa-solid fa-arrow-left" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {headerActions}
              {user && (
                <Link href={profileRouteForRole(user.role)} title="My profile">
                  <Avatar name={user.name} avatarUrl={user.avatarUrl} size={32} />
                </Link>
              )}
            </div>
          </div>
        )}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
