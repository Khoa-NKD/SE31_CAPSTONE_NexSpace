import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from './service';
import { paymentKeys } from './queries';
import type { PaymentCheckoutResponse } from './types';

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

