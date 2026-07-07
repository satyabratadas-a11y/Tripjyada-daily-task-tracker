export interface NavItem {
  href: string;
  label: string;
  icon?: string;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/admin/today', label: "Today's Tasks", icon: 'fa-solid fa-list-check' },
  { href: '/admin/users', label: 'Users', icon: 'fa-solid fa-users' },
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
