'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Avatar from '@/components/Avatar';
import Toast from '@/components/Toast';
import type { ContentNotification } from '@/lib/content-types';

function timeAgo(iso: string, now: number) {
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return '';

  const seconds = Math.floor(Math.max(0, now - timestamp) / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}hr ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  if (days < 365) return `${Math.max(1, Math.floor(days / 30))}mo ago`;

  return `${Math.floor(days / 365)}y ago`;
}

const TYPE_ICONS: Record<string, string> = {
  assigned: 'fa-solid fa-user-check',
  status_changed: 'fa-solid fa-arrows-rotate',
  approval_requested: 'fa-solid fa-hourglass-half',
  approved: 'fa-solid fa-circle-check',
  rejected: 'fa-solid fa-circle-xmark',
  comment: 'fa-solid fa-comment',
  due_soon: 'fa-solid fa-clock',
  signup_pending: 'fa-solid fa-user-plus',
  project_overdue: 'fa-solid fa-triangle-exclamation',
  task_reminder: 'fa-solid fa-list-check',
  task_gap: 'fa-solid fa-calendar-xmark',
  direct: 'fa-solid fa-paper-plane',
};

// A new-signup alert only a super admin can act on, an overdue project, and a multi-day task gap
// each get their own color so they stand out from the rest of the feed at a glance, instead of
// blending in with the usual brand-colored icons.
const TYPE_ICON_COLORS: Record<string, string> = {
  signup_pending: 'text-status-completed',
  project_overdue: 'text-status-flagged',
  task_reminder: 'text-status-progress',
  task_gap: 'text-status-flagged',
};

const HIGHLIGHTED_ROW_STYLES: Record<string, string> = {
  signup_pending: 'bg-status-completed/10 dark:bg-status-completed/15',
  project_overdue: 'bg-status-flagged/10 dark:bg-status-flagged/15',
  task_gap: 'bg-status-flagged/10 dark:bg-status-flagged/15',
  task_reminder: 'bg-status-progress/10 dark:bg-status-progress/15',
};

// Every persisted Notification's id is its Mongo _id (24 hex chars); every live-computed alert
// (due-soon, task/project alerts, signups, reminders, gaps) uses a hand-built, non-hex-24 id —
// so this check works for any current or future ephemeral alert type without needing its own
// prefix listed here. A persisted id was previously missed this way (project_overdue's id didn't
// match the old prefix list), which silently broke marking it read.
function isEphemeralNotification(id: string) {
  return !/^[0-9a-f]{24}$/i.test(id);
}

const TOAST_TYPES = new Set(['task_reminder']);

function toastStorageKey(id: string) {
  return `toast-shown-${id}`;
}

function NotificationMessage({ notification }: { notification: ContentNotification }) {
  const actorName = notification.actor?.name.trim();
  if (!actorName) return <>{notification.message}</>;

  if (notification.message.toLocaleLowerCase().startsWith(actorName.toLocaleLowerCase())) {
    return (
      <>
        <span className="font-semibold text-gray-950 dark:text-white">{actorName}</span>
        {notification.message.slice(actorName.length)}
      </>
    );
  }

  return (
    <>
      <span className="font-semibold text-gray-950 dark:text-white">{actorName}</span>
      <span className="text-gray-400"> · </span>
      {notification.message}
    </>
  );
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<ContentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeToast, setActiveToast] = useState<ContentNotification | null>(null);
  const [relativeTimeNow, setRelativeTimeNow] = useState(() => Date.now());
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ notifications: ContentNotification[]; unreadCount: number }>('/api/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);

      // Toast at most one alert per poll, and only ever once per id (ids already carry a day key
      // for the reminder types, so this naturally re-arms the next calendar day) — a localStorage
      // flag survives page reloads, unlike component state.
      const toastable = data.notifications.find((n) => TOAST_TYPES.has(n.type) && !localStorage.getItem(toastStorageKey(n.id)));
      if (toastable) setActiveToast(toastable);
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

  // Relative labels advance even if the network poll is delayed or returns identical data.
  // Thirty seconds keeps "just now" and minute boundaries feeling live without needless churn.
  useEffect(() => {
    if (!open) return;
    setRelativeTimeNow(Date.now());
    const interval = window.setInterval(() => setRelativeTimeNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, [open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function dismissToast() {
    if (activeToast) localStorage.setItem(toastStorageKey(activeToast.id), '1');
    setActiveToast(null);
  }

  function togglePanel() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      setRelativeTimeNow(Date.now());
      void load();
    }
  }

  function handleClick(n: ContentNotification) {
    setOpen(false);
    if (!isEphemeralNotification(n.id) && !n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount((count) => Math.max(0, count - 1));
      void api.patch(`/api/notifications/${n.id}/read`).catch(() => {
        // Reconcile if persistence failed; navigation itself should never wait on read-state.
        void load();
      });
    }
    if (n.link) router.push(n.link);
  }

  async function handleMarkAllRead() {
    try {
      await api.patch('/api/notifications/read-all');
      // The server now tracks a per-user "cleared at" timestamp that ephemeral alerts (task
      // reminders, due-soon, pending signups) are checked against too, so every currently-listed
      // notification is genuinely read after this — no need to special-case ephemeral ids here.
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
        onClick={togglePanel}
        className="relative rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <i className="fa-solid fa-bell" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-status-flagged px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-ink-light md:absolute md:inset-x-auto md:right-0 md:top-auto md:mt-2 md:w-96 md:max-w-[calc(100vw-1rem)]">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/10">
            <p className="text-lg font-bold text-gray-950 dark:text-white">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllRead} className="text-xs font-semibold text-brand hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-[min(32rem,70vh)] overflow-y-auto">
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
                  className={`flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5 ${
                    HIGHLIGHTED_ROW_STYLES[n.type] || (!n.read ? 'bg-brand/5 dark:bg-brand/10' : '')
                  }`}
                >
                  {n.actor ? (
                    <span className="relative shrink-0">
                      <Avatar name={n.actor.name} avatarUrl={n.actor.avatarUrl} size={44} />
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-brand text-[8px] text-white dark:border-ink-light">
                        <i className={TYPE_ICONS[n.type] || 'fa-solid fa-circle-info'} />
                      </span>
                    </span>
                  ) : (
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-base dark:bg-white/10 ${
                        TYPE_ICON_COLORS[n.type] || 'text-brand'
                      }`}
                    >
                      <i className={TYPE_ICONS[n.type] || 'fa-solid fa-circle-info'} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block leading-5 text-gray-700 dark:text-gray-200">
                      <NotificationMessage notification={n} />
                    </span>
                    <span
                      className={`mt-1 block text-xs ${
                        n.read ? 'text-gray-400 dark:text-gray-500' : 'font-semibold text-brand'
                      }`}
                    >
                      {timeAgo(n.createdAt, relativeTimeNow)}
                    </span>
                  </span>
                  {!n.read && <span className="mt-4 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {activeToast && (
        <Toast
          toast={{ id: activeToast.id, message: activeToast.message, actionLabel: activeToast.link ? 'Add it now' : undefined }}
          onAction={activeToast.link ? () => router.push(activeToast.link) : undefined}
          onDismiss={dismissToast}
        />
      )}
    </div>
  );
}
