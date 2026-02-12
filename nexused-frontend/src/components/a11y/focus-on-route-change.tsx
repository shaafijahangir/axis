'use client';

import { useFocusOnRouteChange } from '@/hooks/use-focus-management';

/**
 * WHY: After SPA route changes, keyboard/screen reader users need focus
 * moved to the new page content. This component wraps the hook into
 * a render-less component that can be placed in the layout tree.
 *
 * WCAG 2.4.3: Focus Order
 */
export function FocusOnRouteChange() {
  useFocusOnRouteChange();
  return null;
}
