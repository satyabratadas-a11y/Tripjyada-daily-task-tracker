'use client';

import RoleGuard from '@/components/RoleGuard';
import AppShell from '@/components/AppShell';
import { B2B_AGENT_NAV_ITEMS } from '@/lib/navItems';

export default function B2BLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="b2b_agent">
      <AppShell navItems={B2B_AGENT_NAV_ITEMS}>{children}</AppShell>
    </RoleGuard>
  );
}
