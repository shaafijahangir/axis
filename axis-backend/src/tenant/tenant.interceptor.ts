import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { GqlExecutionContext } from '@nestjs/graphql';
import { TenantContext } from './tenant-context';

/**
 * ARCH-002: Interceptor that sets up tenant context for every request.
 *
 * WHY: Extracts tenantId from the authenticated user and makes it available
 * throughout the request via TenantContext. Services can then access the
 * tenant without needing it passed through every method call.
 *
 * PATTERN: Wraps the handler execution in AsyncLocalStorage.run() so that
 * the context is available to all async operations within the request.
 *
 * NOTE: This interceptor runs AFTER guards, so the user is already attached
 * to the request by JwtAuthGuard.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = this.getRequest(context);
    const user = request?.user;

    // If no user (public endpoint or auth failed), skip tenant context
    if (!user?.tenantId) {
      return next.handle();
    }

    // Wrap the handler execution in tenant context
    return new Observable((subscriber) => {
      this.tenantContext.run(
        { tenantId: user.tenantId, userId: user.id },
        () => {
          next.handle().subscribe({
            next: (value) => subscriber.next(value),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        },
      );
    });
  }

  private getRequest(
    context: ExecutionContext,
  ): { user?: { tenantId: string; id: string } } | undefined {
    if (context.getType() === 'http') {
      return context
        .switchToHttp()
        .getRequest<{ user?: { tenantId: string; id: string } }>();
    }
    // GraphQL context
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext<{
      req: { user?: { tenantId: string; id: string } };
    }>().req;
  }
}
