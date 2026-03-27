import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';
import { UserRole } from '../database/entities';

interface RequestWithUser extends Request {
  user?: { roles?: UserRole[] };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request: RequestWithUser =
      context.getType() === 'http'
        ? context.switchToHttp().getRequest<RequestWithUser>()
        : GqlExecutionContext.create(context).getContext<{
            req: RequestWithUser;
          }>().req;

    return requiredRoles.some((role) => request.user?.roles?.includes(role));
  }
}
