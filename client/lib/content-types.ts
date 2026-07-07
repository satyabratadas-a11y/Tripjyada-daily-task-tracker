export type ContentFormat = 'Creative' | 'Carousel' | 'Reel' | 'Story' | 'Video' | 'Blog';
export type Platform = 'Instagram' | 'Facebook' | 'LinkedIn' | 'YouTube' | 'X';
export type ContentStatus = 'Idea' | 'Draft' | 'Designing' | 'Review' | 'Approved' | 'Scheduled' | 'Published';
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Changes Requested';
export type ClientRole = 'owner' | 'editor' | 'viewer';

export const CONTENT_FORMATS: ContentFormat[] = ['Creative', 'Carousel', 'Reel', 'Story', 'Video', 'Blog'];
export const PLATFORMS: Platform[] = ['Instagram', 'Facebook', 'LinkedIn', 'YouTube', 'X'];
export const CONTENT_STATUSES: ContentStatus[] = ['Idea', 'Draft', 'Designing', 'Review', 'Approved', 'Scheduled', 'Published'];
export const APPROVAL_STATUSES: ApprovalStatus[] = ['Pending', 'Approved', 'Rejected', 'Changes Requested'];

export interface ClientMember {
  user: string;
  name?: string;
  email?: string;
  roleInClient: ClientRole;
}

export interface ContentClient {
  id: string;
  name: string;
  brandColor: string;
  logoUrl: string;
  industry: string;
  businessType: string;
  description: string;
  status: 'active' | 'archived';
  members: ClientMember[];
  myRole: ClientRole | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentPillar {
  id: string;
  client: string;
  name: string;
  color: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  client: string;
  name: string;
  phase: string;
  startDate?: string;
  endDate?: string;
  color: string;
  status: 'planned' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  url: string;
  resourceType: 'image' | 'video' | 'raw';
  name: string;
  uploadedAt: string;
}

export interface HistoryEntry {
  field: string;
  before: unknown;
  after: unknown;
  changedBy?: string;
  changedAt: string;
}

export interface RefLite {
  id: string;
  name: string;
  color?: string;
}

export interface ContentEntry {
  id: string;
  client: string;
  date: string;
  time: string;
  format: ContentFormat;
  pillar: RefLite | null;
  campaign: RefLite | null;
  idea: string;
  hook: string;
  caption: string;
  cta: string;
  platform: Platform;
  assignee: { id: string; name: string } | null;
  status: ContentStatus;
  approvalStatus: ApprovalStatus;
  reviewNote: string;
  attachments: Attachment[];
  order: number;
  history: HistoryEntry[];
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentComment {
  id: string;
  entry: string;
  author: { id: string; name: string } | null;
  text: string;
  createdAt: string;
}

export type NotificationType =
  | 'assigned'
  | 'status_changed'
  | 'approval_requested'
  | 'approved'
  | 'rejected'
  | 'comment'
  | 'due_soon';

export interface ContentNotification {
  id: string;
  type: NotificationType;
  message: string;
  link: string;
  client: string | null;
  entry: string | null;
  read: boolean;
  createdAt: string;
}

export interface AIGeneratedCalendarRow {
  dayOffset: number;
  date: string;
  format: ContentFormat;
  platform: Platform;
  pillar: string;
  idea: string;
  hook: string;
  caption: string;
  cta: string;
}
