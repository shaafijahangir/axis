import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request: Request =
      ctx.getType() === 'http'
        ? ctx.switchToHttp().getRequest<Request>()
        : GqlExecutionContext.create(ctx).getContext<{ req: Request }>().req;
    return (request as Request & { user?: unknown }).user;
  },
);
