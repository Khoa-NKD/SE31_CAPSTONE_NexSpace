import { queryOptions, useQuery } from '@tanstack/react-query';
import { paymentService } from './service';
import type { PaymentStatusResponse, ExchangeRateResponse } from './types';

export const paymentKeys = {
  all: ['payments'] as const,
  exchangeRate: () => [...paymentKeys.all, 'exchange-rate'] as const,
  status: (bookingId: number) => [...paymentKeys.all, 'status', bookingId] as const
};

export const exchangeRateQueryOptions = () =>
  queryOptions<ExchangeRateResponse>({
    queryKey: paymentKeys.exchangeRate(),
    queryFn: () => paymentService.getExchangeRate(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

export function useExchangeRate() {
  return useQuery(exchangeRateQueryOptions());
}

export function usePaymentStatus(bookingId?: number, enabled = true) {
  return useQuery<PaymentStatusResponse>({
    queryKey: paymentKeys.status(bookingId ?? 0),
    queryFn: () => paymentService.getPaymentStatus(bookingId!),
    enabled: Boolean(bookingId) && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.paymentStatus === 'SUCCESS' || data.paymentStatus === 'CANCELLED' || data.paymentStatus === 'EXPIRED')) {
        return false;
      }
      return 2500; // Poll every 2.5 seconds
    }
  });
}

