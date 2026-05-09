'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

/**
 * WHY: Auth state is now based on user presence, not token.
 * PATTERN: The httpOnly cookie handles auth; we just check if user info exists.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isHydrated, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  if (!isHydrated || !isAuthenticated) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        role="status"
        aria-label="Loading application"
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
          aria-hidden="true"
        />
        <span className="sr-only">Loading Axis, please wait...</span>
      </div>
    );
  }

  return <>{children}</>;
}
