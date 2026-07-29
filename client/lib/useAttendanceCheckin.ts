import { useEffect } from 'react';
import { api } from './api';
import type { User } from './types';

const GEOLOCATION_TIMEOUT_MS = 8000;

function istDayKey(date = new Date()) {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function storageKey(userId: string) {
  // v2 ignores markers written by the original implementation before its API request had
  // actually succeeded. Those stale markers otherwise suppress retries for the rest of the day.
  return `attendance-checkin-v2-${userId}`;
}

async function checkIn(body: Record<string, number | string>, key: string, day: string) {
  try {
    await api.post('/api/attendance/checkin', body);
    localStorage.setItem(key, day);
  } catch {
    // Best-effort — attendance shouldn't ever block or interrupt using the app.
    // Do not write the daily marker: the next page load must retry a failed check-in.
  }
}

/**
 * Records today's login once per IST calendar day per browser, with a location snapshot if the
 * browser grants permission. Runs once when a user is known; login time is recorded immediately
 * (not blocked on the geolocation prompt, which can be slow, denied, or unsupported) and location
 * is reported separately, asynchronously, if and when it resolves.
 */
export function useAttendanceCheckin(user: User | null) {
  useEffect(() => {
    if (!user) return;
    const key = storageKey(user.id);
    const day = istDayKey();
    if (localStorage.getItem(key) === day) return;

    if (!navigator.geolocation) {
      void checkIn({ status: 'unsupported' }, key, day);
      return;
    }

    // getCurrentPosition always eventually calls one callback or the other (the timeout below
    // guarantees the error path fires within 8s even if no fix is ever found), so a single call
    // made from whichever one fires is enough — no need for a separate immediate placeholder
    // check-in first. This whole effect is a fire-and-forget background ping; it never blocks
    // login or any part of the UI either way.
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void checkIn(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          key,
          day
        );
      },
      (error) => {
        void checkIn({ status: error.code === error.PERMISSION_DENIED ? 'denied' : 'error' }, key, day);
      },
      { timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 60 * 60 * 1000 }
    );
  }, [user]);
}
