'use client';

import type { ApprovalStatus, ContentFormat, ContentStatus, Platform } from '@/lib/content-types';

const STATUS_STYLES: Record<ContentStatus, string> = {
  Idea: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-white/5 dark:text-gray-300 dark:border-white/10',
  Draft: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30',
  Designing: 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30',
  Review: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  Approved: 'bg-green-50 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30',
  Scheduled: 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30',
  Published: 'bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30',
};

const APPROVAL_STYLES: Record<ApprovalStatus, string> = {
  Pending: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-white/5 dark:text-gray-300 dark:border-white/10',
  Approved: 'bg-green-50 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30',
  Rejected: 'bg-red-50 text-red-700 border-red-300 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30',
  'Changes Requested': 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
};

const PLATFORM_ICONS: Record<Platform, string> = {
  Instagram: 'fa-brands fa-instagram',
  Facebook: 'fa-brands fa-facebook',
  LinkedIn: 'fa-brands fa-linkedin',
  YouTube: 'fa-brands fa-youtube',
  X: 'fa-brands fa-x-twitter',
};

const FORMAT_ICONS: Record<ContentFormat, string> = {
  Creative: 'fa-solid fa-image',
  Carousel: 'fa-solid fa-images',
  Reel: 'fa-solid fa-clapperboard',
  Story: 'fa-solid fa-circle-play',
  Video: 'fa-solid fa-video',
  Blog: 'fa-solid fa-file-lines',
};

const badgeBase = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none';

export function ContentStatusBadge({ value }: { value: ContentStatus }) {
  return <span className={`${badgeBase} ${STATUS_STYLES[value]}`}>{value}</span>;
}

export function ApprovalStatusBadge({ value }: { value: ApprovalStatus }) {
  return <span className={`${badgeBase} ${APPROVAL_STYLES[value]}`}>{value}</span>;
}

export function PlatformBadge({ value }: { value: Platform }) {
  return (
    <span className={`${badgeBase} border-gray-300 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300`}>
      <i className={PLATFORM_ICONS[value]} />
      {value}
    </span>
  );
}

export function FormatBadge({ value }: { value: ContentFormat }) {
  return (
    <span className={`${badgeBase} border-brand/30 bg-brand/5 text-brand dark:border-brand-light/30 dark:bg-brand/10 dark:text-brand-light`}>
      <i className={FORMAT_ICONS[value]} />
      {value}
    </span>
  );
}

export function PillarBadge({ name, color }: { name: string; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1 text-[11px] font-medium leading-none text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color || '#6366F1' }} />
      {name}
    </span>
  );
}
