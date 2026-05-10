'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * WHY: Screen readers need route change announcements for SPA navigation.
 * PATTERN: aria-live="assertive" region that updates on pathname change.
 * Uses a ref to set textContent directly, avoiding setState-in-effect.
 * Next.js 16 may handle this internally, but this is a safety net.
 */
export function RouteAnnouncer() {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Build a human-readable route name from the pathname
    const routeName = pathname
      .replace(/^\//, '')
      .replace(/\//g, ' - ')
      .replace(/-/g, ' ')
      .replace(/\[.*?\]/g, '')
      .trim();

    const pageName = routeName || 'Home';

    // Clear first, then set — forces screen readers to re-announce
    ref.current.textContent = '';
    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.textContent = `Navigated to ${pageName}`;
      }
    });
  }, [pathname]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
    />
  );
}
