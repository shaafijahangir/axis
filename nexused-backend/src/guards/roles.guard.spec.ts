import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../database/entities';

function makeHttpContext(
  roles: UserRole[] | undefined,
  requiredRoles: UserRole[] | undefined,
): ExecutionContext {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);

  const mockRequest = { user: roles !== undefined ? { roles } : undefined };
  const context = {
    getType: jest.fn().mockReturnValue('http'),
    getHandler: jest.fn().mockReturnValue({}),
    getClass: jest.fn().mockReturnValue({}),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
    }),
  } as unknown as ExecutionContext;

  return context;
}

describe('RolesGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  it('allows access when no roles are required (public resolver)', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = makeHttpContext([UserRole.STUDENT], undefined);
    reflector.getAllAndOverride = jest.fn().mockReturnValue(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when user has one of the required roles', () => {
    const context = makeHttpContext(
      [UserRole.INSTRUCTOR],
      [UserRole.INSTRUCTOR, UserRole.ADMIN],
    );
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue([UserRole.INSTRUCTOR, UserRole.ADMIN]);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when user has none of the required roles', () => {
    const context = makeHttpContext([UserRole.STUDENT], [UserRole.ADMIN]);
    reflector.getAllAndOverride = jest.fn().mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('denies access when user has no roles at all', () => {
    const context = makeHttpContext([], [UserRole.INSTRUCTOR]);
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue([UserRole.INSTRUCTOR]);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('denies access when request has no user object', () => {
    const context = makeHttpContext(undefined, [UserRole.ADMIN]);
    reflector.getAllAndOverride = jest.fn().mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('allows ADMIN through ADMIN-only endpoints', () => {
    const context = makeHttpContext([UserRole.ADMIN], [UserRole.ADMIN]);
    reflector.getAllAndOverride = jest.fn().mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows TA through INSTRUCTOR | TA guarded resolvers', () => {
    const context = makeHttpContext(
      [UserRole.TA],
      [UserRole.INSTRUCTOR, UserRole.TA, UserRole.ADMIN],
    );
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue([UserRole.INSTRUCTOR, UserRole.TA, UserRole.ADMIN]);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('blocks STUDENT from ADMIN | INSTRUCTOR endpoint', () => {
    const context = makeHttpContext(
      [UserRole.STUDENT],
      [UserRole.INSTRUCTOR, UserRole.ADMIN],
    );
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue([UserRole.INSTRUCTOR, UserRole.ADMIN]);

    expect(guard.canActivate(context)).toBe(false);
  });
});
