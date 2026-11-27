import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/features/auth/store/auth-store';
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
  BookingHoldResponse,
  CustomerBookingItemResponse,
  BookingStatus,
  CustomerRefundItemResponse,
  CustomerRefundKpisResponse,
  RefundStatusType,
  RefundSourceType,
  UpdateRefundBankInfoRequest,
  CreateRefundComplaintRequest
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
    return Number(hold.bookingId) || 0;
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
   * Tải trực tiếp file hóa đơn VAT định dạng PDF có kèm Bearer token xác thực.
   */
  downloadInvoicePdf: async (bookingId: number): Promise<void> => {
    const session = useAuthStore.getState();
    const token = session.accessToken;
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`/api/customer/bookings/${bookingId}/receipt/download`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      let errorMsg = 'Không thể tải hóa đơn PDF';
      try {
        const errJson = await response.json();
        if (errJson?.message) errorMsg = errJson.message;
      } catch {
        // Non-JSON error
      }
      throw new Error(errorMsg);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = `Hoa-don-NexSpace-#${bookingId}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
  },

  /**
   * Xem danh sách các đơn đặt chỗ của khách hàng cá nhân.
   */
  getCustomerBookings: (params?: {
    status?: BookingStatus;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<CustomerBookingItemResponse>> =>
    apiClient.get<PageResponse<CustomerBookingItemResponse>>('/customer/bookings', { params }),

  /**
   * Xem chi tiết xác nhận đơn đặt chỗ và vé kỹ thuật số.
   */
  getBookingConfirmationDetail: (bookingId: number): Promise<CustomerBookingItemResponse> =>
    apiClient.get<CustomerBookingItemResponse>(`/customer/bookings/${bookingId}`),

  /**
   * Xem danh sách các yêu cầu hoàn tiền của khách hàng hiện tại.
   */
  getCustomerRefunds: (params?: {
    status?: RefundStatusType;
    source?: RefundSourceType;
    search?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<CustomerRefundItemResponse>> =>
    apiClient.get<PageResponse<CustomerRefundItemResponse>>('/customer/refunds', { params }),

  /**
   * Lấy số liệu thống kê tổng quan các yêu cầu hoàn tiền của khách hàng hiện tại.
   */
  getCustomerRefundKpis: (): Promise<CustomerRefundKpisResponse> =>
    apiClient.get<CustomerRefundKpisResponse>('/customer/refunds/kpis'),

  /**
   * Xem chi tiết một yêu cầu hoàn tiền của khách hàng hiện tại.
   */
  getCustomerRefundDetail: (refundId: number): Promise<CustomerRefundItemResponse> =>
    apiClient.get<CustomerRefundItemResponse>(`/customer/refunds/${refundId}`),

  /**
   * Cập nhật thông tin tài khoản ngân hàng nhận tiền hoàn của khách hàng.
   */
  updateCustomerRefundBankInfo: (
    refundId: number,
    data: UpdateRefundBankInfoRequest
  ): Promise<CustomerRefundItemResponse> =>
    apiClient.patch<CustomerRefundItemResponse>(`/customer/refunds/${refundId}/bank-info`, data),

  /**
   * Gửi yêu cầu khiếu nại đòi hoàn tiền cho đơn đặt chỗ đã sử dụng.
   */
  createComplaintRefund: (
    data: CreateRefundComplaintRequest
  ): Promise<CustomerRefundItemResponse> =>
    apiClient.post<CustomerRefundItemResponse>('/customer/refunds/complaint', data),

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
