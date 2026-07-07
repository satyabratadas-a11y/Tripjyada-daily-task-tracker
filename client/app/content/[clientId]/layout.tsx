'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { Campaign, ContentClient, ContentPillar } from '@/lib/content-types';
import { ClientCalendarProvider } from '@/lib/ClientCalendarContext';

const TABS = [
  { slug: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-gauge-high' },
  { slug: 'calendar', label: 'Monthly Calendar', icon: 'fa-solid fa-calendar-days' },
  { slug: 'week', label: 'Weekly Planner', icon: 'fa-solid fa-table-columns' },
  { slug: 'table', label: 'Table', icon: 'fa-solid fa-table-list' },
  { slug: 'pillars', label: 'Pillars & Campaigns', icon: 'fa-solid fa-layer-group' },
  { slug: 'team', label: 'Team', icon: 'fa-solid fa-users' },
];

export default function ClientCalendarLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const pathname = usePathname();
  const router = useRouter();

  const [client, setClient] = useState<ContentClient | null>(null);
  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [clientData, pillarData, campaignData] = await Promise.all([
          api.get<{ client: ContentClient }>(`/api/content/clients/${clientId}`),
          api.get<{ pillars: ContentPillar[] }>(`/api/content/clients/${clientId}/pillars`),
          api.get<{ campaigns: Campaign[] }>(`/api/content/clients/${clientId}/campaigns`),
        ]);
        if (cancelled) return;
        setClient(clientData.client);
        setPillars(pillarData.pillars);
        setCampaigns(campaignData.campaigns);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
          router.replace('/content');
        } else {
          setError(err instanceof ApiError ? err.message : 'Failed to load client');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [clientId, router]);

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading calendar…</p>;
  }
  if (error || !client) {
    return <p className="text-sm text-status-flagged">{error || 'Client not found'}</p>;
  }

  return (
    <ClientCalendarProvider clientId={clientId} initialClient={client} initialPillars={pillars} initialCampaigns={campaigns}>
      <div className="mb-5">
        <Link href="/content" className="mb-3 inline-block text-xs text-gray-400 hover:text-brand">
          <i className="fa-solid fa-arrow-left mr-1" /> All calendars
        </Link>
        <div className="mb-4 flex items-center gap-3">
          <span className="h-9 w-9 shrink-0 rounded-lg" style={{ backgroundColor: client.brandColor }} />
          <div>
            <h1 className="text-lg font-semibold">{client.name}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {client.industry || 'Industry not set'} · your role: {client.myRole || 'admin'}
            </p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-white/10">
          {TABS.map((tab) => {
            const href = `/content/${clientId}/${tab.slug}`;
            const active = pathname === href;
            return (
              <Link
                key={tab.slug}
                href={href}
                className={`flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-sm transition ${
                  active ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-brand dark:text-gray-400'
                }`}
              >
                <i className={tab.icon} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </ClientCalendarProvider>
  );
}
