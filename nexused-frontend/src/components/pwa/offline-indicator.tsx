'use client';

import { WifiOff } from 'lucide-react';
import { usePwa } from '@/hooks/use-pwa';

/**
 * Offline indicator banner.
 *
 * Shows a persistent banner at the top of the screen when the user is offline.
 */
export function OfflineIndicator() {
  const { isOnline } = usePwa();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white px-4 py-2">
      <div className="container flex items-center justify-center gap-2 text-sm">
        <WifiOff className="w-4 h-4" />
        <span>{"You're offline. Some features may be unavailable."}</span>
      </div>
    </div>
  );
}
