import { queryOptions } from '@tanstack/react-query';
import { adminPayoutService } from './service';
import type { PayoutLedgerFilterParams } from './types';

export const adminPayoutKeys = {
  all: ['admin-payouts'] as const,
  requests: (page: number, size: number) => [...adminPayoutKeys.all, 'requests', page, size] as const,
  ledger: (params?: PayoutLedgerFilterParams) => [...adminPayoutKeys.all, 'ledger', params] as const
};

export const adminPayoutQueries = {
  requests: (page = 1, size = 10) =>
    queryOptions({
      queryKey: adminPayoutKeys.requests(page, size),
      queryFn: () => adminPayoutService.getPendingRequests(page, size),
      refetchInterval: 30000
    }),

  ledger: (params?: PayoutLedgerFilterParams) =>
    queryOptions({
      queryKey: adminPayoutKeys.ledger(params),
      queryFn: () => adminPayoutService.getLedger(params),
      placeholderData: (previousData) => previousData
    })
};
