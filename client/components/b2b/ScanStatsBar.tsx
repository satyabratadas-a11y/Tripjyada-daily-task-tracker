'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface ScanPeriodStats {
  scanned: number;
  saved: number;
  failed: number;
}

interface ScanStatsResponse {
  today: ScanPeriodStats;
  allTime: ScanPeriodStats;
}

const TILES: { key: keyof ScanPeriodStats; label: string; color: string }[] = [
  { key: 'scanned', label: 'Scanned', color: 'bg-brand' },
  { key: 'saved', label: 'Saved', color: 'bg-status-completed' },
  { key: 'failed', label: 'Failed', color: 'bg-status-flagged' },
];

// "Scanned" counts every attempt that reached Vision/Gemini, success or failure — that's what maps
// to API spend, since a failed attempt is still a billed call. "Saved" is actual Contact documents,
// since not every successful scan gets reviewed and saved. Surfaced here so scan volume/cost is
// visible day to day instead of only showing up later as a drained credit balance.
export default function ScanStatsBar() {
  const [stats, setStats] = useState<ScanStatsResponse | null>(null);

  useEffect(() => {
    api
      .get<ScanStatsResponse>('/api/contacts/scan-stats')
      .then(setStats)
      .catch(() => {
        // Non-fatal — the page's contact list/filters still work without this counter.
      });
  }, []);

  if (!stats) return null;

  return (
    <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
      {TILES.map((tile) => (
        <div key={tile.key} className="card relative min-w-0 overflow-hidden px-3 py-2.5 sm:px-4 sm:py-3">
          <span className={`absolute inset-y-0 left-0 w-1 ${tile.color}`} />
          <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">{tile.label}</p>
          <p className="text-xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-2xl">
            {stats.today[tile.key]}
            <span className="ml-1 text-xs font-normal text-gray-400">today</span>
          </p>
          <p className="truncate text-xs text-gray-400">{stats.allTime[tile.key]} all time</p>
        </div>
      ))}
    </div>
  );
}
