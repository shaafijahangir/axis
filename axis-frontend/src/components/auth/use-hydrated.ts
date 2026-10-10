'use client';

import { useSyncExternalStore } from 'react';

// Nothing to subscribe to: the value only flips once, from the server
// snapshot (false) to the client snapshot (true), when hydration finishes.
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Returns false during SSR and the hydration render, true once React owns the DOM.
 *
 * WHY: Until hydration attaches React's event handlers, a client form's
 * `onSubmit` does not exist. A submit in that window falls through to the
 * browser's native form submission (GET to the current URL by default), which
 * reloads the page and silently wipes what the user typed. Gate submit buttons
 * on this so they are only clickable once `onSubmit` is live.
 * PATTERN: useSyncExternalStore with a getServerSnapshot. React uses
 * getServerSnapshot during hydration and re-renders with getSnapshot right
 * after (https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering),
 * so the server HTML and the hydration render agree (no hydration mismatch).
 * TRADEOFF: Without JavaScript the button stays disabled forever. Axis
 * requires JavaScript everywhere (auth is a fetch + client navigation), so a
 * dead button is more honest than a submit that does nothing useful.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
