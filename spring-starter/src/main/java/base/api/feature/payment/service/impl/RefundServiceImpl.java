package base.api.feature.payment.service.impl;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.payment.dto.refund.ApproveRefundRequestDto;
import base.api.feature.payment.dto.refund.RefundKpisDto;
import base.api.feature.payment.dto.refund.RefundRequestResponseDto;
import base.api.feature.payment.dto.refund.RejectRefundRequestDto;
import base.api.feature.payment.dto.refund.UpdateRefundBankInfoDto;
import base.api.feature.payment.mapper.RefundRequestMapper;
import base.api.feature.payment.repository.IRefundRequestRepository;
import base.api.feature.payment.service.IRefundService;
import base.api.feature.auth.repository.IUserRepository;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.RefundRequestModel;
import base.api.shared.enums.RefundStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import vn.payos.PayOS;
import vn.payos.model.v1.payouts.Payout;
import vn.payos.model.v1.payouts.PayoutRequests;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
public class RefundServiceImpl implements IRefundService {

    private static final Set<String> SORTABLE_FIELDS = Set.of(
            "id", "createdAt", "requestedAmount", "approvedAmount", "status"
    );

    private final base.api.feature.payment.service.RefundPayoutService refundPayouts;
    private final IRefundRequestRepository refundRequestRepository;
    private final IUserRepository userRepository;
    private final IBookingRepository bookingRepository;
    private final PayOS payOS;
    private final IAuditService auditService;
    private final base.api.feature.notification.service.INotificationService notificationService;

    @Value("${nexspace.payos.payout.client-id:${nexspace.payos.client-id:}}")
    private String clientId;

