'use client';

import { useRef, useState } from 'react';
import { API_URL } from '@/lib/api';
import { downscaleImage } from '@/lib/imageResize';

type FormState = {
  name: string;
  company: string;
  jobTitle: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  state: string;
  pincode: string;
  notes: string;
};

type ItemStatus = 'pending' | 'scanning' | 'ready' | 'saving' | 'done' | 'scan-error' | 'save-error';

interface DuplicateInfo {
  id: string;
  name: string;
  company: string;
  capturedBy: string;
  createdAt: string;
}

type Item = {
  id: string;
  file: File;
  previewUrl: string;
  upload: Blob | null;
  uploadName: string;
  status: ItemStatus;
  fields: FormState;
  confirmed: boolean;
  error: string;
  duplicate: DuplicateInfo | null;
};

type PreparedItem = {
  item: Item;
  upload: Blob;
  uploadName: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  company: '',
  jobTitle: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  state: '',
  pincode: '',
  notes: '',
};

const FIELD_LABELS: Record<keyof FormState, string> = {
  name: 'Name',
  company: 'Business name *',
  jobTitle: 'Job title',
  phone: 'Phone *',
  email: 'Email *',
  website: 'Website',
  address: 'Address *',
  state: 'State *',
  pincode: 'Pincode *',
  notes: 'Notes',
};

// Mirrors the server-side check in contact.controller.js — this just tells the agent what's
// missing before they hit save instead of after a rejected request.
const MANDATORY_FIELDS: (keyof FormState)[] = ['company', 'phone', 'email', 'address', 'state', 'pincode'];

function missingFields(fields: FormState) {
  return MANDATORY_FIELDS.filter((key) => !fields[key].trim());
}

// Same endpoint the single-card scanner uses (server-side Gemini), scanned one at a time so
// progress is easy to follow and only one Gemini request is ever in flight for this panel.
const SCAN_CONCURRENCY = 1;
const SAVE_CONCURRENCY = 3;
const MAX_BULK_ITEMS = 5;

async function scanCardRemote(blob: Blob, uploadName: string): Promise<{ fields: Partial<FormState>; duplicate: DuplicateInfo | null }> {
  const formData = new FormData();
  formData.append('image', blob, uploadName);

  const res = await fetch(`${API_URL}/api/contacts/scan`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Could not read the card');
  }
  return (await res.json()) as { fields: Partial<FormState>; duplicate: DuplicateInfo | null };
}

