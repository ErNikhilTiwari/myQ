export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type PaymentStatus =
  | 'PENDING'
  | 'CREATED'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED';

export type BookingType = 'IN_CLINIC' | 'REMOTE';

export interface BookAppointmentDto {
  clinicId: string;
  doctorId?: string;
  serviceId?: string;
  slotTime: string; // ISO 8601 string
  bookingType?: BookingType; // Default 'REMOTE' (₹250 default) vs 'IN_CLINIC' (₹200 default)
  qrToken?: string; // Rotating QR cryptographic token required if bookingType === 'IN_CLINIC'
}

export interface InClinicQrCodeDto {
  token: string;
  clinicId: string;
  clinicSlug: string;
  price: number;
  expiresAt: string;
  refreshIntervalSeconds: number;
}

export interface AppointmentDto {
  id: string;
  clinicId: string;
  userId: string;
  patientName?: string;
  patientPhone?: string;
  doctorId?: string | null;
  doctorName?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  slotTime: string;
  status: AppointmentStatus;
  bookingFee: number;
  paymentStatus: PaymentStatus;
  queueEntryId?: string | null;
  tokenNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RescheduleAppointmentDto {
  slotTime: string;
}

export type PaymentProviderType = 'RAZORPAY' | 'CASHFREE' | 'PHONEPE';

export interface CreatePaymentOrderDto {
  appointmentId: string;
  amount: number;
  currency?: string;
  provider?: PaymentProviderType;
}

export interface PaymentOrderDto {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  provider: PaymentProviderType;
  keyId: string;
  status: PaymentStatus;
}

export interface VerifyPaymentDto {
  paymentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        method?: string;
      };
    };
  };
}
