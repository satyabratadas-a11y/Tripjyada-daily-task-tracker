'use client';

import { useState } from 'react';
import { downloadUrl } from '@/lib/api';

export default function ExportMenu({ clientId, queryString }: { clientId: string; queryString: string }) {
  const [open, setOpen] = useState(false);
  const base = `/api/content/clients/${clientId}/entries/export`;
  const sep = queryString ? '&' : '';

  return (
    <div className="relative">
      <button type="button" className="btn-secondary" onClick={() => setOpen((o) => !o)}>
        <i className="fa-solid fa-file-export" /> Export
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-label="Close" />
          <div className="absolute right-0 z-20 mt-1 w-40 rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-ink-light">
            {(['csv', 'xlsx', 'pdf'] as const).map((fmt) => (
              <a
                key={fmt}
                href={downloadUrl(`${base}?format=${fmt}${sep}${queryString}`)}
                className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/5"
                onClick={() => setOpen(false)}
              >
                {fmt.toUpperCase()}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
