'use client';

import { useState } from 'react';

export default function RefreshButton() {
  const [refreshing, setRefreshing] = useState(false);

  function handleClick() {
    setRefreshing(true);
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={refreshing}
      className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
      title="Refresh"
    >
      <i className={`fa-solid fa-arrows-rotate ${refreshing ? 'animate-spin' : ''}`} />
    </button>
  );
}
