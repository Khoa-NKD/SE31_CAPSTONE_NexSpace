package base.api.feature.payment.service.impl;

import base.api.feature.governance.repository.IPlatformSettingRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.notification.service.INotificationService;
import base.api.feature.payment.dto.response.BookingHoldResponseDTO;
import base.api.feature.payment.dto.response.CustomerBookingItemResponseDTO;
import base.api.feature.payment.dto.response.ExchangeRateResponseDTO;
import base.api.feature.payment.dto.response.PaymentCheckoutResponseDTO;
import base.api.feature.payment.dto.response.PaymentStatusResponseDTO;
import base.api.feature.payment.dto.response.PaymentTransactionResponseDTO;
import base.api.feature.payment.mapper.PaymentTransactionMapper;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.feature.payment.repository.IRefundRequestRepository;
import base.api.feature.payment.service.IPaymentService;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.governance.PlatformSettingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.entity.payment.RefundRequestModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.BookingSource;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.enums.PriceType;
import base.api.shared.enums.ReconciliationStatus;
import base.api.shared.enums.RefundStatus;
import base.api.shared.enums.UserStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements IPaymentService {

    private final IBookingRepository bookingRepository;
    private final IPaymentTransactionRepository paymentTransactionRepository;
    private final IUserRepository userRepository;
    private final IWorkspaceRepository workspaceRepository;
    private final IOrganizerProfileRepository organizerProfiles;
    private final IBookableResourceRepository bookableResourceRepository;
    private final IPlatformSettingRepository platformSettingRepository;
    private final IRefundRequestRepository refundRequestRepository;
    private final PayOS payOS;
    private final INotificationService notificationService;

    @Value("${nexspace.payment.usd-to-vnd-rate:25450}")
    private long usdToVndRate;

    private static final int DEFAULT_HOLD_MINUTES = 10;

    @Value("${nexspace.payos.return-url:http://localhost:5173/workspaces/confirmation}")
    private String returnUrl;

    @Value("${nexspace.payos.cancel-url:http://localhost:5173/workspaces/review}")
    private String cancelUrl;

    private static final Map<String, String> BANK_BIN_NAMES = Map.of(
            "970422", "MBBank (Ngân hàng Quân Đội)",
            "970436", "Vietcombank (Ngoại thương Việt Nam)",
            "970407", "Techcombank (Kỹ thương Việt Nam)",
            "970415", "VietinBank (Công thương Việt Nam)",
            "970418", "BIDV (Đầu tư và Phát triển)",
            "970432", "VPBank (Việt Nam Thịnh Vượng)",
            "970423", "TPBank (Tiên Phong)",
            "970405", "Agribank (Nông nghiệp & PTNT)",
            "970448", "OCB (Phương Đông)",
            "970454", "VietCapitalBank (Bản Việt)"
    );

    @Override
    @Transactional(readOnly = true)
    public ExchangeRateResponseDTO getExchangeRate() {
        return ExchangeRateResponseDTO.builder()
                .baseCurrency("USD")
                .targetCurrency("VND")
                .exchangeRate(BigDecimal.valueOf(usdToVndRate))
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Override
    @Transactional
    public PaymentCheckoutResponseDTO createPaymentForBooking(Long bookingId, Long actorId) {
        BookingModel booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new NotFoundException("Đơn đặt chỗ không tồn tại với ID: " + bookingId));

        // Strict Ownership Defense
        if (actorId != null && booking.getCustomer() != null && !booking.getCustomer().getId().equals(actorId)) {
            log.warn("Actor {} attempted to pay for booking {} owned by customer {}",
                    actorId, bookingId, booking.getCustomer().getId());
            throw new NotFoundException("Đơn đặt chỗ không tồn tại với ID: " + bookingId);
        }

        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new ConflictException(String.format(
                    "Đơn đặt chỗ %s đang ở trạng thái %s, không thể tạo phiên thanh toán",
                    booking.getBookingCode(), booking.getStatus()));
        }

        LocalDateTime now = LocalDateTime.now();
        if (booking.getHoldExpiresAt() != null && booking.getHoldExpiresAt().isBefore(now)) {
            throw new ConflictException("Đơn đặt chỗ đã hết thời hạn giữ chỗ 10 phút. Vui lòng tạo đặt chỗ mới.");
        }

        // Phòng vệ đa tầng: Kiểm tra xem tài nguyên này có bị đơn khác CONFIRMED trong cùng khung giờ chưa
        if (booking.getResource() != null) {
            List<BookingModel> confirmedOverlaps = bookingRepository.findOverlappingBookingsForUpdate(
                    List.of(booking.getResource().getId()),
                    List.of(BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN),
                    BookingStatus.CONFIRMED,
                    now,
                    booking.getStartTime(),
                    booking.getEndTime(),
                    booking.getId()
            );
            if (!confirmedOverlaps.isEmpty()) {
                throw new ConflictException("Vị trí này đã được khách hàng khác hoàn tất thanh toán trước đó. Vui lòng chọn vị trí khác.");
            }
        }

        // Calculate amount in VND
        BigDecimal finalPrice = booking.getFinalPrice();
        if (finalPrice == null || finalPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Giá trị đơn đặt chỗ không hợp lệ");
        }

        BigDecimal amountVnd = base.api.feature.payment.service.BookingPaymentAmount.inVnd(booking, usdToVndRate);

        // Generate unique orderCode for PayOS (must be positive integer <= 9007199254740991)
        long orderCode = generateOrderCode();

        // Expire time for booking hold and PayOS link
        // Reuse the booking's existing holdExpiresAt if still valid so the hold duration is not falsely extended
        LocalDateTime expiresAt = booking.getHoldExpiresAt();
        if (expiresAt == null || expiresAt.isBefore(now)) {
            expiresAt = now.plusMinutes(getEffectiveHoldMinutes());
            booking.setHoldExpiresAt(expiresAt);
            bookingRepository.save(booking);
        }

        // Calculate epoch seconds for PayOS link expiration (cho phép link PayOS mở rộng tối thiểu 24h hoặc đến giờ bắt đầu booking)
        long nowEpochSeconds = System.currentTimeMillis() / 1000;
        long payosExpiredAt = nowEpochSeconds + 86400;
        if (booking.getStartTime() != null) {
            long bookingStartEpoch = booking.getStartTime().atZone(java.time.ZoneId.systemDefault()).toEpochSecond();
            if (bookingStartEpoch > nowEpochSeconds + 60) {
                payosExpiredAt = Math.max(payosExpiredAt, bookingStartEpoch);
            }
        }

        // Sanitize transfer description (up to 25 chars, alphanumeric only)
        String description = sanitizeDescription("NX" + booking.getId() + " " + (orderCode % 10000));

        CreatePaymentLinkRequest paymentRequest = CreatePaymentLinkRequest.builder()
                .orderCode(orderCode)
                .amount(amountVnd.longValue())
                .description(description)
                .cancelUrl(cancelUrl)
                .returnUrl(returnUrl)
                .buyerName(booking.getCustomer() != null && StringUtils.hasText(booking.getCustomer().getFullName())
                        ? booking.getCustomer().getFullName() : "Khach hang NexSpace")
                .buyerEmail(booking.getCustomer() != null ? booking.getCustomer().getEmail() : null)
                .expiredAt(payosExpiredAt)
                .build();

        CreatePaymentLinkResponse payosResponse;
        try {
            log.info("Requesting PayOS payment link for bookingId={}, orderCode={}, amountVnd={}",
                    booking.getId(), orderCode, amountVnd);
            payosResponse = payOS.paymentRequests().create(paymentRequest);
        } catch (Exception e) {
            log.error("Failed to create PayOS payment link for bookingId {}: {}", bookingId, e.getMessage(), e);
            throw new BadRequestException("Cổng thanh toán PayOS báo lỗi: " + e.getMessage());
        }

        // Persist transaction record
        PaymentTransactionModel transaction = new PaymentTransactionModel();
        transaction.setBooking(booking);
        transaction.setOrderCode(orderCode);
        transaction.setAmount(amountVnd);
        transaction.setStatus(PaymentStatus.PENDING);
        transaction.setReconciliationStatus(ReconciliationStatus.UNRECONCILED);
        transaction.setCheckoutUrl(payosResponse.getCheckoutUrl());
        transaction.setExpiresAt(expiresAt);

        paymentTransactionRepository.save(transaction);

        String bankBin = payosResponse.getBin();
        String bankName = resolveBankName(bankBin);

        return PaymentCheckoutResponseDTO.builder()
                .orderCode(orderCode)
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .amount(amountVnd)
                .currency("VND")
                .qrCode(payosResponse.getQrCode())
                .bankBin(bankBin)
                .bankName(bankName)
                .accountNumber(payosResponse.getAccountNumber())
                .accountName(payosResponse.getAccountName())
                .description(payosResponse.getDescription())
                .expiresAt(expiresAt)
                .checkoutUrl(payosResponse.getCheckoutUrl())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentStatusResponseDTO getPaymentStatus(Long bookingId, Long actorId) {
        BookingModel booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Đơn đặt chỗ không tồn tại với ID: " + bookingId));

        if (actorId != null && booking.getCustomer() != null && !booking.getCustomer().getId().equals(actorId)) {
            throw new NotFoundException("Đơn đặt chỗ không tồn tại với ID: " + bookingId);
        }

        var latestTx = paymentTransactionRepository.findTopByBookingIdOrderByCreatedAtDesc(bookingId);

        Long orderCode = latestTx.map(PaymentTransactionModel::getOrderCode).orElse(null);
        PaymentStatus paymentStatus = latestTx.map(PaymentTransactionModel::getStatus).orElse(PaymentStatus.PENDING);
        LocalDateTime paidAt = latestTx.map(PaymentTransactionModel::getPaidAt).orElse(null);

        // Derive temporary 4-digit PIN for access if confirmed
        String pinCode = null;
        if (booking.getStatus() == BookingStatus.CONFIRMED && StringUtils.hasText(booking.getBookingCode())) {
            int hash = Math.abs(booking.getBookingCode().hashCode());
            pinCode = String.format("%04d", hash % 10000);
        }

        return PaymentStatusResponseDTO.builder()
                .orderCode(orderCode)
                .bookingId(booking.getId())
                .paymentStatus(paymentStatus)
                .bookingStatus(booking.getStatus())
                .paidAt(paidAt)
                .qrTokenHash(booking.getQrTokenHash())
                .pinCode(pinCode)
                .build();
    }

    @Override
    @Transactional
    public void cancelPayment(Long orderCode, Long actorId, String reason) {
        PaymentTransactionModel tx = paymentTransactionRepository.findByOrderCodeForUpdate(orderCode)
                .orElseThrow(() -> new NotFoundException("Giao dịch thanh toán không tồn tại"));

        BookingModel booking = tx.getBooking();
        if (booking != null && actorId != null && booking.getCustomer() != null
                && !booking.getCustomer().getId().equals(actorId)) {
            throw new NotFoundException("Giao dịch thanh toán không tồn tại");
        }

        if (tx.getStatus() == PaymentStatus.PENDING) {
            tx.setStatus(PaymentStatus.CANCELLED);
            tx.setFailureReason(StringUtils.hasText(reason) ? reason : "Người dùng chủ động hủy giữ chỗ");
            paymentTransactionRepository.save(tx);

            // Gửi thông báo thanh toán bị hủy / thất bại (In-app + Email)
            notificationService.sendPaymentFailedNotification(tx, booking, tx.getFailureReason());

            try {
                payOS.paymentRequests().cancel(orderCode, "Customer cancelled booking checkout");
            } catch (Exception e) {
                log.warn("Could not cancel payment link on PayOS for orderCode {}: {}", orderCode, e.getMessage());
            }

            if (booking != null && (booking.getStatus() == BookingStatus.PENDING_PAYMENT || booking.getStatus() == BookingStatus.PENDING_APPROVAL)) {
                booking.setStatus(BookingStatus.CANCELLED);
                booking.setCancelledAt(LocalDateTime.now());
                booking.setCancelReason(StringUtils.hasText(reason) ? reason : "Người dùng chủ động hủy giữ chỗ");
                booking.setHoldExpiresAt(null);
                bookingRepository.save(booking);
            }
        }
    }

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "createdAt", "amount", "status", "reconciliationStatus", "paidAt"
    );

    @Override
    @Transactional(readOnly = true)
    public Page<PaymentTransactionResponseDTO> getCustomerPaymentHistory(Long actorId, PaymentStatus status, PageRequestDTO pageRequest) {
        Pageable pageable = pageRequest.toPageable("createdAt", Sort.Direction.DESC, ALLOWED_SORT_FIELDS);
        Page<PaymentTransactionModel> page = paymentTransactionRepository.findByCustomerIdAndStatus(actorId, status, pageable);
        return page.map(PaymentTransactionMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PaymentTransactionResponseDTO> getOrganizerPaymentHistory(Long workspaceId, Long actorId, PaymentStatus status, PageRequestDTO pageRequest) {
        Pageable pageable = pageRequest.toPageable("createdAt", Sort.Direction.DESC, ALLOWED_SORT_FIELDS);
        Page<PaymentTransactionModel> page = paymentTransactionRepository.findByWorkspaceIdAndOrganizerId(workspaceId, actorId, status, pageable);
        return page.map(PaymentTransactionMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PaymentTransactionResponseDTO> getAdminPaymentHistory(PaymentStatus status, ReconciliationStatus reconciliationStatus, PageRequestDTO pageRequest) {
        Pageable pageable = pageRequest.toPageable("createdAt", Sort.Direction.DESC, ALLOWED_SORT_FIELDS);
        Page<PaymentTransactionModel> page = paymentTransactionRepository.findAllWithFilters(status, reconciliationStatus, pageable);
        return page.map(PaymentTransactionMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentTransactionResponseDTO getTransactionDetail(Long orderCode) {
        PaymentTransactionModel tx = paymentTransactionRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy giao dịch với orderCode=" + orderCode));
        return PaymentTransactionMapper.toDto(tx);
    }

    private void requireOrganizerAcceptingHolds(WorkspaceModel workspace) {
        if (workspace != null && workspace.getOrganizer() != null
                && organizerProfiles.findByOrganizerIdForBooking(workspace.getOrganizer().getId())
                        .filter(profile -> profile.isSuspended()).isPresent()) {
            throw new base.api.shared.exception.BadRequestException("Không gian làm việc đang tạm ngưng nhận đặt chỗ mới");
        }
    }

    private long generateOrderCode() {
        long timestamp = System.currentTimeMillis() % 1_000_000_000L;
        long randomSuffix = ThreadLocalRandom.current().nextLong(1000L, 9999L);
        return timestamp * 10_000L + randomSuffix;
    }

    private String sanitizeDescription(String input) {
        if (!StringUtils.hasText(input)) {
            return "NEXSPACE";
        }
        String clean = input.replaceAll("[^a-zA-Z0-9 ]", "").trim();
        return clean.length() > 25 ? clean.substring(0, 25) : clean;
    }

    @Override
    @Transactional
    public Long getOrCreatePendingBookingId(Long actorId) {
        return getOrCreatePendingBookingHold(actorId).getBookingId();
    }

    private LocalDateTime calculateEffectiveUnpaidSince(UserModel customer, LocalDateTime now) {
        LocalDateTime windowStart = now.minusHours(24);
        if (customer == null || customer.getId() == null) {
            return windowStart;
        }

        LocalDateTime effectiveSince = windowStart;

        // 1. Trường hợp người dùng từng bị phạt: Sau khi hết 20 phút phạt, các vi phạm hold cũ được reset về 3
        if (customer.getBookingSuspendedUntil() != null && now.isAfter(customer.getBookingSuspendedUntil())) {
            if (customer.getBookingSuspendedUntil().isAfter(effectiveSince)) {
                effectiveSince = customer.getBookingSuspendedUntil();
            }
        }

        // 2. Kiểm tra nếu có >= spamThreshold vi phạm và vi phạm gần nhất đã cách đây >= spamBlockMinutes (hết hạn phạt 20p)
        int spamThreshold = platformSettingRepository.findById("booking.spam_hold_threshold")
                .or(() -> platformSettingRepository.findById("booking_spam_hold_threshold"))
                .map(PlatformSettingModel::getSettingValue)
                .map(val -> {
                    try { return Integer.parseInt(val.trim()); } catch (Exception e) { return 3; }
                }).orElse(3);

        int spamBlockMinutes = platformSettingRepository.findById("booking.spam_hold_block_minutes")
                .or(() -> platformSettingRepository.findById("booking_spam_hold_block_minutes"))
                .map(PlatformSettingModel::getSettingValue)
                .map(val -> {
                    try { return Integer.parseInt(val.trim()); } catch (Exception e) { return 20; }
                }).orElse(20);

        List<BookingModel> recentUnpaids = bookingRepository.findRecentUnpaidHolds(customer.getId(), effectiveSince);
        if (recentUnpaids.size() >= spamThreshold) {
            BookingModel latestUnpaid = recentUnpaids.get(0);
            LocalDateTime latestUnpaidTime = latestUnpaid.getUpdatedAt() != null
                    ? latestUnpaid.getUpdatedAt()
                    : latestUnpaid.getCreatedAt();
            if (latestUnpaidTime != null) {
                LocalDateTime penaltyEnd = latestUnpaidTime.plusMinutes(spamBlockMinutes);
                if (now.isAfter(penaltyEnd) && penaltyEnd.isAfter(effectiveSince)) {
                    effectiveSince = penaltyEnd;
                }
            }
        }

        // 3. Sau khi thanh toán thành công, số lần hold/hủy trước đó được reset
        Optional<LocalDateTime> lastSuccessTime = bookingRepository.findLatestSuccessfulBookingCreatedAt(customer.getId());
        if (lastSuccessTime.isPresent() && lastSuccessTime.get().isAfter(effectiveSince)) {
            effectiveSince = lastSuccessTime.get();
        }

        return effectiveSince;
    }

    @Override
    @Transactional
    public BookingHoldResponseDTO getOrCreatePendingBookingHold(Long actorId) {
        UserModel customer = userRepository.findById(actorId)
                .orElseThrow(() -> new NotFoundException("Người dùng không tồn tại"));

        LocalDateTime now = LocalDateTime.now();

        // Kiểm tra xem khách hàng đã có đơn đặt chỗ nào đang chờ thanh toán hay chưa (chỉ lấy phiên còn hạn)
        List<BookingModel> pendings = bookingRepository.findByCustomerIdAndStatus(actorId, BookingStatus.PENDING_PAYMENT);
        BookingModel booking = pendings.stream()
                .filter(b -> b.getHoldExpiresAt() == null || b.getHoldExpiresAt().isAfter(now))
                .findFirst()
                .orElse(null);

        LocalDateTime holdExpiresAt = booking != null ? booking.getHoldExpiresAt() : null;
        long remainingSeconds = holdExpiresAt != null
                ? Math.max(0, java.time.Duration.between(now, holdExpiresAt).getSeconds())
                : 0L;

        String seatCode = (booking != null && booking.getResource() != null && booking.getResource().getName() != null)
                ? booking.getResource().getName()
                : null;
        String resourceName = (booking != null && booking.getResource() != null) ? booking.getResource().getName() : null;
        String workspaceName = (booking != null && booking.getWorkspace() != null) ? booking.getWorkspace().getName() : null;

        int spamThreshold = platformSettingRepository.findById("booking.spam_hold_threshold")
                .or(() -> platformSettingRepository.findById("booking_spam_hold_threshold"))
                .map(PlatformSettingModel::getSettingValue)
                .map(val -> {
                    try { return Integer.parseInt(val.trim()); } catch (Exception e) { return 3; }
                }).orElse(3);

        int spamBlockMinutes = platformSettingRepository.findById("booking.spam_hold_block_minutes")
                .or(() -> platformSettingRepository.findById("booking_spam_hold_block_minutes"))
                .map(PlatformSettingModel::getSettingValue)
                .map(val -> {
                    try { return Integer.parseInt(val.trim()); } catch (Exception e) { return 20; }
                }).orElse(20);

        int remainingAttempts = spamThreshold;
        boolean isSuspended = false;
        LocalDateTime suspendedUntil = null;

        if (customer.getId() != null) {
            if (customer.getBookingSuspendedUntil() != null && now.isBefore(customer.getBookingSuspendedUntil())) {
                isSuspended = true;
                suspendedUntil = customer.getBookingSuspendedUntil();
            }

            LocalDateTime effectiveSince = calculateEffectiveUnpaidSince(customer, now);
            int unpaidCount = bookingRepository.findRecentUnpaidHolds(customer.getId(), effectiveSince).size();
            remainingAttempts = Math.max(0, spamThreshold - unpaidCount);

            if (unpaidCount >= spamThreshold) {
                BookingModel latestUnpaid = bookingRepository.findRecentUnpaidHolds(customer.getId(), effectiveSince).get(0);
                LocalDateTime latestTime = latestUnpaid.getUpdatedAt() != null ? latestUnpaid.getUpdatedAt() : latestUnpaid.getCreatedAt();
                if (latestTime == null) latestTime = now;
                LocalDateTime blockUntil = latestTime.plusMinutes(spamBlockMinutes);

                if (now.isBefore(blockUntil)) {
                    isSuspended = true;
                    suspendedUntil = blockUntil;
                    if (customer.getBookingSuspendedUntil() == null || !blockUntil.isEqual(customer.getBookingSuspendedUntil())) {
                        customer.setBookingSuspendedUntil(blockUntil);
                        userRepository.save(customer);
                    }
                }
            }
        }

        return BookingHoldResponseDTO.builder()
                .bookingId(booking != null ? booking.getId() : null)
                .bookingCode(booking != null ? booking.getBookingCode() : null)
                .workspaceId(booking != null && booking.getWorkspace() != null ? booking.getWorkspace().getId() : null)
                .resourceId(booking != null && booking.getResource() != null ? booking.getResource().getId() : null)
                .seatCode(seatCode)
                .resourceName(resourceName)
                .workspaceName(workspaceName)
                .holdExpiresAt(holdExpiresAt)
                .serverTime(now)
                .remainingSeconds(remainingSeconds)
                .holdDurationMinutes(getEffectiveHoldMinutes())
                .remainingHoldAttempts(remainingAttempts)
                .maxHoldAttempts(spamThreshold)
                .penaltyBlockMinutes(spamBlockMinutes)
                .isBookingSuspended(isSuspended)
                .bookingSuspendedUntil(suspendedUntil)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CustomerBookingItemResponseDTO> getCustomerBookings(
            Long customerId,
            BookingStatus status,
            PageRequestDTO pageRequest) {
        Pageable pageable = pageRequest != null
                ? pageRequest.toPageable("createdAt", Sort.Direction.DESC, Set.of("createdAt", "startTime", "status", "finalPrice"))
                : org.springframework.data.domain.PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<BookingModel> bookings = bookingRepository.findCustomerBookingsWithDetails(customerId, status, pageable);
        List<Long> bookingIds = bookings.getContent().stream().map(BookingModel::getId).toList();
        Map<Long, RefundRequestModel> refundMap = bookingIds.isEmpty() ? Map.of() :
                refundRequestRepository.findByBookingIdIn(bookingIds).stream()
                        .collect(java.util.stream.Collectors.toMap(
                                r -> r.getBooking().getId(),
                                r -> r,
                                (existing, replacement) -> (replacement.getCreatedAt() != null && existing.getCreatedAt() != null && replacement.getCreatedAt().isAfter(existing.getCreatedAt())) ? replacement : existing
                        ));
        return bookings.map(b -> mapToCustomerBookingItem(b, refundMap.get(b.getId())));
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerBookingItemResponseDTO getBookingConfirmationDetail(Long bookingId, Long actorId) {
        BookingModel booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Đơn đặt chỗ không tồn tại với ID: " + bookingId));

        if (actorId != null && booking.getCustomer() != null && !booking.getCustomer().getId().equals(actorId)) {
            throw new NotFoundException("Đơn đặt chỗ không tồn tại với ID: " + bookingId);
        }

        RefundRequestModel refund = refundRequestRepository.findTopByBookingIdOrderByCreatedAtDesc(bookingId).orElse(null);
        return mapToCustomerBookingItem(booking, refund);
    }

    private CustomerBookingItemResponseDTO mapToCustomerBookingItem(BookingModel booking, RefundRequestModel refund) {
        String pinCode = null;
        if (booking.getStatus() == BookingStatus.CONFIRMED && StringUtils.hasText(booking.getBookingCode())) {
            int hash = Math.abs(booking.getBookingCode().hashCode());
            pinCode = String.format("%04d", hash % 10000);
        }

        String seatCode = (booking.getResource() != null && booking.getResource().getName() != null)
                ? booking.getResource().getName()
                : "Desk A-12";
        String resourceName = (booking.getResource() != null) ? booking.getResource().getName() : "Hot Desk";
        String workspaceName = (booking.getWorkspace() != null) ? booking.getWorkspace().getName() : "NexSpace Central Tower";
        String workspaceAddress = (booking.getWorkspace() != null && booking.getWorkspace().getAddress() != null)
                ? booking.getWorkspace().getAddress()
                : "72 Le Thanh Ton, District 1, Ho Chi Minh City";

        Long workspaceId = booking.getWorkspace() != null ? booking.getWorkspace().getId() : null;
        Long resourceId = booking.getResource() != null ? booking.getResource().getId() : null;
        Long floorId = (booking.getResource() != null && booking.getResource().getFloorPlan() != null)
                ? booking.getResource().getFloorPlan().getId()
                : null;

        RefundStatus refundStatus = refund != null ? refund.getStatus() : null;
        BigDecimal refundAmount = refund != null
                ? (refund.getApprovedAmount() != null ? refund.getApprovedAmount() : refund.getRequestedAmount())
                : null;
        String refundRef = refund != null ? refund.getRefundReference() : null;
        String refundBankName = refund != null ? refund.getBankName() : null;
        String refundAcc = refund != null ? refund.getBankAccountNumber() : null;
        LocalDateTime refundProcessedAt = refund != null ? refund.getProcessedAt() : null;

        return CustomerBookingItemResponseDTO.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .workspaceId(workspaceId)
                .resourceId(resourceId)
                .floorId(floorId)
                .workspaceName(workspaceName)
                .workspaceAddress(workspaceAddress)
                .seatCode(seatCode)
                .resourceName(resourceName)
                .status(booking.getStatus())
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .totalAmount(booking.getFinalPrice())
                .qrTokenHash(booking.getQrTokenHash())
                .pinCode(pinCode)
                .createdAt(booking.getCreatedAt())
                .refundStatus(refundStatus)
                .refundAmount(refundAmount)
                .refundReference(refundRef)
                .refundBankName(refundBankName)
                .refundAccountNumber(refundAcc)
                .refundProcessedAt(refundProcessedAt)
                .build();
    }

    private String resolveBankName(String bin) {
        if (!StringUtils.hasText(bin)) {
            return "Ngân hàng liên kết VietQR";
        }
        return BANK_BIN_NAMES.getOrDefault(bin, "Ngân hàng liên kết VietQR (" + bin + ")");
    }

    private int getEffectiveHoldMinutes() {
        return platformSettingRepository.findById("booking.hold_ttl_minutes")
                .or(() -> platformSettingRepository.findById("booking_hold_minutes"))
                .map(PlatformSettingModel::getSettingValue)
                .map(val -> {
                    try {
                        return Integer.parseInt(val.trim());
                    } catch (Exception e) {
                        return DEFAULT_HOLD_MINUTES;
                    }
                })
                .orElse(DEFAULT_HOLD_MINUTES);
    }
}

