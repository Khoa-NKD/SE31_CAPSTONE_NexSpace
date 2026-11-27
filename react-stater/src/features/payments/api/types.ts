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

export type RefundStatusType = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED' | 'FAILED';

export type RefundSourceType =
  | 'CUSTOMER_CANCEL'
  | 'ORGANIZER_CANCEL'
  | 'PAYMENT_DISCREPANCY'
  | 'ADMIN_DISPUTE';

export interface CustomerRefundItemResponse {
  id: number;
  bookingId: number;
  bookingCode: string;
  bookingStatus?: BookingStatus | null;
  bookingStartTime?: string | null;
  bookingEndTime?: string | null;
  customerId?: number | null;
  customerName?: string | null;
  customerEmail?: string | null;
  workspaceId?: number | null;
  workspaceName?: string | null;
  workspaceAddress?: string | null;
  seatCode?: string | null;
  resourceName?: string | null;
  paymentOrderCode?: number | null;
  paidAt?: string | null;
  originalPaidAmount?: number | null;
  requestedAmount: number;
  approvedAmount?: number | null;
  status: RefundStatusType;
  source: RefundSourceType;
  sourceLabel?: string | null;
  reason?: string | null;
  bankName?: string | null;
  bankBin?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  needsBankInfo?: boolean;
  autoRefundSupportedBank?: boolean;
  adminNote?: string | null;
  refundReference?: string | null;
  reviewedById?: number | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  processedAt?: string | null;
  createdAt: string;
}

export interface CustomerRefundKpisResponse {
  totalCount: number;
  pendingCount: number;
  needsBankInfoCount: number;
  processedCount: number;
  rejectedCount: number;
  totalRequestedAmount: number;
  totalRefundedAmount: number;
}

export interface UpdateRefundBankInfoRequest {
  bankName: string;
  bankBin: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

export interface CreateRefundComplaintRequest {
  bookingId: number;
  requestedAmount?: number;
  reason: string;
  bankName: string;
  bankBin: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

export interface BookingHoldResponse {
  bookingId?: number | null;
  bookingCode?: string | null;
  workspaceId?: number | null;
  resourceId?: number | null;
  seatCode?: string | null;
  resourceName?: string | null;
  workspaceName?: string | null;
  holdExpiresAt?: string | null;
  remainingSeconds?: number | null;
  serverTime?: string;
  holdDurationMinutes?: number | null;
  remainingHoldAttempts?: number;
  maxHoldAttempts?: number;
  penaltyBlockMinutes?: number;
  isBookingSuspended?: boolean;
  bookingSuspendedUntil?: string | null;
}

export interface CustomerBookingItemResponse {
  bookingId: number;
  bookingCode: string;
  workspaceId?: number;
  resourceId?: number;
  floorId?: number;
  workspaceName: string;
  workspaceAddress: string;
  seatCode: string;
  resourceName: string;
  status: BookingStatus;
  startTime: string;
  endTime: string;
  totalAmount: number;
  qrTokenHash: string | null;
  pinCode: string | null;
  createdAt: string;
  refundId?: number | null;
  refundStatus?: RefundStatusType | null;
  refundAmount?: number | null;
  refundReference?: string | null;
  refundBankName?: string | null;
  refundAccountNumber?: string | null;
  refundProcessedAt?: string | null;
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
  totalGrossVolume?: number;
  totalPlatformFee?: number;
  totalPayoutAmount?: number;
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
