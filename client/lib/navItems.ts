import type { Role } from './types';
import { isSuperAdmin } from './roles';

export interface NavItem {
  href: string;
  label: string;
  icon?: string;
}

const BASE_ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/admin/today', label: "Today's Tasks", icon: 'fa-solid fa-list-check' },
  { href: '/admin/my-today', label: 'My Today', icon: 'fa-solid fa-user-clock' },
  { href: '/admin/my-log', label: 'My Monthly Log', icon: 'fa-solid fa-calendar-days' },
  { href: '/admin/dashboard', label: 'Dashboard', icon: 'fa-solid fa-gauge-high' },
  { href: '/admin/report', label: 'Reports', icon: 'fa-solid fa-file-excel' },
  { href: '/admin/audit', label: 'Audit Log', icon: 'fa-solid fa-clock-rotate-left' },
  { href: '/content', label: 'Content Calendar', icon: 'fa-solid fa-layer-group' },
  { href: '/admin/password', label: 'Change Password', icon: 'fa-solid fa-key' },
];

export const EMPLOYEE_NAV_ITEMS: NavItem[] = [
  { href: '/employee/today', label: "Today's Task", icon: 'fa-solid fa-list-check' },
  { href: '/employee/log', label: 'My Monthly Log', icon: 'fa-solid fa-calendar-days' },
  { href: '/content', label: 'Content Calendar', icon: 'fa-solid fa-layer-group' },
  { href: '/employee/password', label: 'Change Password', icon: 'fa-solid fa-key' },
];

export const B2B_AGENT_NAV_ITEMS: NavItem[] = [
  { href: '/b2b/capture', label: 'Scan Card', icon: 'fa-solid fa-camera' },
  { href: '/b2b/contacts', label: 'B2B Contacts', icon: 'fa-solid fa-address-card' },
  { href: '/b2b/password', label: 'Change Password', icon: 'fa-solid fa-key' },
];

export function getNavItemsForRole(role?: Role | null): NavItem[] {
  if (isSuperAdmin(role)) {
    return [
      { href: '/admin/super-dashboard', label: 'Super Admin', icon: 'fa-solid fa-shield-halved' },
      { href: '/admin/users', label: 'Users', icon: 'fa-solid fa-users' },
      { href: '/admin/monthly-review', label: 'Monthly Review', icon: 'fa-solid fa-calendar-check' },
      // B2B contacts are restricted to the super admin and the b2b_agent who captured them — a
      // plain admin doesn't get this item, unlike the rest of BASE_ADMIN_NAV_ITEMS below.
      { href: '/admin/b2b-contacts', label: 'B2B Contacts', icon: 'fa-solid fa-address-card' },
      ...BASE_ADMIN_NAV_ITEMS,
    ];
  }
  if (role === 'admin') {
    return BASE_ADMIN_NAV_ITEMS;
  }
  if (role === 'b2b_agent') {
    return B2B_AGENT_NAV_ITEMS;
  }
  return EMPLOYEE_NAV_ITEMS;
}
