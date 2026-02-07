'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

/**
 * DATA-006: Error boundary for auth routes.
 * WHY: Unhandled React errors crash the entire app with a white screen.
 * This component catches errors and shows a recoverable error state.
 */
export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Auth error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-8 w-8" />
        <h2 className="text-xl font-semibold">Something went wrong</h2>
      </div>

      <p className="max-w-md text-center text-muted-foreground">
        An error occurred while loading this page. Please try again.
      </p>

      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-4 max-w-2xl overflow-auto rounded-md bg-muted p-4 text-xs">
          {error.message}
        </pre>
      )}

      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
