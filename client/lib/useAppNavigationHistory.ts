'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const HISTORY_PREFIX = 'tripjyada-app-history';
const MAX_HISTORY_ENTRIES = 50;

function isInternalUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

function readEntries(key: string) {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isInternalUrl).slice(-MAX_HISTORY_ENTRIES);
  } catch {
    return [];
  }
}

function writeEntries(key: string, entries: string[]) {
  sessionStorage.setItem(key, JSON.stringify(entries.slice(-MAX_HISTORY_ENTRIES)));
}

function browserUrl() {
  return `${window.location.pathname}${window.location.search}`;
}

/**
 * Keeps a per-user, per-tab trail of internal pages. Unlike a pathname-parent shortcut, this
 * preserves the actual route, query filters, and click order the user followed.
 */
export function useAppNavigationHistory(userId?: string) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const search = searchParams.toString();
  const currentUrl = useMemo(() => `${pathname}${search ? `?${search}` : ''}`, [pathname, search]);
  const historyKey = userId ? `${HISTORY_PREFIX}:${userId}` : '';
  const expectedBackKey = historyKey ? `${historyKey}:expected-back` : '';
  const [depth, setDepth] = useState(0);

  useEffect(() => {
    if (!historyKey) {
      setDepth(0);
      return;
    }

    let entries = readEntries(historyKey);
    const expectedBackUrl = sessionStorage.getItem(expectedBackKey);

    if (expectedBackUrl === currentUrl) {
      // Browser/app back navigation: trim the pages that were in front of this destination.
      const previousIndex = entries.lastIndexOf(currentUrl, entries.length - 2);
      entries =
        previousIndex >= 0
          ? entries.slice(0, previousIndex + 1)
          : entries.at(-1) === currentUrl
            ? entries
            : [...entries, currentUrl];
      sessionStorage.removeItem(expectedBackKey);
    } else {
      // Normal Link/router navigation, including revisiting an older page, creates a new step.
      if (expectedBackUrl) sessionStorage.removeItem(expectedBackKey);
      if (entries.at(-1) !== currentUrl) entries.push(currentUrl);
    }

    entries = entries.slice(-MAX_HISTORY_ENTRIES);
    writeEntries(historyKey, entries);
    setDepth(Math.max(0, entries.length - 1));
  }, [currentUrl, expectedBackKey, historyKey]);

  useEffect(() => {
    if (!expectedBackKey) return;

    function handleBrowserHistoryChange() {
      const destination = browserUrl();
      if (isInternalUrl(destination)) sessionStorage.setItem(expectedBackKey, destination);
    }

    window.addEventListener('popstate', handleBrowserHistoryChange);
    return () => window.removeEventListener('popstate', handleBrowserHistoryChange);
  }, [expectedBackKey]);

  const goBack = useCallback(() => {
    if (!historyKey || !expectedBackKey) return;

    const entries = readEntries(historyKey);
    if (entries.at(-1) !== currentUrl) entries.push(currentUrl);
    if (entries.length < 2) {
      setDepth(0);
      return;
    }

    const destination = entries.at(-2);
    if (!destination) return;
    sessionStorage.setItem(expectedBackKey, destination);
    router.back();
  }, [currentUrl, expectedBackKey, historyKey, router]);

  const clearHistory = useCallback(() => {
    if (historyKey) sessionStorage.removeItem(historyKey);
    if (expectedBackKey) sessionStorage.removeItem(expectedBackKey);
    setDepth(0);
  }, [expectedBackKey, historyKey]);

  return {
    canGoBack: depth > 0,
    depth,
    goBack,
    clearHistory,
  };
}
