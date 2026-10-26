import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AppointmentsService (Unit Tests & Defensive Boundaries)', () => {
  let service: AppointmentsService;
  let prisma: any;
  let whatsAppService: any;

  beforeEach(() => {
    prisma = {
      clinic: { findUnique: jest.fn(), findFirst: jest.fn() },
      doctor: { findUnique: jest.fn(), findFirst: jest.fn() },
      service: { findFirst: jest.fn() },
      appointment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      queue: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
      queueEntry: { create: jest.fn(), count: jest.fn(), update: jest.fn() },
      whatsAppMessage: { findFirst: jest.fn(), create: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    whatsAppService = {
      sendMessage: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      sendTemplateNotification: jest.fn().mockResolvedValue({ id: 'tmpl-1' }),
    };

    service = new AppointmentsService(prisma as unknown as PrismaService, whatsAppService as any);
  });

  describe('In-Clinic Rotating QR Code Verification', () => {
    it('generates a cryptographically signed QR code with 30s expiry and verifies it successfully', async () => {
      prisma.clinic.findUnique.mockResolvedValue({
        id: 'clinic-1',
        slug: 'test-clinic',
        inClinicPrice: 150,
      });

      const qrResult = await service.generateInClinicQrCode('clinic-1');
      expect(qrResult).toBeDefined();
      expect(qrResult.clinicId).toBe('clinic-1');
      expect(qrResult.price).toBe(150);
      expect(qrResult.token).toBeDefined();

      const validation = service.validateInClinicQrCode(qrResult.token, 'clinic-1');
      expect(validation.valid).toBe(true);
      expect(validation.price).toBe(150);
    });

    it('rejects QR token scanned at a different clinic facility', async () => {
      prisma.clinic.findUnique.mockResolvedValue({
        id: 'clinic-1',
        slug: 'clinic-one',
        inClinicPrice: 150,
      });

      const qrResult = await service.generateInClinicQrCode('clinic-1');
      const validation = service.validateInClinicQrCode(qrResult.token, 'clinic-2');

      expect(validation.valid).toBe(false);
      expect(validation.reason).toMatch(/different clinic facility/);
    });

    it('rejects tampered or malformed QR tokens', () => {
      const validation = service.validateInClinicQrCode('tampered-garbage-token', 'clinic-1');
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBeDefined();
    });
  });

  describe('bookAppointment - Edge Cases & Rule Enforcement', () => {
    const mockClinic = {
      id: 'clinic-1',
      name: 'Test Clinic',
      remotePrice: 200,
      inClinicPrice: 200,
      enableBookingTime: true,
      enablePriorityQueue: true,
      workingDays: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
      holidays: '[]',
    };

    it('rejects booking with invalid slotTime format', async () => {
      await expect(
        service.bookAppointment('user-1', {
          clinicId: 'clinic-1',
          slotTime: 'not-a-valid-date',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects booking for a past date or time', async () => {
      prisma.clinic.findUnique.mockResolvedValue(mockClinic);

      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await expect(
        service.bookAppointment('user-1', {
          clinicId: 'clinic-1',
          slotTime: pastDate,
        } as any),
      ).rejects.toThrow(/past date or time/);
    });

    it('rejects booking more than 2 days in advance', async () => {
      prisma.clinic.findUnique.mockResolvedValue(mockClinic);

      const farFutureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      await expect(
        service.bookAppointment('user-1', {
          clinicId: 'clinic-1',
          slotTime: farFutureDate,
        } as any),
      ).rejects.toThrow(/today or up to 2 days in advance/);
    });

    it('rejects booking on a marked clinic holiday', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const holidayDateStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      prisma.clinic.findUnique.mockResolvedValue({
        ...mockClinic,
        holidays: JSON.stringify([holidayDateStr]),
      });

      await expect(
        service.bookAppointment('user-1', {
          clinicId: 'clinic-1',
          slotTime: tomorrow.toISOString(),
        } as any),
      ).rejects.toThrow(/marked holiday/);
    });

    it('rejects booking when clinic is closed on that day of week', async () => {
      // Set clinic working days to only MONDAY
      prisma.clinic.findUnique.mockResolvedValue({
        ...mockClinic,
        workingDays: 'MONDAY',
      });

      // Pick a date that is not Monday (e.g. today or tomorrow if Sunday)
      const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const dayName = dayNames[date.getDay()];

      if (dayName !== 'MONDAY') {
        await expect(
          service.bookAppointment('user-1', {
            clinicId: 'clinic-1',
            slotTime: date.toISOString(),
          } as any),
        ).rejects.toThrow(/closed on/);
      }
    });

    it('rejects duplicate booking when patient already has an appointment in the same slot', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      prisma.clinic.findUnique.mockResolvedValue(mockClinic);

      // Simulate patient conflict found in database
      prisma.appointment.findFirst.mockResolvedValueOnce({
        id: 'existing-appt-1',
        userId: 'user-1',
        slotTime: tomorrow,
      });

      await expect(
        service.bookAppointment('user-1', {
          clinicId: 'clinic-1',
          slotTime: tomorrow.toISOString(),
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('calculates fixed ₹200 fee for standard remote appointment', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      prisma.clinic.findUnique.mockResolvedValue({
        ...mockClinic,
        workingDays: 'SUNDAY,MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
      });
      prisma.appointment.findFirst.mockResolvedValue(null);

      prisma.appointment.create.mockImplementation(({ data }: any) => ({
        id: 'appt-new',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.bookAppointment('user-1', {
        clinicId: 'clinic-1',
        slotTime: tomorrow.toISOString(),
        bookingType: 'REMOTE',
        joinQueueImmediately: false,
      } as any);

      expect(result.bookingFee).toBe(200);
      expect(result.isPriority).toBe(false);
    });

    it('rejects future booking when joinQueueImmediately is checked', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      prisma.clinic.findUnique.mockResolvedValue({
        ...mockClinic,
        workingDays: 'SUNDAY,MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
      });
      prisma.appointment.findFirst.mockResolvedValue(null);

      await expect(
        service.bookAppointment('user-1', {
          clinicId: 'clinic-1',
          slotTime: tomorrow.toISOString(),
          bookingType: 'REMOTE',
          joinQueueImmediately: true,
        } as any),
      ).rejects.toThrow(/Join Live Queue option is only available on the date of your appointment/);
    });

    it('adds +₹50 live queue priority fee when booking for TODAY and joinQueueImmediately is checked', async () => {
      const todaySlot = new Date();
      prisma.clinic.findUnique.mockResolvedValue({
        ...mockClinic,
        workingDays: 'SUNDAY,MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
      });
      prisma.appointment.findFirst.mockResolvedValue(null);

      prisma.appointment.create.mockImplementation(({ data }: any) => ({
        id: 'appt-priority-today',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.bookAppointment('user-1', {
        clinicId: 'clinic-1',
        slotTime: todaySlot.toISOString(),
        bookingType: 'REMOTE',
        joinQueueImmediately: true,
      } as any);

      expect(result.bookingFee).toBe(250); // 200 + 50
      expect(result.isPriority).toBe(true);
      expect(result.priorityFee).toBe(50);
    });
  });

  describe('joinLiveQueue & Today Appointment WhatsApp Reminders', () => {
    it('rejects joining live queue if appointment is scheduled for a future date', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      prisma.appointment.findUnique.mockResolvedValue({
        id: 'appt-future',
        userId: 'patient-1',
        clinicId: 'clinic-1',
        status: 'CONFIRMED',
        slotTime: tomorrow,
        isPriority: false,
        clinic: { id: 'clinic-1', enablePriorityQueue: true, priorityPrice: 50 },
      });

      await expect(service.joinLiveQueue('appt-future', 'patient-1')).rejects.toThrow(
        /only join the live queue on the date of your appointment/,
      );
    });

    it('upgrades appointment to priority live queue with P-prefix token on today date', async () => {
      const today = new Date();
      prisma.appointment.findUnique.mockResolvedValue({
        id: 'appt-today',
        userId: 'patient-1',
        clinicId: 'clinic-1',
        status: 'CONFIRMED',
        slotTime: today,
        bookingFee: 200,
        isPriority: false,
        queueEntry: {
          id: 'entry-1',
          tokenNumber: 'A03',
          status: 'BOOKED',
        },
        clinic: { id: 'clinic-1', name: 'Metro Clinic', slug: 'metro-clinic', enablePriorityQueue: true, priorityPrice: 50 },
        doctor: { name: 'Sharma' },
        user: { phoneNumber: '+919876543210', name: 'John Doe' },
      });

      prisma.queueEntry.update.mockResolvedValue({
        id: 'entry-1',
        tokenNumber: 'P03',
        status: 'WAITING',
      });

      prisma.appointment.update.mockResolvedValue({
        id: 'appt-today',
        userId: 'patient-1',
        clinicId: 'clinic-1',
        status: 'CONFIRMED',
        slotTime: today,
        bookingFee: 250,
        isPriority: true,
        priorityFee: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
        clinic: { id: 'clinic-1', name: 'Metro Clinic', slug: 'metro-clinic', priorityPrice: 50, enablePriorityQueue: true },
        queueEntry: { tokenNumber: 'P03' },
      });

      const res = await service.joinLiveQueue('appt-today', 'patient-1');
      expect(res.isPriority).toBe(true);
      expect(res.tokenNumber).toBe('P03');
      expect(res.priorityFee).toBe(50);
      expect(whatsAppService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientPhone: '+919876543210',
          messageText: expect.stringContaining('P03'),
        }),
      );
    });

    it('dispatches appointment details and live queue upgrade offer via WhatsApp for today appointments', async () => {
      const today = new Date();
      prisma.appointment.findUnique.mockResolvedValue({
        id: 'appt-today-whatsapp',
        userId: 'patient-1',
        clinicId: 'clinic-1',
        status: 'CONFIRMED',
        slotTime: today,
        isPriority: false,
        clinic: { id: 'clinic-1', name: 'Apex Health', enablePriorityQueue: true, priorityPrice: 50 },
        doctor: { name: 'Gupta' },
        queueEntry: { tokenNumber: 'A07' },
        user: { phoneNumber: '+919999988888', name: 'Alice' },
      });
      prisma.whatsAppMessage.findFirst.mockResolvedValue(null);

      await service.sendAppointmentScheduledReminder('appt-today-whatsapp');

      // Should send 2 WhatsApp messages:
      // Message 1: Appointment details
      // Message 2: Live queue upgrade offer at ₹50
      expect(whatsAppService.sendMessage).toHaveBeenCalledTimes(2);
      expect(whatsAppService.sendMessage).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          recipientPhone: '+919999988888',
          messageText: expect.stringContaining('is scheduled for today'),
        }),
      );
      expect(whatsAppService.sendMessage).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          recipientPhone: '+919999988888',
          messageText: expect.stringContaining('join the doctor\'s live queue right now from the comfort of your home at ₹50'),
        }),
      );
    });
  });

  describe('Security & IDOR Prevention in Appointment Access', () => {
    it('allows patient to view their own appointment', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: 'appt-1',
        userId: 'patient-123',
        clinicId: 'clinic-1',
        status: 'CONFIRMED',
        slotTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const appt = await service.getAppointment('appt-1', 'patient-123', 'PATIENT');
      expect(appt.id).toBe('appt-1');
    });

    it('denies another patient from viewing someone else appointment (IDOR protection)', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: 'appt-1',
        userId: 'patient-owner',
        clinicId: 'clinic-1',
      });

      await expect(
        service.getAppointment('appt-1', 'attacker-patient', 'PATIENT'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows staff of the same clinic to view appointment', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: 'appt-1',
        userId: 'patient-owner',
        clinicId: 'clinic-1',
        status: 'CONFIRMED',
        slotTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const appt = await service.getAppointment('appt-1', 'staff-1', 'CLINIC_ADMIN', 'clinic-1');
      expect(appt.id).toBe('appt-1');
    });

    it('denies staff from a different clinic facility from accessing appointment', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: 'appt-1',
        userId: 'patient-owner',
        clinicId: 'clinic-1',
      });

      await expect(
        service.getAppointment('appt-1', 'staff-other', 'CLINIC_ADMIN', 'clinic-2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('prevents rescheduling an already COMPLETED or CANCELLED appointment', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: 'appt-1',
        userId: 'patient-1',
        clinicId: 'clinic-1',
        status: 'COMPLETED',
      });

      await expect(
        service.rescheduleAppointment('appt-1', 'patient-1', 'PATIENT', {
          slotTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
