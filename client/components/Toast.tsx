'use client';

import { useEffect } from 'react';

export interface ToastData {
  id: string;
  message: string;
  actionLabel?: string;
}

/** A single transient, self-dismissing toast, fixed to the bottom-right of the viewport. */
export default function Toast({
  toast,
  onAction,
  onDismiss,
  durationMs = 8000,
}: {
  toast: ToastData;
  onAction?: () => void;
  onDismiss: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
    // Re-arm the auto-dismiss timer whenever a new toast replaces this one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id, durationMs]);

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-full max-w-sm animate-[toast-in_0.2s_ease-out]">
      <div className="flex items-start gap-3 rounded-lg border border-status-progress/40 bg-ink px-4 py-3 text-sm text-white shadow-xl dark:border-status-progress/50">
        <i className="fa-solid fa-clock mt-0.5 text-status-progress" />
        <div className="min-w-0 flex-1">
          <p>{toast.message}</p>
          {toast.actionLabel && onAction && (
            <button
              type="button"
              onClick={() => {
                onAction();
                onDismiss();
              }}
              className="mt-1.5 text-xs font-medium text-brand-light hover:underline"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
        <button type="button" onClick={onDismiss} className="shrink-0 text-gray-400 hover:text-white" title="Dismiss">
          <i className="fa-solid fa-xmark text-xs" />
        </button>
      </div>
    </div>
  );
}
