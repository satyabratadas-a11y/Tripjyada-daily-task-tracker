'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { ContentNotification } from '@/lib/content-types';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_ICONS: Record<string, string> = {
  assigned: 'fa-solid fa-user-check',
  status_changed: 'fa-solid fa-arrows-rotate',
  approval_requested: 'fa-solid fa-hourglass-half',
  approved: 'fa-solid fa-circle-check',
  rejected: 'fa-solid fa-circle-xmark',
  comment: 'fa-solid fa-comment',
  due_soon: 'fa-solid fa-clock',
};

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<ContentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ notifications: ContentNotification[]; unreadCount: number }>('/api/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent — notification polling shouldn't surface errors to the whole page
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleClick(n: ContentNotification) {
    setOpen(false);
    if (!n.id.startsWith('due-') && !n.read) {
      try {
        await api.patch(`/api/notifications/${n.id}/read`);
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // ignore — read-state is best-effort
      }
    }
    if (n.link) router.push(n.link);
  }

  async function handleMarkAllRead() {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
        title="Notifications"
      >
        <i className="fa-solid fa-bell" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-status-flagged px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-ink-light">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllRead} className="text-xs text-brand hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-center text-sm text-gray-500">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500">You&apos;re all caught up.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`flex w-full items-start gap-2.5 border-b border-gray-50 px-3 py-2.5 text-left text-sm transition last:border-b-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5 ${
                    !n.read ? 'bg-brand/5 dark:bg-brand/10' : ''
                  }`}
                >
                  <i className={`${TYPE_ICONS[n.type] || 'fa-solid fa-circle-info'} mt-0.5 text-brand`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-gray-800 dark:text-gray-200">{n.message}</span>
                    <span className="mt-0.5 block text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
