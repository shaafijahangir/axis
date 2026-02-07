import { AsyncLocalStorage } from 'async_hooks';
import { Injectable } from '@nestjs/common';

/**
 * ARCH-002: Request-scoped tenant context using AsyncLocalStorage.
 *
 * WHY: Eliminates the need to pass tenantId through every method call.
 * Services can access the current tenant from anywhere in the request lifecycle.
 *
 * PATTERN: Uses Node.js AsyncLocalStorage which maintains context across async
 * operations without polluting function signatures.
 *
 * TRADEOFF: Implicit dependency vs explicit parameter passing. We accept this
 * because tenant scoping is ubiquitous and forgetting to pass tenantId is a
 * security risk (SEC-001 type bugs).
 */

interface TenantStore {
  tenantId: string;
  userId?: string;
}

@Injectable()
export class TenantContext {
  private static storage = new AsyncLocalStorage<TenantStore>();

  /**
   * Run a function within a tenant context.
   * Call this at the beginning of each request (via interceptor).
   */
  run<T>(store: TenantStore, callback: () => T): T {
    return TenantContext.storage.run(store, callback);
  }

  /**
   * Get the current tenant ID.
   * Throws if called outside of a tenant context.
   */
  getTenantId(): string {
    const store = TenantContext.storage.getStore();
    if (!store) {
      throw new Error(
        'TenantContext.getTenantId() called outside of tenant context. ' +
          'Ensure the request passes through TenantInterceptor.',
      );
    }
    return store.tenantId;
  }

  /**
   * Get the current tenant ID or undefined if not in context.
   * Use this when tenant context is optional (e.g., public endpoints).
   */
  getTenantIdOptional(): string | undefined {
    return TenantContext.storage.getStore()?.tenantId;
  }

  /**
   * Get the current user ID if set.
   */
  getUserId(): string | undefined {
    return TenantContext.storage.getStore()?.userId;
  }

  /**
   * Check if we're currently in a tenant context.
   */
  isInContext(): boolean {
    return !!TenantContext.storage.getStore();
  }
}
