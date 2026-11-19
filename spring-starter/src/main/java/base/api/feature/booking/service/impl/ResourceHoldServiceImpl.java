package base.api.feature.booking.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.dto.request.HoldResourceRequestDto;
import base.api.feature.booking.dto.response.HoldResourceResponseDto;
import base.api.feature.booking.dto.response.PriceCalculationResponseDto;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.booking.service.IResourceHoldService;
import base.api.feature.governance.repository.IPlatformSettingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.pricing.repository.IPricingRuleRepository;
import base.api.feature.resource.dto.LockedResourceContext;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.service.IResourceLockService;
import base.api.feature.workspace.repository.IWorkspaceCancellationRuleRepository;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.governance.PlatformSettingModel;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private static final BigDecimal DEFAULT_SERVICE_FEE_PERCENT = BigDecimal.valueOf(2);
    private static final int DEFAULT_HOLD_DURATION_MINUTES = 10;
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

    @Value("${app.booking.max-active-holds:3}")
    private int maxActiveHolds = 3;

    @Value("${app.booking.hold-duration-minutes:10}")
    private int holdDurationMinutes = 10;

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

        // 1. Thẩm định khách hàng
        UserModel customer = userRepository.findById(customerId)
                .orElseThrow(() -> new NotFoundException("Khách hàng không tồn tại"));

        if (customer.getStatus() != UserStatus.ACTIVE) {
            throw new BadRequestException("Tài khoản người dùng hiện đang bị vô hiệu hoá hoặc khoá");
        }

        // 2. Thẩm định khung thời gian giữ chỗ
        LocalDateTime startTime = dto.getStartTime();
        LocalDateTime endTime = dto.getEndTime();
        validateTimeRange(startTime, endTime);

        LocalDateTime now = LocalDateTime.now();

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
            // Nếu sắp hết hạn (dưới 2 phút), tự động gia hạn thêm để khách an tâm thanh toán
            if (existing.getHoldExpiresAt() != null && existing.getHoldExpiresAt().isBefore(now.plusMinutes(2))) {
                existing.setHoldExpiresAt(now.plusMinutes(getEffectiveHoldMinutes()));
                existing = bookingRepository.save(existing);
            }
            log.info("Idempotent Hold Reuse: customerId={}, resourceId={}, bookingCode={}",
                    customerId, dto.getResourceId(), existing.getBookingCode());
            return toHoldResponseDto(existing, now, true);
        }

        // 4. Giới hạn số Hold Active (Anti-Hoarding / Anti-DoS):
        // Số lượng hold active tối đa điều khiển trực tiếp qua biến môi trường BOOKING_MAX_ACTIVE_HOLDS
        long activeHolds = bookingRepository.countActiveHoldsByCustomer(customerId, now);
        if (activeHolds >= maxActiveHolds) {
            throw new BadRequestException("Bạn chỉ được giữ tối đa " + maxActiveHolds + " chỗ cùng lúc. Vui lòng hoàn tất thanh toán hoặc hủy các chỗ đã giữ trước đó");
        }

        // 5. Khóa bi quan có thứ tự (ORDER BY id ASC) và kiểm tra xung đột hai chiều ROOM - DESK qua IResourceLockService
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

        log.info("Temporary Hold created successfully: code={}, customerId={}, resourceId={}, expiresAt={}",
                savedBooking.getBookingCode(), customerId, resource.getId(), holdExpiresAt);

        return toHoldResponseDto(savedBooking, now, false);
    }

    @Override
    public HoldResourceResponseDto getActiveHold(Long customerId, Long resourceId) {
        if (customerId == null || resourceId == null) {
            throw new BadRequestException("Mã khách hàng và mã tài nguyên không được để trống");
        }

        LocalDateTime now = LocalDateTime.now();
        List<BookingModel> pendings = bookingRepository.findByCustomerIdAndStatus(customerId, BookingStatus.PENDING_PAYMENT);

        BookingModel active = pendings.stream()
                .filter(b -> b.getResource() != null && b.getResource().getId().equals(resourceId))
                .filter(b -> b.getHoldExpiresAt() == null || b.getHoldExpiresAt().isAfter(now))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Không tìm thấy phiên giữ chỗ đang hiệu lực cho tài nguyên này"));

        return toHoldResponseDto(active, now, false);
    }

    private HoldResourceResponseDto toHoldResponseDto(BookingModel booking, LocalDateTime serverTime, boolean isReused) {
        LocalDateTime expiresAt = booking.getHoldExpiresAt();
        long ttlSeconds = expiresAt != null
                ? Math.max(0, Duration.between(serverTime, expiresAt).getSeconds())
                : (getEffectiveHoldMinutes() * 60L);

        BookableResourceModel res = booking.getResource();
        WorkspaceModel ws = booking.getWorkspace();

        String resourceName = res != null ? (res.getName() != null ? res.getName() : res.getLabel()) : "Chỗ ngồi";
        Long resourceId = res != null ? res.getId() : null;
        Long workspaceId = ws != null ? ws.getId() : null;
        String workspaceName = ws != null ? ws.getName() : "Không gian làm việc";

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
                .isReused(isReused)
                .baseAmount(booking.getBaseAmount())
                .finalPrice(booking.getFinalPrice())
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

        BigDecimal serviceFeePercent = getDecimalSetting("payment.service_fee_percent", DEFAULT_SERVICE_FEE_PERCENT);
        BigDecimal serviceFeeAmount = taxableBase.multiply(serviceFeePercent)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

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

    private int getEffectiveHoldMinutes() {
        return holdDurationMinutes;
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
}
