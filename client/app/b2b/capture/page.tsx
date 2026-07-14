'use client';

import { useState } from 'react';
import CardScanner from '@/components/b2b/CardScanner';
import BulkCardUpload from '@/components/b2b/BulkCardUpload';

type Mode = 'single' | 'bulk';

export default function CapturePage() {
  const [mode, setMode] = useState<Mode>('single');

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold dark:text-gray-100">Scan business card</h1>
      <p className="mb-4 text-sm text-gray-500">
        {mode === 'single'
          ? 'Point the camera at a card, capture it, review the auto-filled details, then save.'
          : 'Select photos of multiple cards to scan and save them all at once.'}
      </p>

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
      </div>

      {mode === 'single' ? <CardScanner /> : <BulkCardUpload />}
    </div>
  );
}
