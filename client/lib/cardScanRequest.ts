import { API_URL } from '@/lib/api';

// The server's provider deadlines finish in roughly 14 seconds at worst. Keep the browser deadline
// slightly longer for upload/response overhead, while still guaranteeing that a broken proxy or
// dropped connection cannot leave the scanner spinner running indefinitely.
export const CARD_SCAN_TIMEOUT_MS = 18_000;

export async function requestCardScan<T>(formData: FormData, callerSignal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();

  if (callerSignal?.aborted) controller.abort();
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });

  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CARD_SCAN_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/api/contacts/scan`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || 'Could not read the card');
    }
    return (await response.json()) as T;
  } catch (error) {
    if (timedOut) {
      throw new Error('Card scan timed out. Try again, or enter the details manually below.');
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }
}
