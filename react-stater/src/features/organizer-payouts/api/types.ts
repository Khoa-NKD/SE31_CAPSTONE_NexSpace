export type PayoutMode = 'MANUAL' | 'AUTO_DAILY';

export type PayoutApprovalStatus =
  | 'NONE'
  | 'PENDING_ENABLE'
  | 'PENDING_DISABLE'
  | 'APPROVED'
  | 'REJECTED';

export type WithdrawalBatchStatus = 'PROCESSING' | 'PAID' | 'FAILED';

export type WithdrawalType = 'MANUAL' | 'AUTO_DAILY';

export interface OrganizerPayoutBalance {
  grossRevenue: number;
  heldBalance: number;
  withdrawableBalance: number;
  paidOutTotal: number;
  bankName: string | null;
  bankBin: string | null;
  bankAccountNumberMasked: string | null;
  bankAccountHolder: string | null;
  hasConfiguredBank: boolean;
  canWithdraw: boolean;
}

export interface OrganizerPayoutSetting {
  id: number;
  payoutMode: PayoutMode;
  autoPayoutHour: number;
  pendingAutoPayoutHour: number | null;
  approvalStatus: PayoutApprovalStatus;
  requestNote: string | null;
  adminFeedback: string | null;
  requestedAt: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  organizerId?: number;
  organizerName?: string;
  organizerEmail?: string;
  bankName?: string;
  bankAccountNumberMasked?: string;
  bankAccountHolder?: string;
}

export interface OrganizerWithdrawalBatch {
  id: number;
  batchCode: string;
  amount: number;
  payoutType: WithdrawalType;
  status: WithdrawalBatchStatus;
  payosReference: string | null;
  bankName: string | null;
  bankBin: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  errorReason: string | null;
  createdAt: string;
  organizerId?: number;
  organizerName?: string;
  organizerEmail?: string;
}

export interface RequestAutoPayoutDto {
  autoPayoutHour: number;
  requestNote?: string;
}

export interface RequestCancelAutoPayoutDto {
  requestNote?: string;
}

export interface ManualWithdrawalRequestDto {
  amount?: number;
  withdrawAll?: boolean;
}

export interface PageResponse<T> {
  listObjects: T[];
  content?: T[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
