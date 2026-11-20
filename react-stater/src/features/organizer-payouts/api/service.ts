import { apiClient } from '@/lib/api-client';
import type {
  OrganizerPayoutBalance,
  OrganizerPayoutSetting,
  OrganizerWithdrawalBatch,
  RequestAutoPayoutDto,
  RequestCancelAutoPayoutDto,
  ManualWithdrawalRequestDto,
  PageResponse
} from './types';

export const organizerPayoutService = {
  getBalance: async (): Promise<OrganizerPayoutBalance> => {
    return apiClient.get<OrganizerPayoutBalance>('/organizer/payouts/balance');
  },

  getSettings: async (): Promise<OrganizerPayoutSetting> => {
    return apiClient.get<OrganizerPayoutSetting>('/organizer/payouts/settings');
  },

  requestAutoPayout: async (data: RequestAutoPayoutDto): Promise<OrganizerPayoutSetting> => {
    return apiClient.post<OrganizerPayoutSetting>('/organizer/payouts/settings/request-auto', data);
  },

  requestCancelAutoPayout: async (data?: RequestCancelAutoPayoutDto): Promise<OrganizerPayoutSetting> => {
    return apiClient.post<OrganizerPayoutSetting>('/organizer/payouts/settings/request-cancel-auto', data || {});
  },

  withdrawManual: async (data: ManualWithdrawalRequestDto): Promise<OrganizerWithdrawalBatch> => {
    return apiClient.post<OrganizerWithdrawalBatch>('/organizer/payouts/withdraw', data);
  },

  getWithdrawalHistory: async (page = 1, size = 10): Promise<PageResponse<OrganizerWithdrawalBatch>> => {
    return apiClient.get<PageResponse<OrganizerWithdrawalBatch>>('/organizer/payouts/history', {
      params: { page, size, sortBy: 'createdAt', sortDir: 'desc' }
    });
  }
};
