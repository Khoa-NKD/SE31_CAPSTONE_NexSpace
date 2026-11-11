export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export type BookingStatus =
  | 'PENDING_APPROVAL'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'NO_SHOW';

export interface PaymentCheckoutResponse {
  orderCode: number;
  bookingId: number;
  bookingCode: string;
  amount: number;
  currency: string;
  qrCode: string;
  bankBin: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  description: string;
  expiresAt: string;
  checkoutUrl: string;
}

export interface PaymentStatusResponse {
  orderCode: number;
  bookingId: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  paidAt: string | null;
  qrTokenHash: string | null;
  pinCode: string | null;
}

export interface ExchangeRateResponse {
  baseCurrency: string;
  targetCurrency: string;
  exchangeRate: number;
  updatedAt: string;
}

