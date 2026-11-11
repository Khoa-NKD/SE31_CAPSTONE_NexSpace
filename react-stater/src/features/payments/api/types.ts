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

export interface BookingHoldResponse {
  bookingId: number;
  bookingCode: string;
  seatCode: string;
  resourceName: string;
  workspaceName: string;
  holdExpiresAt: string;
  remainingSeconds: number;
}

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

export type ReconciliationStatus = 'UNRECONCILED' | 'MATCHED' | 'MISMATCH' | 'RESOLVED';

export interface PaymentTransactionResponse {
  id: number;
  orderCode: number;
  bookingId?: number;
  bookingCode?: string;
  workspaceId?: number;
  workspaceName?: string;
  customerName?: string;
  customerEmail?: string;
  amount: number;
  receivedAmount?: number;
  currency: string;
  status: PaymentStatus;
  reconciliationStatus: ReconciliationStatus;
  reconciliationNote?: string;
  gatewayTransactionId?: string;
  failureReason?: string;
  invoiceUrl?: string;
  paidAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface InvoiceResponse {
  bookingId: number;
  bookingCode: string;
  orderCode?: number;
  invoiceNumber: string;
  invoiceUrl: string;
  totalAmount: number;
  currency: string;
  status: string;
  issuedAt: string;
}

export interface ReconciliationResult {
  orderCode: number;
  localStatus: PaymentStatus;
  gatewayStatus: string;
  localAmount: number;
  gatewayAmount: number;
  reconciliationStatus: ReconciliationStatus;
  note?: string;
  reconciledAt: string;
}

export interface BatchReconciliationResponse {
  totalProcessed: number;
  matchedCount: number;
  mismatchCount: number;
  autoHealedCount: number;
  errorCount: number;
  completedAt: string;
}

export interface ReconciliationSummary {
  totalTransactions: number;
  matchedCount: number;
  mismatchCount: number;
  unreconciledCount: number;
  resolvedCount: number;
}

export interface PageResponse<T> {
  content: T[];
  listObjects?: T[];
  page: number;
  pageNumber?: number;
  size: number;
  pageSize?: number;
  totalElements: number;
  totalRecords?: number;
  totalPages: number;
}

