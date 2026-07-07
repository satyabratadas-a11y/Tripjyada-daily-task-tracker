'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { api } from '@/lib/api';
import type { Campaign, ContentClient, ContentPillar } from '@/lib/content-types';

interface ClientCalendarState {
  client: ContentClient;
  pillars: ContentPillar[];
  campaigns: Campaign[];
  refresh: () => Promise<void>;
  refreshPillars: () => Promise<void>;
  refreshCampaigns: () => Promise<void>;
}

const ClientCalendarContext = createContext<ClientCalendarState | undefined>(undefined);

export function ClientCalendarProvider({
  clientId,
  initialClient,
  initialPillars,
  initialCampaigns,
  children,
}: {
  clientId: string;
  initialClient: ContentClient;
  initialPillars: ContentPillar[];
  initialCampaigns: Campaign[];
  children: ReactNode;
}) {
  const [client, setClient] = useState(initialClient);
  const [pillars, setPillars] = useState(initialPillars);
  const [campaigns, setCampaigns] = useState(initialCampaigns);

  const refresh = useCallback(async () => {
    const data = await api.get<{ client: ContentClient }>(`/api/content/clients/${clientId}`);
    setClient(data.client);
  }, [clientId]);

  const refreshPillars = useCallback(async () => {
    const data = await api.get<{ pillars: ContentPillar[] }>(`/api/content/clients/${clientId}/pillars`);
    setPillars(data.pillars);
  }, [clientId]);

  const refreshCampaigns = useCallback(async () => {
    const data = await api.get<{ campaigns: Campaign[] }>(`/api/content/clients/${clientId}/campaigns`);
    setCampaigns(data.campaigns);
  }, [clientId]);

  return (
    <ClientCalendarContext.Provider value={{ client, pillars, campaigns, refresh, refreshPillars, refreshCampaigns }}>
      {children}
    </ClientCalendarContext.Provider>
  );
}

export function useClientCalendar() {
  const ctx = useContext(ClientCalendarContext);
  if (!ctx) throw new Error('useClientCalendar must be used within ClientCalendarProvider');
  return ctx;
}
