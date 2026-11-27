package base.api.feature.payment.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.notification.service.INotificationService;
import base.api.feature.payment.dto.refund.ApproveRefundRequestDto;
import base.api.feature.payment.dto.refund.CreateRefundComplaintDto;
import base.api.feature.payment.dto.refund.CustomerRefundKpisDto;
import base.api.feature.payment.dto.refund.RefundKpisDto;
import base.api.feature.payment.dto.refund.RefundRequestResponseDto;
import base.api.feature.payment.dto.refund.RejectRefundRequestDto;
import base.api.feature.payment.dto.refund.UpdateRefundBankInfoDto;
import base.api.feature.payment.mapper.RefundRequestMapper;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.feature.payment.repository.IRefundRequestRepository;
import base.api.feature.payment.service.BookingRefundAmount;
import base.api.feature.payment.service.IRefundService;
import base.api.feature.payment.service.RefundPayoutService;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.entity.payment.RefundRequestModel;
import base.api.shared.enums.AuditActorType;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.RefundSource;
import base.api.shared.enums.RefundStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
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
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
public class RefundServiceImpl implements IRefundService {

    private static final Set<String> SORTABLE_FIELDS = Set.of(
            "id", "createdAt", "requestedAmount", "approvedAmount", "status", "processedAt"
    );

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy");

    private final RefundPayoutService refundPayouts;
    private final IRefundRequestRepository refundRequestRepository;
    private final IUserRepository userRepository;
    private final IBookingRepository bookingRepository;
    private final PayOS payOS;
    private final IAuditService auditService;
    private final INotificationService notificationService;

    @Autowired(required = false)
    private IPaymentTransactionRepository paymentTransactionRepository;

    @Value("${nexspace.payos.payout.client-id:${nexspace.payos.client-id:}}")
    private String clientId;

