import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@queueapp/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard (Unit Tests & Authorization Hardening)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user: any, requiredRoles?: UserRole[]): ExecutionContext => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles as any);

    const request = { user };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('allows access when no roles are required on endpoint', () => {
    const context = createMockContext(null, undefined);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException when role is required but user is not authenticated', () => {
    const context = createMockContext(null, [UserRole.CLINIC_ADMIN]);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(/User authentication required/);
  });

  it('allows SUPER_ADMIN regardless of required roles', () => {
    const superAdmin = { id: 'sa-1', role: UserRole.SUPER_ADMIN };
    const context = createMockContext(superAdmin, [UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST]);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows user with matching required role', () => {
    const clinicAdmin = { id: 'admin-1', role: UserRole.CLINIC_ADMIN };
    const context = createMockContext(clinicAdmin, [UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN]);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies user lacking required role with descriptive error', () => {
    const receptionist = { id: 'rec-1', role: UserRole.RECEPTIONIST };
    const context = createMockContext(receptionist, [UserRole.CLINIC_ADMIN]);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(/does not have required permissions/);
  });

  it('denies patient from accessing staff-only roles', () => {
    const patient = { id: 'patient-1', role: UserRole.PATIENT };
    const context = createMockContext(patient, [UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST]);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
