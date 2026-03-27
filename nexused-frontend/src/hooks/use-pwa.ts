'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UsePwaReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  installApp: () => Promise<boolean>;
  swStatus: 'loading' | 'ready' | 'error' | 'unsupported';
}

/**
 * Hook for PWA functionality.
 *
 * Provides:
 * - Install prompt handling
 * - Online/offline status
 * - Service worker registration status
 */
export function usePwa(): UsePwaReturn {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  // Lazy initializers read synchronous browser APIs at mount time,
  // avoiding setState calls inside effects (react-hooks/set-state-in-effect).
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches;
  });
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  });
  const [swStatus, setSwStatus] = useState<
    'loading' | 'ready' | 'error' | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator))
      return 'unsupported';
    return 'loading';
  });

  const swCheckedRef = useRef(false);
  const installCheckedRef = useRef(false);

  // Register service worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator))
      return;
    if (swCheckedRef.current) return;
    swCheckedRef.current = true;

    // Register the service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service worker registered:', registration.scope);
        setSwStatus('ready');

        // Check for updates periodically
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000,
        ); // Every hour
      })
      .catch((error) => {
        console.error('[PWA] Service worker registration failed:', error);
        setSwStatus('error');
      });
  }, []);

  // Handle install prompt
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (installCheckedRef.current) return;
    installCheckedRef.current = true;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Install app function
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;

      if (outcome === 'accepted') {
        setInstallPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[PWA] Install failed:', error);
      return false;
    }
  }, [installPrompt]);

  return {
    isInstallable: !!installPrompt && !isInstalled,
    isInstalled,
    isOnline,
    installApp,
    swStatus,
  };
}
