package base.api.feature.booking.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.dto.request.HoldResourceRequestDto;
import base.api.feature.booking.dto.response.HoldResourceResponseDto;
import base.api.feature.booking.dto.response.PriceCalculationResponseDto;
import base.api.feature.booking.event.ResourceHoldExpiredEvent;
import base.api.feature.booking.event.ResourceHoldReleasedEvent;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.booking.service.IResourceHoldService;
import base.api.feature.notification.service.INotificationService;
import base.api.feature.governance.repository.IPlatformSettingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.feature.pricing.repository.IPricingRuleRepository;
import base.api.feature.resource.dto.LockedResourceContext;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.service.IResourceLockService;
import base.api.feature.resource.service.IResourceStateSyncService;
import base.api.feature.workspace.repository.IWorkspaceCancellationRuleRepository;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.governance.PlatformSettingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.entity.pricing.PricingRuleModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.workspace.WorkspaceCancellationRuleModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.entity.workspace.WorkspaceOperatingHourModel;
import base.api.shared.enums.*;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.payos.PayOS;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Triển khai Động cơ Giữ chỗ Tạm thời & Tái sử dụng Idempotent (Temporary Hold Engine & Idempotent Reuse).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResourceHoldServiceImpl implements IResourceHoldService {

    private static final BigDecimal DEFAULT_COMMISSION_PERCENT = BigDecimal.valueOf(10);
    private static final BigDecimal DEFAULT_VAT_PERCENT = BigDecimal.valueOf(8);
    private static final int DEFAULT_HOLD_DURATION_MINUTES = 10;
    private static final int DEFAULT_MAX_ACTIVE_HOLDS = 3;
    private final IUserRepository userRepository;
    private final IBookableResourceRepository resourceRepository;
    private final IBookingRepository bookingRepository;
    private final IResourceLockService resourceLockService;
    private final IWorkspaceOperatingHourRepository operatingHourRepository;
    private final IWorkspaceCancellationRuleRepository cancellationRuleRepository;
    private final IOrganizerProfileRepository organizerProfiles;
    private final IPricingRuleRepository pricingRuleRepository;
    private final IPlatformSettingRepository platformSettingRepository;
    private final IAuditService auditService;
    private final ObjectMapper objectMapper;
    private final IPaymentTransactionRepository paymentTransactionRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final IResourceStateSyncService resourceStateSyncService;
    private final PayOS payOS;
    private final INotificationService notificationService;

    @Value("${app.booking.max-hold-lifetime-minutes:15}")
    private int maxHoldLifetimeMinutes = 15;

    @Value("${app.booking.rehold-cooldown-seconds:30}")
    private int reholdCooldownSeconds = 30;

    @Value("${app.booking.spam-hold.threshold:3}")
    private int spamHoldThreshold = 3;

    @Value("${app.booking.spam-hold.block-duration-minutes:20}")
    private int spamHoldBlockMinutes = 20;

    @Value("${app.booking.spam-hold.window-hours:24}")
    private int spamHoldWindowHours = 24;

    @Override
    @Transactional
    public HoldResourceResponseDto holdResource(Long customerId, HoldResourceRequestDto dto) {
        if (customerId == null) {
            throw new BadRequestException("Mã khách hàng không được để trống");
        }
        if (dto == null) {
            throw new BadRequestException("Thông tin giữ chỗ không được để trống");
        }

        base.api.feature.pricing.service.BookingBaseRates.supported(dto.getPriceType());

        LocalDateTime now = LocalDateTime.now();

        // 1. Thẩm định khách hàng
        UserModel customer = userRepository.findById(customerId)
                .orElseThrow(() -> new NotFoundException("Khách hàng không tồn tại"));

        int effectiveThreshold = getEffectiveSpamHoldThreshold();
        int effectiveBlockMinutes = getEffectiveSpamHoldBlockMinutes();

        if (customer.getBookingSuspendedUntil() != null && now.isBefore(customer.getBookingSuspendedUntil())) {
            long remainingMinutes = Math.max(1, Duration.between(now, customer.getBookingSuspendedUntil()).toMinutes() + 1);
            throw new BadRequestException("Tài khoản của bạn tạm thời bị khóa quyền giữ chỗ trong vòng "
                    + remainingMinutes + " phút (đến " + customer.getBookingSuspendedUntil().format(DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"))
                    + ") do nghi vấn có hành vi spam hold chỗ (đã giữ chỗ quá " + effectiveThreshold + " lần mà không thanh toán).");
        }

        if (customer.getStatus() != UserStatus.ACTIVE) {
            throw new BadRequestException("Tài khoản người dùng hiện đang bị vô hiệu hoá hoặc khoá");
        }

        // 2. Thẩm định khung thời gian giữ chỗ
        LocalDateTime startTime = dto.getStartTime();
        LocalDateTime endTime = dto.getEndTime();
        validateTimeRange(startTime, endTime);

        // 3. Quy tắc Idempotent Active Hold Reuse:
        // Nếu cùng khách hàng yêu cầu giữ cùng tài nguyên trong cùng khung giờ đang còn hiệu lực:
        // Tái sử dụng ngay bản ghi hold đó, không ném 409 Conflict và không tạo bản ghi rác trùng lặp.
        Optional<BookingModel> existingHoldOpt = bookingRepository.findActiveHoldByCustomerAndResource(
                customerId, dto.getResourceId(), startTime, endTime, now);

        if (existingHoldOpt.isPresent()) {
            BookingModel existing = existingHoldOpt.get();
            if (base.api.feature.pricing.service.BookingBaseRates.supported(existing.getPriceType())
                    != base.api.feature.pricing.service.BookingBaseRates.supported(dto.getPriceType()))
                throw new ConflictException("Bạn đang giữ chỗ này bằng loại giá khác. Vui lòng hủy lượt giữ chỗ cũ trước khi đổi loại giá.");
            // Phòng vệ Rolling Hold Attack: Áp trần thời gian giữ chỗ tối đa (Hard Ceiling) tính từ createdAt
            LocalDateTime createdAt = existing.getCreatedAt() != null ? existing.getCreatedAt() : now;
            LocalDateTime maxAllowedExpiry = createdAt.plusMinutes(maxHoldLifetimeMinutes);

            // Nếu sắp hết hạn (dưới 2 phút) và chưa chạm trần tối đa, tự động gia hạn thêm để khách an tâm thanh toán
            if (existing.getHoldExpiresAt() != null && existing.getHoldExpiresAt().isBefore(now.plusMinutes(2))) {
                LocalDateTime candidateExpiry = now.plusMinutes(getEffectiveHoldMinutes());
                LocalDateTime finalExpiry = candidateExpiry.isAfter(maxAllowedExpiry) ? maxAllowedExpiry : candidateExpiry;
                if (finalExpiry.isAfter(existing.getHoldExpiresAt())) {
                    existing.setHoldExpiresAt(finalExpiry);
                    existing = bookingRepository.save(existing);
                    log.info("Idempotent Hold Reuse with capped extension: customerId={}, resourceId={}, bookingCode={}, newExpiry={}",
                            customerId, dto.getResourceId(), existing.getBookingCode(), finalExpiry);
                }
            }
            log.info("Idempotent Hold Reuse: customerId={}, resourceId={}, bookingCode={}",
                    customerId, dto.getResourceId(), existing.getBookingCode());
            return toHoldResponseDto(existing, now, true);
        }

        // 4. Theo dõi hành vi khách hàng: Nếu hold quá 3 lần mà không thanh toán thì khóa 20 phút (chống spam hold)
        validateSpamHoldBehavior(customer, now);

        // 5. Phòng vệ Tấn công Re-Hold Churning / Hoarding Loop:
        // Chặn bot hoặc người dùng xấu liên tục hủy hoặc để hết hạn rồi tạo hold mới ngay lập tức
        if (reholdCooldownSeconds > 0) {
            LocalDateTime cooldownSince = now.minusSeconds(reholdCooldownSeconds);
            boolean isCoolingDown = bookingRepository.existsRecentReleasedOrExpiredHold(
                    customerId, dto.getResourceId(), cooldownSince);
            if (isCoolingDown) {
                throw new BadRequestException("Bạn vừa hủy hoặc để hết hạn phiên giữ chỗ cho chỗ ngồi này. Vui lòng đợi "
                        + reholdCooldownSeconds + " giây trước khi thử giữ chỗ lại.");
            }
        }

        // 5. Giới hạn số Hold Active (Anti-Hoarding / Anti-DoS):
        // Số lượng hold active tối đa điều khiển động từ bảng platform_setting trong database
        long activeHolds = bookingRepository.countActiveHoldsByCustomer(customerId, now);
        int effectiveMaxActiveHolds = getEffectiveMaxActiveHolds();
        if (activeHolds >= effectiveMaxActiveHolds) {
            throw new BadRequestException("Bạn chỉ được giữ tối đa " + effectiveMaxActiveHolds + " chỗ cùng lúc. Vui lòng hoàn tất thanh toán hoặc hủy các chỗ đã giữ trước đó");
        }

        // 6. Khóa bi quan có thứ tự (ORDER BY id ASC) và kiểm tra xung đột hai chiều ROOM - DESK qua IResourceLockService
        LockedResourceContext lockContext = resourceLockService.acquireResourceLock(dto.getResourceId(), startTime, endTime);
        BookableResourceModel resource = lockContext.getTargetResource();

        if (resource.getStatus() != BookableResourceStatus.ACTIVE) {
            throw new BadRequestException("Chỗ ngồi/phòng hiện không ở trạng thái hoạt động");
        }

        if (resource.getFloorPlan() == null || resource.getFloorPlan().getWorkspace() == null) {
            throw new BadRequestException("Chỗ ngồi/phòng không thuộc về không gian làm việc hợp lệ");
        }

        WorkspaceModel workspace = resource.getFloorPlan().getWorkspace();

        if (workspace.getStatus() != WorkspaceStatus.ACTIVE) {
            throw new BadRequestException("Không gian làm việc hiện không ở trạng thái sẵn sàng nhận đặt chỗ");
        }

        // Chặn nếu đối tác (Organizer) đang bị tạm đình chỉ
        if (workspace.getOrganizer() != null && organizerProfiles.findByOrganizerIdForBooking(workspace.getOrganizer().getId())
                .filter(profile -> profile.isSuspended()).isPresent()) {
            throw new BadRequestException("Không gian làm việc đang tạm ngưng nhận đặt chỗ mới");
        }

        if (resource.getResourceType() == null || !resource.getResourceType().isActive()) {
            throw new BadRequestException("Loại chỗ ngồi/phòng này hiện đã ngừng hoạt động");
        }

        // 6. Thẩm định giờ hoạt động của Workspace
        validateOperatingHours(workspace.getId(), startTime, endTime);

        // 7. Tính toán giá và phí nền tảng
        PriceCalculationResponseDto priceCalc = computePrice(workspace, resource, startTime, endTime, dto.getPriceType());

        BigDecimal platformCommissionPercent = getDecimalSetting("payment.platform_commission_percent", DEFAULT_COMMISSION_PERCENT);
        BigDecimal platformFeeAmount = priceCalc.getBaseAmount()
                .multiply(platformCommissionPercent)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        LocalDateTime holdExpiresAt = now.plusMinutes(getEffectiveHoldMinutes());

        // 8. Tạo mã đơn đặt chỗ duy nhất và mã băm QR Token
        String bookingCode = generateUniqueBookingCode();
        String qrTokenHash = generateQrTokenHash(bookingCode, customer.getId());

        // 9. Tạo snapshot giá và chính sách hủy
        String pricingSnapshot = buildPricingSnapshot(priceCalc, resource);
        String cancellationPolicySnapshot = buildCancellationPolicySnapshot(workspace.getId());

        // 10. Xác định trạng thái khởi tạo
        BookingStatus initialStatus = workspace.getBookingConfirmationMode() == BookingConfirmationMode.MANUAL_APPROVAL
                ? BookingStatus.PENDING_APPROVAL
                : BookingStatus.PENDING_PAYMENT;

        // 11. Xây dựng và lưu thực thể BookingModel
        BookingModel booking = new BookingModel();
        booking.setBookingCode(bookingCode);
        booking.setCustomer(customer);
        booking.setWorkspace(workspace);
        booking.setResource(resource);
        booking.setSource(BookingSource.SEARCH);
        booking.setStartTime(startTime);
        booking.setEndTime(endTime);
        booking.setPartySize(dto.getPartySize() > 0 ? dto.getPartySize() : 1);
        booking.setPriceType(dto.getPriceType() != null ? dto.getPriceType() : PriceType.HOURLY);
        booking.setBaseAmount(priceCalc.getBaseAmount());
        booking.setSurchargeAmount(priceCalc.getSurchargeAmount());
        booking.setAddonAmount(BigDecimal.ZERO);
        booking.setDiscountAmount(priceCalc.getDiscountAmount());
        booking.setTaxAmount(priceCalc.getTaxAmount());
        booking.setServiceFeeAmount(priceCalc.getServiceFeeAmount());
        booking.setFinalPrice(priceCalc.getFinalPrice());
        booking.setPlatformFeeAmount(platformFeeAmount);
        booking.setQuotaUsedAmount(BigDecimal.ZERO);
        booking.setStatus(initialStatus);
        booking.setHoldExpiresAt(holdExpiresAt);
        booking.setQrTokenHash(qrTokenHash);
        booking.setPricingSnapshot(pricingSnapshot);
        booking.setCancellationPolicySnapshot(cancellationPolicySnapshot);

        BookingModel savedBooking = bookingRepository.save(booking);

        // 12. Ghi nhật ký kiểm toán bất biến (Audit Trail)
        auditService.log(
                customer,
                "BOOKING",
                "HOLD",
                "Booking",
                savedBooking.getId(),
                "Khách hàng giữ chỗ tạm thời mã " + savedBooking.getBookingCode()
                        + " cho tài nguyên " + resource.getLabel() + " đến " + holdExpiresAt
        );

        // 13. Đồng bộ trạng thái thời gian thực và phát sự kiện miền
        if (resourceStateSyncService != null) {
            resourceStateSyncService.syncOnHoldCreated(savedBooking);
        }

        log.info("Temporary Hold created successfully: code={}, customerId={}, resourceId={}, expiresAt={}",
                savedBooking.getBookingCode(), customerId, resource.getId(), holdExpiresAt);

        return toHoldResponseDto(savedBooking, now, false);
    }

    @Override
    public HoldResourceResponseDto getActiveHold(Long customerId, Long resourceId) {
        if (customerId == null) {
            throw new BadRequestException("Mã khách hàng không được để trống");
        }

        LocalDateTime now = LocalDateTime.now();
        List<BookingModel> pendings = bookingRepository.findByCustomerIdAndStatus(customerId, BookingStatus.PENDING_PAYMENT);

        BookingModel activeHold = pendings.stream()
                .filter(b -> resourceId == null || (b.getResource() != null && b.getResource().getId().equals(resourceId)))
                .filter(b -> b.getHoldExpiresAt() == null || b.getHoldExpiresAt().isAfter(now))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Không tìm thấy phiên giữ chỗ đang hiệu lực cho tài nguyên này"));

        return toHoldResponseDto(activeHold, now, false);
    }

    @Override
    public HoldResourceResponseDto getCustomerHoldQuota(Long customerId) {
        if (customerId == null) {
            throw new BadRequestException("Mã khách hàng không được để trống");
        }
        LocalDateTime now = LocalDateTime.now();
        return buildCustomerHoldQuotaDto(customerId, now);
    }

    @Override
    @Transactional
    public HoldResourceResponseDto releaseHold(Long customerId, Long bookingId) {
        if (customerId == null || bookingId == null) {
            throw new BadRequestException("Mã khách hàng và mã đơn đặt chỗ không được để trống");
        }

        BookingModel booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đơn giữ chỗ với ID: " + bookingId));

        // Strict Ownership Defense: Không thuộc quyền sở hữu -> ném NotFoundException để bảo mật
        if (booking.getCustomer() == null || !booking.getCustomer().getId().equals(customerId)) {
            throw new NotFoundException("Không tìm thấy đơn giữ chỗ với ID: " + bookingId);
        }

        // State Machine Defense:
        if (booking.getStatus() == BookingStatus.CONFIRMED || booking.getStatus() == BookingStatus.CHECKED_IN
                || booking.getStatus() == BookingStatus.COMPLETED) {
            throw new BadRequestException("Đơn đặt chỗ đã thanh toán thành công, vui lòng sử dụng quy trình hủy đặt chỗ thay vì nhả phiên giữ chỗ");
        }

        LocalDateTime now = LocalDateTime.now();

        // Idempotent: Nếu đã CANCELLED hoặc EXPIRED trước đó thì trả về kết quả hiện tại
        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.EXPIRED) {
            return toHoldResponseDto(booking, now, false);
        }

        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT && booking.getStatus() != BookingStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Không thể giải phóng phiên giữ chỗ ở trạng thái: " + booking.getStatus());
        }

        BookingStatus prevStatus = booking.getStatus();
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setHoldExpiresAt(null);
        booking.setCancelledAt(now);
        booking.setCancelSource(CancelSource.CUSTOMER);
        booking.setCancelReason("Khách hàng chủ động nhả phiên giữ chỗ");

        BookingModel saved = bookingRepository.save(booking);
        bookingRepository.flush();

        // Kiểm tra nếu chạm hoặc vượt ngưỡng vi phạm hold thì cập nhật tạm khóa quyền đặt chỗ trong DB (booking_suspended_until = now + blockMinutes, người dùng vẫn ACTIVE đăng nhập bình thường)
        if (saved.getCustomer() != null) {
            Long cId = saved.getCustomer().getId();
            int effectiveThreshold = getEffectiveSpamHoldThreshold();
            int effectiveBlockMinutes = getEffectiveSpamHoldBlockMinutes();
            LocalDateTime effectiveSince = calculateEffectiveUnpaidSince(cId, now);
            int unpaidCount = bookingRepository.findRecentUnpaidHolds(cId, effectiveSince).size();
            if (unpaidCount >= effectiveThreshold) {
                UserModel cust = saved.getCustomer();
                LocalDateTime blockUntil = now.plusMinutes(effectiveBlockMinutes);
                cust.setBookingSuspendedUntil(blockUntil);
                userRepository.save(cust);
                log.warn("User booking suspended in DB: customerId={}, bookingSuspendedUntil={}, unpaidCount={}",
                        cId, blockUntil, unpaidCount);
            }
        }

        // Ghi Audit Trail
        auditService.log(
                saved.getCustomer(),
                "BOOKING",
                "RELEASE_HOLD",
                "Booking",
                saved.getId(),
                "Khách hàng chủ động nhả phiên giữ chỗ mã " + saved.getBookingCode() + " từ trạng thái " + prevStatus
        );

        // Phát sự kiện đồng bộ trạng thái thời gian thực
        if (resourceStateSyncService != null) {
            resourceStateSyncService.syncOnHoldReleased(saved);
        } else {
            publishHoldReleasedEvent(saved, now);
        }

        // Gửi thông báo hủy giữ chỗ (In-App + Email)
        if (notificationService != null) {
            notificationService.sendBookingCancelledNotification(saved, BigDecimal.ZERO, "Khách hàng chủ động nhả phiên giữ chỗ");
        }

        log.info("Hold released by customer: bookingId={}, code={}, customerId={}",
                saved.getId(), saved.getBookingCode(), customerId);

        return toHoldResponseDto(saved, now, false);
    }

    @Override
    @Transactional
    public int expireOutdatedHolds() {
        LocalDateTime now = LocalDateTime.now();
        List<BookingModel> expiredList = bookingRepository.findExpiredHoldBookings(BookingStatus.PENDING_PAYMENT, now);

        if (expiredList.isEmpty()) {
            return 0;
        }

        int releasedCount = 0;
        for (BookingModel booking : expiredList) {
            try {
                // Chống race condition với webhook thanh toán:
                // Nếu booking đã có giao dịch thanh toán SUCCESS, không expire
                List<PaymentTransactionModel> txs = paymentTransactionRepository.findByBookingId(booking.getId());
                boolean hasSuccessfulPayment = txs.stream().anyMatch(tx ->
                        tx.getStatus() == PaymentStatus.SUCCESS);
                if (hasSuccessfulPayment) {
                    log.warn("Booking {} has successful payment transaction. Skipping hold expiration.", booking.getBookingCode());
                    continue;
                }

                // Hủy các giao dịch PENDING và PayOS payment link nếu có
                for (PaymentTransactionModel tx : txs) {
                    if (tx.getStatus() == PaymentStatus.PENDING) {
                        tx.setStatus(PaymentStatus.EXPIRED);
                        tx.setFailureReason("Giao dịch hết hạn thanh toán (quá thời gian giữ chỗ)");
                        paymentTransactionRepository.save(tx);

                        if (payOS != null && tx.getOrderCode() != null) {
                            try {
                                payOS.paymentRequests().cancel(tx.getOrderCode(), "Hết hạn thanh toán");
                            } catch (Exception e) {
                                log.debug("PayOS link cancel note for orderCode {}: {}", tx.getOrderCode(), e.getMessage());
                            }
                        }
                    }
                }

                booking.setStatus(BookingStatus.EXPIRED);
                booking.setHoldExpiresAt(null);
                BookingModel saved = bookingRepository.save(booking);
                bookingRepository.flush();

                if (saved.getCustomer() != null) {
                    Long cId = saved.getCustomer().getId();
                    int effectiveThreshold = getEffectiveSpamHoldThreshold();
                    int effectiveBlockMinutes = getEffectiveSpamHoldBlockMinutes();
                    LocalDateTime effectiveSince = calculateEffectiveUnpaidSince(cId, now);
                    int unpaidCount = bookingRepository.findRecentUnpaidHolds(cId, effectiveSince).size();
                    if (unpaidCount >= effectiveThreshold) {
                        UserModel cust = saved.getCustomer();
                        LocalDateTime blockUntil = now.plusMinutes(effectiveBlockMinutes);
                        cust.setBookingSuspendedUntil(blockUntil);
                        userRepository.save(cust);
                        log.warn("User booking suspended in DB on expiration: customerId={}, bookingSuspendedUntil={}, unpaidCount={}",
                                cId, blockUntil, unpaidCount);
                    }
                }

                auditService.log(
                        saved.getCustomer(),
                        AuditActorType.SYSTEM,
                        "BOOKING",
                        "BOOKING_EXPIRED",
                        "Booking",
                        saved.getId(),
                        BookingStatus.PENDING_PAYMENT.name(),
                        BookingStatus.EXPIRED.name(),
                        "Hết thời gian giữ chỗ 10 phút, hệ thống tự động giải phóng",
                        null
                );

                if (resourceStateSyncService != null) {
                    resourceStateSyncService.syncOnHoldExpired(saved);
                } else {
                    publishHoldExpiredEvent(saved, now);
                }
                releasedCount++;

                log.info("Hold expired and released automatically: bookingId={}, code={}", saved.getId(), saved.getBookingCode());
            } catch (Exception ex) {
                log.error("Lỗi khi giải phóng giữ chỗ hết hạn bookingId={}: {}", booking.getId(), ex.getMessage(), ex);
            }
        }

        return releasedCount;
    }

    private HoldResourceResponseDto toHoldResponseDto(BookingModel booking, LocalDateTime serverTime, boolean isReused) {
        LocalDateTime expiresAt = booking.getHoldExpiresAt();
        int effectiveHoldMinutes = getEffectiveHoldMinutes();
        long ttlSeconds = expiresAt != null
                ? Math.max(0, Duration.between(serverTime, expiresAt).getSeconds())
                : (effectiveHoldMinutes * 60L);

        BookableResourceModel res = booking.getResource();
        WorkspaceModel ws = booking.getWorkspace();

        String resourceName = res != null ? (res.getName() != null ? res.getName() : res.getLabel()) : "Chỗ ngồi";
        Long resourceId = res != null ? res.getId() : null;
        Long workspaceId = ws != null ? ws.getId() : null;
        String workspaceName = ws != null ? ws.getName() : "Không gian làm việc";

        int effectiveThreshold = getEffectiveSpamHoldThreshold();
        int effectiveBlockMinutes = getEffectiveSpamHoldBlockMinutes();
        Long customerId = booking.getCustomer() != null ? booking.getCustomer().getId() : null;
        int remainingAttempts = effectiveThreshold;
        boolean isSuspended = false;
        LocalDateTime suspendedUntil = null;

        if (customerId != null) {
            UserModel customer = booking.getCustomer();
            if (customer != null && customer.getBookingSuspendedUntil() != null && serverTime.isBefore(customer.getBookingSuspendedUntil())) {
                isSuspended = true;
                suspendedUntil = customer.getBookingSuspendedUntil();
            }
            LocalDateTime effectiveSince = calculateEffectiveUnpaidSince(customerId, serverTime);
            int unpaidCount = bookingRepository.findRecentUnpaidHolds(customerId, effectiveSince).size();
            remainingAttempts = Math.max(0, effectiveThreshold - unpaidCount);
        }

        return HoldResourceResponseDto.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .resourceId(resourceId)
                .resourceName(resourceName)
                .workspaceId(workspaceId)
                .workspaceName(workspaceName)
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .holdExpiresAt(expiresAt)
                .serverTime(serverTime)
                .ttlSeconds(ttlSeconds)
                .holdDurationMinutes(effectiveHoldMinutes)
                .isReused(isReused)
                .baseAmount(booking.getBaseAmount())
                .finalPrice(booking.getFinalPrice())
                .remainingHoldAttempts(remainingAttempts)
                .maxHoldAttempts(effectiveThreshold)
                .penaltyBlockMinutes(effectiveBlockMinutes)
                .isBookingSuspended(isSuspended)
                .bookingSuspendedUntil(suspendedUntil)
                .currency("VND")
                .build();
    }

    private void validateTimeRange(LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime == null || endTime == null) {
            throw new BadRequestException("Thời gian bắt đầu và kết thúc không được để trống");
        }
        if (!startTime.isBefore(endTime)) {
            throw new BadRequestException("Thời gian bắt đầu phải trước thời gian kết thúc");
        }
        LocalDateTime now = LocalDateTime.now();
        if (startTime.isBefore(now.minusMinutes(2))) {
            throw new BadRequestException("Thời gian bắt đầu không được ở trong quá khứ");
        }
    }

    private void validateOperatingHours(Long workspaceId, LocalDateTime startTime, LocalDateTime endTime) {
        List<WorkspaceOperatingHourModel> operatingHours =
                operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspaceId);

        if (operatingHours.isEmpty()) {
            return;
        }

        int dayOfWeek = startTime.getDayOfWeek().getValue() % 7;
        WorkspaceOperatingHourModel todayHours = operatingHours.stream()
                .filter(h -> h.getId() != null && Objects.equals(h.getId().getDayOfWeek(), dayOfWeek))
                .findFirst()
                .orElse(null);

        if (todayHours == null || todayHours.isClosed()) {
            throw new BadRequestException("Không gian không mở cửa vào ngày này");
        }

        LocalTime openTime = todayHours.getOpenTime();
        LocalTime closeTime = todayHours.getCloseTime();

        if (openTime != null && closeTime != null) {
            LocalTime startLocal = startTime.toLocalTime();
            LocalTime endLocal = endTime.toLocalTime();

            if (startLocal.isBefore(openTime) || endLocal.isAfter(closeTime)) {
                throw new BadRequestException("Thời gian đặt chỗ nằm ngoài khung giờ mở cửa của không gian ("
                        + openTime + " - " + closeTime + ")");
            }
        }
    }

    private PriceCalculationResponseDto computePrice(
            WorkspaceModel workspace, BookableResourceModel resource,
            LocalDateTime startTime, LocalDateTime endTime, PriceType priceType) {

        var baseQuote = base.api.feature.pricing.service.BookingBaseRates.quote(resource, startTime, endTime, priceType);
        PriceType effectivePriceType = baseQuote.priceType();
        BigDecimal unitPrice = baseQuote.unitPrice();
        BigDecimal durationHours = baseQuote.durationHours();
        BigDecimal baseAmount = baseQuote.baseAmount();

        BigDecimal surchargeAmount = base.api.feature.pricing.service.PricingAdjustments.surcharge(
                pricingRuleRepository.findByWorkspaceId(workspace.getId()), resource, startTime, endTime, baseAmount);

        BigDecimal discountAmount = BigDecimal.ZERO;

        BigDecimal taxableBase = baseAmount.add(surchargeAmount);
        BigDecimal vatPercent = getDecimalSetting("payment.vat_percent", DEFAULT_VAT_PERCENT);
        BigDecimal taxAmount = taxableBase.multiply(vatPercent)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        // Keep hold totals identical to quotes, regardless of obsolete customer-fee settings.
        BigDecimal serviceFeeAmount = BigDecimal.ZERO.setScale(2);

        BigDecimal finalPrice = taxableBase.subtract(discountAmount)
                .add(taxAmount)
                .add(serviceFeeAmount)
                .setScale(2, RoundingMode.HALF_UP);

        String currency = "VND";
        if (resource.getResourceType() != null && resource.getResourceType().getCurrency() != null) {
            currency = resource.getResourceType().getCurrency().name();
        }

        return PriceCalculationResponseDto.builder()
                .resourceId(resource.getId())
                .resourceName(resource.getName() != null ? resource.getName() : resource.getLabel())
                .resourceCode(resource.getLabel())
                .priceType(effectivePriceType)
                .unitPrice(unitPrice)
                .durationHours(durationHours)
                .baseAmount(baseAmount)
                .surchargeAmount(surchargeAmount)
                .taxAmount(taxAmount)
                .serviceFeeAmount(serviceFeeAmount)
                .discountAmount(discountAmount)
                .finalPrice(finalPrice)
                .currency(currency)
                .build();
    }

    private String generateUniqueBookingCode() {
        String datePrefix = DateTimeFormatter.ofPattern("yyyyMMdd").format(LocalDate.now());
        for (int i = 0; i < 5; i++) {
            String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
            String code = "BK-" + datePrefix + "-" + suffix;
            if (!bookingRepository.existsByBookingCode(code)) {
                return code;
            }
        }
        return "BK-" + datePrefix + "-" + (System.currentTimeMillis() % 1000000);
    }

    private String generateQrTokenHash(String bookingCode, Long customerId) {
        try {
            String raw = bookingCode + ":" + customerId + ":" + UUID.randomUUID();
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            return UUID.randomUUID().toString().replace("-", "");
        }
    }

    private String buildPricingSnapshot(PriceCalculationResponseDto priceCalc, BookableResourceModel resource) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("resourceId", resource.getId());
        map.put("resourceCode", resource.getLabel());
        map.put("unitPrice", priceCalc.getUnitPrice());
        map.put("durationHours", priceCalc.getDurationHours());
        map.put("baseAmount", priceCalc.getBaseAmount());
        map.put("surchargeAmount", priceCalc.getSurchargeAmount());
        map.put("taxAmount", priceCalc.getTaxAmount());
        map.put("serviceFeeAmount", priceCalc.getServiceFeeAmount());
        map.put("discountAmount", priceCalc.getDiscountAmount());
        map.put("finalPrice", priceCalc.getFinalPrice());
        map.put("currency", priceCalc.getCurrency());
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    private String buildCancellationPolicySnapshot(Long workspaceId) {
        return base.api.feature.workspace.service.CancellationPolicies.snapshot(
                cancellationRuleRepository.findByWorkspaceIdOrderByMinHoursBeforeStartDesc(workspaceId));
    }

    private int getIntegerSetting(String primaryKey, String fallbackKey, int defaultValue) {
        return platformSettingRepository.findById(primaryKey)
                .or(() -> platformSettingRepository.findById(fallbackKey))
                .map(PlatformSettingModel::getSettingValue)
                .map(val -> {
                    try {
                        return Integer.parseInt(val.trim());
                    } catch (Exception e) {
                        return defaultValue;
                    }
                })
                .orElse(defaultValue);
    }

    private int getEffectiveHoldMinutes() {
        return getIntegerSetting("booking.hold_ttl_minutes", "booking_hold_minutes", DEFAULT_HOLD_DURATION_MINUTES);
    }

    private int getEffectiveMaxActiveHolds() {
        return getIntegerSetting("booking.max_active_holds", "booking_max_active_holds", DEFAULT_MAX_ACTIVE_HOLDS);
    }

    private int getEffectiveSpamHoldThreshold() {
        return getIntegerSetting("booking.spam_hold_threshold", "booking_spam_hold_threshold", spamHoldThreshold);
    }

    private int getEffectiveSpamHoldBlockMinutes() {
        return getIntegerSetting("booking.spam_hold_block_minutes", "booking_spam_hold_block_minutes", spamHoldBlockMinutes);
    }

    private BigDecimal getDecimalSetting(String key, BigDecimal defaultValue) {
        return platformSettingRepository.findById(key)
                .map(PlatformSettingModel::getSettingValue)
                .map(val -> {
                    try {
                        return new BigDecimal(val.trim());
                    } catch (Exception e) {
                        return defaultValue;
                    }
                })
                .orElse(defaultValue);
    }

    private void publishHoldExpiredEvent(BookingModel booking, LocalDateTime timestamp) {
        if (applicationEventPublisher != null) {
            Long resourceId = booking.getResource() != null ? booking.getResource().getId() : null;
            Long workspaceId = booking.getWorkspace() != null ? booking.getWorkspace().getId() : null;
            Long customerId = booking.getCustomer() != null ? booking.getCustomer().getId() : null;

            ResourceHoldExpiredEvent event = ResourceHoldExpiredEvent.builder()
                    .bookingId(booking.getId())
                    .bookingCode(booking.getBookingCode())
                    .resourceId(resourceId)
                    .workspaceId(workspaceId)
                    .customerId(customerId)
                    .expiredAt(timestamp)
                    .build();

            applicationEventPublisher.publishEvent(event);
        }
    }

    private void publishHoldReleasedEvent(BookingModel booking, LocalDateTime timestamp) {
        if (applicationEventPublisher != null) {
            Long resourceId = booking.getResource() != null ? booking.getResource().getId() : null;
            Long workspaceId = booking.getWorkspace() != null ? booking.getWorkspace().getId() : null;
            Long customerId = booking.getCustomer() != null ? booking.getCustomer().getId() : null;

            ResourceHoldReleasedEvent event = ResourceHoldReleasedEvent.builder()
                    .bookingId(booking.getId())
                    .bookingCode(booking.getBookingCode())
                    .resourceId(resourceId)
                    .workspaceId(workspaceId)
                    .customerId(customerId)
                    .releasedAt(timestamp)
                    .build();

            applicationEventPublisher.publishEvent(event);
        }
    }

    private LocalDateTime calculateEffectiveUnpaidSince(Long customerId, LocalDateTime now) {
        LocalDateTime windowStart = now.minusHours(spamHoldWindowHours);
        if (customerId == null) {
            return windowStart;
        }

        LocalDateTime effectiveSince = windowStart;

        // 1. Trường hợp người dùng từng bị phạt: Sau khi hết 20 phút phạt, các vi phạm hold cũ được reset về 3
        UserModel customer = userRepository.findById(customerId).orElse(null);
        if (customer != null && customer.getBookingSuspendedUntil() != null && now.isAfter(customer.getBookingSuspendedUntil())) {
            if (customer.getBookingSuspendedUntil().isAfter(effectiveSince)) {
                effectiveSince = customer.getBookingSuspendedUntil();
            }
        }

        // 2. Kiểm tra nếu có >= spamHoldThreshold vi phạm và vi phạm gần nhất đã cách đây >= effectiveBlockMinutes (hết hạn phạt 20p)
        int effectiveThreshold = getEffectiveSpamHoldThreshold();
        int effectiveBlockMinutes = getEffectiveSpamHoldBlockMinutes();
        List<BookingModel> recentUnpaids = bookingRepository.findRecentUnpaidHolds(customerId, effectiveSince);
        if (recentUnpaids.size() >= effectiveThreshold) {
            BookingModel latestUnpaid = recentUnpaids.get(0);
            LocalDateTime latestUnpaidTime = latestUnpaid.getUpdatedAt() != null
                    ? latestUnpaid.getUpdatedAt()
                    : latestUnpaid.getCreatedAt();
            if (latestUnpaidTime != null) {
                LocalDateTime penaltyEnd = latestUnpaidTime.plusMinutes(effectiveBlockMinutes);
                if (now.isAfter(penaltyEnd) && penaltyEnd.isAfter(effectiveSince)) {
                    effectiveSince = penaltyEnd;
                }
            }
        }

        // 3. Quy tắc: Sau khi thanh toán thành công (CONFIRMED/CHECKED_IN/COMPLETED), số lần hold/hủy trước đó được reset về 0
        Optional<LocalDateTime> lastSuccessTime = bookingRepository.findLatestSuccessfulBookingCreatedAt(customerId);
        if (lastSuccessTime.isPresent() && lastSuccessTime.get().isAfter(effectiveSince)) {
            effectiveSince = lastSuccessTime.get();
        }

        return effectiveSince;
    }

    private void validateSpamHoldBehavior(UserModel customer, LocalDateTime now) {
        int effectiveThreshold = getEffectiveSpamHoldThreshold();
        int effectiveBlockMinutes = getEffectiveSpamHoldBlockMinutes();

        if (effectiveThreshold <= 0 || effectiveBlockMinutes <= 0) {
            return;
        }

        if (customer.getBookingSuspendedUntil() != null && now.isBefore(customer.getBookingSuspendedUntil())) {
            long minutesRemaining = Math.max(1, Duration.between(now, customer.getBookingSuspendedUntil()).toMinutes() + 1);
            throw new BadRequestException("Tài khoản của bạn tạm thời bị khóa quyền giữ chỗ trong vòng "
                    + minutesRemaining + " phút (đến " + customer.getBookingSuspendedUntil().format(DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"))
                    + ") do nghi vấn có hành vi spam hold chỗ (đã giữ chỗ quá "
                    + effectiveThreshold + " lần mà không thanh toán).");
        }

        LocalDateTime effectiveSince = calculateEffectiveUnpaidSince(customer.getId(), now);
        List<BookingModel> unpaidHolds = bookingRepository.findRecentUnpaidHolds(customer.getId(), effectiveSince);

        if (unpaidHolds.size() >= effectiveThreshold) {
            BookingModel latestUnpaid = unpaidHolds.get(0);
            LocalDateTime latestUnpaidTime = latestUnpaid.getUpdatedAt() != null
                    ? latestUnpaid.getUpdatedAt()
                    : latestUnpaid.getCreatedAt();
            if (latestUnpaidTime == null) {
                latestUnpaidTime = now;
            }

            LocalDateTime blockUntil = latestUnpaidTime.plusMinutes(effectiveBlockMinutes);
            if (now.isBefore(blockUntil)) {
                customer.setBookingSuspendedUntil(blockUntil);
                userRepository.save(customer);

                long minutesRemaining = Math.max(1, Duration.between(now, blockUntil).toMinutes() + 1);
                log.warn("Spam hold blocked: customerId={}, unpaidCount={}, minutesRemaining={}",
                        customer.getId(), unpaidHolds.size(), minutesRemaining);

                auditService.log(
                        customer,
                        AuditActorType.SYSTEM,
                        "BOOKING",
                        "SPAM_HOLD_BLOCKED",
                        "User",
                        customer.getId(),
                        "ACTIVE",
                        "ACTIVE",
                        "Khóa quyền giữ/đặt chỗ tạm thời đến " + blockUntil.format(DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"))
                                + " (" + minutesRemaining + " phút) do nghi vấn có hành vi spam hold chỗ ("
                                + unpaidHolds.size() + " lần không thanh toán)",
                        null
                );

                throw new BadRequestException("Tài khoản của bạn tạm thời bị khóa quyền giữ chỗ trong vòng "
                        + minutesRemaining + " phút (đến " + blockUntil.format(DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"))
                        + ") do nghi vấn có hành vi spam hold chỗ (đã giữ chỗ quá "
                        + effectiveThreshold + " lần mà không thanh toán).");
            }
        }
    }

    private HoldResourceResponseDto buildCustomerHoldQuotaDto(Long customerId, LocalDateTime now) {
        UserModel customer = userRepository.findById(customerId).orElse(null);
        int effectiveThreshold = getEffectiveSpamHoldThreshold();
        int effectiveBlockMinutes = getEffectiveSpamHoldBlockMinutes();
        int remainingAttempts = effectiveThreshold;
        boolean isSuspended = false;
        LocalDateTime suspendedUntil = null;

        if (customer != null) {
            if (customer.getBookingSuspendedUntil() != null && now.isBefore(customer.getBookingSuspendedUntil())) {
                isSuspended = true;
                suspendedUntil = customer.getBookingSuspendedUntil();
            }
            LocalDateTime effectiveSince = calculateEffectiveUnpaidSince(customerId, now);
            int unpaidCount = bookingRepository.findRecentUnpaidHolds(customerId, effectiveSince).size();
            remainingAttempts = Math.max(0, effectiveThreshold - unpaidCount);

            if (unpaidCount >= effectiveThreshold) {
                if (suspendedUntil == null) {
                    List<BookingModel> unpaidHolds = bookingRepository.findRecentUnpaidHolds(customerId, effectiveSince);
                    if (!unpaidHolds.isEmpty()) {
                        BookingModel latest = unpaidHolds.get(0);
                        LocalDateTime latestTime = latest.getUpdatedAt() != null ? latest.getUpdatedAt() : latest.getCreatedAt();
                        if (latestTime == null) latestTime = now;
                        LocalDateTime blockUntil = latestTime.plusMinutes(effectiveBlockMinutes);
                        if (now.isBefore(blockUntil)) {
                            isSuspended = true;
                            suspendedUntil = blockUntil;
                        }
                    }
                }
            }
        }

        return HoldResourceResponseDto.builder()
                .bookingId(null)
                .bookingCode(null)
                .resourceId(null)
                .resourceName(null)
                .workspaceId(null)
                .workspaceName(null)
                .startTime(null)
                .endTime(null)
                .holdExpiresAt(null)
                .serverTime(now)
                .ttlSeconds(0)
                .holdDurationMinutes(getEffectiveHoldMinutes())
                .isReused(false)
                .baseAmount(null)
                .finalPrice(null)
                .remainingHoldAttempts(remainingAttempts)
                .maxHoldAttempts(effectiveThreshold)
                .penaltyBlockMinutes(effectiveBlockMinutes)
                .isBookingSuspended(isSuspended)
                .bookingSuspendedUntil(suspendedUntil)
                .currency("VND")
                .build();
    }
}
