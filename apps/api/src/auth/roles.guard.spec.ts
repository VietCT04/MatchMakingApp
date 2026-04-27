import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  function createContext(role?: UserRole): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(() => ({
        getRequest: () => ({
          user: role
            ? {
                id: 'user-1',
                email: 'user@example.com',
                displayName: 'User',
                role,
              }
            : undefined,
        }),
      })),
    } as unknown as ExecutionContext;
  }

  it('rejects USER for moderator-only routes', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.MODERATOR, UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createContext(UserRole.USER))).toThrow(ForbiddenException);
  });

  it('allows MODERATOR for moderator-only routes', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.MODERATOR, UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext(UserRole.MODERATOR))).toBe(true);
  });

  it('allows ADMIN for moderator-only routes', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.MODERATOR, UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext(UserRole.ADMIN))).toBe(true);
  });
});
