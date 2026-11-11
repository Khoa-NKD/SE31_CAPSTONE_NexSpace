import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from './service';
import { paymentKeys } from './queries';
import type {
  PaymentCheckoutResponse,
  ReconciliationResult,
  BatchReconciliationResponse
} from './types';

export function useCreatePaymentCheckout() {
  const queryClient = useQueryClient();

  return useMutation<PaymentCheckoutResponse, Error, number>({
    mutationFn: (bookingId: number) => paymentService.createPaymentCheckout(bookingId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.status(data.bookingId) });
    }
  });
}

export function useCancelPayment() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { orderCode: number; reason?: string }>({
    mutationFn: ({ orderCode, reason }) => paymentService.cancelPayment(orderCode, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
    }
  });
}

export function useReconcileTransaction() {
  const queryClient = useQueryClient();

  return useMutation<ReconciliationResult, Error, number>({
    mutationFn: (orderCode: number) => paymentService.reconcileTransaction(orderCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
    }
  });
}

export function useBatchReconcile() {
  const queryClient = useQueryClient();

  return useMutation<BatchReconciliationResponse, Error, void>({
    mutationFn: () => paymentService.batchReconcile(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
    }
  });
}

