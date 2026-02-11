'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted">
          <WifiOff className="w-10 h-10 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">You're offline</h1>
          <p className="text-muted-foreground">
            It looks like you've lost your internet connection. Some features
            may not be available until you're back online.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => window.location.reload()}
            className="w-full"
            size="lg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>

          <p className="text-sm text-muted-foreground">
            Cached content is still available. Check your assignments and course
            materials that you've viewed recently.
          </p>
        </div>
      </div>
    </div>
  );
}
