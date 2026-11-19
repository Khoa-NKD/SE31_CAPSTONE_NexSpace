export type RefundStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED' | 'FAILED';

export interface RefundRequestResponseDto {
  id: number;
  bookingId: number;
  bookingCode: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  workspaceId: number;
  workspaceName: string;
  resourceName: string;
  originalPaidAmount: number;
  requestedAmount: number;
  approvedAmount?: number;
  status: RefundStatus;
  source: string;
  reason: string;
  bankName?: string;
  bankBin?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  adminNote?: string;
  refundReference?: string;
  reviewedById?: number;
  reviewedByName?: string;
  reviewedAt?: string;
  processedAt?: string;
  createdAt: string;
}

export interface RefundKpisDto {
  pendingCount: number;
  pendingVolume: number;
  processedCount: number;
  processedVolume: number;
  rejectedCount: number;
  rejectedVolume: number;
}

export interface ApproveRefundRequestDto {
  approvedAmount?: number;
  adminNote?: string;
}

export interface RejectRefundRequestDto {
  reason: string;
}

export interface RefundFilterParams {
  status?: string;
  workspaceId?: number;
  search?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}

export interface PageResponse<T> {
  content: T[];
  listObjects?: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
