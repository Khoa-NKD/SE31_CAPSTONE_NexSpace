import { queryOptions } from '@tanstack/react-query';
import { organizerPayoutService } from './service';

export const organizerPayoutKeys = {
  all: ['organizer-payouts'] as const,
  balance: () => [...organizerPayoutKeys.all, 'balance'] as const,
  settings: () => [...organizerPayoutKeys.all, 'settings'] as const,
  history: (page: number, size: number) => [...organizerPayoutKeys.all, 'history', page, size] as const
};

export const organizerPayoutQueries = {
  balance: () =>
    queryOptions({
      queryKey: organizerPayoutKeys.balance(),
      queryFn: () => organizerPayoutService.getBalance(),
      refetchInterval: 30000 // tự động làm mới mỗi 30s
    }),

  settings: () =>
    queryOptions({
      queryKey: organizerPayoutKeys.settings(),
      queryFn: () => organizerPayoutService.getSettings()
    }),

  history: (page = 1, size = 10) =>
    queryOptions({
      queryKey: organizerPayoutKeys.history(page, size),
      queryFn: () => organizerPayoutService.getWithdrawalHistory(page, size),
      placeholderData: (previousData) => previousData
    })
};
