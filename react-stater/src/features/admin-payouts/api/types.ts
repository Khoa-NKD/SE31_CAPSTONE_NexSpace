import type {
  OrganizerPayoutSetting,
  OrganizerWithdrawalBatch,
  PageResponse
} from '@/features/organizer-payouts/api/types';

export type {
  OrganizerPayoutSetting,
  OrganizerWithdrawalBatch,
  PageResponse
};

export interface ReviewPayoutRequestDto {
  approved: boolean;
  adminFeedback?: string;
}

export interface PayoutLedgerFilterParams {
  page?: number;
  size?: number;
  status?: string;
  payoutType?: string;
}
