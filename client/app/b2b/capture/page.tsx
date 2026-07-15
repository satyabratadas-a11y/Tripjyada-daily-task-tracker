'use client';

import { useState } from 'react';
import CardScanner from '@/components/b2b/CardScanner';
import BulkCardUpload from '@/components/b2b/BulkCardUpload';
import ManualContactForm from '@/components/b2b/ManualContactForm';

type Mode = 'single' | 'bulk' | 'manual';

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  single: 'Point the camera at a card, capture it, review the auto-filled details, then save.',
  bulk: 'Select up to 5 card photos — they scan one by one, then review and correct each result before saving.',
  manual: 'No card to scan? Type the contact details in directly.',
};

export default function CapturePage() {
  const [mode, setMode] = useState<Mode>('single');

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold dark:text-gray-100">Scan business card</h1>
      <p className="mb-4 text-sm text-gray-500">{MODE_DESCRIPTIONS[mode]}</p>

      <div className="mx-auto mb-4 flex max-w-xl gap-2">
        <button
          type="button"
          className={mode === 'single' ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
          onClick={() => setMode('single')}
        >
          <i className="fa-solid fa-camera" />
          Single card
        </button>
        <button
          type="button"
          className={mode === 'bulk' ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
          onClick={() => setMode('bulk')}
        >
          <i className="fa-solid fa-layer-group" />
          Bulk upload
        </button>
        <button
          type="button"
          className={mode === 'manual' ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
          onClick={() => setMode('manual')}
        >
          <i className="fa-solid fa-keyboard" />
          Manual entry
        </button>
      </div>

      {mode === 'single' && <CardScanner />}
      {mode === 'bulk' && <BulkCardUpload />}
      {mode === 'manual' && <ManualContactForm />}
    </div>
  );
}
