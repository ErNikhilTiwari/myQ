import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';
import { UserRole } from '@queueapp/shared';

describe('TenantGuard (Unit Tests & Security Boundaries)', () => {
  let guard: TenantGuard;

  beforeEach(() => {
    guard = new TenantGuard();
  });

  const createMockContext = (user: any, params: any = {}, body: any = {}, query: any = {}): ExecutionContext => {
    const request = {
      user,
      params,
      body,
      query,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  it('throws ForbiddenException if user is not authenticated', () => {
    const context = createMockContext(null, { clinicId: 'clinic-1' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows SUPER_ADMIN universal access across any clinic', () => {
    const user = { id: 'sa-1', role: UserRole.SUPER_ADMIN, clinicId: null };
    const context = createMockContext(user, { clinicId: 'clinic-target' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows pass-through when no target clinic ID is present in context', () => {
    const user = { id: 'user-1', role: UserRole.CLINIC_ADMIN, clinicId: 'clinic-1' };
    const context = createMockContext(user, {}, {}, {});
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows clinic staff to access their assigned clinic from route params', () => {
    const user = { id: 'staff-1', role: UserRole.CLINIC_ADMIN, clinicId: 'clinic-1' };
    const context = createMockContext(user, { clinicId: 'clinic-1' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows clinic receptionist to access their assigned clinic from body or query', () => {
    const user = { id: 'staff-2', role: UserRole.RECEPTIONIST, clinicId: 'clinic-1' };
    const contextBody = createMockContext(user, {}, { clinicId: 'clinic-1' }, {});
    expect(guard.canActivate(contextBody)).toBe(true);

    const contextQuery = createMockContext(user, {}, {}, { clinicId: 'clinic-1' });
    expect(guard.canActivate(contextQuery)).toBe(true);
  });

  it('blocks clinic staff from accessing a different clinic (cross-tenant violation)', () => {
    const user = { id: 'staff-1', role: UserRole.CLINIC_ADMIN, clinicId: 'clinic-1' };
    const context = createMockContext(user, { clinicId: 'clinic-2' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(/Cross-tenant access violation/);
  });

  it('blocks unassigned staff (missing clinicId) from accessing any clinic', () => {
    const user = { id: 'staff-unassigned', role: UserRole.CLINIC_ADMIN, clinicId: null };
    const context = createMockContext(user, { clinicId: 'clinic-1' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('blocks patients from accessing clinic-scoped management endpoints', () => {
    const patientUser = { id: 'patient-1', role: UserRole.PATIENT, clinicId: null };
    const context = createMockContext(patientUser, { clinicId: 'clinic-1' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(/Patients cannot perform clinic-scoped staff operations/);
  });
});
