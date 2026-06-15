/**
 * Pagination helpers — shared clamp logic for every paginated list query.
 *
 * WHY: Services that read `pageSize`/`limit` straight from client input and
 * pass it to `.take()` let a caller request `pageSize: 10_000_000` and dump an
 * entire table in one query — a denial-of-service and data-exfiltration vector.
 * Centralising the clamp means every list endpoint shares one defensible cap
 * instead of each re-deriving (or forgetting) its own bound.
 *
 * PATTERN: Defence in depth — DTOs carry `@Max` validators for a clean API
 * error, but services still clamp here so a query is never unbounded even if a
 * caller bypasses the GraphQL layer (internal calls, future REST, etc.).
 */

/** Hard ceiling for any single page. No list query may exceed this. */
export const MAX_PAGE_SIZE = 100;

/** Default page size when the caller supplies none. */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Clamp a requested page size into `[1, max]`, falling back to `def` when the
 * request is missing or not a positive number.
 */
export function clampPageSize(
  requested: number | null | undefined,
  def: number = DEFAULT_PAGE_SIZE,
  max: number = MAX_PAGE_SIZE,
): number {
  if (requested == null || !Number.isFinite(requested) || requested < 1) {
    return Math.min(def, max);
  }
  return Math.min(Math.floor(requested), max);
}

/**
 * Normalise a 1-based page number into a positive integer, defaulting to 1.
 */
export function clampPage(requested: number | null | undefined): number {
  if (requested == null || !Number.isFinite(requested) || requested < 1) {
    return 1;
  }
  return Math.floor(requested);
}
