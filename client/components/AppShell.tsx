'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { formatRoleLabel } from '@/lib/roles';

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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.replace('/login');
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 text-gray-900 dark:bg-ink dark:text-gray-100">
      <div className="relative z-50 flex shrink-0 items-center justify-between bg-ink px-4 py-3 md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Image src="/logo.webp" alt="Tripjyada" width={28} height={28} className="rounded" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Tripjyada Task Tracker</p>
            {user && <p className="truncate text-xs text-gray-400">{user.name}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerActions}
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
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
          <Image src="/logo.webp" alt="Tripjyada" width={32} height={32} className="rounded" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Tripjyada Task Tracker</p>
            {user && (
              <p className="truncate text-xs text-gray-400">
                {user.name} · {formatRoleLabel(user.role)}
              </p>
            )}
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                  active ? 'bg-brand text-white shadow-sm shadow-brand/40' : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.icon && <i className={`${item.icon} w-4 text-center text-xs`} />}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/10"
          >
            <i className="fa-solid fa-right-from-bracket text-xs" />
            Log out
          </button>
        </div>
      </aside>
      <div className="flex min-h-0 flex-1 flex-col md:ml-60">
        {headerActions && (
          <div className="hidden shrink-0 items-center justify-end gap-2 bg-ink px-6 py-2 md:flex">{headerActions}</div>
        )}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
