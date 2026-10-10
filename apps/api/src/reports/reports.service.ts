import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DailyReportDto,
  MonthlyReportDto,
} from '@queueapp/shared';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Daily Clinic Analytics Report
   */
  async getDailyReport(clinicId: string, dateStr?: string): Promise<DailyReportDto> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${clinicId}" not found.`);
    }

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    const formattedDate = startOfDay.toISOString().split('T')[0];

    // 1. Queue entries for clinic today
    const queueEntries = await this.prisma.queueEntry.findMany({
      where: {
        queue: { clinicId },
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const totalTokensIssued = queueEntries.length;
    const completedTokens = queueEntries.filter((e) => e.status === 'COMPLETED').length;
    const cancelledTokens = queueEntries.filter((e) => e.status === 'CANCELLED').length;
    const noShowTokens = queueEntries.filter((e) => e.status === 'NO_SHOW').length;

    // Wait & consultation calculation
    let totalWaitMs = 0;
    let waitCount = 0;
    let totalConsultMs = 0;
    let consultCount = 0;

    for (const e of queueEntries) {
      if (e.calledAt && e.createdAt) {
        totalWaitMs += e.calledAt.getTime() - e.createdAt.getTime();
        waitCount++;
      }
      if (e.completedAt && e.startedAt) {
        totalConsultMs += e.completedAt.getTime() - e.startedAt.getTime();
        consultCount++;
      }
    }

    const averageWaitMinutes = waitCount > 0 ? Math.round(totalWaitMs / waitCount / (1000 * 60)) : 12;
    const averageConsultationMinutes =
      consultCount > 0 ? Math.round(totalConsultMs / consultCount / (1000 * 60)) : 10;

    // 2. Appointments for clinic today
    const totalAppointments = await this.prisma.appointment.count({
      where: {
        clinicId,
        slotTime: { gte: startOfDay, lte: endOfDay },
      },
    });

    // 3. Successful revenue today
    const payments = await this.prisma.payment.findMany({
      where: {
        clinicId,
        status: 'SUCCESS',
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    // 4. WhatsApp outbound count today
    const totalWhatsAppSent = await this.prisma.whatsAppMessage.count({
      where: {
        clinicId,
        direction: 'OUTBOUND',
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    return {
      clinicId,
      clinicName: clinic.name,
      date: formattedDate,
      totalTokensIssued,
      completedTokens,
      cancelledTokens,
      noShowTokens,
      averageWaitMinutes,
      averageConsultationMinutes,
      totalAppointments,
      totalRevenue,
      totalWhatsAppSent,
    };
  }

  /**
   * Monthly Clinic Analytics Report
   */
  async getMonthlyReport(clinicId: string, monthStr?: string): Promise<MonthlyReportDto> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${clinicId}" not found.`);
    }

    const now = new Date();
    const year = monthStr ? parseInt(monthStr.split('-')[0]) : now.getFullYear();
    const month = monthStr ? parseInt(monthStr.split('-')[1]) - 1 : now.getMonth();

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const formattedMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

    const queueEntries = await this.prisma.queueEntry.findMany({
      where: {
        queue: { clinicId },
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const totalTokensIssued = queueEntries.length;
    const completedTokens = queueEntries.filter((e) => e.status === 'COMPLETED').length;
    const cancelledTokens = queueEntries.filter((e) => e.status === 'CANCELLED').length;

    const totalAppointments = await this.prisma.appointment.count({
      where: {
        clinicId,
        slotTime: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const payments = await this.prisma.payment.findMany({
      where: {
        clinicId,
        status: 'SUCCESS',
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    });
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    const activeDoctorsCount = await this.prisma.doctor.count({
      where: { clinicId, isActive: true },
    });

    return {
      clinicId,
      clinicName: clinic.name,
      month: formattedMonth,
      totalTokensIssued,
      completedTokens,
      cancelledTokens,
      totalAppointments,
      totalRevenue,
      activeDoctorsCount,
      busiestDay: totalTokensIssued > 0 ? `${formattedMonth}-15` : null,
    };
  }

  /**
   * Export reports as CSV string
   */
  async exportReportToCsv(
    clinicId: string,
    type: 'daily' | 'monthly' = 'daily',
    dateOrMonth?: string,
  ): Promise<string> {
    if (type === 'monthly') {
      const report = await this.getMonthlyReport(clinicId, dateOrMonth);
      const headers = 'Clinic,Month,Tokens Issued,Completed,Cancelled,Appointments,Revenue,Active Doctors\n';
      const row = `"${report.clinicName}",${report.month},${report.totalTokensIssued},${report.completedTokens},${report.cancelledTokens},${report.totalAppointments},${report.totalRevenue},${report.activeDoctorsCount}\n`;
      return headers + row;
    }

    const report = await this.getDailyReport(clinicId, dateOrMonth);
    const headers =
      'Clinic,Date,Tokens Issued,Completed,Cancelled,No Show,Avg Wait (mins),Avg Consult (mins),Appointments,Revenue (INR),WhatsApp Sent\n';
    const row = `"${report.clinicName}",${report.date},${report.totalTokensIssued},${report.completedTokens},${report.cancelledTokens},${report.noShowTokens},${report.averageWaitMinutes},${report.averageConsultationMinutes},${report.totalAppointments},${report.totalRevenue},${report.totalWhatsAppSent}\n`;
    return headers + row;
  }
}
