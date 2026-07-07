'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useClientCalendar } from '@/lib/ClientCalendarContext';
import type { ClientRole, ContentClient } from '@/lib/content-types';

const ROLE_DESCRIPTIONS: Record<ClientRole, string> = {
  owner: 'Full control — manage pillars, campaigns, team, and approvals.',
  editor: 'Create, edit, schedule, and comment on content — cannot approve.',
  viewer: 'Read-only access, can leave comments.',
};

export default function TeamPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const { user } = useAuth();
  const { client, refresh } = useClientCalendar();
  const canManage = client.myRole === 'owner';

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ClientRole>('editor');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleInvite() {
    if (!email.trim()) {
      setError('Enter a teammate email');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post<{ client: ContentClient }>(`/api/content/clients/${clientId}/members`, { email: email.trim(), roleInClient: role });
      setEmail('');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add team member');
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(userId: string, roleInClient: ClientRole) {
    try {
      await api.post(`/api/content/clients/${clientId}/members`, { userId, roleInClient });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update role');
    }
  }

  async function handleRemove(userId: string, name?: string) {
    if (!window.confirm(`Remove ${name || 'this member'} from the calendar?`)) return;
    try {
      await api.delete(`/api/content/clients/${clientId}/members/${userId}`);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove member');
    }
  }

  return (
    <div className="max-w-2xl">
      {canManage && (
        <div className="card mb-5 space-y-3">
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Invite a team member</p>
          <div className="flex flex-wrap gap-2">
            <input
              className="input flex-1"
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select className="input w-32" value={role} onChange={(e) => setRole(e.target.value as ClientRole)}>
              <option value="owner">Owner</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button className="btn-primary" disabled={saving} onClick={handleInvite}>
              {saving ? 'Adding…' : 'Add'}
            </button>
          </div>
          <p className="text-xs text-gray-400">The teammate must already have an active account on this platform.</p>
          {error && <p className="text-xs text-status-flagged">{error}</p>}
        </div>
      )}

      <div className="space-y-2">
        {client.members.map((m) => (
          <div key={m.user} className="card flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {m.name || m.email || m.user} {m.user === user?.id && <span className="text-xs text-gray-400">(you)</span>}
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{m.email}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {canManage ? (
                <select
                  className="input w-28 py-1 text-xs"
                  value={m.roleInClient}
                  onChange={(e) => handleRoleChange(m.user, e.target.value as ClientRole)}
                >
                  <option value="owner">Owner</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              ) : (
                <span className="rounded-full border border-gray-300 px-2.5 py-1 text-xs capitalize dark:border-white/10">
                  {m.roleInClient}
                </span>
              )}
              {canManage && (
                <button className="text-gray-400 hover:text-status-flagged" onClick={() => handleRemove(m.user, m.name)}>
                  <i className="fa-solid fa-user-minus" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-5">
        <p className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Role permissions</p>
        <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
          {(Object.keys(ROLE_DESCRIPTIONS) as ClientRole[]).map((r) => (
            <li key={r}>
              <span className="font-medium capitalize">{r}</span> — {ROLE_DESCRIPTIONS[r]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
