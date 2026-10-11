import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  BookAppointmentDto,
  AppointmentDto,
  RescheduleAppointmentDto,
  InClinicQrCodeDto,
  AppointmentStatus,
  PaymentStatus,
} from '@queueapp/shared';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

import * as crypto from 'crypto';

const QR_SECRET = process.env.JWT_ACCESS_SECRET || 'qr_rotating_salt_secret_key';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Generate Rotating Secure In-Clinic QR Code Token
   * Valid for 45 seconds (refreshes every 30-45s on clinic TV screen)
   */
  async generateInClinicQrCode(clinicId: string): Promise<InClinicQrCodeDto> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${clinicId}" not found.`);
    }

    const price = clinic.inClinicPrice ?? 200;
    // Window: 45-second duration with a 15-second grace period buffer
    const timestamp = Date.now();
    const expiresAt = new Date(timestamp + 45 * 1000).toISOString();

    const payload = `${clinic.id}:${price}:${expiresAt}`;
    const signature = crypto.createHmac('sha256', QR_SECRET).update(payload).digest('hex');
    const token = Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');

    return {
      token,
      clinicId: clinic.id,
      clinicSlug: clinic.slug,
      price,
      expiresAt,
      refreshIntervalSeconds: 30,
    };
  }

  /**
   * 2. Validate cryptographic rotating QR code
   */
  validateInClinicQrCode(token: string, expectedClinicId: string): { valid: boolean; price: number; reason?: string } {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
      const { payload, signature } = decoded;
      const expectedSig = crypto.createHmac('sha256', QR_SECRET).update(payload).digest('hex');

      if (signature !== expectedSig) {
        return { valid: false, price: 0, reason: 'Invalid QR cryptographic signature.' };
      }

      const [cId, priceStr, expiresAtStr] = payload.split(':');
      if (cId !== expectedClinicId) {
        return { valid: false, price: 0, reason: 'QR code belongs to a different clinic facility.' };
      }

      const expiresAt = new Date(expiresAtStr).getTime();
      // Allow 15-second grace period for network jitter
      if (Date.now() > expiresAt + 15 * 1000) {
        return { valid: false, price: 0, reason: 'QR code has expired. Please scan the current code on the TV screen.' };
      }

      return { valid: true, price: parseFloat(priceStr) };
    } catch {
      return { valid: false, price: 0, reason: 'Malformed or corrupt QR code token.' };
    }
  }

  /**
   * Book an appointment with fail-closed availability check & server-side calculated pricing
   */
  async bookAppointment(
    userId: string,
    dto: BookAppointmentDto,
  ): Promise<AppointmentDto> {
    const slotDate = new Date(dto.slotTime);

    // Basic date validation
    if (isNaN(slotDate.getTime())) {
      throw new BadRequestException('Invalid slotTime format. Must be a valid ISO 8601 string.');
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${dto.clinicId}" not found.`);
    }

    // STRICT SERVER-SIDE PRICING CALCULATION
    const bookingType = dto.bookingType || 'REMOTE';
    let calculatedFee: number;

    if (bookingType === 'IN_CLINIC') {
      if (!dto.qrToken) {
        throw new BadRequestException(
          'Missing QR code token for in-clinic discounted booking. Please scan the rotating QR code on the clinic TV screen.'
        );
      }
      const qrValidation = this.validateInClinicQrCode(dto.qrToken, clinic.id);
      if (!qrValidation.valid) {
        throw new BadRequestException(`In-Clinic QR verification failed: ${qrValidation.reason}`);
      }
      calculatedFee = qrValidation.price || clinic.inClinicPrice || 200;
    } else {
      // Remote booking (default ₹250 or clinic's configured remotePrice)
      calculatedFee = clinic.remotePrice ?? 250;
    }

    if (dto.doctorId) {
      const doctor = await this.prisma.doctor.findFirst({
        where: { id: dto.doctorId, clinicId: dto.clinicId },
      });
      if (!doctor) {
        throw new NotFoundException(
          `Doctor with ID "${dto.doctorId}" not found in clinic "${dto.clinicId}".`,
        );
      }
    }

    if (dto.serviceId) {
      const service = await this.prisma.service.findFirst({
        where: { id: dto.serviceId, clinicId: dto.clinicId },
      });
      if (!service) {
        throw new NotFoundException(
          `Service with ID "${dto.serviceId}" not found in clinic "${dto.clinicId}".`,
        );
      }
    }

    // Fail-Closed Slot Check (ADR-005):
    // If there is an existing CONFIRMED or PENDING appointment for the same doctor at the same slot, fail-closed
    if (dto.doctorId) {
      const existing = await this.prisma.appointment.findFirst({
        where: {
          clinicId: dto.clinicId,
          doctorId: dto.doctorId,
          slotTime: slotDate,
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      });

      if (existing) {
        throw new ConflictException(
          `The selected slot ${slotDate.toISOString()} for this doctor is already booked. Please choose another slot.`,
        );
      }
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        clinicId: dto.clinicId,
        userId,
        doctorId: dto.doctorId || null,
        serviceId: dto.serviceId || null,
        slotTime: slotDate,
        bookingType,
        qrCodeToken: dto.qrToken || null,
        status: 'PENDING',
        bookingFee: calculatedFee,
        paymentStatus: 'PENDING',
      },
      include: {
        user: true,
        doctor: true,
        service: true,
        queueEntry: true,
      },
    });

    this.logger.log(
      `📅 Appointment ${appointment.id} initiated (${bookingType} @ ₹${calculatedFee}) for User ${userId} at Clinic ${dto.clinicId}`
    );

    return this.mapToDto(appointment);
  }

  /**
   * Get single appointment with ownership or staff verification
   */
  async getAppointment(
    appointmentId: string,
    userId: string,
    userRole: string,
    userClinicId?: string,
  ): Promise<AppointmentDto> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        user: true,
        doctor: true,
        service: true,
        queueEntry: true,
      },
    });

    if (!appt) {
      throw new NotFoundException(`Appointment with ID "${appointmentId}" not found.`);
    }

    const isOwner = appt.userId === userId;
    const isStaff =
      ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST'].includes(userRole) &&
      (userRole === 'SUPER_ADMIN' || userClinicId === appt.clinicId);

    if (!isOwner && !isStaff) {
      throw new ForbiddenException('Access denied. You do not have permission to view this appointment.');
    }

    return this.mapToDto(appt);
  }

  /**
   * Reschedule appointment (Patient or Staff)
   */
  async rescheduleAppointment(
    appointmentId: string,
    userId: string,
    userRole: string,
    dto: RescheduleAppointmentDto,
    userClinicId?: string,
  ): Promise<AppointmentDto> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appt) {
      throw new NotFoundException(`Appointment with ID "${appointmentId}" not found.`);
    }

    const isOwner = appt.userId === userId;
    const isStaff =
      ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST'].includes(userRole) &&
      (userRole === 'SUPER_ADMIN' || userClinicId === appt.clinicId);

    if (!isOwner && !isStaff) {
      throw new ForbiddenException('You cannot reschedule another user\'s appointment.');
    }

    if (appt.status === 'COMPLETED' || appt.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot reschedule appointment with status "${appt.status}".`);
    }

    const newSlot = new Date(dto.slotTime);
    if (isNaN(newSlot.getTime())) {
      throw new BadRequestException('Invalid slotTime format.');
    }

    // Slot collision check if doctor assigned
    if (appt.doctorId) {
      const conflict = await this.prisma.appointment.findFirst({
        where: {
          id: { not: appointmentId },
          clinicId: appt.clinicId,
          doctorId: appt.doctorId,
          slotTime: newSlot,
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      });

      if (conflict) {
        throw new ConflictException('The requested reschedule slot is already occupied.');
      }
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { slotTime: newSlot },
      include: {
        user: true,
        doctor: true,
        service: true,
        queueEntry: true,
      },
    });

    this.logger.log(`Rescheduled Appointment ${appointmentId} to ${newSlot.toISOString()}`);
    return this.mapToDto(updated);
  }

  /**
   * Cancel appointment
   */
  async cancelAppointment(
    appointmentId: string,
    userId: string,
    userRole: string,
    userClinicId?: string,
  ): Promise<AppointmentDto> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appt) {
      throw new NotFoundException(`Appointment with ID "${appointmentId}" not found.`);
    }

    const isOwner = appt.userId === userId;
    const isStaff =
      ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST'].includes(userRole) &&
      (userRole === 'SUPER_ADMIN' || userClinicId === appt.clinicId);

    if (!isOwner && !isStaff) {
      throw new ForbiddenException('You cannot cancel another user\'s appointment.');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' },
      include: {
        user: true,
        doctor: true,
        service: true,
        queueEntry: true,
      },
    });

    this.logger.log(`Cancelled Appointment ${appointmentId}`);
    return this.mapToDto(updated);
  }

  /**
   * Confirm Arrival: Convert booked appointment to an active queue token (Section 5)
   */
  async confirmArrival(
    clinicId: string,
    appointmentId: string,
  ): Promise<AppointmentDto> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        user: true,
        doctor: true,
        service: true,
        queueEntry: true,
      },
    });

    if (!appt) {
      throw new NotFoundException(`Appointment with ID "${appointmentId}" not found.`);
    }

    if (appt.clinicId !== clinicId) {
      throw new ForbiddenException('Appointment does not belong to this clinic.');
    }

    if (appt.status === 'CANCELLED') {
      throw new BadRequestException('Cannot confirm arrival for a cancelled appointment.');
    }

    if (appt.queueEntryId) {
      return this.mapToDto(appt); // Already checked in
    }

    // Find or create default queue for clinic/doctor
    let queue = await this.prisma.queue.findFirst({
      where: {
        clinicId,
        doctorId: appt.doctorId || undefined,
      },
    });

    if (!queue) {
      queue = await this.prisma.queue.findFirst({
        where: { clinicId },
      });
    }

    if (!queue) {
      queue = await this.prisma.queue.create({
        data: {
          clinicId,
          name: 'General Queue',
          doctorId: appt.doctorId || null,
        },
      });
    }

    // Atomically increment currentSeq
    const updatedQueue = await this.prisma.queue.update({
      where: { id: queue.id },
      data: { currentSeq: { increment: 1 } },
    });

    const tokenNumber = `A${String(updatedQueue.currentSeq).padStart(2, '0')}`;
    const publicToken = `pt_${nanoid()}`;

    // Create queue entry
    const entry = await this.prisma.queueEntry.create({
      data: {
        queueId: queue.id,
        userId: appt.userId,
        tokenNumber,
        sequenceNumber: updatedQueue.currentSeq,
        status: 'WAITING',
        publicToken,
        estimatedWait: 15,
      },
    });

    const updatedAppt = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        queueEntryId: entry.id,
        status: 'CONFIRMED',
      },
      include: {
        user: true,
        doctor: true,
        service: true,
        queueEntry: true,
      },
    });

    this.logger.log(
      `Patient arrived for Appointment ${appointmentId} -> Generated Token ${tokenNumber} (${publicToken})`,
    );

    return this.mapToDto(updatedAppt);
  }

  /**
   * List clinic appointments (Staff)
   */
  async listClinicAppointments(
    clinicId: string,
    status?: string,
  ): Promise<AppointmentDto[]> {
    const where: any = { clinicId };
    if (status) {
      where.status = status;
    }

    const list = await this.prisma.appointment.findMany({
      where,
      orderBy: { slotTime: 'asc' },
      include: {
        user: true,
        doctor: true,
        service: true,
        queueEntry: true,
      },
    });

    return list.map((a) => this.mapToDto(a));
  }

  /**
   * 7. List authenticated patient's own appointments
   */
  async getMyPatientAppointments(userId: string): Promise<any[]> {
    const list = await this.prisma.appointment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        doctor: true,
        service: true,
        queueEntry: true,
        clinic: true,
      },
    });

    return list.map((a: any) => ({
      ...this.mapToDto(a),
      clinicName: a.clinic?.name || 'Clinic',
      clinicSlug: a.clinic?.slug || '',
      clinicAddress: a.clinic?.address || '',
    }));
  }

  private mapToDto(a: any): AppointmentDto {
    return {
      id: a.id,
      clinicId: a.clinicId,
      userId: a.userId,
      patientName: a.user?.name || undefined,
      patientPhone: a.user?.phoneNumber || undefined,
      doctorId: a.doctorId,
      doctorName: a.doctor?.name || null,
      serviceId: a.serviceId,
      serviceName: a.service?.name || null,
      slotTime: a.slotTime.toISOString(),
      status: a.status as AppointmentStatus,
      bookingFee: a.bookingFee,
      paymentStatus: a.paymentStatus as PaymentStatus,
      queueEntryId: a.queueEntryId,
      tokenNumber: a.queueEntry?.tokenNumber || null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }
}
