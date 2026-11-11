import { apiClient } from '@/lib/api-client';
import type {
  PaymentCheckoutResponse,
  PaymentStatusResponse,
  ExchangeRateResponse,
  PaymentStatus,
  ReconciliationStatus,
  PaymentTransactionResponse,
  InvoiceResponse,
  ReconciliationResult,
  BatchReconciliationResponse,
  ReconciliationSummary,
  PageResponse,
  BookingHoldResponse
} from './types';

export const paymentService = {
  /**
   * Tạo phiên thanh toán PayOS và nhận chuỗi mã VietQR cùng thông tin thụ hưởng.
   */
  createPaymentCheckout: (bookingId: number): Promise<PaymentCheckoutResponse> =>
    apiClient.post<PaymentCheckoutResponse>(`/customer/bookings/${bookingId}/payments`),

  /**
   * Lấy hoặc tự động tạo phiên đặt chỗ đang chờ thanh toán của khách hàng hiện tại (kèm mốc holdExpiresAt).
   */
  getCurrentPendingBooking: (): Promise<BookingHoldResponse> =>
    apiClient.get<BookingHoldResponse>('/customer/bookings/current-pending'),

  /**
   * Lấy ID phiên đặt chỗ đang chờ thanh toán (tương thích backward).
   */
  getCurrentPendingBookingId: async (): Promise<number> => {
    const hold = await apiClient.get<BookingHoldResponse>('/customer/bookings/current-pending');
    return hold.bookingId;
  },

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
    apiClient.get<ExchangeRateResponse>('/public/exchange-rate'),

  /**
   * Xem lịch sử thanh toán của khách hàng cá nhân.
   */
  getCustomerPaymentHistory: (params?: {
    status?: PaymentStatus;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<PaymentTransactionResponse>> =>
    apiClient.get<PageResponse<PaymentTransactionResponse>>('/customer/payments', { params }),

  /**
   * Lấy thông tin hóa đơn điện tử / link PDF Cloudinary cho đơn đặt chỗ.
   */
  getInvoice: (bookingId: number): Promise<InvoiceResponse> =>
    apiClient.get<InvoiceResponse>(`/customer/bookings/${bookingId}/receipt`),

  /**
   * Organizer xem lịch sử thanh toán của workspace thuộc quyền quản lý.
   */
  getOrganizerPaymentHistory: (
    workspaceId: number,
    params?: { status?: PaymentStatus; page?: number; size?: number }
  ): Promise<PageResponse<PaymentTransactionResponse>> =>
    apiClient.get<PageResponse<PaymentTransactionResponse>>(
      `/organizer/workspaces/${workspaceId}/payments`,
      { params }
    ),

  /**
   * Admin xem toàn bộ giao dịch thanh toán trên hệ thống kèm bộ lọc đối soát.
   */
  getAdminPaymentHistory: (params?: {
    status?: PaymentStatus;
    reconciliationStatus?: ReconciliationStatus;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<PaymentTransactionResponse>> =>
    apiClient.get<PageResponse<PaymentTransactionResponse>>('/admin/payments', { params }),

  /**
   * Admin xem chi tiết 1 giao dịch và trạng thái đối soát.
   */
  getAdminTransactionDetail: (orderCode: number): Promise<PaymentTransactionResponse> =>
    apiClient.get<PaymentTransactionResponse>(`/admin/payments/${orderCode}`),

  /**
   * Admin thực hiện đối soát đơn lẻ với cổng PayOS.
   */
  reconcileTransaction: (orderCode: number): Promise<ReconciliationResult> =>
    apiClient.post<ReconciliationResult>(`/admin/payments/${orderCode}/reconcile`),

  /**
   * Admin thực hiện đối soát hàng loạt tất cả giao dịch chưa khớp.
   */
  batchReconcile: (): Promise<BatchReconciliationResponse> =>
    apiClient.post<BatchReconciliationResponse>('/admin/payments/batch-reconcile'),

  /**
   * Lấy số liệu thống kê tổng hợp đối soát (A09 KPI cards).
   */
  getReconciliationSummary: (): Promise<ReconciliationSummary> =>
    apiClient.get<ReconciliationSummary>('/admin/payments/reconciliation-summary')
};

