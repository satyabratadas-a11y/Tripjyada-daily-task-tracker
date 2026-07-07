'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import type { User } from '@/lib/types';

function ApproveRow({ user, onDone }: { user: User; onDone: () => void }) {
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [jobTitle, setJobTitle] = useState(user.jobTitle);
  const [saving, setSaving] = useState(false);
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

  return (
    <tr>
      <td data-label="Name">{user.name}</td>
      <td data-label="Employee ID">{user.employeeCode}</td>
      <td data-label="Email">{user.email}</td>
      <td data-label="Job title">
        <input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
      </td>
      <td data-label="Role">
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'employee')}>
          <option value="employee">Employee</option>
          <option value="admin">Admin</option>
        </select>
      </td>
      <td data-label="Actions">
        <button className="btn-primary w-full sm:w-auto" disabled={saving} onClick={approve}>
          {saving ? 'Approving…' : 'Approve'}
        </button>
        {error && <p className="text-xs text-status-flagged">{error}</p>}
      </td>
    </tr>
  );
}

function ActiveRow({ user, onDone }: { user: User; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  async function toggleDisabled() {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/api/admin/users/${user.id}`, {
        status: user.status === 'disabled' ? 'active' : 'disabled',
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status');
    } finally {
      setSaving(false);
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
      <td data-label="Job title">{user.jobTitle}</td>
      <td data-label="Role" className="capitalize">{user.role}</td>
      <td data-label="Status" className="capitalize">{user.status}</td>
      <td data-label="Actions">
        <div className="flex flex-wrap gap-2">
          {user.role === 'employee' && (
            <Link href={`/admin/employees/${user.id}?month=${month}&year=${year}`} className="btn-secondary">
              Review tasks
            </Link>
          )}
          <button className="btn-secondary" disabled={saving} onClick={toggleDisabled}>
            {user.status === 'disabled' ? 'Re-enable' : 'Disable'}
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-status-flagged">{error}</p>}
      </td>
    </tr>
  );
}

export default function AdminUsersPage() {
  const { refresh } = useAuth();
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
      } else {
        setError(err instanceof ApiError ? err.message : 'Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = users.filter((u) => u.status === 'pending');
  const others = users.filter((u) => u.status !== 'pending');

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-status-flagged">{error}</p>}
      <div>
        <h1 className="mb-4 text-lg font-semibold">Pending approvals</h1>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-gray-500">No pending signups.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="tracker w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Employee ID</th>
                  <th>Email</th>
                  <th>Job title</th>
                  <th>Role</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((u) => (
                  <ApproveRow key={u.id} user={u} onDone={load} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h1 className="mb-4 text-lg font-semibold">All users</h1>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="tracker w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Employee ID</th>
                <th>Email</th>
                <th>Job title</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {others.map((u) => (
                <ActiveRow key={u.id} user={u} onDone={load} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
