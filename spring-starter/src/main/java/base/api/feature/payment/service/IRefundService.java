package base.api.feature.payment.service;

import base.api.feature.payment.dto.refund.ApproveRefundRequestDto;
import base.api.feature.payment.dto.refund.CreateRefundComplaintDto;
import base.api.feature.payment.dto.refund.CustomerRefundKpisDto;
import base.api.feature.payment.dto.refund.RefundKpisDto;
import base.api.feature.payment.dto.refund.RefundRequestResponseDto;
import base.api.feature.payment.dto.refund.RejectRefundRequestDto;
import base.api.feature.payment.dto.refund.UpdateRefundBankInfoDto;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.entity.payment.RefundRequestModel;
import base.api.shared.enums.RefundSource;
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

    PageResponseDTO<RefundRequestResponseDto> getCustomerRefunds(
            Long customerId,
            RefundStatus status,
            RefundSource source,
            String search,
            PageRequestDTO pageRequest);

    CustomerRefundKpisDto getCustomerRefundKpis(Long customerId);

    RefundRequestResponseDto getCustomerRefundById(Long customerId, Long refundId);

    RefundRequestResponseDto updateCustomerRefundBankInfo(Long customerId, Long refundId, UpdateRefundBankInfoDto dto);

    RefundRequestResponseDto createCustomerComplaintRefund(Long customerId, CreateRefundComplaintDto dto);

    RefundRequestModel processPostExpiryAutoRefund(
            BookingModel booking,
            PaymentTransactionModel tx,
            String counterBankId,
            String counterBankName,
            String counterAccountNumber,
            String counterAccountName,
            String reason);
}
