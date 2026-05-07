import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Extends ThrottlerGuard to work with both REST and GraphQL contexts.
 * The default ThrottlerGuard reads request.ip from HTTP context only,
 * crashing on GraphQL resolvers where the context is wrapped differently.
 */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext): {
    req: Record<string, unknown>;
    res: Record<string, unknown>;
  } {
    if (context.getType<string>() === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      const req = gqlCtx.getContext<{ req: Request }>().req;
      return {
        req: req as unknown as Record<string, unknown>,
        res: (req.res ?? {}) as Record<string, unknown>,
      };
    }
    return super.getRequestResponse(context);
  }
}
