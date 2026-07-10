import type { Role } from './types';

export function isSuperAdmin(role?: Role | null) {
  return role === 'super_admin';
}

export function isAdminLike(role?: Role | null) {
  return role === 'super_admin' || role === 'admin';
}

export function homeRouteForRole(role?: Role | null) {
  return isAdminLike(role) ? '/admin/today' : '/employee/today';
}

export function formatRoleLabel(role?: string | null) {
  if (!role) return '';
  return role
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
