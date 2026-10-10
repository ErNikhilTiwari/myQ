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

    // Extract clinicId from route params or query
    const targetClinicId = request.params.clinicId || request.body?.clinicId || request.query?.clinicId;

    if (!targetClinicId) {
      // If no target clinic ID is specified in the request context, pass through
      return true;
    }

    // Enforce that clinic staff can only access their assigned clinic
    if (user.clinicId && user.clinicId !== targetClinicId) {
      throw new ForbiddenException(
        `Cross-tenant access violation: User belonging to clinic "${user.clinicId}" attempted to access clinic "${targetClinicId}".`,
      );
    }

    return true;
  }
}
