package base.api.feature.payment.service;

import base.api.feature.payment.dto.request.ProcessRefundRequestDTO;
import base.api.feature.payment.dto.response.RefundResponseDTO;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.enums.RefundStatus;
import org.springframework.data.domain.Page;

public interface IRefundService {
    Page<RefundResponseDTO> getRefunds(RefundStatus status, PageRequestDTO pageRequest);

    RefundResponseDTO getRefundById(Long id);

    RefundResponseDTO processRefund(Long adminUserId, Long refundId, ProcessRefundRequestDTO dto);

    RefundResponseDTO rejectRefund(Long adminUserId, Long refundId, String note);
}