export default function BulkCardUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [processing, setProcessing] = useState(false);
  const [savingReviewed, setSavingReviewed] = useState(false);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [selectionNotice, setSelectionNotice] = useState('');

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    e.target.value = '';
    if (selected.length === 0) return;

    const files = selected.slice(0, MAX_BULK_ITEMS);
    setSelectionNotice(
      selected.length > MAX_BULK_ITEMS ? `Only the first ${MAX_BULK_ITEMS} photos were kept (max ${MAX_BULK_ITEMS} per batch).` : ''
    );

    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    const nextItems = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      previewUrl: URL.createObjectURL(file),
      upload: null,
      uploadName: file.name,
      status: 'pending' as const,
      fields: { ...EMPTY_FORM },
      confirmed: false,
      error: '',
      duplicate: null,
    }));
    setItems(nextItems);
    setOpenItemId(nextItems[0]?.id || null);
  }

  function updateItem(id: string, patch: Partial<Item>) {
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function updateField(id: string, key: keyof FormState, value: string) {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id
          ? { ...item, fields: { ...item.fields, [key]: value }, confirmed: false }
          : item
      )
    );
  }

  async function prepareItem(item: Item): Promise<PreparedItem> {
    if (item.upload) return { item, upload: item.upload, uploadName: item.uploadName };
    try {
      return { item, upload: await downscaleImage(item.file), uploadName: 'card.jpg' };
    } catch {
      // Canvas cannot decode every mobile image format. Gemini may still accept the original.
      return { item, upload: item.file, uploadName: item.file.name };
    }
  }

  async function startBulkScan() {
    if (processing) return;
    const queue = items.filter((item) => item.status === 'pending' || item.status === 'scan-error');
    if (queue.length === 0) return;

    setProcessing(true);
    queue.forEach((item) => updateItem(item.id, { status: 'scanning', error: '', confirmed: false, duplicate: null }));
    const prepared = await Promise.all(queue.map(prepareItem));

    let nextIndex = 0;
    async function worker() {
      while (nextIndex < prepared.length) {
        const preparedItem = prepared[nextIndex];
        nextIndex += 1;
        try {
          // eslint-disable-next-line no-await-in-loop
          const { fields, duplicate } = await scanCardRemote(preparedItem.upload, preparedItem.uploadName);
          updateItem(preparedItem.item.id, {
            upload: preparedItem.upload,
            uploadName: preparedItem.uploadName,
            status: 'ready',
            fields: { ...EMPTY_FORM, ...fields },
            confirmed: false,
            error: '',
            duplicate: duplicate || null,
          });
        } catch (error) {
          updateItem(preparedItem.item.id, {
            upload: preparedItem.upload,
            uploadName: preparedItem.uploadName,
            status: 'scan-error',
            error: error instanceof Error ? error.message : 'Could not read this card',
          });
        }
      }
    }

    const workerCount = Math.min(SCAN_CONCURRENCY, prepared.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    setOpenItemId((current) => current || prepared[0]?.item.id || null);
    setProcessing(false);
  }

  async function saveItem(item: Item) {
    if (!item.confirmed || !item.upload || !['ready', 'save-error'].includes(item.status)) return;
    updateItem(item.id, { status: 'saving', error: '' });

    try {
      const formData = new FormData();
      formData.append('image', item.upload, item.uploadName);
      (Object.keys(item.fields) as (keyof FormState)[]).forEach((key) => formData.append(key, item.fields[key]));

      const response = await fetch(`${API_URL}/api/contacts`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save contact');
      }
      updateItem(item.id, { status: 'done', error: '' });
    } catch (error) {
      updateItem(item.id, {
        status: 'save-error',
        error: error instanceof Error ? error.message : 'Failed to save contact',
      });
    }
  }

  async function saveAllReviewed() {
    if (savingReviewed) return;
    const queue = items.filter(
      (item) =>
        item.confirmed && (item.status === 'ready' || item.status === 'save-error') && missingFields(item.fields).length === 0
    );
    if (queue.length === 0) return;

    setSavingReviewed(true);
    let nextIndex = 0;
    async function worker() {
      while (nextIndex < queue.length) {
        const item = queue[nextIndex];
        nextIndex += 1;
        // eslint-disable-next-line no-await-in-loop
        await saveItem(item);
      }
    }
    const workerCount = Math.min(SAVE_CONCURRENCY, queue.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    setSavingReviewed(false);
  }

  function reset() {
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
    setOpenItemId(null);
    setSelectionNotice('');
  }

  const scanFinishedCount = items.filter((item) =>
    ['ready', 'saving', 'done', 'scan-error', 'save-error'].includes(item.status)
  ).length;
  const scanFailedCount = items.filter((item) => item.status === 'scan-error').length;
  const reviewedCount = items.filter(
    (item) =>
      item.confirmed && (item.status === 'ready' || item.status === 'save-error') && missingFields(item.fields).length === 0
  ).length;
  const savedCount = items.filter((item) => item.status === 'done').length;
  const busy = processing || savingReviewed || items.some((item) => item.status === 'saving');

  const statusIcon: Record<ItemStatus, string> = {
    pending: 'fa-solid fa-clock text-gray-300',
    scanning: 'fa-solid fa-circle-notch fa-spin text-brand',
    ready: 'fa-solid fa-pen-to-square text-amber-500',
    saving: 'fa-solid fa-circle-notch fa-spin text-brand',
    done: 'fa-solid fa-circle-check text-green-500',
    'scan-error': 'fa-solid fa-circle-exclamation text-red-500',
    'save-error': 'fa-solid fa-circle-exclamation text-red-500',
  };

  const statusLabel: Record<ItemStatus, string> = {
    pending: 'Waiting',
    scanning: 'Reading card',
    ready: 'Review required',
    saving: 'Saving',
    done: 'Saved',
    'scan-error': 'Scan failed',
    'save-error': 'Save failed',
  };

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bulk upload</h2>
        <p className="text-xs text-gray-500">Scan up to {MAX_BULK_ITEMS} cards at once, read one by one, then review each before saving.</p>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesSelected} />

      {selectionNotice && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {selectionNotice}
        </p>
      )}

      {items.length === 0 ? (
        <div className="card space-y-3 text-center">
          <p className="text-sm text-gray-500">Select up to {MAX_BULK_ITEMS} clear photos, one per business card.</p>
          <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-left text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            <i className="fa-solid fa-circle-info mr-1" />
            Sharp, well-lit, glare-free photos read far more accurately than blurry ones.
          </p>
          <button type="button" className="btn-primary w-full" onClick={() => fileInputRef.current?.click()}>
            <i className="fa-solid fa-upload" />
            Choose files
          </button>
        </div>
      ) : (
        <>
          {processing && (
            <p className="text-sm text-gray-500">
              Reading {scanFinishedCount} of {items.length} cards…
            </p>
          )}
          {savedCount === items.length && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
              All {savedCount} reviewed contacts are saved.
            </p>
          )}

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-ink-light">
            {items.map((item) => {
              const isOpen = openItemId === item.id;
              const hasFields = ['ready', 'saving', 'done', 'save-error'].includes(item.status);
              const itemLabel = item.fields.name || item.fields.company || item.file.name;
              const fieldsDisabled = item.status === 'saving' || item.status === 'done';

              return (
                <section key={item.id} className="border-b border-gray-100 last:border-b-0 dark:border-white/10">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/5"
                    onClick={() => setOpenItemId(isOpen ? null : item.id)}
                    aria-expanded={isOpen}
                  >
                    <img src={item.previewUrl} alt="" className="h-12 w-12 shrink-0 rounded-md border border-gray-200 object-cover dark:border-white/10" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">{itemLabel}</span>
                      <span className={`block text-xs ${item.status.includes('error') ? 'text-red-600' : 'text-gray-500'}`}>
                        {statusLabel[item.status]}
                      </span>
                    </span>
                    <i className={`${statusIcon[item.status]} shrink-0`} />
                    <i className={`fa-solid fa-chevron-down text-xs text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="space-y-4 border-t border-gray-100 px-4 py-4 dark:border-white/10">
                      <img src={item.previewUrl} alt="Business card to review" className="max-h-64 w-full rounded-lg object-contain" />

                      {item.error && <p className="text-sm text-red-600">{item.error}</p>}
                      {item.duplicate && (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                          <i className="fa-solid fa-triangle-exclamation mr-1" />
                          Possible duplicate — matches {item.duplicate.name || item.duplicate.company || 'a contact'} captured by{' '}
                          {item.duplicate.capturedBy || 'someone'} on {new Date(item.duplicate.createdAt).toLocaleDateString()}.
                        </p>
                      )}

                      {hasFields && (
                        <>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {(Object.keys(EMPTY_FORM) as (keyof FormState)[]).map((key) => (
                              <div key={key} className={key === 'address' || key === 'notes' ? 'sm:col-span-2' : ''}>
                                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                                  {FIELD_LABELS[key]}
                                </label>
                                <input
                                  className="input"
                                  value={item.fields[key]}
                                  disabled={fieldsDisabled}
                                  onChange={(event) => updateField(item.id, key, event.target.value)}
                                />
                              </div>
                            ))}
                          </div>

                          {item.status !== 'done' && (
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                              <input
                                type="checkbox"
                                className="accent-brand"
                                checked={item.confirmed}
                                disabled={item.status === 'saving'}
                                onChange={(event) => updateItem(item.id, { confirmed: event.target.checked })}
                              />
                              I reviewed this card and corrected its details
                            </label>
                          )}

                          {item.status !== 'done' && missingFields(item.fields).length > 0 && (
                            <p className="text-xs text-status-flagged">
                              Still needed: {missingFields(item.fields).map((key) => FIELD_LABELS[key].replace(' *', '')).join(', ')}
                            </p>
                          )}

                          {(item.status === 'ready' || item.status === 'save-error') && (
                            <button
                              type="button"
                              className="btn-primary w-full"
                              disabled={!item.confirmed || busy || missingFields(item.fields).length > 0}
                              onClick={() => saveItem(item)}
                            >
                              <i className="fa-solid fa-floppy-disk" />
                              Save this contact
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={reset} disabled={busy}>
              {savedCount === items.length ? 'Scan more cards' : 'Clear'}
            </button>
            {(items.some((item) => item.status === 'pending') || scanFailedCount > 0) && (
              <button type="button" className="btn-primary flex-1" onClick={startBulkScan} disabled={busy}>
                {processing ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin" />
                    Reading…
                  </>
                ) : scanFailedCount > 0 ? (
                  `Retry ${scanFailedCount} failed`
                ) : (
                  `Read ${items.length} cards`
                )}
              </button>
            )}
            {reviewedCount > 0 && (
              <button type="button" className="btn-primary flex-1" onClick={saveAllReviewed} disabled={busy}>
                <i className={savingReviewed ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-floppy-disk'} />
                Save reviewed ({reviewedCount})
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
