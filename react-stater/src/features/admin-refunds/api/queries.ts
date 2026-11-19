import { queryOptions } from '@tanstack/react-query';
import { adminRefundService } from './service';
import type { RefundFilterParams } from './types';

export const adminRefundKeys = {
  all: ['admin-refunds'] as const,
  lists: () => [...adminRefundKeys.all, 'list'] as const,
  list: (params?: RefundFilterParams) => [...adminRefundKeys.lists(), params] as const,
  kpis: () => [...adminRefundKeys.all, 'kpis'] as const,
  details: () => [...adminRefundKeys.all, 'detail'] as const,
  detail: (id: number) => [...adminRefundKeys.details(), id] as const
};

export const adminRefundQueries = {
  list: (params?: RefundFilterParams) =>
    queryOptions({
      queryKey: adminRefundKeys.list(params),
      queryFn: () => adminRefundService.getRefunds(params),
      placeholderData: (previousData) => previousData
    }),

  kpis: () =>
    queryOptions({
      queryKey: adminRefundKeys.kpis(),
      queryFn: () => adminRefundService.getKpis()
    }),

  detail: (id: number) =>
    queryOptions({
      queryKey: adminRefundKeys.detail(id),
      queryFn: () => adminRefundService.getRefundDetails(id),
      enabled: id > 0
    })
};
