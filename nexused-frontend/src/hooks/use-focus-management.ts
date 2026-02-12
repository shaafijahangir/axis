'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * WHY: After SPA navigation, focus must move to the new page content
 * so keyboard/screen reader users aren't stranded on the old page.
 *
 * WCAG 2.4.3: Focus Order — focus must follow a logical sequence.
 *
 * PATTERN: On pathname change, focus the <main> element (#main-content).
 * The main element has tabIndex={-1} so it can receive programmatic focus
 * without appearing in the tab order.
 */
export function useFocusOnRouteChange() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== previousPathname.current) {
      previousPathname.current = pathname;

      // Small delay to allow the new page to render
      requestAnimationFrame(() => {
        const main = document.getElementById('main-content');
        if (main) {
          main.focus({ preventScroll: true });
        }
      });
    }
  }, [pathname]);
}

/**
 * Returns a focus-trap manager for modal-like components.
 * Radix UI already handles focus trapping for its primitives,
 * but this is useful for custom modal-like components.
 *
 * WCAG 2.4.3: Focus must be trapped inside modal dialogs.
 */
export function useFocusTrap() {
  const containerRef = useRef<HTMLDivElement>(null);

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !containerRef.current) return;

    const focusable = containerRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), textarea:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: if at first, loop to last
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: if at last, loop to first
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, [trapFocus]);

  return containerRef;
}

/**
 * Hook that returns the previous focused element and restores it on unmount.
 * Useful for modals/dialogs that need to return focus to the trigger.
 *
 * WCAG 2.4.3: When a dialog closes, focus should return to the trigger element.
 */
export function useRestoreFocus() {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement;

    return () => {
      // Restore focus on unmount
      if (previousFocus.current && previousFocus.current.focus) {
        previousFocus.current.focus();
      }
    };
  }, []);
}
