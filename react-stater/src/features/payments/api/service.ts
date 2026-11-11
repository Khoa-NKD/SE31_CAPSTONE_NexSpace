import { apiClient } from '@/lib/api-client';
import type {
  PaymentCheckoutResponse,
  PaymentStatusResponse,
  ExchangeRateResponse
} from './types';

export const paymentService = {
  /**
   * Tạo phiên thanh toán PayOS và nhận chuỗi mã VietQR cùng thông tin thụ hưởng.
   */
  createPaymentCheckout: (bookingId: number): Promise<PaymentCheckoutResponse> =>
    apiClient.post<PaymentCheckoutResponse>(`/customer/bookings/${bookingId}/payments`),

  /**
   * Kiểm tra trạng thái thanh toán và đặt chỗ thời gian thực (hỗ trợ polling).
   */
  getPaymentStatus: (bookingId: number): Promise<PaymentStatusResponse> =>
    apiClient.get<PaymentStatusResponse>(`/customer/bookings/${bookingId}/payment-status`),

  /**
   * Khách hàng chủ động hủy phiên thanh toán và giải phóng slot giữ chỗ.
   */
  cancelPayment: (orderCode: number, reason?: string): Promise<void> =>
    apiClient.post<void>(`/customer/payments/${orderCode}/cancel`, undefined, {
      params: { reason }
    }),

  /**
   * Lấy tỷ giá quy đổi tiền tệ USD <-> VNĐ.
   */
  getExchangeRate: (): Promise<ExchangeRateResponse> =>
    apiClient.get<ExchangeRateResponse>('/public/exchange-rate')
};

