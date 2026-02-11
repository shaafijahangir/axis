'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePwa } from '@/hooks/use-pwa';

/**
 * Install prompt banner for PWA installation.
 *
 * Shows a dismissable banner prompting users to install the app.
 * Only shows when:
 * - The app is installable (browser supports it)
 * - The app is not already installed
 * - The user hasn't dismissed the prompt in this session
 */
export function InstallPrompt() {
  const { isInstallable, installApp } = usePwa();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Don't show if already dismissed in this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  if (!isInstallable || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    const success = await installApp();
    setIsInstalling(false);

    if (success) {
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa-install-dismissed', 'true');
    setIsDismissed(true);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-card border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Install NexusEd</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add to your home screen for quick access and offline support.
            </p>

            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleInstall}
                disabled={isInstalling}
                className="h-8"
              >
                <Download className="w-3 h-3 mr-1" />
                {isInstalling ? 'Installing...' : 'Install'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8"
              >
                Not now
              </Button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-muted rounded"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
