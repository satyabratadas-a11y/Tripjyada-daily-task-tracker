export type Role = 'super_admin' | 'admin' | 'employee' | 'b2b_agent';
export type UserStatus = 'pending' | 'active' | 'disabled';

export interface User {
  id: string;
  name: string;
  email: string;
  employeeCode: string;
  avatarUrl?: string;
  role: Role;
  jobTitle: string;
  status: UserStatus;
  createdAt: string;
}

export type DayType = 'working' | 'optional_sunday';
export type AdminStatus = 'pending' | 'completed' | 'on_progress' | 'incomplete' | 'flagged';
export type MemberStatus = 'not_started' | 'on_progress' | 'done';

export type CreatedBy = 'admin' | 'employee';

export interface Task {
  _id: string;
  employee: string;
  date: string;
  dayType: DayType;
  createdBy: CreatedBy;
  assignedTask: string;
  brief: string;
  adminStatus: AdminStatus;
  reviewerNotes: string;
  proofLink: string;
  memberStatus: MemberStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardRow {
  employee: { id: string; name: string; jobTitle: string };
  assignedDays: number;
  completed: number;
  onProgress: number;
  incomplete: number;
  flags: number;
  progressPct: number;
}

export interface AuditFieldChange {
  before: unknown;
  after: unknown;
}

export interface AuditLogEntry {
  id: string;
  actor: { id: string; name: string; role: Role };
  action: string;
  targetType: 'user' | 'task' | 'contact';
  targetId: string;
  targetLabel: string;
  summary: string;
  changes: Record<string, AuditFieldChange>;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Contact {
  _id: string;
  capturedBy: string | { _id: string; name: string; email: string };
  name: string;
  company: string;
  jobTitle: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  notes: string;
  rawOcrText: string;
  imageUrl: string;
  backImageUrl: string;
  imagePublicId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SuperAdminPlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  disabledUsers: number;
  totalAdmins: number;
  totalSuperAdmins: number;
  totalEmployees: number;
  activeEmployees: number;
  activeClients: number;
  archivedClients: number;
  tasksThisMonth: number;
  completedThisMonth: number;
  onProgressThisMonth: number;
  pendingReviewThisMonth: number;
  flaggedThisMonth: number;
  incompleteThisMonth: number;
  reviewsThisMonth: number;
  assignmentsThisMonth: number;
  approvalsThisMonth: number;
}

export interface SuperAdminRow {
  admin: {
    id: string;
    name: string;
    email: string;
    role: Role;
    jobTitle: string;
    status: UserStatus;
  };
  reviewsToday: number;
  reviewsThisMonth: number;
  assignmentsThisMonth: number;
  approvalsThisMonth: number;
  flaggedThisMonth: number;
  activityScore: number;
  attentionState: 'active' | 'watch' | 'idle' | 'disabled';
  lastActionAt: string | null;
  lastActionSummary: string;
}

export interface SuperAdminEmployeeWatchRow {
  employee: {
    id: string;
    name: string;
    jobTitle: string;
  };
  taskCount: number;
  pendingCount: number;
  flaggedCount: number;
  incompleteCount: number;
  progressPct: number;
  lastUpdateAt: string | null;
}

export interface SuperAdminDashboardResponse {
  month: number;
  year: number;
  platform: SuperAdminPlatformMetrics;
  adminRows: SuperAdminRow[];
  employeeWatch: SuperAdminEmployeeWatchRow[];
  recentActions: AuditLogEntry[];
}
