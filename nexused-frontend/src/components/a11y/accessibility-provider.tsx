'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

/**
 * WHY: Centralized accessibility state that any component can consume.
 * PATTERN: Context provider at the layout level, detecting OS preferences
 * and providing imperative helpers (announce, moveFocus).
 *
 * WCAG 2.1 references:
 * - 2.3.3 Animation from Interactions (prefers-reduced-motion)
 * - 1.4.11 Non-text Contrast (prefers-contrast)
 * - 4.1.3 Status Messages (live region announcements)
 */

interface AccessibilityContextValue {
  /** User prefers reduced motion (OS setting) */
  prefersReducedMotion: boolean;
  /** User prefers higher contrast (OS setting) */
  prefersHighContrast: boolean;
  /** Announce a message to screen readers via aria-live region */
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue>({
  prefersReducedMotion: false,
  prefersHighContrast: false,
  announce: () => {},
});

/** Hook to consume accessibility context */
export function useAccessibility() {
  return useContext(AccessibilityContext);
}

/**
 * Detects a CSS media query and keeps state in sync.
 * Uses useSyncExternalStore (React 18+) to avoid setState-in-effect warnings.
 */
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const prefersReducedMotion = useMediaQuery(
    '(prefers-reduced-motion: reduce)',
  );
  const prefersHighContrast = useMediaQuery('(prefers-contrast: more)');

  // Live region refs for screen reader announcements
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);

  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      const ref = priority === 'assertive' ? assertiveRef : politeRef;
      if (!ref.current) return;

      // Clear first, then set — forces screen readers to re-announce
      ref.current.textContent = '';
      requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.textContent = message;
        }
      });
    },
    [],
  );

  const value = useMemo(
    () => ({ prefersReducedMotion, prefersHighContrast, announce }),
    [prefersReducedMotion, prefersHighContrast, announce],
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}

      {/* WCAG 4.1.3: Live regions for programmatic announcements */}
      <div
        ref={politeRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        ref={assertiveRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </AccessibilityContext.Provider>
  );
}
