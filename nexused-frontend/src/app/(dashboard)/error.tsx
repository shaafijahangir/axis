'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

/**
 * DATA-006: Error boundary for dashboard routes.
 * WHY: Unhandled React errors crash the entire app with a white screen.
 * This component catches errors and shows a recoverable error state.
 *
 * PATTERN: Next.js App Router error.tsx is automatically used as an error boundary.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-8 w-8" />
        <h2 className="text-xl font-semibold">Something went wrong</h2>
      </div>

      <p className="max-w-md text-center text-muted-foreground">
        An unexpected error occurred. This has been logged and we&apos;ll look
        into it.
      </p>

      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-4 max-w-2xl overflow-auto rounded-md bg-muted p-4 text-xs">
          {error.message}
        </pre>
      )}

      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button
          variant="outline"
          onClick={() => (window.location.href = '/home')}
        >
          Go to Home
        </Button>
      </div>
    </div>
  );
}
