import { apiClient } from '@/lib/api-client';
import type {
  OrganizerPayoutSetting,
  OrganizerWithdrawalBatch,
  ReviewPayoutRequestDto,
  PayoutLedgerFilterParams,
  PageResponse
} from './types';

export const adminPayoutService = {
  getPendingRequests: async (page = 1, size = 10): Promise<PageResponse<OrganizerPayoutSetting>> => {
    return apiClient.get<PageResponse<OrganizerPayoutSetting>>('/admin/payouts/requests', {
      params: { page, size, sortBy: 'requestedAt', sortDir: 'desc' }
    });
  },

  reviewRequest: async (
    settingId: number,
    data: ReviewPayoutRequestDto
  ): Promise<OrganizerPayoutSetting> => {
    return apiClient.post<OrganizerPayoutSetting>(`/admin/payouts/requests/${settingId}/review`, data);
  },

  getLedger: async (params?: PayoutLedgerFilterParams): Promise<PageResponse<OrganizerWithdrawalBatch>> => {
    return apiClient.get<PageResponse<OrganizerWithdrawalBatch>>('/admin/payouts/ledger', {
      params: {
        page: params?.page ?? 1,
        size: params?.size ?? 10,
        status: params?.status && params.status !== 'all' ? params.status : undefined,
        payoutType: params?.payoutType && params.payoutType !== 'all' ? params.payoutType : undefined,
        sortBy: 'createdAt',
        sortDir: 'desc'
      }
    });
  },

  retryWithdrawal: async (batchId: number): Promise<OrganizerWithdrawalBatch> => {
    return apiClient.post<OrganizerWithdrawalBatch>(`/admin/payouts/ledger/${batchId}/retry`);
  }
};
