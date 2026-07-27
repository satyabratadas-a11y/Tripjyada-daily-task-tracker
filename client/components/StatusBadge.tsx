const ADMIN_STATUS_STYLES: Record<string, string> = {
  completed:
    'border-status-completed bg-status-completed/15 text-green-800 dark:border-status-completed/50 dark:bg-status-completed/20 dark:text-green-300',
  on_progress:
    'border-status-progress bg-status-progress/20 text-amber-800 dark:border-status-progress/50 dark:bg-status-progress/20 dark:text-amber-300',
  flagged:
    'border-status-flagged bg-status-flagged/15 text-red-800 dark:border-status-flagged/50 dark:bg-status-flagged/20 dark:text-red-300',
  incomplete:
    'border-gray-300 bg-gray-100 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300',
  pending:
    'border-gray-300 bg-status-pending text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300',
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
  not_done: 'Not Done',
  not_started: 'No Update Yet',
};

const MEMBER_STATUS_STYLES: Record<string, string> = {
  done: 'border-status-completed/30 bg-status-completed/10 text-green-800 dark:text-green-300',
  on_progress: 'border-status-progress/40 bg-status-progress/15 text-amber-900 dark:text-amber-300',
  not_done: 'border-status-flagged/40 bg-status-flagged/10 text-red-800 dark:text-red-300',
  not_started: 'border-gray-300 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300',
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
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded bg-status-sunday px-2 py-0.5 text-xs text-gray-700 dark:bg-status-sunday/20 dark:text-amber-200">
        Optional Sunday
      </span>
    );
  }
  return <span className="inline-flex items-center whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">Working</span>;
}

const PROJECT_STATUS_STYLES: Record<string, string> = {
  active:
    'border-status-progress bg-status-progress/20 text-amber-800 dark:border-status-progress/50 dark:bg-status-progress/20 dark:text-amber-300',
  completed:
    'border-status-completed bg-status-completed/15 text-green-800 dark:border-status-completed/50 dark:bg-status-completed/20 dark:text-green-300',
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  completed: 'Completed',
};

export function ProjectStatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none sm:text-xs ${
        PROJECT_STATUS_STYLES[value] || PROJECT_STATUS_STYLES.active
      }`}
    >
      {PROJECT_STATUS_LABELS[value] || value}
    </span>
  );
}

export function OverdueBadge() {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-status-flagged bg-status-flagged/15 px-2.5 py-1 text-[11px] font-medium leading-none text-red-800 dark:border-status-flagged/50 dark:bg-status-flagged/20 dark:text-red-300 sm:text-xs">
      Overdue
    </span>
  );
}

export function SourceBadge({ value }: { value: 'admin' | 'employee' }) {
  return value === 'employee' ? (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-brand/30 bg-brand/5 px-2.5 py-1 text-[11px] leading-none text-brand dark:border-brand-light/30 dark:bg-brand/10 dark:text-brand-light">
      Self-added
    </span>
  ) : (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1 text-[11px] leading-none text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
      Assigned
    </span>
  );
}
