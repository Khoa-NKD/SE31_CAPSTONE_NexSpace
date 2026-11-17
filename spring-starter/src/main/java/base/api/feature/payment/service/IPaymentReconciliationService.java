package base.api.feature.payment.service;

import base.api.feature.payment.dto.response.BatchReconciliationResponseDTO;
import base.api.feature.payment.dto.response.ReconciliationResultDTO;
import base.api.feature.payment.dto.response.ReconciliationSummaryDTO;

public interface IPaymentReconciliationService {

    /**
     * Đối soát 1 giao dịch cụ thể với trạng thái trực tiếp trên cổng PayOS qua API get(orderCode).
     *
     * @param orderCode Mã đơn hàng PayOS
     * @return Kết quả đối soát chi tiết
     */
    ReconciliationResultDTO reconcileTransaction(Long orderCode);

    /**
     * Chạy đối soát hàng loạt toàn bộ các giao dịch UNRECONCILED hoặc MISMATCH.
     *
     * @return Báo cáo kết quả đối soát theo lô
     */
    BatchReconciliationResponseDTO batchReconcile();

    /**
     * Lấy thống kê tổng hợp đối soát phục vụ màn hình Admin Reconciliation (A09).
     *
     * @return Số lượng giao dịch MATCHED, MISMATCH, UNRECONCILED
     */
    ReconciliationSummaryDTO getReconciliationSummary();
}

