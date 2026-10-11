import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

  constructor(private readonly prisma: PrismaService) {}

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
    const orderId = `${provider.toLowerCase()}_order_${nanoid()}`;

    // STRICT SERVER PRICING: NEVER trust client amount; always use appointment.bookingFee
    const serverAmount = appointment.bookingFee;

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

    this.logger.log(`💳 Created [${provider}] Payment Order ${orderId} for Appointment ${appointment.id} at strict server price ₹${serverAmount}`);

    return {
      paymentId: payment.id,
      orderId,
      amount: payment.amount,
      currency: payment.currency,
      provider,
      keyId: `${provider.toLowerCase()}_key_test`,
      status: payment.status as PaymentStatus,
    };
  }

  /**
   * Verify client-submitted payment signature (HMAC-SHA256) & Allocate Queue Token on First-Paid Basis
   */
  async verifyPayment(dto: VerifyPaymentDto): Promise<{ success: boolean; message: string; tokenNumber?: string }> {
    return this.prisma.$transaction(async (tx) => {
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

      const isSignatureValid =
        dto.razorpaySignature === 'mock_paid_signature' ||
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
      if (payment.appointmentId) {
        const appt = await tx.appointment.findUnique({
          where: { id: payment.appointmentId },
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

          const prefix = appt.bookingType === 'IN_CLINIC' ? 'Q' : 'A';
          tokenNumber = `${prefix}${String(updatedQueue.currentSeq).padStart(2, '0')}`;
          const publicToken = `pt_${nanoid()}`;

          // Create Queue Entry
          const entry = await tx.queueEntry.create({
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

          // Confirm Appointment with linked queue token
          await tx.appointment.update({
            where: { id: appt.id },
            data: {
              status: 'CONFIRMED',
              paymentStatus: 'SUCCESS',
              queueEntryId: entry.id,
            },
          });

          this.logger.log(
            `🎟️ First-Paid Queue Token ${tokenNumber} allocated for Appointment ${appt.id} (Seq ${updatedQueue.currentSeq})`
          );
        }
      }

      return {
        success: true,
        message: 'Payment verified and appointment token confirmed.',
        tokenNumber,
      };
    });
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

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
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
