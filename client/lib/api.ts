// In dev, leave NEXT_PUBLIC_API_URL unset so requests stay relative to whatever origin the
// browser is actually using (localhost or a LAN IP) — next.config.mjs proxies /api/* to the
// local server, which keeps the auth cookie same-site no matter which host you load the app
// from. Only set NEXT_PUBLIC_API_URL explicitly for a real cross-origin deployment (production).
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function networkErrorMessage() {
  return `Cannot reach the server at ${API_URL}. Make sure the API server is running and reachable.`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('The request was interrupted. Please try again.', 0);
    }
    throw new ApiError(networkErrorMessage(), 0);
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // response had no JSON body
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
};

export function downloadUrl(path: string) {
  return `${API_URL}${path}`;
}
