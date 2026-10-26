import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

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
   * Get booked slot times for a clinic, doctor, and date (YYYY-MM-DD)
   */
  async getBookedSlots(
    clinicId: string, 
    doctorId?: string, 
    dateStr?: string
  ): Promise<{ bookedSlots: string[]; bookedIsoTimes: string[] }> {
    if (!clinicId || !dateStr) {
      return { bookedSlots: [], bookedIsoTimes: [] };
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) {
      return { bookedSlots: [], bookedIsoTimes: [] };
    }

    // Window from start of day to end of day
    const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const where: any = {
      clinicId,
      status: { in: ['CONFIRMED', 'PENDING'] },
      slotTime: {
        gte: new Date(dayStart.getTime() - 24 * 60 * 60 * 1000),
        lte: new Date(dayEnd.getTime() + 24 * 60 * 60 * 1000),
      },
    };

    if (doctorId) {
      where.doctorId = doctorId;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      select: { slotTime: true },
    });

    const bookedSlotsSet = new Set<string>();
    const bookedIsoSet = new Set<string>();

    for (const appt of appointments) {
      const d = new Date(appt.slotTime);
      const apptDateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const aY = d.getFullYear();
      const aM = d.getMonth() + 1;
      const aD = d.getDate();
      const isSameDate = apptDateStr === dateStr || (aY === year && aM === month && aD === day);

      if (isSameDate) {
        bookedIsoSet.add(d.toISOString());
        let hours = d.getHours();
        const minutes = d.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        if (hours > 12) hours -= 12;
        if (hours === 0) hours = 12;
        const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
        bookedSlotsSet.add(timeFormatted);

        const istFormatted = d.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        bookedSlotsSet.add(istFormatted);
      }
    }

    return {
      bookedSlots: Array.from(bookedSlotsSet),
      bookedIsoTimes: Array.from(bookedIsoSet),
    };
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

    let clinicId = dto.clinicId;
    if (!clinicId && dto.doctorId) {
      const doc = await this.prisma.doctor.findUnique({
        where: { id: dto.doctorId },
      });
      if (doc) {
        clinicId = doc.clinicId;
        dto.clinicId = doc.clinicId;
      }
    }

    const clinic = clinicId
      ? await this.prisma.clinic.findUnique({
          where: { id: clinicId },
        })
      : null;
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${dto.clinicId || clinicId}" not found.`);
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
      // Remote booking (fixed price for appointment: ₹200)
      calculatedFee = clinic.remotePrice ?? 200;
    }

    // Strict Future Booking Rule: "Join Live Queue" is only available on the date of appointment.
    const tz = 'Asia/Kolkata';
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const slotDateStr = slotDate.toLocaleDateString('en-CA', { timeZone: tz });
    const isToday = slotDateStr === todayStr;

    if (dto.joinQueueImmediately && !isToday) {
      throw new BadRequestException(
        'Join Live Queue option is only available on the date of your appointment. When your appointment date arrives, you can join the live queue directly from the app.'
      );
    }

    // Optional Priority Pass / Join Queue Right Away (allowed only for today's appointments)
    const isPriorityAllowed = (clinic as any).enablePriorityQueue !== false;
    const joinQueueImmediately = isPriorityAllowed && isToday && Boolean(dto.joinQueueImmediately);
    const priorityFee = joinQueueImmediately ? Number((clinic as any).priorityPrice ?? 50.0) : 0.0;
    calculatedFee += priorityFee;

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

    // Slot validations (enforced when booking time slots are enabled):
    if (clinic.enableBookingTime !== false) {
      const tz = 'Asia/Kolkata';
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
      const slotDateStr = slotDate.toLocaleDateString('en-CA', { timeZone: tz });
      const [tY, tM, tD] = todayStr.split('-').map(Number);
      const [sY, sM, sD] = slotDateStr.split('-').map(Number);
      const todayMidnight = new Date(Date.UTC(tY, tM - 1, tD));
      const slotMidnight = new Date(Date.UTC(sY, sM - 1, sD));
      const diffDays = Math.round((slotMidnight.getTime() - todayMidnight.getTime()) / (24 * 60 * 60 * 1000));

      if (slotDate.getTime() < Date.now() - 2 * 60 * 1000 || diffDays < 0) {
        throw new BadRequestException('Cannot book an appointment for a past date or time.');
      }

      if (diffDays > 2) {
        throw new BadRequestException('Appointments can only be booked for today or up to 2 days in advance.');
      }

      // Check clinic holidays
      if ((clinic as any).holidays) {
        try {
          const holidays: string[] = JSON.parse((clinic as any).holidays);
          if (Array.isArray(holidays) && holidays.includes(slotDateStr)) {
            throw new BadRequestException(`Clinic is closed on ${slotDateStr} due to a marked holiday. Please choose another date.`);
          }
        } catch (err: any) {
          if (err instanceof BadRequestException) throw err;
        }
      }

      // Check clinic working days
      if ((clinic as any).workingDays) {
        const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const dayIndex = new Date(slotDate.toLocaleString('en-US', { timeZone: tz })).getDay();
        const dayName = dayNames[dayIndex];
        const activeDays = (clinic as any).workingDays.toUpperCase().split(',').map((s: string) => s.trim());
        if (!activeDays.includes(dayName)) {
          throw new BadRequestException(`Clinic is closed on ${dayName}s. Please choose an active working day.`);
        }
      }

      // Check 1: Patient must not have overlapping appointment for this exact slot
      const patientConflict = await this.prisma.appointment.findFirst({
        where: {
          userId,
          slotTime: slotDate,
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      });

      if (patientConflict) {
        throw new ConflictException(
          'You already have an appointment booked for this time slot. The selected slot is already booked. Please choose another slot.',
        );
      }

      // Check 2: Doctor must not have overlapping appointment for this slot in the same clinic
      if (dto.doctorId) {
        const doctorConflict = await this.prisma.appointment.findFirst({
          where: {
            clinicId: dto.clinicId,
            doctorId: dto.doctorId,
            slotTime: slotDate,
            status: { in: ['CONFIRMED', 'PENDING'] },
          },
        });

        if (doctorConflict) {
          throw new ConflictException(
            `The selected slot for this doctor is already booked. Please choose another slot.`,
          );
        }
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
        isPriority: joinQueueImmediately,
        priorityFee,
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
      `📅 Appointment ${appointment.id} initiated (${bookingType} @ ₹${calculatedFee}, priority: ${joinQueueImmediately}) for User ${userId} at Clinic ${dto.clinicId}`
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
      include: { clinic: true },
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

    if ((appt.clinic as any)?.enableBookingTime !== false) {
      const tz = 'Asia/Kolkata';
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
      const slotDateStr = newSlot.toLocaleDateString('en-CA', { timeZone: tz });
      const [tY, tM, tD] = todayStr.split('-').map(Number);
      const [sY, sM, sD] = slotDateStr.split('-').map(Number);
      const todayMidnight = new Date(Date.UTC(tY, tM - 1, tD));
      const slotMidnight = new Date(Date.UTC(sY, sM - 1, sD));
      const diffDays = Math.round((slotMidnight.getTime() - todayMidnight.getTime()) / (24 * 60 * 60 * 1000));

      if (newSlot.getTime() < Date.now() - 2 * 60 * 1000 || diffDays < 0) {
        throw new BadRequestException('Cannot reschedule to a past date or time.');
      }

      if (diffDays > 2) {
        throw new BadRequestException('Appointments can only be scheduled for today or up to 2 days in advance.');
      }

      // Check patient's other appointments for overlap
      const patientConflict = await this.prisma.appointment.findFirst({
        where: {
          id: { not: appointmentId },
          userId: appt.userId,
          slotTime: newSlot,
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      });

      if (patientConflict) {
        throw new ConflictException('You already have another appointment booked for this time slot.');
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
    const tz = 'Asia/Kolkata';
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });

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

    // Auto-dispatch reminders for confirmed appointments scheduled for today
    for (const a of list) {
      if (a.status === 'CONFIRMED') {
        const slotDateStr = new Date(a.slotTime).toLocaleDateString('en-CA', { timeZone: tz });
        if (slotDateStr === todayStr) {
          this.sendAppointmentScheduledReminder(a.id).catch((err) => {
            this.logger.warn(`Auto-reminder error for appointment ${a.id}: ${err?.message}`);
          });
        }
      }
    }

    return list.map((a: any) => ({
      ...this.mapToDto(a),
      clinicName: a.clinic?.name || 'Clinic',
      clinicSlug: a.clinic?.slug || '',
      clinicAddress: a.clinic?.address || '',
      priorityPrice: a.clinic?.priorityPrice ?? 50,
      enablePriorityQueue: a.clinic?.enablePriorityQueue ?? true,
    }));
  }

  /**
   * 8. Join Live Queue on Appointment Date (Patient Upgrade from Home)
   */
  async joinLiveQueue(
    appointmentId: string,
    userId: string,
  ): Promise<any> {
    const tz = 'Asia/Kolkata';
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });

    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        clinic: true,
        doctor: true,
        service: true,
        queueEntry: true,
        user: true,
      },
    });

    if (!appt) {
      throw new NotFoundException(`Appointment with ID "${appointmentId}" not found.`);
    }

    if (appt.userId !== userId) {
      throw new ForbiddenException('You cannot modify another patient\'s appointment.');
    }

    if (appt.status !== 'CONFIRMED') {
      throw new BadRequestException(
        `Cannot join live queue for an appointment with status "${appt.status}". Must be CONFIRMED.`
      );
    }

    const slotDateStr = new Date(appt.slotTime).toLocaleDateString('en-CA', { timeZone: tz });
    if (slotDateStr !== todayStr) {
      throw new BadRequestException('You can only join the live queue on the date of your appointment.');
    }

    if (appt.clinic.enablePriorityQueue === false) {
      throw new BadRequestException('Priority live queue is currently disabled by this clinic.');
    }

    if (appt.isPriority || appt.queueEntry?.tokenNumber?.startsWith('P')) {
      throw new BadRequestException('This appointment has already joined the priority live queue.');
    }

    const priorityFee = Number(appt.clinic.priorityPrice ?? 50.0);

    const result = await this.prisma.$transaction(async (tx) => {
      let newToken = appt.queueEntry?.tokenNumber || 'P01';

      if (appt.queueEntry) {
        if (appt.queueEntry.tokenNumber.startsWith('A') || appt.queueEntry.tokenNumber.startsWith('Q')) {
          newToken = 'P' + appt.queueEntry.tokenNumber.slice(1);
        } else if (!appt.queueEntry.tokenNumber.startsWith('P')) {
          newToken = 'P' + appt.queueEntry.tokenNumber;
        }

        await tx.queueEntry.update({
          where: { id: appt.queueEntry.id },
          data: {
            tokenNumber: newToken,
            status: 'WAITING',
            estimatedWait: 5,
          },
        });
      } else {
        // Locate or create queue for clinic/doctor
        let queue = await tx.queue.findFirst({
          where: {
            clinicId: appt.clinicId,
            ...(appt.doctorId ? { doctorId: appt.doctorId } : {}),
          },
        });

        if (!queue) {
          queue = await tx.queue.findFirst({
            where: { clinicId: appt.clinicId },
          });
        }

        if (!queue) {
          queue = await tx.queue.create({
            data: {
              clinicId: appt.clinicId,
              name: 'General Queue',
              doctorId: appt.doctorId || null,
            },
          });
        }

        const updatedQueue = await tx.queue.update({
          where: { id: queue.id },
          data: { currentSeq: { increment: 1 } },
        });

        newToken = `P${String(updatedQueue.currentSeq).padStart(2, '0')}`;
        const publicToken = `pt_${nanoid()}`;

        const entry = await tx.queueEntry.create({
          data: {
            queueId: queue.id,
            userId: appt.userId,
            tokenNumber: newToken,
            sequenceNumber: updatedQueue.currentSeq,
            status: 'WAITING',
            publicToken,
            estimatedWait: 5,
          },
        });

        await tx.appointment.update({
          where: { id: appt.id },
          data: { queueEntryId: entry.id },
        });
      }

      const updatedAppt = await tx.appointment.update({
        where: { id: appt.id },
        data: {
          isPriority: true,
          priorityFee,
          bookingFee: appt.bookingFee + priorityFee,
        },
        include: {
          user: true,
          doctor: true,
          service: true,
          queueEntry: true,
          clinic: true,
        },
      });

      this.logger.log(
        `⚡ Upgraded Appointment ${appt.id} to Live Queue (Token: ${newToken}, Priority Fee: ₹${priorityFee})`
      );

      return {
        ...this.mapToDto(updatedAppt),
        tokenNumber: newToken,
        clinicName: appt.clinic.name,
        clinicSlug: appt.clinic.slug,
        priorityPrice: appt.clinic.priorityPrice ?? 50,
        enablePriorityQueue: appt.clinic.enablePriorityQueue ?? true,
      };
    });

    // Send confirmation WhatsApp message after transaction commits
    if (appt.user?.phoneNumber) {
      const docName = appt.doctor?.name ? `with Dr. ${appt.doctor.name}` : '';
      const msg = `⚡ You have joined the Live Queue for your consultation ${docName} at ${appt.clinic.name}! Your priority token is ${result.tokenNumber}. Track your live status directly on QueueApp.`;
      try {
        await this.whatsAppService.sendMessage({
          clinicId: appt.clinicId,
          recipientPhone: appt.user.phoneNumber,
          messageText: msg,
        });
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch join live queue WhatsApp confirmation: ${err?.message}`);
      }
    }

    return result;
  }

  /**
   * 9. Send WhatsApp Appointment Day Reminders (Message 1: Details, Message 2: Live Queue Offer)
   */
  async sendAppointmentScheduledReminder(appointmentId: string): Promise<void> {
    const tz = 'Asia/Kolkata';
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });

    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        user: true,
        clinic: true,
        doctor: true,
        queueEntry: true,
      },
    });

    if (!appt || !appt.user?.phoneNumber || appt.status !== 'CONFIRMED') {
      return;
    }

    const slotDateStr = new Date(appt.slotTime).toLocaleDateString('en-CA', { timeZone: tz });
    if (slotDateStr !== todayStr) {
      return;
    }

    // Check if appointment day reminder was already dispatched today to avoid duplicates
    const startOfTodayUtc = new Date();
    startOfTodayUtc.setHours(0, 0, 0, 0);

    const alreadySent = await this.prisma.whatsAppMessage.findFirst({
      where: {
        phoneNumber: appt.user.phoneNumber,
        clinicId: appt.clinicId,
        content: { contains: 'is scheduled for today' },
        createdAt: { gte: startOfTodayUtc },
      },
    });

    if (alreadySent) {
      return;
    }

    const formattedTime = new Date(appt.slotTime).toLocaleTimeString('en-IN', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const tokenStr = appt.queueEntry?.tokenNumber ? ` Token: ${appt.queueEntry.tokenNumber}.` : '';
    const doctorStr = appt.doctor?.name ? `with Dr. ${appt.doctor.name}` : '';

    // Message 1: Appointment Details
    const msg1 = `Hello ${appt.user.name || 'Patient'}, your appointment ${doctorStr} at ${appt.clinic.name} is scheduled for today at ${formattedTime}.${tokenStr}`;
    try {
      await this.whatsAppService.sendMessage({
        clinicId: appt.clinicId,
        recipientPhone: appt.user.phoneNumber,
        messageText: msg1,
      });
      this.logger.log(`📱 Sent today appointment reminder to ${appt.user.phoneNumber} for appointment ${appt.id}`);
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch WhatsApp today appointment reminder: ${err?.message}`);
    }

    // Message 2: Live Queue Offer (if not already priority)
    const isPriority = appt.isPriority || appt.queueEntry?.tokenNumber?.startsWith('P');
    if (!isPriority && appt.clinic.enablePriorityQueue !== false) {
      const price = appt.clinic.priorityPrice ?? 50;
      const msg2 = `Skip the waiting room! You can join the doctor's live queue right now from the comfort of your home at ₹${price}. Open your patient portal to join live queue instantly.`;
      try {
        await this.whatsAppService.sendMessage({
          clinicId: appt.clinicId,
          recipientPhone: appt.user.phoneNumber,
          messageText: msg2,
        });
        this.logger.log(`📱 Sent live queue offer to ${appt.user.phoneNumber} for appointment ${appt.id}`);
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch WhatsApp live queue offer: ${err?.message}`);
      }
    }
  }

  /**
   * 10. Bulk trigger today's reminders for a clinic (Clinic Admin / Receptionist)
   */
  async sendTodayClinicReminders(clinicId: string): Promise<{ sentCount: number }> {
    const tz = 'Asia/Kolkata';
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });

    const appts = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        status: 'CONFIRMED',
      },
      include: {
        user: true,
        clinic: true,
        doctor: true,
        queueEntry: true,
      },
    });

    const todayAppts = appts.filter((a) => {
      const slotDateStr = new Date(a.slotTime).toLocaleDateString('en-CA', { timeZone: tz });
      return slotDateStr === todayStr;
    });

    let sentCount = 0;
    for (const a of todayAppts) {
      await this.sendAppointmentScheduledReminder(a.id);
      sentCount++;
    }

    return { sentCount };
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
      bookingType: a.bookingType,
      isPriority: a.isPriority ?? false,
      priorityFee: a.priorityFee ?? 0,
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

