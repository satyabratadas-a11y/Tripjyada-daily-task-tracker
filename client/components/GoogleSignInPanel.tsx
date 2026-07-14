'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { api, ApiError } from '@/lib/api';
import { homeRouteForRole } from '@/lib/roles';
import type { User } from '@/lib/types';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              width?: string | number;
              logo_alignment?: 'left' | 'center';
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

type GoogleAuthResponse = {
  user?: User;
  pending?: boolean;
  message?: string;
};

export default function GoogleSignInPanel({
  onError,
  onPending,
}: {
  onError?: (message: string) => void;
  onPending?: (message: string) => void;
}) {
  const router = useRouter();
  const { refresh } = useAuth();
  const buttonId = useId().replace(/:/g, '-');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  const buttonText = useMemo(() => (busy ? 'Checking Google account…' : 'Continue with Google'), [busy]);

  async function handleCredentialResponse(response: { credential?: string }) {
    if (!response.credential) {
      onError?.('Google sign-in did not return a credential. Please try again.');
      return;
    }

    setBusy(true);
    onError?.('');
    onPending?.('');

    try {
      const data = await api.post<GoogleAuthResponse>('/api/auth/google', {
        credential: response.credential,
      });

      if (data.pending) {
        onPending?.(data.message || 'Your Google account was received and is awaiting super admin approval.');
        return;
      }

      if (!data.user) {
        onError?.('Google sign-in did not complete correctly. Please try again.');
        return;
      }

      await refresh();
      router.replace(homeRouteForRole(data.user.role));
    } catch (err) {
      onError?.(err instanceof ApiError ? err.message : 'Google sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  function renderGoogleButton() {
    if (!clientId || !window.google || !containerRef.current) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
    });

    containerRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(containerRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: 320,
      logo_alignment: 'left',
    });
    initializedRef.current = true;
  }

  useEffect(() => {
    if (!clientId) return;
    if (window.google && !initializedRef.current) {
      renderGoogleButton();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (!clientId) return null;

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-[0.2em] text-gray-400">
          <span className="bg-white px-3">or</span>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
        <p className="mb-3 text-center text-sm font-medium text-gray-700">{buttonText}</p>
        <div id={buttonId} ref={containerRef} className="flex min-h-[44px] items-center justify-center" />
      </div>

      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          renderGoogleButton();
        }}
      />
    </div>
  );
}
