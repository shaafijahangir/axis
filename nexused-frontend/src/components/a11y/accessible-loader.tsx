'use client';

import { cn } from '@/lib/utils';

/**
 * WHY: Loading indicators MUST be accessible to screen readers (WCAG 4.1.3).
 * PATTERN: role="status" + aria-label + sr-only text. The visual spinner
 * is aria-hidden so screen readers only see the text announcement.
 *
 * Use this instead of raw spinner divs throughout the app.
 */

interface AccessibleLoaderProps {
  /** Screen reader announcement text */
  label?: string;
  /** Visual size of the spinner */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Whether to render as a full-page centered loader */
  fullPage?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-12 w-12 border-4',
} as const;

export function AccessibleLoader({
  label = 'Loading, please wait...',
  size = 'md',
  className,
  fullPage = false,
}: AccessibleLoaderProps) {
  const spinner = (
    <div
      role="status"
      aria-label={label}
      className={cn(
        'flex items-center justify-center',
        fullPage && 'h-screen',
        className,
      )}
    >
      <div
        className={cn(
          'animate-spin rounded-full border-primary border-t-transparent',
          sizeClasses[size],
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );

  return spinner;
}
