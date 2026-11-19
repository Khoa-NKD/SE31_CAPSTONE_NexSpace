package base.api.feature.payment.service;

import base.api.feature.payment.dto.refund.ApproveRefundRequestDto;
import base.api.feature.payment.dto.refund.RefundKpisDto;
import base.api.feature.payment.dto.refund.RefundRequestResponseDto;
import base.api.feature.payment.dto.refund.RejectRefundRequestDto;
import base.api.feature.payment.dto.refund.UpdateRefundBankInfoDto;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.enums.RefundStatus;

public interface IRefundService {

    PageResponseDTO<RefundRequestResponseDto> getAdminRefunds(
            RefundStatus status,
            Long workspaceId,
            String search,
            PageRequestDTO pageRequest);

    RefundKpisDto getAdminRefundKpis();

    RefundRequestResponseDto getRefundDetails(Long refundId);

    RefundRequestResponseDto approveRefund(Long adminUserId, Long refundId, ApproveRefundRequestDto dto);

    RefundRequestResponseDto rejectRefund(Long adminUserId, Long refundId, RejectRefundRequestDto dto);

    RefundRequestResponseDto getBookingRefund(Long currentUserId, Long bookingId);

    RefundRequestResponseDto updateBookingRefundBankInfo(Long currentUserId, Long bookingId, UpdateRefundBankInfoDto dto);
}