    public RefundServiceImpl(
            base.api.feature.payment.service.RefundPayoutService refundPayouts,
            IRefundRequestRepository refundRequestRepository,
            IUserRepository userRepository,
            IBookingRepository bookingRepository,
            @Qualifier("payOSPayoutClient") PayOS payOS,
            IAuditService auditService,
            @org.springframework.beans.factory.annotation.Autowired(required = false) base.api.feature.notification.service.INotificationService notificationService) {
        this.refundPayouts = refundPayouts;
        this.refundRequestRepository = refundRequestRepository;
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
        this.payOS = payOS;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<RefundRequestResponseDto> getAdminRefunds(
            RefundStatus status,
            Long workspaceId,
            String search,
            PageRequestDTO pageRequest) {
        Pageable pageable = pageRequest.toPageable("createdAt", Sort.Direction.DESC, SORTABLE_FIELDS);
        String normalizedSearch = StringUtils.hasText(search) ? search.trim() : pageRequest.normalizedSearch();

        Page<RefundRequestModel> page = refundRequestRepository.searchAdminRefunds(
                status, workspaceId, normalizedSearch, pageable
        );
        return PageResponseDTO.from(page.map(RefundRequestMapper::toDto));
    }

    @Override
    @Transactional(readOnly = true)
    public RefundKpisDto getAdminRefundKpis() {
        long pendingCount = refundRequestRepository.countByStatus(RefundStatus.PENDING);
        BigDecimal pendingVolume = refundRequestRepository.sumRequestedAmountByStatus(RefundStatus.PENDING);

        long processedCount = refundRequestRepository.countByStatus(RefundStatus.PROCESSED);
        BigDecimal processedVolume = refundRequestRepository.sumApprovedAmountByStatus(RefundStatus.PROCESSED);

        long rejectedCount = refundRequestRepository.countByStatus(RefundStatus.REJECTED);
        BigDecimal rejectedVolume = refundRequestRepository.sumRequestedAmountByStatus(RefundStatus.REJECTED);

        return RefundKpisDto.builder()
                .pendingCount(pendingCount)
                .pendingVolume(pendingVolume)
                .processedCount(processedCount)
                .processedVolume(processedVolume)
                .rejectedCount(rejectedCount)
                .rejectedVolume(rejectedVolume)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public RefundRequestResponseDto getRefundDetails(Long refundId) {
        RefundRequestModel refund = refundRequestRepository.findByIdWithDetails(refundId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy yêu cầu hoàn tiền với ID: " + refundId));
        return RefundRequestMapper.toDto(refund);
    }

    @Override
    @Transactional
    public RefundRequestResponseDto approveRefund(Long adminUserId, Long refundId, ApproveRefundRequestDto dto) {
        RefundRequestModel refund = refundRequestRepository.findByIdForUpdate(refundId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy yêu cầu hoàn tiền với ID: " + refundId));

        if (refund.getStatus() != RefundStatus.PENDING) {
            throw new ConflictException("Yêu cầu hoàn tiền đã được xử lý (trạng thái: " + refund.getStatus() + ")");
        }

        if (!StringUtils.hasText(refund.getBankBin()) || !StringUtils.hasText(refund.getBankAccountNumber())) {
            throw new BadRequestException("Chưa có thông tin số tài khoản và mã BIN ngân hàng để thực hiện chuyển tiền hoàn qua PayOS");
        }

        BigDecimal approvedAmount = (dto != null && dto.getApprovedAmount() != null)
                ? dto.getApprovedAmount()
                : refund.getRequestedAmount();

        if (approvedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Số tiền hoàn duyệt phải lớn hơn 0");
        }

        if (approvedAmount.compareTo(refund.getRequestedAmount()) > 0) {
            throw new BadRequestException("Số tiền duyệt (" + approvedAmount + " đ) không được vượt quá số tiền yêu cầu (" + refund.getRequestedAmount() + " đ)");
        }

        refundPayouts.reserve(refund.getBooking());
        String refId = "RF" + refund.getId() + "_" + (System.currentTimeMillis() % 1000000);
        String desc = sanitizeDescription("NX REFUND " + refund.getBooking().getId());

        if ("mock-client-id".equals(clientId) || !StringUtils.hasText(clientId)) {
            log.info("Mock PayOS credentials detected. Simulating successful payout for refundId={}", refund.getId());
            refund.setRefundReference("PAYOS_MOCK_" + System.currentTimeMillis());
        } else {
            try {
                log.info("Executing PayOS Payout for refundId={}, amount={}, toBin={}, toAccount={}",
                        refund.getId(), approvedAmount.longValue(), refund.getBankBin(), refund.getBankAccountNumber());

                PayoutRequests payoutReq = PayoutRequests.builder()
                        .referenceId(refId)
                        .amount(approvedAmount.longValue())
                        .description(desc)
                        .toBin(refund.getBankBin().trim())
                        .toAccountNumber(refund.getBankAccountNumber().trim())
                        .build();

                Payout payout = payOS.payouts().create(payoutReq);
                log.info("PayOS Payout created successfully: id={}, refId={}", payout.getId(), payout.getReferenceId());
                refund.setRefundReference(StringUtils.hasText(payout.getId()) ? payout.getId() : payout.getReferenceId());
            } catch (Exception e) {
                log.error("PayOS Payout failed for refundId {}: {}", refund.getId(), e.getMessage(), e);
                throw new BadRequestException("Cổng PayOS báo lỗi khi thực hiện chi tiền: " + e.getMessage());
            }
        }

        UserModel adminUser = userRepository.findById(adminUserId).orElse(null);
        refund.setApprovedAmount(approvedAmount);
        refund.setStatus(RefundStatus.PROCESSED);
        refund.setAdminNote(dto != null ? dto.getAdminNote() : null);
        refund.setReviewedBy(adminUser);
        refund.setReviewedAt(LocalDateTime.now());
        refund.setProcessedAt(LocalDateTime.now());

        RefundRequestModel saved = refundRequestRepository.saveAndFlush(refund);
        refundPayouts.reconcile(refund.getBooking());

        if (notificationService != null) {
            notificationService.sendRefundCompletedNotification(saved);
        }

        auditService.log(
                adminUser,
                "REFUND",
                "APPROVE",
                "RefundRequest",
                saved.getId(),
                dto != null ? dto.getAdminNote() : "Approved and processed via PayOS Payout"
        );

        return RefundRequestMapper.toDto(saved);
    }

    @Override
    @Transactional
    public RefundRequestResponseDto rejectRefund(Long adminUserId, Long refundId, RejectRefundRequestDto dto) {
        RefundRequestModel refund = refundRequestRepository.findByIdForUpdate(refundId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy yêu cầu hoàn tiền với ID: " + refundId));

        if (refund.getStatus() != RefundStatus.PENDING) {
            throw new ConflictException("Yêu cầu hoàn tiền đã được xử lý (trạng thái: " + refund.getStatus() + ")");
        }

        UserModel adminUser = userRepository.findById(adminUserId).orElse(null);
        refund.setStatus(RefundStatus.REJECTED);
        refund.setAdminNote(dto.getReason());
        refund.setReviewedBy(adminUser);
        refund.setReviewedAt(LocalDateTime.now());

        RefundRequestModel saved = refundRequestRepository.saveAndFlush(refund);
        refundPayouts.reconcile(refund.getBooking());

        if (notificationService != null) {
            notificationService.sendRefundCompletedNotification(saved);
        }

        auditService.log(
                adminUser,
                "REFUND",
                "REJECT",
                "RefundRequest",
                saved.getId(),
                dto.getReason()
        );

        return RefundRequestMapper.toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public RefundRequestResponseDto getBookingRefund(Long currentUserId, Long bookingId) {
        BookingModel booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đơn đặt chỗ với ID: " + bookingId));

        if (!booking.getCustomer().getId().equals(currentUserId)) {
            throw new NotFoundException("Không tìm thấy đơn đặt chỗ");
        }

        List<RefundRequestModel> list = refundRequestRepository.findByBookingIdWithDetails(bookingId);
        if (list.isEmpty()) {
            throw new NotFoundException("Đơn đặt chỗ này chưa có yêu cầu hoàn tiền");
        }

        return RefundRequestMapper.toDto(list.get(0));
    }

    @Override
    @Transactional
    public RefundRequestResponseDto updateBookingRefundBankInfo(Long currentUserId, Long bookingId, UpdateRefundBankInfoDto dto) {
        BookingModel booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đơn đặt chỗ với ID: " + bookingId));

        if (!booking.getCustomer().getId().equals(currentUserId)) {
            throw new NotFoundException("Không tìm thấy đơn đặt chỗ");
        }

        List<RefundRequestModel> list = refundRequestRepository.findByBookingId(bookingId);
        if (list.isEmpty()) {
            throw new NotFoundException("Đơn đặt chỗ này chưa có yêu cầu hoàn tiền để cập nhật");
        }

        RefundRequestModel refund = list.get(0);
        if (refund.getStatus() != RefundStatus.PENDING) {
            throw new ConflictException("Không thể cập nhật thông tin tài khoản vì yêu cầu hoàn tiền đã được xử lý (" + refund.getStatus() + ")");
        }

        refund.setBankName(dto.getBankName().trim());
        refund.setBankBin(dto.getBankBin().trim());
        refund.setBankAccountNumber(dto.getBankAccountNumber().trim());
        refund.setBankAccountName(dto.getBankAccountName().trim().toUpperCase());

        RefundRequestModel saved = refundRequestRepository.save(refund);
        return RefundRequestMapper.toDto(saved);
    }

    private String sanitizeDescription(String input) {
        if (!StringUtils.hasText(input)) {
            return "NX REFUND";
        }
        String clean = input.replaceAll("[^a-zA-Z0-9 ]", "").trim();
        if (clean.length() > 25) {
            return clean.substring(0, 25);
        }
        return clean.isEmpty() ? "NX REFUND" : clean;
    }
}
