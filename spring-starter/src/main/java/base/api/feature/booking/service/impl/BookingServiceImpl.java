package base.api.feature.booking.service.impl;

import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.dto.request.CalculatePriceRequestDto;
import base.api.feature.booking.dto.request.CreateBookingRequestDto;
import base.api.feature.booking.dto.response.BookingCancellationPreviewDto;
import base.api.feature.booking.dto.response.BookingResponseDto;
import base.api.feature.booking.dto.response.PriceCalculationResponseDto;
import base.api.feature.booking.dto.response.ResourceAvailabilityDto;
import base.api.feature.booking.mapper.BookingMapper;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.notification.service.INotificationService;
import base.api.feature.governance.repository.IPlatformSettingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.feature.payment.repository.IRefundRequestRepository;
import base.api.feature.pricing.repository.IPricingRuleRepository;
import base.api.feature.resource.dto.FloorManagement.AvailabilityState;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.repository.IResourceBlockedSlotRepository;
import base.api.feature.resource.service.ResourceMaintenance;
import base.api.feature.resource.repository.ResourceUsageRepository;
import base.api.feature.resource.service.IResourceStateSyncService;
import base.api.feature.resource.service.PublishedGeometry;
import base.api.feature.workspace.repository.IWorkspaceCancellationRuleRepository;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.entity.UserModel;
import java.util.stream.Collectors;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.entity.payment.RefundRequestModel;
import base.api.shared.security.CurrentUserProvider;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.governance.PlatformSettingModel;
import base.api.shared.entity.pricing.PricingRuleModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.ResourceBlockedSlotModel;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BookingServiceImpl implements base.api.feature.booking.service.IBookingService {

    private static final BigDecimal DEFAULT_VAT_PERCENT = new BigDecimal("8.00");
    private static final BigDecimal DEFAULT_COMMISSION_PERCENT = new BigDecimal("10.00");
    private static final int DEFAULT_MAX_ADVANCE_DAYS = 90;
    private static final int DEFAULT_MAX_ACTIVE_HOLDS = 3;
    private static final int DEFAULT_HOLD_DURATION_MINUTES = 10;
    private static final int DEFAULT_MIN_ADVANCE_MINUTES = 0;

    private static final int DEFAULT_HOLD_MINUTES = 10;

    private static final List<BookingStatus> ACTIVE_BOOKING_STATUSES = List.of(
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.PENDING_APPROVAL,
            BookingStatus.PENDING_PAYMENT
    );

    private final base.api.feature.payment.service.RefundPayoutService refundPayouts;
    private final base.api.feature.booking.service.BookingAddons addons;
    private final IBookingRepository bookingRepository;
    private final IBookableResourceRepository resourceRepository;
    private final IWorkspaceRepository workspaceRepository;
    private final IOrganizerProfileRepository organizerProfiles;
    private final IUserRepository userRepository;
    private final base.api.feature.operations.repository.MaintenanceGroupRepository maintenanceGroups;
    private final IWorkspaceOperatingHourRepository operatingHourRepository;
    private final IWorkspaceCancellationRuleRepository cancellationRuleRepository;
    private final IResourceBlockedSlotRepository blockedSlotRepository;
    private final IPlatformSettingRepository platformSettingRepository;
    private final IPricingRuleRepository pricingRuleRepository;
    private final ResourceUsageRepository resourceUsageRepository;
    private final IAuditService auditService;
    private final ObjectMapper objectMapper;
    private final CurrentUserProvider currentUserProvider;
    private final IRefundRequestRepository refundRequestRepository;
    private final IPaymentTransactionRepository paymentTransactionRepository;
    private final INotificationService notificationService;
    private final IResourceStateSyncService resourceStateSyncService;

    @org.springframework.beans.factory.annotation.Value("${app.booking.spam-hold.threshold:3}")
    private int spamHoldThreshold = 3;

    @org.springframework.beans.factory.annotation.Value("${app.booking.spam-hold.block-duration-minutes:20}")
    private int spamHoldBlockMinutes = 20;

    @org.springframework.beans.factory.annotation.Value("${app.booking.spam-hold.window-hours:24}")
    private int spamHoldWindowHours = 24;

    @Override
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public BookingResponseDto createBooking(Long customerId, CreateBookingRequestDto dto) {
        base.api.feature.pricing.service.BookingBaseRates.supported(dto.getPriceType());
        // 1. Identify Customer
        UserModel customer = userRepository.findById(customerId)
                .orElseThrow(() -> new NotFoundException("Khách hàng không tồn tại"));

        if (customer.getStatus() != UserStatus.ACTIVE) {
            throw new BadRequestException("Tài khoản người dùng hiện đang bị vô hiệu hoá hoặc khoá");
        }

        // 2. Identify Workspace
        WorkspaceModel workspace = workspaceRepository.findById(dto.getWorkspaceId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + dto.getWorkspaceId()));

        if (workspace.getBaseStatus() != WorkspaceStatus.ACTIVE) {
            throw new BadRequestException("Không gian làm việc hiện không ở trạng thái sẵn sàng nhận đặt chỗ");
        }

        // Serialize new holds against an administrator's suspension without locking other resources.
        if (workspace.getOrganizer() != null && organizerProfiles.findByOrganizerIdForBooking(workspace.getOrganizer().getId())
                .filter(profile -> profile.isSuspended()).isPresent()) {
            throw new BadRequestException("Không gian làm việc đang tạm ngưng nhận đặt chỗ mới");
        }

        LocalDateTime now = LocalDateTime.now();
        validateSpamHoldBehavior(customer, now);

        // 3. Acquire Pessimistic Write Lock on Bookable Resource
        BookableResourceModel resource = resourceRepository.findByIdForUpdate(dto.getResourceId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy chỗ ngồi/phòng với ID: " + dto.getResourceId()));
        requireIndividuallyBookable(resource);

        if (resource.getStatus() != BookableResourceStatus.ACTIVE) {
            throw new BadRequestException("Chỗ ngồi/phòng hiện không ở trạng thái hoạt động");
        }

        if (resource.getFloorPlan() == null || resource.getFloorPlan().getWorkspace() == null
                || !resource.getFloorPlan().getWorkspace().getId().equals(workspace.getId())) {
            throw new BadRequestException("Chỗ ngồi/phòng không thuộc về không gian làm việc đã chọn");
        }

        if (resource.getResourceType() == null || !resource.getResourceType().isActive()) {
            throw new BadRequestException("Loại chỗ ngồi/phòng này hiện đã ngừng hoạt động");
        }
        if (!PublishedGeometry.isCurrentPublishedPlacement(resource))
            throw new ConflictException("Sơ đồ chỗ ngồi/phòng đang chờ publish. Vui lòng chọn chỗ khác hoặc thử lại sau.");

        // 4. Validate Booking Time Range
        LocalDateTime startTime = dto.getStartTime();
        LocalDateTime endTime = dto.getEndTime();
        validateTimeRange(startTime, endTime);

        // 5. Validate Workspace Operating Hours
        validateOperatingHours(workspace.getId(), startTime, endTime);

        // 5.1. Idempotent Active Hold Reuse:
        // Nếu cùng khách hàng yêu cầu giữ cùng tài nguyên trong cùng khung giờ đang còn hiệu lực:
        // Tái sử dụng ngay phiên giữ chỗ đó, không ném 409 Conflict và không tạo bản ghi rác.
        Optional<BookingModel> existingHold = bookingRepository.findActiveHoldByCustomerAndResource(
                customerId, resource.getId(), startTime, endTime, now);
        if (existingHold.isPresent()) {
            BookingModel reused = existingHold.get();
            if (base.api.feature.pricing.service.BookingBaseRates.supported(reused.getPriceType())
                    != base.api.feature.pricing.service.BookingBaseRates.supported(dto.getPriceType()))
                throw new ConflictException("Bạn đang giữ chỗ này bằng loại giá khác. Vui lòng hủy lượt giữ chỗ cũ trước khi đổi loại giá.");
            log.info("Idempotent hold reuse in createBooking: code={}, customerId={}", reused.getBookingCode(), customerId);
            return BookingMapper.toDto(reused);
        }

        // 5.2. Giới hạn số Hold Active (Anti-Hoarding / Anti-DoS):
        // Số hold active tối đa điều khiển động từ bảng platform_setting trong database
        long activeHolds = bookingRepository.countActiveHoldsByCustomer(customerId, now);
        int effectiveMaxActiveHolds = getEffectiveMaxActiveHolds();
        if (activeHolds >= effectiveMaxActiveHolds) {
            throw new BadRequestException("Bạn chỉ được giữ tối đa " + effectiveMaxActiveHolds + " chỗ cùng lúc. Vui lòng hoàn tất thanh toán hoặc hủy các chỗ đã giữ trước đó");
        }

        // 6. Check for Conflicting Active Bookings (including 10-min unexpired holds)
        List<BookingModel> conflictingBookings = bookingRepository.findConflictingBookingsWithHold(
                resource.getId(), startTime, endTime, ACTIVE_BOOKING_STATUSES, now);

        if (!conflictingBookings.isEmpty()) {
            throw new ConflictException("Chỗ ngồi/phòng đã có người đặt hoặc đang được giữ chỗ trong khung thời gian này");
        }

        // 7. Check for Conflicting Blocked Slots
        List<ResourceBlockedSlotModel> conflictingBlockedSlots = blockedSlotRepository.findConflictingBlockedSlots(
                resource.getId(), startTime, endTime);

        if (conflictingBlockedSlots.stream().anyMatch(slot -> ResourceMaintenance.preventsBooking(resource, slot))) {
            throw new ConflictException("Chỗ ngồi/phòng đang bị khoá tạm thời (bảo trì hoặc sự kiện riêng)");
        }
        int availableCapacity = ResourceMaintenance.capacity(resource, resourceRepository.findByParentRoomId(resource.getId()),
                ResourceMaintenance.maintenanceIds(conflictingBlockedSlots));
        if (availableCapacity == 0)
            throw new ConflictException("Phòng không còn ghế khả dụng trong thời gian bảo trì.");
        if (dto.getPartySize() > availableCapacity)
            throw new ConflictException("Số người vượt số ghế khả dụng sau khi trừ ghế đang bảo trì.");
        // 8. Calculate Pricing & Tariffs
        PriceCalculationResponseDto priceCalc = computePrice(workspace, resource, startTime, endTime, dto.getPriceType(), dto.getAmenityIds());

        BigDecimal platformCommissionPercent = getDecimalSetting("payment.platform_commission_percent", DEFAULT_COMMISSION_PERCENT);
        BigDecimal platformFeeAmount = priceCalc.getBaseAmount().add(priceCalc.getSurchargeAmount()).add(priceCalc.getAddonAmount())
                .multiply(platformCommissionPercent)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        LocalDateTime holdExpiresAt = now.plusMinutes(getEffectiveHoldMinutes());

        // 9. Generate Unique Booking Code
        String bookingCode = generateUniqueBookingCode();

        // 10. Generate QR Token Hash
        String qrTokenHash = generateQrTokenHash(bookingCode, customer.getId());

        BigDecimal addonAmount = dto.getAddonAmount() != null && dto.getAddonAmount().compareTo(BigDecimal.ZERO) > 0
                ? dto.getAddonAmount()
                : BigDecimal.ZERO;

        // 11. Create Snapshots (Pricing & Cancellation Policies)
        String pricingSnapshot = buildPricingSnapshot(priceCalc, resource, addonAmount);
        String cancellationPolicySnapshot = buildCancellationPolicySnapshot(workspace.getId());

        // 12. Determine Initial Status (Chỉ sử dụng INSTANT -> PENDING_PAYMENT)
        BookingStatus initialStatus = BookingStatus.PENDING_PAYMENT;

        // 13. Build & Save BookingModel
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
        booking.setAddonAmount(priceCalc.getAddonAmount());
        booking.setAddonAmount(addonAmount);
        booking.setDiscountAmount(priceCalc.getDiscountAmount());
        booking.setTaxAmount(priceCalc.getTaxAmount());
        booking.setServiceFeeAmount(priceCalc.getServiceFeeAmount());
        booking.setFinalPrice(priceCalc.getFinalPrice().add(addonAmount));
        booking.setPlatformFeeAmount(platformFeeAmount);
        booking.setQuotaUsedAmount(BigDecimal.ZERO);
        booking.setStatus(initialStatus);
        booking.setHoldExpiresAt(holdExpiresAt);
        booking.setQrTokenHash(qrTokenHash);
        booking.setPricingSnapshot(pricingSnapshot);
        booking.setCancellationPolicySnapshot(cancellationPolicySnapshot);

        BookingModel savedBooking = bookingRepository.save(booking);
        bookingRepository.flush();

        // 14. Immutable Audit Trail
        auditService.log(
                customer,
                "BOOKING",
                "CREATE",
                "Booking",
                savedBooking.getId(),
                "Khách hàng tạo đơn đặt chỗ " + savedBooking.getBookingCode() + " giữ chỗ đến " + holdExpiresAt
        );

        log.info("Booking created successfully: code={}, customerId={}, resourceId={}, status={}",
                savedBooking.getBookingCode(), customerId, resource.getId(), savedBooking.getStatus());

        if (initialStatus == BookingStatus.PENDING_APPROVAL) {
            notificationService.sendBookingPendingApprovalToOrganizerNotification(savedBooking);
        }

        return enrichBookingDto(savedBooking);
    }

    @Override
    public PriceCalculationResponseDto calculatePrice(CalculatePriceRequestDto dto) {
        WorkspaceModel workspace = workspaceRepository.findById(dto.getWorkspaceId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + dto.getWorkspaceId()));

        BookableResourceModel resource = resourceRepository.findById(dto.getResourceId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy chỗ ngồi/phòng với ID: " + dto.getResourceId()));
        if (!resource.getFloorPlan().getWorkspace().getId().equals(workspace.getId())) throw new NotFoundException("Vị trí không thuộc không gian.");
        requireIndividuallyBookable(resource);

        validateTimeRange(dto.getStartTime(), dto.getEndTime());
        validateOperatingHours(workspace.getId(), dto.getStartTime(), dto.getEndTime());

        return computePrice(workspace, resource, dto.getStartTime(), dto.getEndTime(), dto.getPriceType(), dto.getAmenityIds());
    }

    @Override
    @Transactional
    public BookingResponseDto updateAddons(Long customerId, Long bookingId, List<Long> amenityIds) {
        var booking = bookingRepository.findByIdForUpdate(bookingId)
                .filter(b -> b.getCustomer().getId().equals(customerId))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đơn đặt chỗ."));
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT || booking.getHoldExpiresAt() == null
                || !booking.getHoldExpiresAt().isAfter(LocalDateTime.now()))
            throw new ConflictException("Đơn không còn trong thời gian giữ chỗ.");
        // Once a gateway session exists, its immutable amount cannot be changed by another tab.
        if (!paymentTransactionRepository.findByBookingId(bookingId).isEmpty())
            throw new ConflictException("Phiên thanh toán đã được tạo. Hãy giữ nguyên tiện ích của đơn này.");
        var selected = addons.quote(booking.getWorkspace().getId(),amenityIds,booking.getStartTime(),booking.getEndTime());
        var previous = BookingMapper.toDto(booking);
        var amount = selected.stream().map(base.api.feature.booking.service.BookingAddons.Item::amount).reduce(BigDecimal.ZERO,BigDecimal::add);
        com.fasterxml.jackson.databind.JsonNode frozen;
        try { frozen = objectMapper.readTree(booking.getPricingSnapshot()); }
        catch (Exception ex) { throw new BadRequestException("Không đọc được giá đã chốt của đơn."); }
        String currency = frozen.path("currency").asText("VND");
        if (amount.signum() > 0 && !"VND".equals(currency)) throw new BadRequestException("Tiện ích VND chỉ áp dụng cho đơn VND.");
        BigDecimal oldTaxable = booking.getBaseAmount().add(booking.getSurchargeAmount()).add(booking.getAddonAmount()).subtract(booking.getDiscountAmount());
        BigDecimal rate = frozen.hasNonNull("vatPercent") ? frozen.get("vatPercent").decimalValue()
                : oldTaxable.signum() > 0 ? booking.getTaxAmount().multiply(BigDecimal.valueOf(100)).divide(oldTaxable,2,RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal taxable = booking.getBaseAmount().add(booking.getSurchargeAmount()).add(amount).subtract(booking.getDiscountAmount());
        BigDecimal tax = taxable.multiply(rate).divide(BigDecimal.valueOf(100),2,RoundingMode.HALF_UP);
        var quote = PriceCalculationResponseDto.builder().resourceId(booking.getResource().getId()).unitPrice(previous.getUnitPrice())
                .durationHours(previous.getDurationHours()).priceType(booking.getPriceType()).baseAmount(booking.getBaseAmount())
                .surchargeAmount(booking.getSurchargeAmount()).addonAmount(amount).addons(selected).discountAmount(booking.getDiscountAmount())
                .vatPercent(rate).taxAmount(tax).serviceFeeAmount(booking.getServiceFeeAmount()).currency(currency)
                .finalPrice(taxable.add(tax).add(booking.getServiceFeeAmount()).setScale(2,RoundingMode.HALF_UP)).build();
        booking.setBaseAmount(quote.getBaseAmount());
        booking.setSurchargeAmount(quote.getSurchargeAmount());
        booking.setAddonAmount(quote.getAddonAmount());
        booking.setTaxAmount(quote.getTaxAmount());
        booking.setDiscountAmount(quote.getDiscountAmount());
        booking.setServiceFeeAmount(quote.getServiceFeeAmount());
        booking.setFinalPrice(quote.getFinalPrice());
        booking.setPricingSnapshot(buildPricingSnapshot(quote, booking.getResource()));
        booking.setPlatformFeeAmount(quote.getBaseAmount().add(quote.getSurchargeAmount()).add(quote.getAddonAmount())
                .multiply(getDecimalSetting("payment.platform_commission_percent", DEFAULT_COMMISSION_PERCENT))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
        bookingRepository.save(booking);
        return enrichBookingDto(booking);
    }

    private void requireIndividuallyBookable(BookableResourceModel resource) {
        if (resource.getParentRoom() != null) {
            throw new BadRequestException("Ghế này thuộc phòng. Vui lòng đặt nguyên phòng.");
        }
    }

    @Override
    public BookingResponseDto getBookingById(Long customerId, Long bookingId) {
        BookingModel booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đơn đặt chỗ với ID: " + bookingId));

        // Multi-Role Access Control: Customer (owner), Organizer (workspace host), or Platform Admin
        boolean isOwner = booking.getCustomer() != null && booking.getCustomer().getId().equals(customerId);
        boolean isHost = booking.getWorkspace() != null && booking.getWorkspace().getOrganizer() != null
                && booking.getWorkspace().getOrganizer().getId().equals(customerId);
        boolean isAdmin = isCallerAdmin(customerId);

        if (!isOwner && !isHost && !isAdmin) {
            throw new NotFoundException("Không tìm thấy đơn đặt chỗ với ID: " + bookingId);
        }

        return enrichBookingDto(booking);
    }

    @Override
    public BookingResponseDto getBookingByCode(Long customerId, String bookingCode) {
        BookingModel booking = bookingRepository.findByBookingCode(bookingCode)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đơn đặt chỗ với mã: " + bookingCode));

        // Multi-Role Access Control: Customer (owner), Organizer (workspace host), or Platform Admin
        boolean isOwner = booking.getCustomer() != null && booking.getCustomer().getId().equals(customerId);
        boolean isHost = booking.getWorkspace() != null && booking.getWorkspace().getOrganizer() != null
                && booking.getWorkspace().getOrganizer().getId().equals(customerId);
        boolean isAdmin = isCallerAdmin(customerId);

        if (!isOwner && !isHost && !isAdmin) {
            throw new NotFoundException("Không tìm thấy đơn đặt chỗ với mã: " + bookingCode);
        }

        return enrichBookingDto(booking);
    }

    @Override
    public PageResponseDTO<BookingResponseDto> getOrganizerBookings(
            Long organizerId,
            Long workspaceId,
            BookingStatus status,
            LocalDate date,
            LocalDate startDate,
            LocalDate endDate,
            PageRequestDTO pageRequest) {

        boolean isAdmin = isCallerAdmin(organizerId);

        // Strict Ownership Defense: If workspaceId is specified, verify organizer ownership
        if (workspaceId != null && workspaceId > 0) {
            WorkspaceModel workspace = workspaceRepository.findById(workspaceId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId));

            boolean isHost = workspace.getOrganizer() != null && workspace.getOrganizer().getId().equals(organizerId);
            if (!isHost && !isAdmin) {
                throw new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId);
            }
        }

        // Calculate time range
        LocalDateTime startTimeFrom = null;
        LocalDateTime startTimeTo = null;

        if (date != null) {
            startTimeFrom = date.atStartOfDay();
            startTimeTo = date.atTime(LocalTime.MAX);
        } else {
            if (startDate != null) {
                startTimeFrom = startDate.atStartOfDay();
            }
            if (endDate != null) {
                startTimeTo = endDate.atTime(LocalTime.MAX);
            }
        }

        Pageable pageable = PageRequest.of(
                Math.max(0, pageRequest.getPage() - 1),
                pageRequest.getSize(),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        String search = (pageRequest.getSearch() != null && !pageRequest.getSearch().trim().isEmpty())
                ? pageRequest.getSearch().trim()
                : null;

        Long targetWorkspaceId = (workspaceId != null && workspaceId > 0) ? workspaceId : null;

        Page<BookingModel> page = isAdmin
                ? bookingRepository.findAllBookingsAdmin(targetWorkspaceId, status, startTimeFrom, startTimeTo, search, pageable)
                : bookingRepository.findOrganizerBookings(organizerId, targetWorkspaceId, status, startTimeFrom, startTimeTo, search, pageable);

        return PageResponseDTO.from(page.map(BookingMapper::toDto));
    }

    @Override
    public PageResponseDTO<BookingResponseDto> getWorkspaceBookings(
            Long hostOrAdminId,
            Long workspaceId,
            BookingStatus status,
            LocalDate date,
            PageRequestDTO pageRequest) {
        return getOrganizerBookings(hostOrAdminId, workspaceId, status, date, null, null, pageRequest);
    }

    @Override
    public PageResponseDTO<BookingResponseDto> getAllBookings(Long adminId, PageRequestDTO pageRequest) {
        if (!isCallerAdmin(adminId)) {
            throw new BadRequestException("Chỉ quản trị viên hệ thống mới có quyền truy cập danh sách toàn bộ đơn đặt chỗ");
        }

        Pageable pageable = PageRequest.of(
                Math.max(0, pageRequest.getPage() - 1),
                pageRequest.getSize(),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        Page<BookingModel> page = bookingRepository.findAll(pageable);
        return PageResponseDTO.from(page.map(BookingMapper::toDto));
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponseDto> getOrganizerCalendarEvents(
            Long currentUserId,
            Long workspaceId,
            BookingStatus status,
            LocalDate date,
            LocalDate startDate,
            LocalDate endDate) {

        boolean isAdmin = isCallerAdmin(currentUserId);

        // Strict Ownership Defense
        if (workspaceId != null && workspaceId > 0) {
            WorkspaceModel workspace = workspaceRepository.findById(workspaceId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId));

            boolean isHost = workspace.getOrganizer() != null && workspace.getOrganizer().getId().equals(currentUserId);
            if (!isHost && !isAdmin) {
                throw new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId);
            }
        }

        LocalDateTime startTimeFrom = null;
        LocalDateTime startTimeTo = null;

        if (date != null) {
            startTimeFrom = date.atStartOfDay();
            startTimeTo = date.atTime(LocalTime.MAX);
        } else {
            if (startDate != null) {
                startTimeFrom = startDate.atStartOfDay();
            }
            if (endDate != null) {
                startTimeTo = endDate.atTime(LocalTime.MAX);
            }
        }

        Long targetWorkspaceId = (workspaceId != null && workspaceId > 0) ? workspaceId : null;

        List<BookingModel> bookings = isAdmin
                ? bookingRepository.findAllCalendarBookingsAdmin(targetWorkspaceId, status, startTimeFrom, startTimeTo)
                : bookingRepository.findOrganizerCalendarBookings(currentUserId, targetWorkspaceId, status, startTimeFrom, startTimeTo);

        return bookings.stream().map(BookingMapper::toDto).toList();
    }

    @Override
    public PageResponseDTO<BookingResponseDto> getMyBookings(Long customerId, BookingStatus status, PageRequestDTO pageRequest) {
        Pageable pageable = PageRequest.of(
                Math.max(0, pageRequest.getPage() - 1),
                pageRequest.getSize(),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        Page<BookingModel> page = (status != null)
                ? bookingRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(customerId, status, pageable)
                : bookingRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable);

        return PageResponseDTO.from(page.map(BookingMapper::toDto));
    }

    @Override
    public List<ResourceAvailabilityDto> getFloorAvailability(
            Long workspaceId, Long floorId, LocalDateTime startTime, LocalDateTime endTime) {
        return getFloorAvailability(workspaceId, floorId, startTime, endTime, null);
    }

    @Override
    public List<ResourceAvailabilityDto> getFloorAvailability(
            Long workspaceId, Long floorId, LocalDateTime startTime, LocalDateTime endTime, Long currentUserId) {

        validateTimeRange(startTime, endTime);

        List<BookableResourceModel> resources;
        if (floorId != null) {
            resources = resourceRepository.findByFloorPlanId(floorId);
        } else {
            resources = resourceRepository.findByFloorPlanWorkspaceIdAndStatusNot(
                    workspaceId, BookableResourceStatus.ARCHIVED);
        }

        LocalDateTime now = LocalDateTime.now();
        var occupancyMap = floorId != null
                ? resourceUsageRepository.occupancy(floorId, startTime, endTime, now)
                : resourceUsageRepository.occupancyByWorkspace(workspaceId, startTime, endTime, now);
        Set<Long> maintenanceIds = occupancyMap.entrySet().stream()
                .filter(entry -> entry.getValue().contains(AvailabilityState.MAINTENANCE))
                .map(Map.Entry::getKey).collect(Collectors.toSet());
        boolean suspended = workspaceRepository.findById(workspaceId)
                .map(WorkspaceModel::getOrganizer)
                .flatMap(organizer -> organizerProfiles.findByOrganizerId(organizer.getId()))
                .filter(profile -> profile.isSuspended()).isPresent();

        // Thu thập các ID tài nguyên mà chính người dùng hiện tại đang giữ chỗ còn hiệu lực
        Set<Long> myHeldResourceIds = currentUserId != null
                ? bookingRepository.findByCustomerIdAndStatus(currentUserId, BookingStatus.PENDING_PAYMENT).stream()
                        .filter(b -> b.getHoldExpiresAt() != null && b.getHoldExpiresAt().isAfter(now))
                        .filter(b -> b.getResource() != null)
                        .map(b -> b.getResource().getId())
                        .collect(Collectors.toSet())
                : Collections.emptySet();

        var childrenByRoom = resources.stream().filter(child -> child.getParentRoom() != null)
                .collect(Collectors.groupingBy(child -> child.getParentRoom().getId()));
        List<ResourceAvailabilityDto> results = new ArrayList<>();
        for (BookableResourceModel res : resources) {
            if (!workspaceId.equals(res.getFloorPlan().getWorkspace().getId())
                    || res.getStatus() == BookableResourceStatus.ARCHIVED) continue;
            var publishedPlacement = PublishedGeometry.read(res.getFloorPlan());
            if (res.getStatus() == BookableResourceStatus.DRAFT
                    && (publishedPlacement == null || !publishedPlacement.containsKey(res.getId()))) continue;
            Set<AvailabilityState> flags = new HashSet<>(occupancyMap.getOrDefault(res.getId(), Collections.emptySet()));
            if (res.getParentRoom() != null)
                flags.addAll(occupancyMap.getOrDefault(res.getParentRoom().getId(), Collections.emptySet()));
            // Child maintenance reduces capacity; a live child reservation still excludes a room booking.
            var children = childrenByRoom.getOrDefault(res.getId(), Collections.emptyList());
            for (var child : children) {
                var childFlags = occupancyMap.getOrDefault(child.getId(), Collections.emptySet());
                if (childFlags.contains(AvailabilityState.BOOKED)) flags.add(AvailabilityState.BOOKED);
                if (childFlags.contains(AvailabilityState.LOCKED)) flags.add(AvailabilityState.LOCKED);
            }
            int availableCapacity = ResourceMaintenance.capacity(res, children, maintenanceIds);
            if (availableCapacity == 0) flags.add(AvailabilityState.MAINTENANCE);

            boolean isOccupiedByMe = myHeldResourceIds.contains(res.getId());

            AvailabilityState state = AvailabilityState.AVAILABLE;
            if (flags.contains(AvailabilityState.MAINTENANCE)) {
                state = AvailabilityState.MAINTENANCE;
            } else if (res.getStatus() != BookableResourceStatus.ACTIVE
                    || res.getParentRoom() != null && res.getParentRoom().getStatus() != BookableResourceStatus.ACTIVE) {
                state = AvailabilityState.DISABLED;
            } else if (flags.contains(AvailabilityState.BOOKED)) {
                state = AvailabilityState.BOOKED;
            } else if (flags.contains(AvailabilityState.LOCKED)) {
                state = AvailabilityState.LOCKED;
            } else if (suspended) {
                state = AvailabilityState.DISABLED;
            }
            if (state == AvailabilityState.AVAILABLE && !PublishedGeometry.isCurrentPublishedPlacement(res))
                state = AvailabilityState.DISABLED;

            BigDecimal price = res.getPricePerHour() != null
                    ? res.getPricePerHour()
                    : (res.getResourceType() != null ? res.getResourceType().getPricePerHour() : BigDecimal.ZERO);

            // Nếu chính user này đang giữ chỗ (isOccupiedByMe = true), cho phép selectable để họ tiếp tục thanh toán
            boolean selectable = (state == AvailabilityState.AVAILABLE || (isOccupiedByMe && state == AvailabilityState.LOCKED))
                    && res.getParentRoom() == null
                    && res.getStatus() == BookableResourceStatus.ACTIVE
                    && res.getResourceType() != null && res.getResourceType().isActive();

            Integer capacity = availableCapacity;
            String typeName = res.getResourceType() != null ? res.getResourceType().getName() : null;

            results.add(ResourceAvailabilityDto.builder()
                    .resourceId(res.getId())
                    .code(res.getLabel())
                    .name(res.getName() != null ? res.getName() : res.getLabel())
                    .category(res.getResourceType() != null ? res.getResourceType().getCategory() : null)
                    .capacity(capacity)
                    .resourceTypeName(typeName)
                    .zoneName(res.getZoneName())
                    .pricePerHour(price)
                    .selectable(selectable)
                    .state(state)
                    .flags(flags)
                    .isOccupiedByMe(isOccupiedByMe)
                    .build());
        }

        return results;
    }

    @Override
    public BookingCancellationPreviewDto getCancellationPreview(Long currentUserId, Long bookingId) {
        BookingModel booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đơn đặt chỗ với ID: " + bookingId));
        boolean isOwner = booking.getCustomer() != null && booking.getCustomer().getId().equals(currentUserId);
        boolean isHost = booking.getWorkspace() != null && booking.getWorkspace().getOrganizer() != null
                && booking.getWorkspace().getOrganizer().getId().equals(currentUserId);
        boolean isAdmin = isCallerAdmin(currentUserId);
        if (!isOwner && !isHost && !isAdmin) throw new NotFoundException("Không tìm thấy đơn đặt chỗ với ID: " + bookingId);
        boolean canCancel = !List.of(BookingStatus.CANCELLED,BookingStatus.COMPLETED,BookingStatus.EXPIRED,
                BookingStatus.CHECKED_IN,BookingStatus.NO_SHOW).contains(booking.getStatus());
        boolean host = isHost || isAdmin;
        LocalDateTime now = LocalDateTime.now();
        List<base.api.feature.workspace.dto.response.CancellationRuleDto> rules = List.of();
        if (booking.getStatus() == BookingStatus.CONFIRMED && !host) {
            rules = base.api.feature.workspace.service.CancellationPolicies.readSnapshot(booking.getCancellationPolicySnapshot());
        } else if (booking.getCancellationPolicySnapshot() != null) {
            try { rules = base.api.feature.workspace.service.CancellationPolicies.readSnapshot(booking.getCancellationPolicySnapshot()); }
            catch (BadRequestException ignored) { /* Non-refundable or host-driven cancellation needs no customer policy. */ }
        }
        BigDecimal percent = BigDecimal.ZERO;
        if (canCancel && booking.getStatus() == BookingStatus.CONFIRMED) {
            percent = host ? BigDecimal.valueOf(100)
                    : base.api.feature.workspace.service.CancellationPolicies.refundPercent(rules,now,booking.getStartTime());
        }
        BigDecimal paidAmount = booking.getStatus() == BookingStatus.CONFIRMED
                ? base.api.feature.payment.service.BookingRefundAmount.settledTransaction(paymentTransactionRepository.findByBookingId(bookingId)).getAmount()
                : BigDecimal.ZERO;
        BigDecimal amount = base.api.feature.payment.service.BookingRefundAmount.calculate(paidAmount,percent);
        var items = rules.stream().map(rule -> BookingCancellationPreviewDto.CancellationRuleItemDto.builder()
                .minHoursBeforeStart(rule.minHoursBeforeStart().intValueExact()).refundPercent(rule.refundPercent())
                .label("Từ " + rule.minHoursBeforeStart().intValueExact() + " giờ trước khi bắt đầu: hoàn " + rule.refundPercent().toPlainString() + "%").build()).toList();
        String explanation = !canCancel ? "Trạng thái đơn không cho phép hủy qua luồng này."
                : booking.getStatus() != BookingStatus.CONFIRMED ? "Đơn chưa xác nhận: hủy và giải phóng chỗ, không phát sinh khoản hoàn trong luồng này."
                : host ? "Organizer hoặc quản trị viên hủy đơn đã xác nhận: hoàn 100% giá trị đơn."
                : "Áp dụng chính sách đã chốt khi đặt: hoàn " + percent.toPlainString() + "%. Không dùng chính sách workspace đã sửa sau đó.";
        return BookingCancellationPreviewDto.builder().bookingId(booking.getId()).bookingCode(booking.getBookingCode())
                .status(booking.getStatus()).startTime(booking.getStartTime())
                .hoursBeforeStart(Math.max(0,Duration.between(now,booking.getStartTime()).toHours()))
                .finalPrice(paidAmount).refundPercent(percent).refundAmount(amount)
                .isHostCancellation(host).canCancel(canCancel).cancellationPolicyExplanation(explanation).rules(items).build();
    }

    @Override
    @Transactional
    public BookingResponseDto cancelBooking(Long customerId, Long bookingId, String cancelReason) {
        return cancelBooking(customerId, bookingId, base.api.feature.booking.dto.request.CancelBookingRequestDto.builder()
                .reason(cancelReason)
                .build());
    }

    @Override
    @Transactional
    public BookingResponseDto cancelBooking(Long customerId, Long bookingId, base.api.feature.booking.dto.request.CancelBookingRequestDto requestDto) {
        BookingModel booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đơn đặt chỗ với ID: " + bookingId));

        String cancelReason = requestDto != null ? requestDto.getReason() : null;

        boolean isOwner = booking.getCustomer() != null && booking.getCustomer().getId().equals(customerId);
        boolean isHost = booking.getWorkspace() != null && booking.getWorkspace().getOrganizer() != null
                && booking.getWorkspace().getOrganizer().getId().equals(customerId);
        boolean isAdmin = isCallerAdmin(customerId);

        if (!isOwner && !isHost && !isAdmin) {
            throw new NotFoundException("Không tìm thấy đơn đặt chỗ với ID: " + bookingId);
        }

        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.COMPLETED
                || booking.getStatus() == BookingStatus.EXPIRED || booking.getStatus() == BookingStatus.CHECKED_IN
                || booking.getStatus() == BookingStatus.NO_SHOW) {
            throw new BadRequestException("Không thể hủy đơn đặt chỗ ở trạng thái hiện tại: " + booking.getStatus());
        }

        CancelSource cancelSource;
        if (isAdmin) {
            cancelSource = CancelSource.ADMINISTRATOR;
        } else if (isHost) {
            cancelSource = CancelSource.ORGANIZER;
        } else {
            cancelSource = CancelSource.CUSTOMER;
        }

        LocalDateTime now = LocalDateTime.now();
        BigDecimal refundPercent = BigDecimal.ZERO;
        BigDecimal refundAmount = BigDecimal.ZERO;

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            if (cancelSource == CancelSource.ORGANIZER || cancelSource == CancelSource.ADMINISTRATOR) {
                refundPercent = BigDecimal.valueOf(100);
            } else {
                var policy = base.api.feature.workspace.service.CancellationPolicies.readSnapshot(booking.getCancellationPolicySnapshot());
                refundPercent = base.api.feature.workspace.service.CancellationPolicies.refundPercent(policy,now,booking.getStartTime());
            }
            var charge = base.api.feature.payment.service.BookingRefundAmount.settledTransaction(paymentTransactionRepository.findByBookingId(bookingId));
            refundAmount = base.api.feature.payment.service.BookingRefundAmount.calculate(charge.getAmount(),refundPercent);
        }

        if (refundAmount.signum() > 0) refundPayouts.reserve(booking);
        BookingStatus previousStatus = booking.getStatus();
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setHoldExpiresAt(null);
        booking.setCancelledAt(now);
        booking.setCancelSource(cancelSource);
        booking.setCancelReason(cancelReason != null && !cancelReason.isBlank()
                ? cancelReason
                : (cancelSource == CancelSource.ORGANIZER ? "Organizer cancelled reservation" : "Customer cancelled reservation"));

        BookingModel updated = bookingRepository.save(booking);

        UserModel actor = userRepository.findById(customerId).orElse(booking.getCustomer());

        // Create Refund Request if refundAmount > 0 and transaction exists
        if (refundAmount.compareTo(BigDecimal.ZERO) > 0) {
            PaymentTransactionModel tx = base.api.feature.payment.service.BookingRefundAmount.settledTransaction(paymentTransactionRepository.findByBookingId(updated.getId()));
            RefundRequestModel refund = new RefundRequestModel();
            refund.setBooking(updated);
            refund.setPaymentTransaction(tx);
            refund.setRequestedBy(actor);
            refund.setSource(cancelSource == CancelSource.ORGANIZER ? RefundSource.ORGANIZER_CANCEL : cancelSource == CancelSource.ADMINISTRATOR ? RefundSource.ADMIN_DISPUTE : RefundSource.CUSTOMER_CANCEL);
            refund.setReason(updated.getCancelReason());
            refund.setRequestedAmount(refundAmount);
            refund.setStatus(RefundStatus.PENDING);
            if (requestDto != null) {
                refund.setBankName(requestDto.getBankName());
                refund.setBankBin(requestDto.getBankBin());
                refund.setBankAccountNumber(requestDto.getBankAccountNumber());
                refund.setBankAccountName(requestDto.getBankAccountName() != null ? requestDto.getBankAccountName().toUpperCase() : null);
            }
            RefundRequestModel savedRefund = refundRequestRepository.save(refund);
            notificationService.sendRefundRequestedNotification(savedRefund);
        }

        auditService.log(
                actor,
                "BOOKING",
                "CANCEL",
                "Booking",
                updated.getId(),
                "Hủy đơn đặt chỗ " + updated.getBookingCode() + " từ trạng thái " + previousStatus
                        + " bởi " + cancelSource
                        + (cancelReason != null && !cancelReason.isBlank() ? " (Lý do: " + cancelReason + ")" : "")
                        + (refundAmount.compareTo(BigDecimal.ZERO) > 0 ? " (Hoàn " + refundPercent + "%: " + refundAmount + " VND)" : "")
        );

        log.info("Booking cancelled successfully: id={}, code={}, source={}, previousStatus={}, refundPercent={}%, refundAmount={}",
                updated.getId(), updated.getBookingCode(), cancelSource, previousStatus, refundPercent, refundAmount);

        // Đồng bộ trạng thái giải phóng tài nguyên thời gian thực
        if (resourceStateSyncService != null) {
            resourceStateSyncService.syncOnBookingCancelled(updated);
        }

        // Gửi thông báo hủy đặt chỗ (In-App + Email) cho khách hàng
        notificationService.sendBookingCancelledNotification(updated, refundAmount, updated.getCancelReason());

        // Nếu người hủy không phải là Organizer, gửi thông báo cho Organizer của không gian
        if (cancelSource != CancelSource.ORGANIZER) {
            notificationService.sendBookingCancelledToOrganizerNotification(updated, updated.getCancelReason());
        }

        return BookingMapper.toDto(updated, refundPercent, refundAmount);
    }

    @Override
    @Transactional
    public BookingResponseDto approveBooking(Long currentUserId, Long bookingId) {
        BookingModel booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đơn đặt chỗ với ID: " + bookingId));

        boolean isAdmin = isCallerAdmin(currentUserId);
        boolean isHost = booking.getWorkspace() != null && booking.getWorkspace().getOrganizer() != null
                && booking.getWorkspace().getOrganizer().getId().equals(currentUserId);

        if (!isHost && !isAdmin) {
            throw new NotFoundException("Không tìm thấy đơn đặt chỗ với ID: " + bookingId);
        }

        if (booking.getStatus() != BookingStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Chỉ có thể phê duyệt đơn đặt chỗ đang chờ duyệt (PENDING_APPROVAL). Trạng thái hiện tại: " + booking.getStatus());
        }

        BookingStatus targetStatus;
        if (booking.getFinalPrice() == null || booking.getFinalPrice().compareTo(BigDecimal.ZERO) <= 0) {
            targetStatus = BookingStatus.CONFIRMED;
            booking.setHoldExpiresAt(null);
        } else {
            targetStatus = BookingStatus.PENDING_PAYMENT;
            // Renewed hold window for customer to complete payment (reads DB setting or fallback to BOOKING_HOLD_MINUTES)
            booking.setHoldExpiresAt(LocalDateTime.now().plusMinutes(getEffectiveHoldMinutes()));
        }

        booking.setStatus(targetStatus);
        BookingModel updated = bookingRepository.save(booking);

        UserModel actor = userRepository.findById(currentUserId).orElse(booking.getWorkspace().getOrganizer());
        auditService.log(
                actor,
                "BOOKING",
                "APPROVE",
                "Booking",
                updated.getId(),
                "Organizer phê duyệt đơn đặt chỗ " + updated.getBookingCode() + " chuyển sang " + targetStatus
        );

        log.info("Booking approved successfully: id={}, code={}, newStatus={}",
                updated.getId(), updated.getBookingCode(), targetStatus);

        if (resourceStateSyncService != null) {
            if (targetStatus == BookingStatus.CONFIRMED) {
                resourceStateSyncService.syncOnBookingConfirmed(updated);
            } else if (targetStatus == BookingStatus.PENDING_PAYMENT) {
                resourceStateSyncService.syncOnHoldCreated(updated);
            }
        }

        return BookingMapper.toDto(updated);
    }

    @Override
    @Transactional
    public BookingResponseDto rejectBooking(Long currentUserId, Long bookingId, String rejectionReason) {
        BookingModel booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đơn đặt chỗ với ID: " + bookingId));

        boolean isAdmin = isCallerAdmin(currentUserId);
        boolean isHost = booking.getWorkspace() != null && booking.getWorkspace().getOrganizer() != null
                && booking.getWorkspace().getOrganizer().getId().equals(currentUserId);

        if (!isHost && !isAdmin) {
            throw new NotFoundException("Không tìm thấy đơn đặt chỗ với ID: " + bookingId);
        }

        if (booking.getStatus() != BookingStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Chỉ có thể từ chối đơn đặt chỗ đang chờ duyệt (PENDING_APPROVAL). Trạng thái hiện tại: " + booking.getStatus());
        }

        String reason = (rejectionReason != null && !rejectionReason.isBlank())
                ? rejectionReason.trim()
                : "Organizer từ chối duyệt đơn đặt chỗ";

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelSource(CancelSource.ORGANIZER);
        booking.setCancelReason(reason);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setHoldExpiresAt(null);

        BookingModel updated = bookingRepository.save(booking);

        UserModel actor = userRepository.findById(currentUserId).orElse(booking.getWorkspace().getOrganizer());
        auditService.log(
                actor,
                "BOOKING",
                "REJECT",
                "Booking",
                updated.getId(),
                "Organizer từ chối đơn đặt chỗ " + updated.getBookingCode() + " (Lý do: " + reason + ")"
        );

        log.info("Booking rejected successfully: id={}, code={}, reason={}",
                updated.getId(), updated.getBookingCode(), reason);

        if (resourceStateSyncService != null) {
            resourceStateSyncService.syncOnBookingCancelled(updated);
        }

        // Gửi thông báo từ chối đặt chỗ (In-App + Email)
        notificationService.sendBookingCancelledNotification(updated, BigDecimal.ZERO, updated.getCancelReason());

        return BookingMapper.toDto(updated);
    }

    @Override
    @Transactional
    public int expireOutdatedHolds() {
        LocalDateTime now = LocalDateTime.now();
        List<BookingModel> expiredList = bookingRepository.findByStatusAndHoldExpiresAtBefore(
                BookingStatus.PENDING_PAYMENT, now);

        if (expiredList.isEmpty()) {
            return 0;
        }

        int count = 0;
        for (BookingModel b : expiredList) {
            b.setStatus(BookingStatus.EXPIRED);
            bookingRepository.save(b);
            count++;

            notificationService.sendPaymentFailedNotification(null, b, "Hết thời gian giữ chỗ tạm thời (Hold Expiry)");

            auditService.log(
                    b.getCustomer(),
                    "BOOKING",
                    "EXPIRE_HOLD",
                    "Booking",
                    b.getId(),
                    "Đơn giữ chỗ " + b.getBookingCode() + " đã hết thời gian giữ chỗ và tự động giải phóng"
            );
        }

        log.info("Expired {} outdated booking holds at {}", count, now);
        return count;
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private boolean isCallerAdmin(Long customerId) {
        if (currentUserProvider != null) {
            try {
                if (currentUserProvider.isAdmin()) {
                    return true;
                }
            } catch (Exception ignored) {
            }
        }
        if (customerId == null) {
            return false;
        }
        return userRepository.findById(customerId)
                .map(u -> u.getRoleEntity() != null &&
                        ("ADMIN".equalsIgnoreCase(u.getRoleEntity().getName()) ||
                         "ROLE_ADMIN".equalsIgnoreCase(u.getRoleEntity().getName())))
                .orElse(false);
    }

    private void validateTimeRange(LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime == null || endTime == null) {
            throw new BadRequestException("Thời gian bắt đầu và kết thúc không được để trống");
        }

        if (!endTime.isAfter(startTime)) {
            throw new BadRequestException("Thời gian kết thúc phải diễn ra sau thời gian bắt đầu");
        }

        LocalDateTime now = LocalDateTime.now();
        // Allow 5 minutes clock drift / submission lag
        if (startTime.isBefore(now.minusMinutes(5))) {
            throw new BadRequestException("Thời gian bắt đầu không được ở quá khứ");
        }

        long durationMinutes = Duration.between(startTime, endTime).toMinutes();
        if (durationMinutes < 30) {
            throw new BadRequestException("Thời lượng đặt chỗ tối thiểu là 30 phút");
        }

        int maxAdvanceDays = getIntSetting("booking.max_advance_days", DEFAULT_MAX_ADVANCE_DAYS);
        if (startTime.isAfter(now.plusDays(maxAdvanceDays))) {
            throw new BadRequestException("Không thể đặt chỗ trước quá " + maxAdvanceDays + " ngày");
        }
    }

    @org.springframework.beans.factory.annotation.Autowired private base.api.feature.workspace.service.WorkspaceHolidayService workspaceHolidays;
    private void validateOperatingHours(Long workspaceId, LocalDateTime startTime, LocalDateTime endTime) {
        workspaceHolidays.validate(workspaceId,startTime,endTime);
        if (maintenanceGroups.wholeWorkspaceOverlaps(workspaceId,startTime,endTime)) throw new base.api.shared.exception.ConflictException("Không gian có lịch bảo trì trong khoảng đặt chỗ.");
        base.api.feature.workspace.service.OperatingHours.validate(
                operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspaceId), startTime, endTime);
    }

    private String getDayOfWeekName(int dayOfWeek) {
        return switch (dayOfWeek) {
            case 1 -> "Thứ Hai";
            case 2 -> "Thứ Ba";
            case 3 -> "Thứ Tư";
            case 4 -> "Thứ Năm";
            case 5 -> "Thứ Sáu";
            case 6 -> "Thứ Bảy";
            case 7 -> "Chủ Nhật";
            default -> "ngày này";
        };
    }

    private PriceCalculationResponseDto computePrice(
            WorkspaceModel workspace, BookableResourceModel resource,
            LocalDateTime startTime, LocalDateTime endTime, PriceType priceType, List<Long> amenityIds) {

        var baseQuote = base.api.feature.pricing.service.BookingBaseRates.quote(resource, startTime, endTime, priceType);
        PriceType effectivePriceType = baseQuote.priceType();
        BigDecimal unitPrice = baseQuote.unitPrice();
        BigDecimal durationHours = baseQuote.durationHours();
        BigDecimal baseAmount = baseQuote.baseAmount();

        BigDecimal surchargeAmount = base.api.feature.pricing.service.PricingAdjustments.surcharge(
                pricingRuleRepository.findByWorkspaceId(workspace.getId()), resource, startTime, endTime, baseAmount);

        BigDecimal discountAmount = BigDecimal.ZERO;

        var selectedAddons = addons.quote(workspace.getId(), amenityIds, startTime, endTime);
        BigDecimal addonAmount = selectedAddons.stream().map(base.api.feature.booking.service.BookingAddons.Item::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal taxableBase = baseAmount.add(surchargeAmount).add(addonAmount);
        BigDecimal vatPercent = getDecimalSetting("payment.vat_percent", DEFAULT_VAT_PERCENT);
        BigDecimal taxAmount = taxableBase.multiply(vatPercent)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        // NexSpace charges the organizer's commission only; customers pay no platform service fee.
        BigDecimal serviceFeeAmount = BigDecimal.ZERO.setScale(2);

        BigDecimal finalPrice = taxableBase.subtract(discountAmount)
                .add(taxAmount)
                .add(serviceFeeAmount)
                .setScale(2, RoundingMode.HALF_UP);

        String currency = "VND";
        if (resource.getResourceType() != null && resource.getResourceType().getCurrency() != null) {
            currency = resource.getResourceType().getCurrency().name();
        }

        if (addonAmount.signum() > 0 && !"VND".equals(currency)) throw new BadRequestException("Tiện ích VND chỉ áp dụng cho đơn VND.");
        return PriceCalculationResponseDto.builder()
                .resourceId(resource.getId())
                .resourceName(resource.getName() != null ? resource.getName() : resource.getLabel())
                .resourceCode(resource.getLabel())
                .priceType(effectivePriceType)
                .unitPrice(unitPrice)
                .durationHours(durationHours)
                .baseAmount(baseAmount)
                .surchargeAmount(surchargeAmount)
                .addonAmount(addonAmount)
                .addons(selectedAddons)
                .vatPercent(vatPercent)
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
        return "BK-" + datePrefix + "-" + System.currentTimeMillis() % 1000000;
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

    private String buildPricingSnapshot(PriceCalculationResponseDto priceCalc, BookableResourceModel resource, BigDecimal addonAmount) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("resourceId", resource.getId());
        map.put("resourceCode", resource.getLabel());
        map.put("unitPrice", priceCalc.getUnitPrice());
        map.put("durationHours", priceCalc.getDurationHours());
        map.put("baseAmount", priceCalc.getBaseAmount());
        map.put("surchargeAmount", priceCalc.getSurchargeAmount());
        map.put("addonAmount", priceCalc.getAddonAmount());
        map.put("addons", priceCalc.getAddons());
        map.put("vatPercent", priceCalc.getVatPercent());
        map.put("addonAmount", addonAmount != null ? addonAmount : BigDecimal.ZERO);
        map.put("taxAmount", priceCalc.getTaxAmount());
        map.put("serviceFeeAmount", priceCalc.getServiceFeeAmount());
        map.put("discountAmount", priceCalc.getDiscountAmount());
        BigDecimal finalPrice = priceCalc.getFinalPrice().add(addonAmount != null ? addonAmount : BigDecimal.ZERO);
        map.put("finalPrice", finalPrice);
        map.put("currency", priceCalc.getCurrency());
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    private String buildCancellationPolicySnapshot(Long workspaceId) {
        return base.api.feature.workspace.service.CancellationPolicies.systemSnapshot();
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

    private int getEffectiveHoldMinutes() {
        return platformSettingRepository.findById("booking.hold_ttl_minutes")
                .or(() -> platformSettingRepository.findById("booking_hold_minutes"))
                .map(PlatformSettingModel::getSettingValue)
                .map(val -> {
                    try {
                        return Integer.parseInt(val.trim());
                    } catch (Exception e) {
                        return DEFAULT_HOLD_DURATION_MINUTES;
                    }
                })
                .orElse(DEFAULT_HOLD_DURATION_MINUTES);
    }

    private int getEffectiveMaxActiveHolds() {
        return platformSettingRepository.findById("booking.max_active_holds")
                .or(() -> platformSettingRepository.findById("booking_max_active_holds"))
                .map(PlatformSettingModel::getSettingValue)
                .map(val -> {
                    try {
                        return Integer.parseInt(val.trim());
                    } catch (Exception e) {
                        return DEFAULT_MAX_ACTIVE_HOLDS;
                    }
                })
                .orElse(DEFAULT_MAX_ACTIVE_HOLDS);
    }

    private int getIntSetting(String key, int defaultValue) {
        return platformSettingRepository.findById(key)
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

    private int getEffectiveSpamHoldThreshold() {
        return platformSettingRepository.findById("booking.spam_hold_threshold")
                .or(() -> platformSettingRepository.findById("booking_spam_hold_threshold"))
                .map(PlatformSettingModel::getSettingValue)
                .map(val -> {
                    try {
                        return Integer.parseInt(val.trim());
                    } catch (Exception e) {
                        return spamHoldThreshold;
                    }
                })
                .orElse(spamHoldThreshold);
    }

    private int getEffectiveSpamHoldBlockMinutes() {
        return platformSettingRepository.findById("booking.spam_hold_block_minutes")
                .or(() -> platformSettingRepository.findById("booking_spam_hold_block_minutes"))
                .map(PlatformSettingModel::getSettingValue)
                .map(val -> {
                    try {
                        return Integer.parseInt(val.trim());
                    } catch (Exception e) {
                        return spamHoldBlockMinutes;
                    }
                })
                .orElse(spamHoldBlockMinutes);
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
            long minutesRemaining = Math.max(1, java.time.Duration.between(now, customer.getBookingSuspendedUntil()).toMinutes() + 1);
            throw new BadRequestException("Tài khoản của bạn tạm thời bị khóa quyền giữ chỗ và đặt phòng/ghế trong vòng "
                    + minutesRemaining + " phút (đến " + customer.getBookingSuspendedUntil().format(DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"))
                    + ") do vi phạm quy tắc giữ chỗ quá " + effectiveThreshold + " lần mà không thanh toán.");
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

                long minutesRemaining = Math.max(1, java.time.Duration.between(now, blockUntil).toMinutes() + 1);
                throw new BadRequestException("Tài khoản của bạn tạm thời bị khóa quyền giữ chỗ và đặt phòng/ghế trong vòng "
                        + minutesRemaining + " phút (đến " + blockUntil.format(DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"))
                        + ") do vi phạm quy tắc giữ chỗ quá " + effectiveThreshold + " lần mà không thanh toán.");
            }
        }
    }

    private BookingResponseDto enrichBookingDto(BookingModel booking) {
        BookingResponseDto dto = BookingMapper.toDto(booking);
        if (dto == null) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now();
        int effectiveThreshold = getEffectiveSpamHoldThreshold();
        int effectiveBlockMinutes = getEffectiveSpamHoldBlockMinutes();
        int remainingAttempts = effectiveThreshold;
        boolean isSuspended = false;
        LocalDateTime suspendedUntil = null;

        if (booking.getCustomer() != null) {
            UserModel customer = booking.getCustomer();
            if (customer.getBookingSuspendedUntil() != null && now.isBefore(customer.getBookingSuspendedUntil())) {
                isSuspended = true;
                suspendedUntil = customer.getBookingSuspendedUntil();
            }
            LocalDateTime effectiveSince = calculateEffectiveUnpaidSince(customer.getId(), now);
            int unpaidCount = bookingRepository.findRecentUnpaidHolds(customer.getId(), effectiveSince).size();
            remainingAttempts = Math.max(0, effectiveThreshold - unpaidCount);
        }

        int effectiveHoldMinutes = getEffectiveHoldMinutes();

        return BookingResponseDto.builder()
                .id(dto.getId())
                .bookingCode(dto.getBookingCode())
                .status(dto.getStatus())
                .confirmationMode(dto.getConfirmationMode())
                .holdExpiresAt(dto.getHoldExpiresAt())
                .remainingSeconds(dto.getRemainingSeconds())
                .serverTime(now)
                .holdDurationMinutes(dto.getHoldDurationMinutes() != null ? dto.getHoldDurationMinutes() : effectiveHoldMinutes)
                .remainingHoldAttempts(remainingAttempts)
                .maxHoldAttempts(effectiveThreshold)
                .penaltyBlockMinutes(effectiveBlockMinutes)
                .isBookingSuspended(isSuspended)
                .bookingSuspendedUntil(suspendedUntil)
                .createdAt(dto.getCreatedAt())
                .workspaceId(dto.getWorkspaceId())
                .workspaceName(dto.getWorkspaceName())
                .workspaceAddress(dto.getWorkspaceAddress())
                .workspaceCity(dto.getWorkspaceCity())
                .workspaceDistrict(dto.getWorkspaceDistrict())
                .resourceId(dto.getResourceId())
                .resourceCode(dto.getResourceCode())
                .resourceName(dto.getResourceName())
                .resourceCategory(dto.getResourceCategory())
                .floorName(dto.getFloorName())
                .floorNumber(dto.getFloorNumber())
                .zoneName(dto.getZoneName())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .durationHours(dto.getDurationHours())
                .partySize(dto.getPartySize())
                .priceType(dto.getPriceType())
                .unitPrice(dto.getUnitPrice())
                .baseAmount(dto.getBaseAmount())
                .surchargeAmount(dto.getSurchargeAmount())
                .addonAmount(dto.getAddonAmount())
                .discountAmount(dto.getDiscountAmount())
                .taxAmount(dto.getTaxAmount())
                .serviceFeeAmount(dto.getServiceFeeAmount())
                .finalPrice(dto.getFinalPrice())
                .customerId(dto.getCustomerId())
                .customerName(dto.getCustomerName())
                .customerEmail(dto.getCustomerEmail())
                .customerPhone(dto.getCustomerPhone())
                .qrTokenHash(dto.getQrTokenHash())
                .cancellationPolicySnapshot(dto.getCancellationPolicySnapshot())
                .pricingSnapshot(dto.getPricingSnapshot())
                .cancelReason(dto.getCancelReason())
                .cancelSource(dto.getCancelSource())
                .cancelledAt(dto.getCancelledAt())
                .refundPercent(dto.getRefundPercent())
                .refundAmount(dto.getRefundAmount())
                .build();
    }
}
