import type { Role } from './types';

export function isSuperAdmin(role?: Role | null) {
  return role === 'super_admin';
}

export function isAdminLike(role?: Role | null) {
  return role === 'super_admin' || role === 'admin';
}

export function isB2BAgent(role?: Role | null) {
  return role === 'b2b_agent';
}

export function homeRouteForRole(role?: Role | null) {
  if (role === 'super_admin') return '/admin/super-dashboard';
  if (role === 'admin') return '/admin/today';
  if (role === 'b2b_agent') return '/b2b/capture';
  return '/employee/today';
}

export function formatRoleLabel(role?: string | null) {
  if (!role) return '';
  return role
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
