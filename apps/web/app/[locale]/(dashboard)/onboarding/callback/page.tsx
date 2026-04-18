'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { api } from '@/lib/api';

// This page receives the OAuth redirect from Meta after Embedded Signup.
// URL format: /[locale]/onboarding/callback?code=ABC&state=businessId
// It runs in the popup opened by the onboarding page.
// On success/failure it notifies the opener via postMessage and closes the popup.
export default function OnboardingCallbackPage() {
  const router = useRouter();
  const locale = useLocale();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    const businessId = searchParams.get('state');

    const notifyAndClose = (type: 'whatsapp_connected' | 'whatsapp_error') => {
      if (window.opener) {
        window.opener.postMessage({ type }, window.location.origin);
        window.close();
      } else {
        // Fallback: not in a popup, navigate directly
        if (type === 'whatsapp_connected') {
          router.push(`/${locale}/onboarding?step=2`);
        } else {
          router.push(`/${locale}/onboarding?error=connect_failed`);
        }
      }
    };

    if (!code) {
      notifyAndClose('whatsapp_error');
      return;
    }

    if (!businessId) {
      notifyAndClose('whatsapp_error');
      return;
    }

    // Reconstruct the exact redirect_uri that was sent in the OAuth dialog
    const redirectUri = `${window.location.origin}${window.location.pathname}`;

    api
      .post('/whatsapp/connect', { code, businessId, redirectUri })
      .then(() => notifyAndClose('whatsapp_connected'))
      .catch(() => notifyAndClose('whatsapp_error'));
  }, [router, locale]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-600 text-sm">Connecting your WhatsApp...</p>
      </div>
    </div>
  );
}
