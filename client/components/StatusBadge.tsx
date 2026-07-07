const ADMIN_STATUS_STYLES: Record<string, string> = {
  completed: 'bg-status-completed/15 text-green-800 border-status-completed',
  on_progress: 'bg-status-progress/20 text-amber-800 border-status-progress',
  flagged: 'bg-status-flagged/15 text-red-800 border-status-flagged',
  incomplete: 'bg-gray-100 text-gray-600 border-gray-300',
  pending: 'bg-status-pending text-gray-600 border-gray-300',
};

const ADMIN_STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  on_progress: 'On Progress',
  flagged: 'Flagged',
  incomplete: 'Incomplete',
  pending: 'Pending',
};

const MEMBER_STATUS_LABELS: Record<string, string> = {
  done: 'Done',
  on_progress: 'On Progress',
  not_started: 'No Update Yet',
};

const MEMBER_STATUS_STYLES: Record<string, string> = {
  done: 'border-status-completed/30 bg-status-completed/10 text-green-800',
  on_progress: 'border-status-progress/40 bg-status-progress/15 text-amber-900',
  not_started: 'border-gray-300 bg-gray-50 text-gray-600',
};

export function AdminStatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none sm:text-xs ${
        ADMIN_STATUS_STYLES[value] || ADMIN_STATUS_STYLES.pending
      }`}
    >
      {ADMIN_STATUS_LABELS[value] || value}
    </span>
  );
}

export function MemberStatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none sm:text-xs ${
        MEMBER_STATUS_STYLES[value] || MEMBER_STATUS_STYLES.not_started
      }`}
    >
      {MEMBER_STATUS_LABELS[value] || value}
    </span>
  );
}

export function DayTypeCell({ value }: { value: string }) {
  if (value === 'optional_sunday') {
    return <span className="inline-flex items-center whitespace-nowrap rounded bg-status-sunday px-2 py-0.5 text-xs">Optional Sunday</span>;
  }
  return <span className="inline-flex items-center whitespace-nowrap text-xs text-gray-500">Working</span>;
}

export function SourceBadge({ value }: { value: 'admin' | 'employee' }) {
  return value === 'employee' ? (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-brand/30 bg-brand/5 px-2.5 py-1 text-[11px] leading-none text-brand">
      Self-added
    </span>
  ) : (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1 text-[11px] leading-none text-gray-600">
      Assigned
    </span>
  );
}