    public RefundServiceImpl(
            RefundPayoutService refundPayouts,
            IRefundRequestRepository refundRequestRepository,
            IUserRepository userRepository,
            IBookingRepository bookingRepository,
            @Qualifier("payOSPayoutClient") PayOS payOS,
            IAuditService auditService,
            @Autowired(required = false) INotificationService notificationService) {
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

        if (refund.getSource() != RefundSource.PAYMENT_DISCREPANCY) {
            refundPayouts.reserve(refund.getBooking());
        }
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
        if (refund.getSource() != RefundSource.PAYMENT_DISCREPANCY) {
            refundPayouts.reconcile(refund.getBooking());
        }

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
        if (refund.getSource() != RefundSource.PAYMENT_DISCREPANCY) {
            refundPayouts.reconcile(refund.getBooking());
        }

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
        return applyBankInfoUpdateAndTryAutoRefund(refund, dto);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<RefundRequestResponseDto> getCustomerRefunds(
            Long customerId,
            RefundStatus status,
            RefundSource source,
            String search,
            PageRequestDTO pageRequest) {
        Pageable pageable = pageRequest.toPageable("createdAt", Sort.Direction.DESC, SORTABLE_FIELDS);
        String normalizedSearch = StringUtils.hasText(search) ? search.trim() : pageRequest.normalizedSearch();

        Page<RefundRequestModel> page = refundRequestRepository.searchCustomerRefunds(
                customerId, status, source, normalizedSearch, pageable
        );
        return PageResponseDTO.from(page.map(RefundRequestMapper::toDto));
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerRefundKpisDto getCustomerRefundKpis(Long customerId) {
        List<RefundRequestModel> all = refundRequestRepository.findAllByCustomerIdWithDetails(customerId);
        long totalCount = all.size();
        long pendingCount = 0;
        long needsBankInfoCount = 0;
        long processedCount = 0;
        long rejectedCount = 0;
        BigDecimal totalRequested = BigDecimal.ZERO;
        BigDecimal totalRefunded = BigDecimal.ZERO;

        for (RefundRequestModel r : all) {
            if (r.getRequestedAmount() != null) {
                totalRequested = totalRequested.add(r.getRequestedAmount());
            }
            if (r.getStatus() == RefundStatus.PENDING) {
                pendingCount++;
                boolean hasBank = StringUtils.hasText(r.getBankBin()) && StringUtils.hasText(r.getBankAccountNumber());
                boolean supported = RefundRequestMapper.isPayOSAutoRefundSupportedBank(r.getBankBin(), r.getBankName());
                if (!hasBank || (r.getSource() == RefundSource.PAYMENT_DISCREPANCY && !supported)) {
                    needsBankInfoCount++;
                }
            } else if (r.getStatus() == RefundStatus.PROCESSED || r.getStatus() == RefundStatus.APPROVED) {
                processedCount++;
                BigDecimal amt = r.getApprovedAmount() != null ? r.getApprovedAmount() : r.getRequestedAmount();
                if (amt != null) {
                    totalRefunded = totalRefunded.add(amt);
                }
            } else if (r.getStatus() == RefundStatus.REJECTED || r.getStatus() == RefundStatus.FAILED) {
                rejectedCount++;
            }
        }

        return CustomerRefundKpisDto.builder()
                .totalCount(totalCount)
                .pendingCount(pendingCount)
                .needsBankInfoCount(needsBankInfoCount)
                .processedCount(processedCount)
                .rejectedCount(rejectedCount)
                .totalRequestedAmount(totalRequested)
                .totalRefundedAmount(totalRefunded)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public RefundRequestResponseDto getCustomerRefundById(Long customerId, Long refundId) {
        RefundRequestModel refund = refundRequestRepository.findByIdWithDetails(refundId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy yêu cầu hoàn tiền với ID: " + refundId));

        if (refund.getBooking() == null || refund.getBooking().getCustomer() == null
                || !refund.getBooking().getCustomer().getId().equals(customerId)) {
            throw new NotFoundException("Không tìm thấy yêu cầu hoàn tiền");
        }

        return RefundRequestMapper.toDto(refund);
    }

    @Override
    @Transactional
    public RefundRequestResponseDto updateCustomerRefundBankInfo(Long customerId, Long refundId, UpdateRefundBankInfoDto dto) {
        RefundRequestModel refund = refundRequestRepository.findByIdWithDetails(refundId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy yêu cầu hoàn tiền với ID: " + refundId));

        if (refund.getBooking() == null || refund.getBooking().getCustomer() == null
                || !refund.getBooking().getCustomer().getId().equals(customerId)) {
            throw new NotFoundException("Không tìm thấy yêu cầu hoàn tiền");
        }

        return applyBankInfoUpdateAndTryAutoRefund(refund, dto);
    }

    @Override
    @Transactional
    public RefundRequestResponseDto createCustomerComplaintRefund(Long customerId, CreateRefundComplaintDto dto) {
        BookingModel booking = bookingRepository.findByIdForUpdate(dto.getBookingId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đơn đặt chỗ với ID: " + dto.getBookingId()));

        if (booking.getCustomer() == null || !booking.getCustomer().getId().equals(customerId)) {
            throw new NotFoundException("Không tìm thấy đơn đặt chỗ");
        }

        if (booking.getStatus() != BookingStatus.COMPLETED
                && booking.getStatus() != BookingStatus.CHECKED_IN
                && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Chỉ có thể gửi khiếu nại hoàn tiền cho đơn đặt chỗ đã xác nhận hoặc đã sử dụng (trạng thái hiện tại: " + booking.getStatus() + ")");
        }

        List<RefundRequestModel> existingRefunds = refundRequestRepository.findByBookingId(booking.getId());
        boolean hasActiveRefund = existingRefunds.stream().anyMatch(
                r -> r.getStatus() == RefundStatus.PENDING || r.getStatus() == RefundStatus.PROCESSED || r.getStatus() == RefundStatus.APPROVED
        );
        if (hasActiveRefund) {
            throw new ConflictException("Đơn đặt chỗ #" + booking.getBookingCode() + " đã có yêu cầu hoàn tiền đang xử lý hoặc đã hoàn tất");
        }

        PaymentTransactionModel tx = null;
        if (paymentTransactionRepository != null) {
            tx = BookingRefundAmount.settledTransaction(paymentTransactionRepository.findByBookingId(booking.getId()));
        }
        if (tx == null) {
            throw new BadRequestException("Không tìm thấy giao dịch thanh toán hợp lệ cho đơn đặt chỗ này");
        }

        BigDecimal maxPaid = tx.getReceivedAmount() != null && tx.getReceivedAmount().compareTo(BigDecimal.ZERO) > 0
                ? tx.getReceivedAmount()
                : tx.getAmount();
        BigDecimal requestedAmount = dto.getRequestedAmount() != null && dto.getRequestedAmount().compareTo(BigDecimal.ZERO) > 0
                ? dto.getRequestedAmount()
                : maxPaid;

        if (requestedAmount.compareTo(maxPaid) > 0) {
            throw new BadRequestException("Số tiền khiếu nại yêu cầu hoàn (" + requestedAmount + " đ) không được vượt quá số tiền đã thanh toán (" + maxPaid + " đ)");
        }

        try {
            refundPayouts.reserve(booking);
        } catch (Exception e) {
            log.warn("Could not reserve organizer payout on complaint refund for booking {}: {}", booking.getId(), e.getMessage());
        }

        RefundRequestModel refund = new RefundRequestModel();
        refund.setBooking(booking);
        refund.setPaymentTransaction(tx);
        refund.setRequestedBy(booking.getCustomer());
        refund.setSource(RefundSource.ADMIN_DISPUTE);
        refund.setReason(dto.getReason().trim());
        refund.setRequestedAmount(requestedAmount);
        refund.setStatus(RefundStatus.PENDING);
        refund.setBankName(dto.getBankName().trim());
        refund.setBankBin(dto.getBankBin().trim());
        refund.setBankAccountNumber(dto.getBankAccountNumber().trim());
        refund.setBankAccountName(dto.getBankAccountName().trim().toUpperCase());
        refund.setAdminNote("Khách hàng gửi yêu cầu khiếu nại hoàn tiền sau sử dụng. Đang chờ Quản trị viên thẩm định và giải quyết.");

        RefundRequestModel saved = refundRequestRepository.saveAndFlush(refund);

        if (notificationService != null) {
            notificationService.sendRefundRequestedNotification(saved);
        }

        auditService.log(
                booking.getCustomer(),
                "REFUND",
                "CREATE_COMPLAINT",
                "RefundRequest",
                saved.getId(),
                "Khách hàng tạo khiếu nại yêu cầu hoàn tiền cho đơn #" + booking.getBookingCode() + ": " + dto.getReason()
        );

        return RefundRequestMapper.toDto(saved);
    }

    @Override
    @Transactional
    public RefundRequestModel processPostExpiryAutoRefund(
            BookingModel booking,
            PaymentTransactionModel tx,
            String counterBankId,
            String counterBankName,
            String counterAccountNumber,
            String counterAccountName,
            String reason) {
        if (booking == null || tx == null) {
            return null;
        }

        // Idempotency: nếu giao dịch này đã tạo yêu cầu hoàn tiền rồi thì trả về luôn
        List<RefundRequestModel> existing = refundRequestRepository.findByBookingId(booking.getId());
        if (!existing.isEmpty()) {
            return existing.get(0);
        }

        BigDecimal refundAmount = (tx.getReceivedAmount() != null && tx.getReceivedAmount().compareTo(BigDecimal.ZERO) > 0)
                ? tx.getReceivedAmount()
                : tx.getAmount();

        RefundRequestModel refund = new RefundRequestModel();
        refund.setBooking(booking);
        refund.setPaymentTransaction(tx);
        refund.setRequestedBy(booking.getCustomer());
        refund.setSource(RefundSource.PAYMENT_DISCREPANCY);
        refund.setRequestedAmount(refundAmount);
        refund.setReason(StringUtils.hasText(reason)
                ? reason
                : "Thanh toán sau khi đã hết thời gian giữ chỗ (Hold Expired) — Hệ thống tự động hoàn trả 100%");
        refund.setStatus(RefundStatus.PENDING);

        String resolvedBin = RefundRequestMapper.resolveSupportedBankBin(counterBankId, counterBankName);
        String resolvedBankName = RefundRequestMapper.resolveBankDisplayName(resolvedBin != null ? resolvedBin : counterBankId, counterBankName);
        boolean isSupportedBank = RefundRequestMapper.isPayOSAutoRefundSupportedBank(resolvedBin, resolvedBankName);
        String cleanAccountNum = StringUtils.hasText(counterAccountNumber) ? counterAccountNumber.trim() : null;
        boolean hasValidUnmaskedAccount = StringUtils.hasText(cleanAccountNum) && !cleanAccountNum.contains("*");

        if (isSupportedBank && hasValidUnmaskedAccount) {
            refund.setBankBin(resolvedBin);
            refund.setBankName(resolvedBankName);
            refund.setBankAccountNumber(cleanAccountNum);
            String holderName = StringUtils.hasText(counterAccountName)
                    ? counterAccountName.trim().toUpperCase()
                    : (booking.getCustomer() != null && StringUtils.hasText(booking.getCustomer().getFullName())
                        ? booking.getCustomer().getFullName().toUpperCase()
                        : "KHACH HANG");
            refund.setBankAccountName(holderName);

            RefundRequestModel savedInitial = refundRequestRepository.saveAndFlush(refund);
            boolean autoDisbursed = tryExecuteAutoPayout(savedInitial, "Tự động hoàn tiền 100% về tài khoản chuyển khoản gốc do thanh toán sau khi hết thời gian giữ chỗ");

            RefundRequestModel finalSaved = refundRequestRepository.saveAndFlush(savedInitial);
            if (notificationService != null) {
                if (autoDisbursed) {
                    notificationService.sendRefundCompletedNotification(finalSaved);
                } else {
                    notificationService.sendRefundRequestedNotification(finalSaved);
                }
            }
            return finalSaved;
        } else {
            // Ngân hàng không được PayOS hỗ trợ hoàn tự động (không phải MB Bank, ACB, KienlongBank) hoặc thiếu STK
            String detectedBankInfo = StringUtils.hasText(resolvedBankName)
                    ? resolvedBankName
                    : (StringUtils.hasText(counterBankName) ? counterBankName : counterBankId);
            if (StringUtils.hasText(detectedBankInfo)) {
                refund.setAdminNote("Ngân hàng chuyển khoản gốc (" + detectedBankInfo + ") không nằm trong danh sách PayOS hỗ trợ hoàn tự động (MB Bank, ACB, KienlongBank) hoặc thiếu số tài khoản. Đang chờ khách hàng điền tài khoản nhận tiền hoàn.");
            } else {
                refund.setAdminNote("Thanh toán sau khi hết thời gian giữ chỗ. Đang chờ khách hàng điền thông tin tài khoản ngân hàng (hỗ trợ hoàn tự động qua MB Bank, ACB, KienlongBank) để hoàn trả 100%.");
            }

            RefundRequestModel saved = refundRequestRepository.saveAndFlush(refund);
            if (notificationService != null) {
                notificationService.sendAutoRefundBankInfoRequiredNotification(saved, detectedBankInfo);
            }
            return saved;
        }
    }

    private RefundRequestResponseDto applyBankInfoUpdateAndTryAutoRefund(RefundRequestModel refund, UpdateRefundBankInfoDto dto) {
        if (refund.getStatus() != RefundStatus.PENDING) {
            throw new ConflictException("Không thể cập nhật thông tin tài khoản vì yêu cầu hoàn tiền đã được xử lý (" + refund.getStatus() + ")");
        }

        refund.setBankName(dto.getBankName().trim());
        refund.setBankBin(dto.getBankBin().trim());
        refund.setBankAccountNumber(dto.getBankAccountNumber().trim());
        refund.setBankAccountName(dto.getBankAccountName().trim().toUpperCase());

        boolean autoDisbursed = false;
        if (refund.getSource() == RefundSource.PAYMENT_DISCREPANCY
                && RefundRequestMapper.isPayOSAutoRefundSupportedBank(refund.getBankBin(), refund.getBankName())) {
            autoDisbursed = tryExecuteAutoPayout(
                    refund,
                    "Hệ thống tự động hoàn tiền 100% qua PayOS sau khi khách hàng cập nhật tài khoản nhận hoàn"
            );
        } else {
            refund.setAdminNote("Khách hàng đã cập nhật thông tin tài khoản nhận hoàn tiền ("
                    + refund.getBankName() + " - " + refund.getBankAccountNumber() + ") lúc "
                    + LocalDateTime.now().format(TIME_FMT) + ". Đang chờ duyệt lệnh chi.");
        }

        RefundRequestModel saved = refundRequestRepository.save(refund);

        if (notificationService != null) {
            if (autoDisbursed) {
                notificationService.sendRefundCompletedNotification(saved);
            } else {
                notificationService.sendRefundBankInfoUpdatedNotification(saved);
            }
        }

        return RefundRequestMapper.toDto(saved);
    }

    private boolean tryExecuteAutoPayout(RefundRequestModel refund, String notePrefix) {
        if (!StringUtils.hasText(refund.getBankBin()) || !StringUtils.hasText(refund.getBankAccountNumber())) {
            return false;
        }

        BigDecimal amount = refund.getRequestedAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }

        Long refundIdPart = refund.getId() != null ? refund.getId() : 0L;
        Long bookingIdPart = (refund.getBooking() != null && refund.getBooking().getId() != null)
                ? refund.getBooking().getId()
                : 0L;
        String refId = "AUTORF" + refundIdPart + "_" + (System.currentTimeMillis() % 1000000);
        String desc = sanitizeDescription("NX AUTOREFUND " + bookingIdPart);
        LocalDateTime now = LocalDateTime.now();

        if ("mock-client-id".equals(clientId) || !StringUtils.hasText(clientId) || payOS == null) {
            log.info("Simulating automatic PayOS payout for post-expiry refundId={}", refund.getId());
            refund.setRefundReference("PAYOS_AUTO_" + System.currentTimeMillis());
            refund.setApprovedAmount(amount);
            refund.setStatus(RefundStatus.PROCESSED);
            refund.setReviewedAt(now);
            refund.setProcessedAt(now);
            refund.setAdminNote(notePrefix + " (" + refund.getBankName() + " - STK " + refund.getBankAccountNumber()
                    + ") lúc " + now.format(TIME_FMT) + ".");
            return true;
        }

        try {
            if (payOS.payouts() == null) {
                return false;
            }
            log.info("Executing automatic PayOS Payout for post-expiry refundId={}, amount={}, toBin={}, toAccount={}",
                    refund.getId(), amount.longValue(), refund.getBankBin(), refund.getBankAccountNumber());

            PayoutRequests payoutReq = PayoutRequests.builder()
                    .referenceId(refId)
                    .amount(amount.longValue())
                    .description(desc)
                    .toBin(refund.getBankBin().trim())
                    .toAccountNumber(refund.getBankAccountNumber().trim())
                    .build();

            Payout payout = payOS.payouts().create(payoutReq);
            String payoutRef = (payout != null && StringUtils.hasText(payout.getId()))
                    ? payout.getId()
                    : (payout != null && StringUtils.hasText(payout.getReferenceId()) ? payout.getReferenceId() : refId);

            refund.setRefundReference(payoutRef);
            refund.setApprovedAmount(amount);
            refund.setStatus(RefundStatus.PROCESSED);
            refund.setReviewedAt(now);
            refund.setProcessedAt(now);
            refund.setAdminNote(notePrefix + " qua PayOS Payout (Mã GD: " + payoutRef + " • "
                    + refund.getBankName() + " - STK " + refund.getBankAccountNumber() + ") lúc " + now.format(TIME_FMT) + ".");

            auditService.log(
                    refund.getBooking() != null ? refund.getBooking().getCustomer() : null,
                    AuditActorType.SYSTEM,
                    "REFUND",
                    "AUTO_REFUND_PROCESSED",
                    "RefundRequest",
                    refund.getId(),
                    RefundStatus.PENDING.name(),
                    RefundStatus.PROCESSED.name(),
                    refund.getAdminNote(),
                    null
            );
            return true;
        } catch (Exception e) {
            log.warn("Automatic PayOS Payout did not complete immediately for refundId={}: {}. Keeping in PENDING for review.",
                    refund.getId(), e.getMessage());
            refund.setAdminNote("Đã ghi nhận tài khoản nhận hoàn (" + refund.getBankName() + " - STK " + refund.getBankAccountNumber()
                    + "). Cổng PayOS phản hồi khi chi tự động: " + e.getMessage() + ". Đang chờ xử lý hoàn tất.");
            return false;
        }
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
