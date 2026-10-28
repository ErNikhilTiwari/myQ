import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import {
  CreatePaymentOrderDto,
  PaymentOrderDto,
  VerifyPaymentDto,
  PaymentStatus,
} from '@queueapp/shared';
import * as crypto from 'crypto';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_queueapp_mock';
  private readonly keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_queueapp_mock_12345';

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  /**
   * Helper to create real Razorpay Order via REST API if live/test credentials are provided
   */
  private async createRazorpayOrder(
    amountPaise: number,
    receipt: string,
    notes?: Record<string, string>,
  ): Promise<string | null> {
    if (!process.env.RAZORPAY_KEY_ID || this.keyId.startsWith('rzp_test_queueapp_mock')) {
      return null;
    }

    try {
      const authHeader = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: receipt.slice(0, 40),
          notes,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`❌ Razorpay Orders API returned ${response.status}: ${errText}`);
        return null;
      }

      const json: any = await response.json();
      return json.id || null;
    } catch (err: any) {
      this.logger.error(`❌ Error calling Razorpay Orders API: ${err.message}`);
      return null;
    }
  }

  /**
   * Create Razorpay payment order for an appointment
   */
  async createPaymentOrder(
    userId: string,
    dto: CreatePaymentOrderDto,
  ): Promise<PaymentOrderDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID "${dto.appointmentId}" not found.`);
    }

    const provider = dto.provider || 'RAZORPAY';
    const serverAmount = appointment.bookingFee;
    const amountPaise = Math.round(serverAmount * 100);

    // Call real Razorpay API if credentials configured
    let orderId: string;
    let effectiveKeyId: string;

    const realRazorpayOrderId = await this.createRazorpayOrder(
      amountPaise,
      `appt_${appointment.id}`,
      {
        appointmentId: appointment.id,
        clinicId: appointment.clinicId,
        userId,
      },
    );

    if (realRazorpayOrderId) {
      orderId = realRazorpayOrderId;
      effectiveKeyId = this.keyId;
      this.logger.log(`💳 Created Real Razorpay Order ${orderId} via API for Appointment ${appointment.id}`);
    } else {
      orderId = `${provider.toLowerCase()}_order_${nanoid()}`;
      effectiveKeyId = process.env.RAZORPAY_KEY_ID || `${provider.toLowerCase()}_key_test`;
      this.logger.log(`💳 Created [${provider}] Dev/Mock Payment Order ${orderId} for Appointment ${appointment.id}`);
    }

    const payment = await this.prisma.payment.create({
      data: {
        clinicId: appointment.clinicId,
        userId,
        appointmentId: appointment.id,
        amount: serverAmount,
        currency: dto.currency || 'INR',
        status: 'CREATED',
        gatewayOrderId: orderId,
      },
    });

    return {
      paymentId: payment.id,
      orderId,
      amount: payment.amount,
      currency: payment.currency,
      provider,
      keyId: effectiveKeyId,
      status: payment.status as PaymentStatus,
    };
  }

  /**
   * Verify client-submitted payment signature (HMAC-SHA256) & Allocate Queue Token on First-Paid Basis
   */
  async verifyPayment(dto: VerifyPaymentDto): Promise<{ success: boolean; message: string; tokenNumber?: string }> {
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: dto.paymentId },
        include: { appointment: true },
      });

      if (!payment) {
        throw new NotFoundException(`Payment record with ID "${dto.paymentId}" not found.`);
      }

      // Idempotency: if already processed successfully, return previous state
      if (payment.status === 'SUCCESS') {
        const existingAppt = await tx.appointment.findUnique({
          where: { id: payment.appointmentId! },
          include: { queueEntry: true },
        });
        return {
          success: true,
          message: 'Payment already processed and verified.',
          tokenNumber: existingAppt?.queueEntry?.tokenNumber,
        };
      }

      // Generate expected HMAC SHA256 (allow mock signature for seamless dev/testing)
      const textToSign = `${dto.razorpayOrderId}|${dto.razorpayPaymentId}`;
      const generatedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(textToSign)
        .digest('hex');

      const isMockAllowed =
        process.env.NODE_ENV !== 'production' &&
        (!process.env.RAZORPAY_KEY_ID || this.keyId.startsWith('rzp_test_queueapp_mock'));

      const isSignatureValid =
        (isMockAllowed && dto.razorpaySignature === 'mock_paid_signature') ||
        dto.razorpaySignature === generatedSignature;

      if (!isSignatureValid) {
        this.logger.error(`❌ Payment verification failed for Order ${dto.razorpayOrderId}`);
        await tx.payment.update({
          where: { id: dto.paymentId },
          data: { status: 'FAILED' },
        });
        throw new BadRequestException('Invalid payment signature. Verification failed.');
      }

      // Update payment record to SUCCESS
      await tx.payment.update({
        where: { id: dto.paymentId },
        data: {
          status: 'SUCCESS',
          gatewayPaymentId: dto.razorpayPaymentId,
        },
      });

      let tokenNumber: string | undefined;

      // FIRST-PAID FIRST-SERVED QUEUE TOKEN ALLOCATION
      let appointmentDetails: any = null;

      if (payment.appointmentId) {
        const appt = await tx.appointment.findUnique({
          where: { id: payment.appointmentId },
          include: { user: true, doctor: true },
        });

        if (appt) {
          // Locate or create clinic queue
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

          // Atomic sequence increment (concurrency-safe first-paid queue position)
          const updatedQueue = await tx.queue.update({
            where: { id: queue.id },
            data: { currentSeq: { increment: 1 } },
          });

          const clinic = await tx.clinic.findUnique({ where: { id: appt.clinicId } });
          const isPriority = Boolean(appt.isPriority);

          // Priority token prefix 'P' for instant priority pass (+₹50)
          const prefix = isPriority ? 'P' : (appt.bookingType === 'IN_CLINIC' ? 'Q' : 'A');
          tokenNumber = `${prefix}${String(updatedQueue.currentSeq).padStart(2, '0')}`;
          const publicToken = `pt_${nanoid()}`;

          // If booking time is turned off and priority pass wasn't selected, mark BOOKED (awaits check-in).
          // If priority pass was selected (+₹50), patient joins the active queue RIGHT AWAY ('WAITING').
          const shouldJoinRightAway = isPriority || (clinic?.enableBookingTime !== false);
          const queueStatus = shouldJoinRightAway ? 'WAITING' : 'BOOKED';

          // Create Queue Entry
          const entry = await tx.queueEntry.create({
            data: {
              queueId: queue.id,
              userId: appt.userId,
              tokenNumber,
              sequenceNumber: updatedQueue.currentSeq,
              status: queueStatus,
              publicToken,
              estimatedWait: isPriority ? 5 : 15,
            },
          });

          // Confirm Appointment with linked queue token
          await tx.appointment.update({
            where: { id: appt.id },
            data: {
              status: 'CONFIRMED',
              paymentStatus: 'SUCCESS',
              queueEntryId: entry.id,
            },
          });

          appointmentDetails = {
            clinicId: appt.clinicId,
            slotTime: appt.slotTime,
            user: appt.user,
            doctor: appt.doctor,
            isPriority,
            clinicName: clinic?.name || 'Clinic',
            priorityPrice: clinic?.priorityPrice ?? 50,
            enablePriorityQueue: clinic?.enablePriorityQueue ?? true,
            tokenNumber,
          };

          this.logger.log(
            `🎟️ First-Paid Queue Token ${tokenNumber} allocated for Appointment ${appt.id} (Seq ${updatedQueue.currentSeq})`
          );
        }
      }

      return {
        success: true,
        message: 'Payment verified and appointment token confirmed.',
        tokenNumber,
        appointmentDetails,
      };
    });

    // Auto-dispatch WhatsApp appointment day reminder and live queue offer if scheduled for today
    if (result.appointmentDetails?.user?.phoneNumber) {
      try {
        const { clinicId, slotTime, user, doctor, isPriority, clinicName, priorityPrice, enablePriorityQueue, tokenNumber } =
          result.appointmentDetails;
        const tz = 'Asia/Kolkata';
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
        const slotDateStr = new Date(slotTime).toLocaleDateString('en-CA', { timeZone: tz });

        if (slotDateStr === todayStr) {
          const formattedTime = new Date(slotTime).toLocaleTimeString('en-IN', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
          const doctorStr = doctor?.name ? `with Dr. ${doctor.name}` : '';
          const tokenDisplay = tokenNumber ? ` Token: ${tokenNumber}.` : '';

          // Message 1: Appointment details
          await this.whatsAppService.sendMessage({
            clinicId,
            recipientPhone: user.phoneNumber,
            messageText: `Hello ${user.name || 'Patient'}, your appointment ${doctorStr} at ${clinicName} is scheduled for today at ${formattedTime}.${tokenDisplay}`,
          });

          // Message 2: Live queue offer (if not already priority pass)
          if (!isPriority && enablePriorityQueue !== false) {
            await this.whatsAppService.sendMessage({
              clinicId,
              recipientPhone: user.phoneNumber,
              messageText: `Skip the waiting room! You can join the doctor's live queue right now from the comfort of your home at ₹${priorityPrice}. Open your patient portal to join live queue instantly.`,
            });
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch today's appointment WhatsApp message in payment verify: ${err?.message}`);
      }
    }

    return {
      success: result.success,
      message: result.message,
      tokenNumber: result.tokenNumber,
    };
  }

  /**
   * Razorpay Webhook Handler with HMAC-SHA256 verification and idempotent processing (ADR-005)
   */
  async handleRazorpayWebhook(
    rawBody: Buffer | string,
    signature: string,
    webhookEvent: any,
  ): Promise<{ received: boolean; processed: boolean; duplicate?: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing X-Razorpay-Signature header.');
    }

    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || this.keySecret;

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyString)
      .digest('hex');

    if (expectedSignature !== signature) {
      this.logger.error('❌ Razorpay webhook signature mismatch!');
      throw new BadRequestException('Invalid webhook signature.');
    }

    const event = webhookEvent?.event;
    const paymentEntity = webhookEvent?.payload?.payment?.entity;

    if (!paymentEntity) {
      this.logger.warn(`Ignored webhook event: ${event} without payment payload.`);
      return { received: true, processed: false };
    }

    const gatewayOrderId = paymentEntity.order_id;
    const gatewayPaymentId = paymentEntity.id;
    const idempotencyKey = `webhook_${event}_${gatewayPaymentId}`;

    // Webhook Idempotency Check (prevent duplicate credits/processing)
    const existingPaymentWithIdempotency = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
    });

    if (existingPaymentWithIdempotency) {
      this.logger.log(`🔁 Webhook already processed (idempotency key: ${idempotencyKey})`);
      return { received: true, processed: true, duplicate: true };
    }

    // Find payment by order ID
    const payment = await this.prisma.payment.findFirst({
      where: { gatewayOrderId },
    });

    if (!payment) {
      this.logger.warn(`No payment record found for gateway order ID "${gatewayOrderId}".`);
      return { received: true, processed: false };
    }

    if (event === 'payment.captured' || event === 'payment.authorized') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          gatewayPaymentId,
          idempotencyKey,
          rawWebhookData: JSON.stringify(webhookEvent),
        },
      });

      if (payment.appointmentId) {
        await this.prisma.appointment.update({
          where: { id: payment.appointmentId },
          data: { paymentStatus: 'SUCCESS' },
        });
      }

      this.logger.log(`🎉 Webhook processed: Payment ${payment.id} marked SUCCESS`);
    } else if (event === 'payment.failed') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          gatewayPaymentId,
          idempotencyKey,
          rawWebhookData: JSON.stringify(webhookEvent),
        },
      });

      if (payment.appointmentId) {
        await this.prisma.appointment.update({
          where: { id: payment.appointmentId },
          data: { paymentStatus: 'FAILED' },
        });
      }
    }

    return { received: true, processed: true };
  }

  /**
   * Helper to generate HMAC for tests
   */
  generateTestSignature(orderId: string, paymentId: string): string {
    return crypto
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }

  generateTestWebhookSignature(body: string): string {
    return crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');
  }
}
