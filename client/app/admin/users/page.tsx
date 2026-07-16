'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { formatRoleLabel, isSuperAdmin } from '@/lib/roles';
import type { Role, User, UserStatus } from '@/lib/types';

const ROLE_OPTIONS: Role[] = ['employee', 'b2b_agent', 'admin', 'super_admin'];
const ROLE_LABEL_OVERRIDES: Partial<Record<Role, string>> = { b2b_agent: 'B2B Agent' };
const STATUS_OPTIONS: UserStatus[] = ['active', 'disabled'];

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: Role;
  onChange: (value: Role) => void;
  disabled?: boolean;
}) {
  return (
    <select className="input" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as Role)}>
      {ROLE_OPTIONS.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABEL_OVERRIDES[role] ?? formatRoleLabel(role)}
        </option>
      ))}
    </select>
  );
}

function StatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: UserStatus;
  onChange: (value: UserStatus) => void;
  disabled?: boolean;
}) {
  return (
    <select className="input" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as UserStatus)}>
      {STATUS_OPTIONS.map((status) => (
        <option key={status} value={status}>
          {formatRoleLabel(status)}
        </option>
      ))}
    </select>
  );
}

function ApproveRow({ user, onDone }: { user: User; onDone: () => void }) {
  const [role, setRole] = useState<Role>('employee');
  const [jobTitle, setJobTitle] = useState(user.jobTitle);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');

  async function approve() {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/api/admin/users/${user.id}/approve`, { role, jobTitle });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to approve');
    } finally {
      setSaving(false);
    }
  }

  async function reject() {
    if (!window.confirm(`Remove the signup request from ${user.name}? This cannot be undone.`)) return;
    setRemoving(true);
    setError('');
    try {
      await api.delete(`/api/admin/users/${user.id}`);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <tr>
      <td data-label="Name">{user.name}</td>
      <td data-label="Employee ID">{user.employeeCode}</td>
      <td data-label="Email">{user.email}</td>
      <td data-label="Requested">
        <span title={new Date(user.createdAt).toLocaleString()}>{new Date(user.createdAt).toLocaleDateString()}</span>
      </td>
      <td data-label="Job title">
        <input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
      </td>
      <td data-label="Role">
        <RoleSelect value={role} onChange={setRole} />
      </td>
      <td data-label="Actions">
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={saving || removing} onClick={approve}>
            {saving ? 'Approving…' : 'Approve'}
          </button>
          <button className="btn-secondary" disabled={saving || removing} onClick={reject}>
            {removing ? 'Removing…' : 'Reject'}
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-status-flagged">{error}</p>}
      </td>
    </tr>
  );
}

function ActiveRow({
  user,
  currentUserId,
  onDone,
}: {
  user: User;
  currentUserId?: string;
  onDone: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [jobTitle, setJobTitle] = useState(user.jobTitle);
  const [role, setRole] = useState<Role>(user.role);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const { user: viewer } = useAuth();
  const isSelf = currentUserId === user.id;
  const isDirty = name !== user.name || jobTitle !== user.jobTitle || role !== user.role || status !== user.status;
  const canReviewTasks = user.role === 'employee' || (user.role === 'admin' && isSuperAdmin(viewer?.role));

  async function save() {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/api/admin/users/${user.id}`, {
        name,
        jobTitle,
        role,
        status,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update account');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Remove ${user.name}'s account permanently? This cannot be undone.`)) return;
    setRemoving(true);
    setError('');
    try {
      await api.delete(`/api/admin/users/${user.id}`);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove account');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <tr>
      <td data-label="Name">
        {user.role === 'employee' ? (
          <Link href={`/admin/employees/${user.id}?month=${month}&year=${year}`} className="text-brand hover:underline">
            {user.name}
          </Link>
        ) : (
          user.name
        )}
      </td>
      <td data-label="Employee ID">{user.employeeCode}</td>
      <td data-label="Email">{user.email}</td>
      <td data-label="Account">
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          <input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Job title" />
        </div>
      </td>
      <td data-label="Role">
        <RoleSelect value={role} onChange={setRole} disabled={isSelf} />
      </td>
      <td data-label="Status">
        <StatusSelect value={status} onChange={setStatus} disabled={isSelf} />
      </td>
      <td data-label="Actions">
        <div className="flex flex-wrap gap-2">
          {canReviewTasks && (
            <Link
              href={`/admin/employees/${user.id}?month=${month}&year=${year}&targetRole=${user.role}`}
              className="btn-secondary"
            >
              Review tasks
            </Link>
          )}
          <button className="btn-primary" disabled={saving || removing || !isDirty} onClick={save}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {!isSelf && (
            <button className="btn-secondary" disabled={saving || removing} onClick={remove}>
              {removing ? 'Removing…' : 'Remove'}
            </button>
          )}
        </div>
        {isSelf && <p className="mt-1 text-xs text-gray-400">Your own role and status stay locked for safety.</p>}
        {error && <p className="mt-1 text-xs text-status-flagged">{error}</p>}
      </td>
    </tr>
  );
}

export default function AdminUsersPage() {
  const { user, refresh, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ users: User[] }>('/api/admin/users');
      setUsers(data.users);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await refresh();
        setError(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : 'Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && isSuperAdmin(user?.role)) {
      load();
    } else if (!authLoading) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.role]);

  if (!authLoading && !isSuperAdmin(user?.role)) {
    return (
      <div className="card max-w-3xl space-y-2">
        <h1 className="text-lg font-semibold">Platform Access Control</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Only a super admin can approve signups, promote admins, or change platform roles.
        </p>
      </div>
    );
  }

  const pending = users.filter((u) => u.status === 'pending');
  const others = users.filter((u) => u.status !== 'pending');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold">Platform Access Control</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Approve new accounts, assign employee, admin, or super admin privileges, and manage the platform hierarchy.
        </p>
      </div>

      {error && <p className="text-sm text-status-flagged">{error}</p>}

      {!loading && pending.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-status-completed/30 bg-status-completed/10 px-4 py-3 dark:border-status-completed/40 dark:bg-status-completed/15">
          <i className="fa-solid fa-user-plus mt-0.5 text-status-completed" />
          <p className="text-sm text-gray-800 dark:text-gray-100">
            {pending.length === 1
              ? `${pending[0].name} just signed up and is awaiting your approval.`
              : `${pending.length} new accounts have signed up and are awaiting your approval.`}
          </p>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Pending approvals</h2>
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No pending signups.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
            <table className="tracker w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Employee ID</th>
                  <th>Email</th>
                  <th>Requested</th>
                  <th>Job title</th>
                  <th>Role</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((pendingUser) => (
                  <ApproveRow key={pendingUser.id} user={pendingUser} onDone={load} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">All users</h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
          <table className="tracker w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Employee ID</th>
                <th>Email</th>
                <th>Account</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {others.map((activeUser) => (
                <ActiveRow key={activeUser.id} user={activeUser} currentUserId={user?.id} onDone={load} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
