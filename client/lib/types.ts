export type Role = 'admin' | 'employee';
export type UserStatus = 'pending' | 'active' | 'disabled';

export interface User {
  id: string;
  name: string;
  email: string;
  employeeCode: string;
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
  targetType: 'user' | 'task';
  targetId: string;
  targetLabel: string;
  summary: string;
  changes: Record<string, AuditFieldChange>;
  metadata: Record<string, unknown>;
  createdAt: string;
}
