'use client';

import { useRef, useState } from 'react';
import { API_URL } from '@/lib/api';
import { downscaleImage } from '@/lib/imageResize';

type ItemStatus = 'pending' | 'scanning' | 'saving' | 'done' | 'error';

type Item = {
  id: string;
  file: File;
  previewUrl: string;
  status: ItemStatus;
  label: string;
  error: string;
};

export default function BulkCardUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setDone(false);
    setItems(
      files.map((file, i) => ({
        id: `${Date.now()}-${i}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
        label: '',
        error: '',
      }))
    );
  }

  function updateItem(id: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function processOne(item: Item) {
    updateItem(item.id, { status: 'scanning', error: '' });
    try {
      const resized = await downscaleImage(item.file);

      const scanForm = new FormData();
      scanForm.append('image', resized, 'card.jpg');
      const scanRes = await fetch(`${API_URL}/api/contacts/scan`, {
        method: 'POST',
        credentials: 'include',
        body: scanForm,
      });
      if (!scanRes.ok) {
        const body = await scanRes.json().catch(() => ({}));
        throw new Error(body.error || 'Could not read the card');
      }
      const { fields } = (await scanRes.json()) as { fields: Record<string, string> };

      updateItem(item.id, { status: 'saving', label: fields.name || fields.company || '' });

      const saveForm = new FormData();
      saveForm.append('image', resized, 'card.jpg');
      for (const [key, value] of Object.entries(fields)) {
        if (typeof value === 'string') saveForm.append(key, value);
      }
      const saveRes = await fetch(`${API_URL}/api/contacts`, {
        method: 'POST',
        credentials: 'include',
        body: saveForm,
      });
      if (!saveRes.ok) {
        const body = await saveRes.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save contact');
      }

      updateItem(item.id, { status: 'done', label: fields.name || fields.company || item.file.name });
    } catch (err) {
      updateItem(item.id, { status: 'error', error: err instanceof Error ? err.message : 'Failed to process this card' });
    }
  }

  async function startBulkScan() {
    setProcessing(true);
    setDone(false);
    // Sequential on purpose: each card is a real AI call, and running many in parallel is far more
    // likely to trip Gemini's per-minute rate limit (especially on a free-tier key) than to finish
    // meaningfully faster — a rate-limited request just retries with backoff anyway.
    for (const item of items) {
      // eslint-disable-next-line no-await-in-loop
      await processOne(item);
    }
    setProcessing(false);
    setDone(true);
  }

  function reset() {
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setItems([]);
    setDone(false);
  }

  const savedCount = items.filter((i) => i.status === 'done').length;
  const failedCount = items.filter((i) => i.status === 'error').length;

  const statusIcon: Record<ItemStatus, string> = {
    pending: 'fa-solid fa-clock text-gray-300',
    scanning: 'fa-solid fa-circle-notch fa-spin text-brand',
    saving: 'fa-solid fa-circle-notch fa-spin text-brand',
    done: 'fa-solid fa-circle-check text-green-500',
    error: 'fa-solid fa-circle-exclamation text-red-500',
  };

  const statusLabel: Record<ItemStatus, string> = {
    pending: 'Waiting…',
    scanning: 'Reading card…',
    saving: 'Saving…',
    done: 'Saved',
    error: 'Failed',
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesSelected} />

      {items.length === 0 ? (
        <div className="card space-y-3 text-center">
          <p className="text-sm text-gray-500">Select photos of multiple business cards to scan and save them all at once.</p>
          <button type="button" className="btn-primary w-full" onClick={() => fileInputRef.current?.click()}>
            <i className="fa-solid fa-upload" />
            Choose files
          </button>
        </div>
      ) : (
        <>
          {done && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
              Done — {savedCount} saved{failedCount > 0 ? `, ${failedCount} failed` : ''}.
            </p>
          )}

          <div className="card space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 border-b border-gray-100 py-2 last:border-b-0 dark:border-white/10">
                <img src={item.previewUrl} alt="" className="h-12 w-12 shrink-0 rounded-md border border-gray-200 object-cover dark:border-white/10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-900 dark:text-gray-100">{item.label || item.file.name}</p>
                  <p className={`text-xs ${item.status === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
                    {item.status === 'error' ? item.error : statusLabel[item.status]}
                  </p>
                </div>
                <i className={`${statusIcon[item.status]} shrink-0`} />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={reset} disabled={processing}>
              {done ? 'Scan more cards' : 'Clear'}
            </button>
            {!done && (
              <button type="button" className="btn-primary flex-1" onClick={startBulkScan} disabled={processing}>
                {processing ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin" />
                    Processing…
                  </>
                ) : (
                  `Scan ${items.length} card${items.length === 1 ? '' : 's'}`
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
