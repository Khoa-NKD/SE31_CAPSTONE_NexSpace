import { queryOptions, useQuery } from '@tanstack/react-query';
import { paymentService } from './service';
import type {
  PaymentStatusResponse,
  ExchangeRateResponse,
  PaymentStatus,
  ReconciliationStatus,
  PaymentTransactionResponse,
  InvoiceResponse,
  ReconciliationSummary,
  PageResponse
} from './types';

export const paymentKeys = {
  all: ['payments'] as const,
  exchangeRate: () => [...paymentKeys.all, 'exchange-rate'] as const,
  status: (bookingId: number) => [...paymentKeys.all, 'status', bookingId] as const,
  customerList: (params?: Record<string, unknown>) => [...paymentKeys.all, 'customer', params] as const,
  organizerList: (workspaceId: number, params?: Record<string, unknown>) =>
    [...paymentKeys.all, 'organizer', workspaceId, params] as const,
  adminList: (params?: Record<string, unknown>) => [...paymentKeys.all, 'admin', params] as const,
  adminDetail: (orderCode: number) => [...paymentKeys.all, 'admin-detail', orderCode] as const,
  invoice: (bookingId: number) => [...paymentKeys.all, 'invoice', bookingId] as const,
  reconciliationSummary: () => [...paymentKeys.all, 'reconciliation-summary'] as const
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

export function useCustomerPaymentHistory(params?: {
  status?: PaymentStatus;
  page?: number;
  size?: number;
  sort?: string;
}) {
  return useQuery<PageResponse<PaymentTransactionResponse>>({
    queryKey: paymentKeys.customerList(params),
    queryFn: () => paymentService.getCustomerPaymentHistory(params)
  });
}

export function useInvoice(bookingId?: number, enabled = true) {
  return useQuery<InvoiceResponse>({
    queryKey: paymentKeys.invoice(bookingId ?? 0),
    queryFn: () => paymentService.getInvoice(bookingId!),
    enabled: Boolean(bookingId) && enabled,
    staleTime: 60 * 1000
  });
}

export function useOrganizerPaymentHistory(
  workspaceId: number,
  params?: { status?: PaymentStatus; page?: number; size?: number }
) {
  return useQuery<PageResponse<PaymentTransactionResponse>>({
    queryKey: paymentKeys.organizerList(workspaceId, params),
    queryFn: () => paymentService.getOrganizerPaymentHistory(workspaceId, params),
    enabled: Boolean(workspaceId)
  });
}

export function useAdminPaymentHistory(params?: {
  status?: PaymentStatus;
  reconciliationStatus?: ReconciliationStatus;
  page?: number;
  size?: number;
  sort?: string;
}) {
  return useQuery<PageResponse<PaymentTransactionResponse>>({
    queryKey: paymentKeys.adminList(params),
    queryFn: () => paymentService.getAdminPaymentHistory(params)
  });
}

export function useAdminTransactionDetail(orderCode?: number, enabled = true) {
  return useQuery<PaymentTransactionResponse>({
    queryKey: paymentKeys.adminDetail(orderCode ?? 0),
    queryFn: () => paymentService.getAdminTransactionDetail(orderCode!),
    enabled: Boolean(orderCode) && enabled
  });
}

export function useReconciliationSummary() {
  return useQuery<ReconciliationSummary>({
    queryKey: paymentKeys.reconciliationSummary(),
    queryFn: () => paymentService.getReconciliationSummary()
  });
}

