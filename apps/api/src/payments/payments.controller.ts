import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreatePaymentOrderDto,
  VerifyPaymentDto,
  ApiResponse,
} from '@queueapp/shared';
import { Request } from 'express';

@Controller('api')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * 1. Patient creates a payment order (Razorpay)
   */
  @Post('payments/create-order')
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePaymentOrderDto,
  ): Promise<ApiResponse> {
    const data = await this.paymentsService.createPaymentOrder(userId, dto);
    return { success: true, data };
  }

  /**
   * 2. Patient verifies payment with client-side signature
   */
  @Post('payments/verify')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(@Body() dto: VerifyPaymentDto): Promise<ApiResponse> {
    const data = await this.paymentsService.verifyPayment(dto);
    return { success: true, data };
  }

  /**
   * 3. Server-side Razorpay Webhook endpoint with HMAC-SHA256 verification and idempotency
   */
  @Post('webhooks/razorpay')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: Request,
    @Body() body: any,
  ): Promise<ApiResponse> {
    const rawBody = (req as any).rawBody || JSON.stringify(body);
    const result = await this.paymentsService.handleRazorpayWebhook(
      rawBody,
      signature,
      body,
    );
    return { success: true, data: result };
  }
}
