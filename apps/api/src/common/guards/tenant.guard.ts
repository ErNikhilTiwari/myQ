import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@queueapp/shared';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required for tenant-scoped operations.');
    }

    // Super Admin has global platform access across all clinics
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Extract clinicId from route params, query, or body
    const targetClinicId = request.params?.clinicId || request.body?.clinicId || request.query?.clinicId;

    if (!targetClinicId) {
      // If no target clinic ID is specified in the request context, pass through
      return true;
    }

    // Enforce that clinic staff can only access their assigned clinic
    if (user.role === UserRole.CLINIC_ADMIN || user.role === UserRole.RECEPTIONIST || user.role === UserRole.DOCTOR) {
      if (!user.clinicId || user.clinicId !== targetClinicId) {
        throw new ForbiddenException(
          `Cross-tenant access violation: User belonging to clinic "${user.clinicId || 'Unassigned'}" attempted to access clinic "${targetClinicId}".`,
        );
      }
    } else if (user.role === UserRole.PATIENT) {
      // Patients cannot perform clinic staff/admin operations
      throw new ForbiddenException(
        `Access denied: Patients cannot perform clinic-scoped staff operations on clinic "${targetClinicId}".`,
      );
    }

    return true;
  }
}
