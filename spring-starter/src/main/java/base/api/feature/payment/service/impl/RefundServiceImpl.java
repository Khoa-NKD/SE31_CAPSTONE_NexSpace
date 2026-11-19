package base.api.feature.payment.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.notification.service.INotificationService;
import base.api.feature.payment.dto.request.ProcessRefundRequestDTO;
import base.api.feature.payment.dto.response.RefundResponseDTO;
import base.api.feature.payment.repository.IRefundRequestRepository;
import base.api.feature.payment.service.IRefundService;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.RefundRequestModel;
import base.api.shared.enums.RefundStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefundServiceImpl implements IRefundService {

    private final IRefundRequestRepository refundRequestRepository;
    private final IUserRepository userRepository;
    private final INotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public Page<RefundResponseDTO> getRefunds(RefundStatus status, PageRequestDTO pageRequest) {
        Page<RefundRequestModel> page = (status != null)
                ? refundRequestRepository.findByStatus(status, pageRequest.toPageable())
                : refundRequestRepository.findAll(pageRequest.toPageable());

        return page.map(this::toResponseDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public RefundResponseDTO getRefundById(Long id) {
        RefundRequestModel refund = refundRequestRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy yêu cầu hoàn tiền với ID: " + id));
        return toResponseDTO(refund);
    }

    @Override
    @Transactional
    public RefundResponseDTO processRefund(Long adminUserId, Long refundId, ProcessRefundRequestDTO dto) {
        RefundRequestModel refund = refundRequestRepository.findById(refundId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy yêu cầu hoàn tiền với ID: " + refundId));

        if (refund.getStatus() != RefundStatus.PENDING) {
            throw new BadRequestException("Chỉ có thể xử lý yêu cầu hoàn tiền đang chờ (PENDING). Trạng thái hiện tại: " + refund.getStatus());
        }

        UserModel admin = userRepository.findById(adminUserId).orElse(null);

        refund.setApprovedAmount(dto != null && dto.getApprovedAmount() != null ? dto.getApprovedAmount() : refund.getRequestedAmount());
        refund.setStatus(RefundStatus.PROCESSED);
        if (dto != null) {
            if (StringUtils.hasText(dto.getAdminNote())) {
                refund.setAdminNote(dto.getAdminNote());
            }
            if (StringUtils.hasText(dto.getRefundReference())) {
                refund.setRefundReference(dto.getRefundReference());
            } else {
                refund.setRefundReference("REF-" + System.currentTimeMillis());
            }
        }
        refund.setReviewedBy(admin);
        refund.setReviewedAt(LocalDateTime.now());
        refund.setProcessedAt(LocalDateTime.now());

        RefundRequestModel saved = refundRequestRepository.save(refund);
        log.info("Refund request {} processed successfully by admin {}. Status={}", refundId, adminUserId, saved.getStatus());

        // Kích hoạt thông báo hoàn tiền hoàn tất cho khách hàng (In-app + Email)
        notificationService.sendRefundCompletedNotification(saved);

        return toResponseDTO(saved);
    }

    @Override
    @Transactional
    public RefundResponseDTO rejectRefund(Long adminUserId, Long refundId, String note) {
        RefundRequestModel refund = refundRequestRepository.findById(refundId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy yêu cầu hoàn tiền với ID: " + refundId));

        if (refund.getStatus() != RefundStatus.PENDING) {
            throw new BadRequestException("Chỉ có thể từ chối yêu cầu hoàn tiền đang chờ (PENDING). Trạng thái hiện tại: " + refund.getStatus());
        }

        UserModel admin = userRepository.findById(adminUserId).orElse(null);
        refund.setStatus(RefundStatus.REJECTED);
        refund.setAdminNote(note);
        refund.setReviewedBy(admin);
        refund.setReviewedAt(LocalDateTime.now());

        RefundRequestModel saved = refundRequestRepository.save(refund);
        log.info("Refund request {} rejected by admin {}", refundId, adminUserId);

        return toResponseDTO(saved);
    }

    private RefundResponseDTO toResponseDTO(RefundRequestModel model) {
        BookingModel booking = model.getBooking();
        UserModel customer = booking != null ? booking.getCustomer() : null;

        String customerName = "N/A";
        String customerEmail = "N/A";
        if (customer != null) {
            if (StringUtils.hasText(customer.getFirstName())) {
                String last = customer.getLastName() != null ? customer.getLastName() : "";
                customerName = (customer.getFirstName() + " " + last).trim();
            } else {
                customerName = customer.getUserName();
            }
            customerEmail = customer.getEmail();
        }

        String workspaceName = (booking != null && booking.getWorkspace() != null)
                ? booking.getWorkspace().getName()
                : "N/A";

        return RefundResponseDTO.builder()
                .id(model.getId())
                .bookingId(booking != null ? booking.getId() : null)
                .bookingCode(booking != null ? booking.getBookingCode() : null)
                .workspaceName(workspaceName)
                .customerId(customer != null ? customer.getId() : null)
                .customerName(customerName)
                .customerEmail(customerEmail)
                .source(model.getSource() != null ? model.getSource().name() : null)
                .reason(model.getReason())
                .requestedAmount(model.getRequestedAmount())
                .approvedAmount(model.getApprovedAmount())
                .status(model.getStatus() != null ? model.getStatus().name() : null)
                .adminNote(model.getAdminNote())
                .refundReference(model.getRefundReference())
                .createdAt(model.getCreatedAt())
                .processedAt(model.getProcessedAt())
                .build();
    }
}
