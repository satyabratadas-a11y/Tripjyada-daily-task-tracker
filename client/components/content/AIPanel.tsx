'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import {
  CONTENT_FORMATS,
  PLATFORMS,
  type AIGeneratedCalendarRow,
  type Campaign,
  type ContentEntry,
  type ContentFormat,
  type ContentPillar,
  type Platform,
} from '@/lib/content-types';

interface DraftRow extends AIGeneratedCalendarRow {
  pillarId: string;
}

function matchPillarId(name: string, pillars: ContentPillar[]) {
  const match = pillars.find((p) => p.name.toLowerCase() === name.toLowerCase());
  return match?.id || '';
}

export default function AIPanel({
  clientId,
  pillars,
  campaigns,
  onClose,
  onImported,
}: {
  clientId: string;
  pillars: ContentPillar[];
  campaigns: Campaign[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [industry, setIndustry] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>(['Instagram']);
  const [postsPerWeek, setPostsPerWeek] = useState(4);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [goals, setGoals] = useState('');
  const [selectedPillars, setSelectedPillars] = useState<string[]>(pillars.map((p) => p.name));

  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<DraftRow[] | null>(null);

  void campaigns;

  function togglePlatform(p: Platform) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function togglePillarName(name: string) {
    setSelectedPillars((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  }

  async function handleGenerate() {
    if (platforms.length === 0) {
      setError('Select at least one platform');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const data = await api.post<{ entries: AIGeneratedCalendarRow[] }>(`/api/content/clients/${clientId}/ai/calendar`, {
        industry,
        businessType,
        platforms,
        postsPerWeek,
        pillars: selectedPillars,
        startDate,
        goals,
      });
      setDraft(data.entries.map((e) => ({ ...e, pillarId: matchPillarId(e.pillar, pillars) })));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate calendar');
    } finally {
      setGenerating(false);
    }
  }

  function updateRow(i: number, patch: Partial<DraftRow>) {
    setDraft((prev) => (prev ? prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) : prev));
  }

  function removeRow(i: number) {
    setDraft((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function handleImport() {
    if (!draft || draft.length === 0) return;
    setImporting(true);
    setError('');
    try {
      await api.post(`/api/content/clients/${clientId}/entries/bulk`, {
        entries: draft.map((row) => ({
          date: row.date,
          format: row.format,
          platform: row.platform,
          pillar: row.pillarId || undefined,
          idea: row.idea,
          hook: row.hook,
          caption: row.caption,
          cta: row.cta,
        })),
      });
      onImported();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to import calendar');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-ink-light">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-white/10">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <i className="fa-solid fa-wand-magic-sparkles text-brand" /> AI 30-day content calendar
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!draft ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Industry</label>
                  <input className="input" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Food & Beverage" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Business type</label>
                  <input className="input" value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="e.g. D2C retail" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Start date</label>
                  <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Posts per week</label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    className="input"
                    value={postsPerWeek}
                    onChange={(e) => setPostsPerWeek(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <label
                      key={p}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                        platforms.includes(p)
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-gray-300 text-gray-500 dark:border-white/10 dark:text-gray-400'
                      }`}
                    >
                      <input type="checkbox" className="hidden" checked={platforms.includes(p)} onChange={() => togglePlatform(p)} />
                      {p}
                    </label>
                  ))}
                </div>
              </div>

              {pillars.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Pillars to rotate through</label>
                  <div className="flex flex-wrap gap-2">
                    {pillars.map((p) => (
                      <label
                        key={p.id}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                          selectedPillars.includes(p.name)
                            ? 'border-brand bg-brand/10 text-brand'
                            : 'border-gray-300 text-gray-500 dark:border-white/10 dark:text-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={selectedPillars.includes(p.name)}
                          onChange={() => togglePillarName(p.name)}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Goals (optional)</label>
                <textarea className="input" rows={2} value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="e.g. drive foot traffic, grow email list" />
              </div>

              {error && <p className="text-xs text-status-flagged">{error}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                Review and edit the {draft.length} generated posts below, then import the ones you want.
              </p>
              {draft.map((row, i) => (
                <div key={i} className="card space-y-2 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      className="input w-36 py-1 text-xs"
                      value={row.date}
                      onChange={(e) => updateRow(i, { date: e.target.value })}
                    />
                    <select className="input w-28 py-1 text-xs" value={row.format} onChange={(e) => updateRow(i, { format: e.target.value as ContentFormat })}>
                      {CONTENT_FORMATS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                    <select className="input w-28 py-1 text-xs" value={row.platform} onChange={(e) => updateRow(i, { platform: e.target.value as Platform })}>
                      {PLATFORMS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <select className="input w-32 py-1 text-xs" value={row.pillarId} onChange={(e) => updateRow(i, { pillarId: e.target.value })}>
                      <option value="">No pillar</option>
                      {pillars.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="ml-auto text-gray-400 hover:text-status-flagged" onClick={() => removeRow(i)}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                  <input className="input py-1 text-xs" value={row.idea} onChange={(e) => updateRow(i, { idea: e.target.value })} placeholder="Idea" />
                  <input className="input py-1 text-xs" value={row.hook} onChange={(e) => updateRow(i, { hook: e.target.value })} placeholder="Hook" />
                  <textarea
                    className="input py-1 text-xs"
                    rows={2}
                    value={row.caption}
                    onChange={(e) => updateRow(i, { caption: e.target.value })}
                    placeholder="Caption"
                  />
                  <input className="input py-1 text-xs" value={row.cta} onChange={(e) => updateRow(i, { cta: e.target.value })} placeholder="CTA" />
                </div>
              ))}
              {error && <p className="text-xs text-status-flagged">{error}</p>}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-gray-200 px-5 py-4 dark:border-white/10">
          {!draft ? (
            <button className="btn-primary" disabled={generating} onClick={handleGenerate}>
              {generating ? 'Generating…' : 'Generate calendar'}
            </button>
          ) : (
            <>
              <button className="btn-primary" disabled={importing || draft.length === 0} onClick={handleImport}>
                {importing ? 'Importing…' : `Import ${draft.length} entries`}
              </button>
              <button className="btn-secondary" onClick={() => setDraft(null)}>
                Back
              </button>
            </>
          )}
          <button className="btn-secondary ml-auto" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
