import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  UserRole,
  ApiResponse,
  ExportReportQueryDto,
} from '@queueapp/shared';
import { Response } from 'express';

@Controller('api')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * 1. Get daily clinic stats (Admin / Receptionist)
   */
  @Get('clinics/:clinicId/reports/daily')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async getDaily(
    @Param('clinicId') clinicId: string,
    @Query('date') date?: string,
  ): Promise<ApiResponse> {
    const data = await this.reportsService.getDailyReport(clinicId, date);
    return { success: true, data };
  }

  /**
   * 2. Get monthly clinic stats (Admin)
   */
  @Get('clinics/:clinicId/reports/monthly')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async getMonthly(
    @Param('clinicId') clinicId: string,
    @Query('month') month?: string,
  ): Promise<ApiResponse> {
    const data = await this.reportsService.getMonthlyReport(clinicId, month);
    return { success: true, data };
  }

  /**
   * 3. Export report to CSV / JSON format (Admin)
   */
  @Get('clinics/:clinicId/reports/export')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async exportReport(
    @Param('clinicId') clinicId: string,
    @Query() query: ExportReportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const format = query.format || 'csv';
    const type = query.type || 'daily';

    if (format === 'csv') {
      const csv = await this.reportsService.exportReportToCsv(
        clinicId,
        type,
        query.date,
      );
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="report_${type}_${clinicId}.csv"`,
      );
      res.send(csv);
      return;
    }

    // Default JSON
    const data =
      type === 'monthly'
        ? await this.reportsService.getMonthlyReport(clinicId, query.date)
        : await this.reportsService.getDailyReport(clinicId, query.date);

    res.json({ success: true, data });
  }

  /**
   * 4. Get advanced analytics (Hourly traffic, peak hours, completion rate)
   */
  @Get('clinics/:clinicId/reports/advanced-analytics')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async getAdvancedAnalytics(
    @Param('clinicId') clinicId: string,
    @Query('date') date?: string,
  ): Promise<ApiResponse> {
    const data = await this.reportsService.getAdvancedAnalytics(clinicId, date);
    return { success: true, data };
  }

  /**
   * 5. Automated AI Clinic Insights & Bottleneck Detection (Phase 3)
   */
  @Get('clinics/:clinicId/reports/insights')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async getInsights(
    @Param('clinicId') clinicId: string,
  ): Promise<ApiResponse> {
    const data = await this.reportsService.generateClinicInsights(clinicId);
    return { success: true, data };
  }
}


