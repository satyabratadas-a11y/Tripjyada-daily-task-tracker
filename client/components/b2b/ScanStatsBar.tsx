'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface ScanPeriodStats {
  scanned: number;
  saved: number;
  failed: number;
}

interface AgentScanStats {
  id: string;
  name: string;
  scanned: number;
  saved: number;
  failed: number;
}

interface ScanStatsResponse {
  today: ScanPeriodStats;
  allTime: ScanPeriodStats;
  byAgent: AgentScanStats[];
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
    <div className="mb-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
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

      {stats.byAgent.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
          <p className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
            By employee — all time
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="p-2 font-medium">Employee</th>
                  <th className="p-2 text-right font-medium">Scanned</th>
                  <th className="p-2 text-right font-medium">Saved</th>
                  <th className="p-2 text-right font-medium">Failed</th>
                </tr>
              </thead>
              <tbody>
                {stats.byAgent.map((a) => (
                  <tr key={a.id} className="border-t border-gray-100 dark:border-white/10">
                    <td className="p-2 font-medium text-gray-900 dark:text-gray-100">{a.name}</td>
                    <td className="p-2 text-right text-gray-600 dark:text-gray-300">{a.scanned}</td>
                    <td className="p-2 text-right text-gray-600 dark:text-gray-300">{a.saved}</td>
                    <td className="p-2 text-right text-gray-600 dark:text-gray-300">{a.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
