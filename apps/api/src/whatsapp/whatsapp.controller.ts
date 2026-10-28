import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  SendWhatsAppTemplateDto,
  SendWhatsAppMessageDto,
  UserRole,
  ApiResponse,
} from '@queueapp/shared';
import { Request } from 'express';

@Controller('api')
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  /**
   * 1. Meta Webhook Verification Challenge (GET /api/webhooks/whatsapp)
   */
  @Get('webhooks/whatsapp')
  verifyWebhook(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): string {
    return this.whatsAppService.verifyWebhookChallenge(mode, token, challenge);
  }

  /**
   * 2. Inbound Meta Webhook Receiver (POST /api/webhooks/whatsapp)
   */
  @Post('webhooks/whatsapp')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: Request,
    @Body() payload: any,
  ): Promise<ApiResponse> {
    const rawBody = (req as any).rawBody || JSON.stringify(payload);
    const data = await this.whatsAppService.handleWebhook(
      rawBody,
      signature,
      payload,
    );
    return { success: true, data };
  }

  /**
   * 2b. Direct simulation endpoint for interactive chatbot testing and debugging
   */
  @Post('clinics/:clinicId/whatsapp/simulate-chat')
  @HttpCode(HttpStatus.OK)
  async simulateChat(
    @Param('clinicId') clinicId: string,
    @Body('phoneNumber') phoneNumber: string,
    @Body('messageText') messageText: string,
  ): Promise<ApiResponse> {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Simulation endpoints are disabled in production.');
    }
    const data = await this.whatsAppService.processChatbotMessage(
      clinicId,
      phoneNumber,
      messageText,
    );
    return { success: true, data };
  }

  /**
   * 3. Send WhatsApp Template Notification (Staff)
   */
  @Post('clinics/:clinicId/whatsapp/send-template')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async sendTemplate(
    @Param('clinicId') clinicId: string,
    @Body() dto: SendWhatsAppTemplateDto,
  ): Promise<ApiResponse> {
    dto.clinicId = clinicId;
    const data = await this.whatsAppService.sendTemplateNotification(dto);
    return { success: true, data };
  }

  /**
   * 4. Send Custom WhatsApp Message (Staff)
   */
  @Post('clinics/:clinicId/whatsapp/send-message')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async sendMessage(
    @Param('clinicId') clinicId: string,
    @Body() dto: SendWhatsAppMessageDto,
  ): Promise<ApiResponse> {
    dto.clinicId = clinicId;
    const data = await this.whatsAppService.sendMessage(dto);
    return { success: true, data };
  }

  /**
   * 5. List Clinic WhatsApp Message Delivery History (Staff)
   */
  @Get('clinics/:clinicId/whatsapp/messages')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async listMessages(
    @Param('clinicId') clinicId: string,
  ): Promise<ApiResponse> {
    const data = await this.whatsAppService.listClinicMessages(clinicId);
    return { success: true, data };
  }
}
