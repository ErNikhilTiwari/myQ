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

    const orderId = `order_${nanoid()}`;

    const payment = await this.prisma.payment.create({
      data: {
        clinicId: appointment.clinicId,
        userId,
        appointmentId: appointment.id,
        amount: dto.amount,
        currency: dto.currency || 'INR',
        status: 'CREATED',
        gatewayOrderId: orderId,
      },
    });

    this.logger.log(`💳 Created Payment Order ${orderId} for Appointment ${appointment.id}`);

    return {
      paymentId: payment.id,
      orderId,
      amount: payment.amount,
      currency: payment.currency,
      keyId: this.keyId,
      status: payment.status as PaymentStatus,
    };
  }

  /**
   * Verify client-submitted payment signature (HMAC-SHA256)
   */
  async verifyPayment(dto: VerifyPaymentDto): Promise<{ success: boolean; message: string }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record with ID "${dto.paymentId}" not found.`);
    }

    // Generate expected HMAC SHA256
    const textToSign = `${dto.razorpayOrderId}|${dto.razorpayPaymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(textToSign)
      .digest('hex');

    if (generatedSignature !== dto.razorpaySignature) {
      this.logger.error(`❌ Payment verification failed for Order ${dto.razorpayOrderId}`);
      await this.prisma.payment.update({
        where: { id: dto.paymentId },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException('Invalid payment signature. Verification failed.');
    }

    // Success
    await this.prisma.payment.update({
      where: { id: dto.paymentId },
      data: {
        status: 'SUCCESS',
        gatewayPaymentId: dto.razorpayPaymentId,
      },
    });

    if (payment.appointmentId) {
      await this.prisma.appointment.update({
        where: { id: payment.appointmentId },
        data: { paymentStatus: 'SUCCESS' },
      });
    }

    this.logger.log(`✅ Payment verified successfully for Payment ${payment.id}`);
    return { success: true, message: 'Payment successfully verified.' };
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
