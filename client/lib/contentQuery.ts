import type { EntryFilters } from '@/components/content/FilterBar';

export function buildEntryQuery(filters: EntryFilters, from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (filters.q) params.set('q', filters.q);
  if (filters.status.length > 0) params.set('status', filters.status.join(','));
  if (filters.platform.length > 0) params.set('platform', filters.platform.join(','));
  if (filters.pillar) params.set('pillar', filters.pillar);
  if (filters.campaign) params.set('campaign', filters.campaign);
  if (filters.assignee) params.set('assignee', filters.assignee);
  return params.toString();
}
