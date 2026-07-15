'use client';

import { useState } from 'react';
import { API_URL } from '@/lib/api';

type FormState = {
  name: string;
  company: string;
  jobTitle: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  company: '',
  jobTitle: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  notes: '',
};

const FIELD_LABELS: Record<keyof FormState, string> = {
  name: 'Name',
  company: 'Company',
  jobTitle: 'Job title',
  phone: 'Phone',
  email: 'Email',
  website: 'Website',
  address: 'Address',
  notes: 'Notes',
};

export default function ManualContactForm() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  function updateField<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSavedMessage('');
  }

  const hasIdentifyingField = Boolean(form.name || form.company || form.phone || form.email);

  async function handleSave() {
    if (!hasIdentifyingField) {
      setError('Enter at least a name, company, phone, or email');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      (Object.keys(form) as (keyof FormState)[]).forEach((key) => formData.append(key, form[key]));

      const res = await fetch(`${API_URL}/api/contacts`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save contact');
      }
      setSavedMessage('Contact saved.');
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Manual entry</h2>
        <p className="text-xs text-gray-500">No card photo needed — type in the details directly.</p>
      </div>

      {savedMessage && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          {savedMessage}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="card grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(Object.keys(EMPTY_FORM) as (keyof FormState)[]).map((key) => (
          <div key={key} className={key === 'address' || key === 'notes' ? 'sm:col-span-2' : ''}>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">{FIELD_LABELS[key]}</label>
            <input className="input" value={form[key]} disabled={saving} onChange={(e) => updateField(key, e.target.value)} />
          </div>
        ))}
      </div>

      <button type="button" className="btn-primary w-full" disabled={saving} onClick={handleSave}>
        {saving ? (
          <>
            <i className="fa-solid fa-circle-notch fa-spin" />
            Saving…
          </>
        ) : (
          <>
            <i className="fa-solid fa-floppy-disk" />
            Save contact
          </>
        )}
      </button>
    </div>
  );
}
