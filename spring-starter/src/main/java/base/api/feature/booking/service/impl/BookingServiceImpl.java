package base.api.feature.booking.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.dto.request.CalculatePriceRequestDto;
import base.api.feature.booking.dto.request.CreateBookingRequestDto;
import base.api.feature.booking.dto.response.BookingCancellationPreviewDto;
import base.api.feature.booking.dto.response.BookingResponseDto;
import base.api.feature.booking.dto.response.PriceCalculationResponseDto;
import base.api.feature.booking.dto.response.ResourceAvailabilityDto;
import base.api.feature.booking.mapper.BookingMapper;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.governance.repository.IPlatformSettingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.feature.payment.repository.IRefundRequestRepository;
import base.api.feature.pricing.repository.IPricingRuleRepository;
import base.api.feature.resource.dto.FloorManagement.AvailabilityState;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.repository.IResourceBlockedSlotRepository;
import base.api.feature.resource.repository.ResourceUsageRepository;
import base.api.feature.workspace.repository.IWorkspaceCancellationRuleRepository;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.entity.UserModel;
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
    private static final BigDecimal DEFAULT_SERVICE_FEE_PERCENT = new BigDecimal("0.00");
    private static final int DEFAULT_HOLD_TTL_MINUTES = 15;
    private static final int DEFAULT_MAX_ADVANCE_DAYS = 90;
    private static final int DEFAULT_MIN_ADVANCE_MINUTES = 0;

    private static final List<BookingStatus> ACTIVE_BOOKING_STATUSES = List.of(
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.PENDING_APPROVAL,
            BookingStatus.PENDING_PAYMENT
    );

    private final IBookingRepository bookingRepository;
    private final IBookableResourceRepository resourceRepository;
    private final IWorkspaceRepository workspaceRepository;
    private final IUserRepository userRepository;
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

    @Override
    @Transactional
    public BookingResponseDto createBooking(Long customerId, CreateBookingRequestDto dto) {
        // 1. Identify Customer
        UserModel customer = userRepository.findById(customerId)
                .orElseThrow(() -> new NotFoundException("Khách hàng không tồn tại"));

        if (customer.getStatus() != UserStatus.ACTIVE) {
            throw new BadRequestException("Tài khoản người dùng hiện đang bị vô hiệu hoá hoặc khoá");
        }

        // 2. Identify Workspace
        WorkspaceModel workspace = workspaceRepository.findById(dto.getWorkspaceId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + dto.getWorkspaceId()));

        if (workspace.getStatus() != WorkspaceStatus.ACTIVE) {
            throw new BadRequestException("Không gian làm việc hiện không ở trạng thái sẵn sàng nhận đặt chỗ");
        }

        // 3. Acquire Pessimistic Write Lock on Bookable Resource
        BookableResourceModel resource = resourceRepository.findByIdForUpdate(dto.getResourceId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy chỗ ngồi/phòng với ID: " + dto.getResourceId()));

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

        // 4. Validate Booking Time Range
        LocalDateTime startTime = dto.getStartTime();
        LocalDateTime endTime = dto.getEndTime();
        validateTimeRange(startTime, endTime);

        // 5. Validate Workspace Operating Hours
        validateOperatingHours(workspace.getId(), startTime, endTime);

        // 6. Check for Conflicting Active Bookings (including 15-min unexpired holds)
        LocalDateTime now = LocalDateTime.now();
        List<BookingModel> conflictingBookings = bookingRepository.findConflictingBookingsWithHold(
                resource.getId(), startTime, endTime, ACTIVE_BOOKING_STATUSES, now);

        if (!conflictingBookings.isEmpty()) {
            throw new ConflictException("Chỗ ngồi/phòng đã có người đặt hoặc đang được giữ chỗ trong khung thời gian này");
        }

        // 7. Check for Conflicting Blocked Slots
        List<ResourceBlockedSlotModel> conflictingBlockedSlots = blockedSlotRepository.findConflictingBlockedSlots(
                resource.getId(), startTime, endTime);

        if (!conflictingBlockedSlots.isEmpty()) {
            throw new ConflictException("Chỗ ngồi/phòng đang bị khoá tạm thời (bảo trì hoặc sự kiện riêng)");
        }

        // 8. Calculate Pricing & Tariffs
        PriceCalculationResponseDto priceCalc = computePrice(workspace, resource, startTime, endTime, dto.getPriceType());

        BigDecimal platformCommissionPercent = getDecimalSetting("payment.platform_commission_percent", DEFAULT_COMMISSION_PERCENT);
        BigDecimal platformFeeAmount = priceCalc.getBaseAmount()
                .multiply(platformCommissionPercent)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        int holdTtlMinutes = getIntSetting("booking.hold_ttl_minutes", DEFAULT_HOLD_TTL_MINUTES);
        LocalDateTime holdExpiresAt = now.plusMinutes(holdTtlMinutes);

        // 9. Generate Unique Booking Code
        String bookingCode = generateUniqueBookingCode();

        // 10. Generate QR Token Hash
        String qrTokenHash = generateQrTokenHash(bookingCode, customer.getId());

        // 11. Create Snapshots (Pricing & Cancellation Policies)
        String pricingSnapshot = buildPricingSnapshot(priceCalc, resource);
        String cancellationPolicySnapshot = buildCancellationPolicySnapshot(workspace.getId());

        // 12. Determine Initial Status
        BookingStatus initialStatus = workspace.getBookingConfirmationMode() == BookingConfirmationMode.MANUAL_APPROVAL
                ? BookingStatus.PENDING_APPROVAL
                : BookingStatus.PENDING_PAYMENT;

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

        return BookingMapper.toDto(savedBooking);
    }

    @Override
    public PriceCalculationResponseDto calculatePrice(CalculatePriceRequestDto dto) {
        WorkspaceModel workspace = workspaceRepository.findById(dto.getWorkspaceId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + dto.getWorkspaceId()));

        BookableResourceModel resource = resourceRepository.findById(dto.getResourceId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy chỗ ngồi/phòng với ID: " + dto.getResourceId()));

        validateTimeRange(dto.getStartTime(), dto.getEndTime());
        validateOperatingHours(workspace.getId(), dto.getStartTime(), dto.getEndTime());

        return computePrice(workspace, resource, dto.getStartTime(), dto.getEndTime(), dto.getPriceType());
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

        return BookingMapper.toDto(booking);
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

        return BookingMapper.toDto(booking);
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

        validateTimeRange(startTime, endTime);

        List<BookableResourceModel> resources;
        if (floorId != null) {
            resources = resourceRepository.findByFloorPlanId(floorId);
        } else {
            resources = resourceRepository.findByFloorPlanWorkspaceIdAndStatusNot(
                    workspaceId, BookableResourceStatus.DISABLED);
        }

        LocalDateTime now = LocalDateTime.now();
        var occupancyMap = floorId != null
                ? resourceUsageRepository.occupancy(floorId, startTime, endTime, now)
                : resourceUsageRepository.occupancyByWorkspace(workspaceId, startTime, endTime, now);

        List<ResourceAvailabilityDto> results = new ArrayList<>();
        for (BookableResourceModel res : resources) {
            Set<AvailabilityState> flags = occupancyMap.getOrDefault(res.getId(), Collections.emptySet());

            AvailabilityState state = AvailabilityState.AVAILABLE;
            if (res.getStatus() != BookableResourceStatus.ACTIVE) {
                state = AvailabilityState.MAINTENANCE;
            } else if (flags.contains(AvailabilityState.MAINTENANCE)) {
                state = AvailabilityState.MAINTENANCE;
            } else if (flags.contains(AvailabilityState.BOOKED)) {
                state = AvailabilityState.BOOKED;
            } else if (flags.contains(AvailabilityState.LOCKED)) {
                state = AvailabilityState.LOCKED;
            }

            BigDecimal price = res.getPricePerHour() != null
                    ? res.getPricePerHour()
                    : (res.getResourceType() != null ? res.getResourceType().getPricePerHour() : BigDecimal.ZERO);

            boolean selectable = state == AvailabilityState.AVAILABLE
                    && res.getStatus() == BookableResourceStatus.ACTIVE
                    && res.getResourceType() != null && res.getResourceType().isActive();

            Integer capacity = res.getCapacityOverride() != null
                    ? res.getCapacityOverride()
                    : (res.getResourceType() != null ? res.getResourceType().getCapacity() : 1);
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

        if (!isOwner && !isHost && !isAdmin) {
            throw new NotFoundException("Không tìm thấy đơn đặt chỗ với ID: " + bookingId);
        }

        boolean canCancel = booking.getStatus() != BookingStatus.CANCELLED
                && booking.getStatus() != BookingStatus.COMPLETED
                && booking.getStatus() != BookingStatus.EXPIRED
                && booking.getStatus() != BookingStatus.CHECKED_IN
                && booking.getStatus() != BookingStatus.NO_SHOW;

        LocalDateTime now = LocalDateTime.now();
        long hoursBeforeStart = Duration.between(now, booking.getStartTime()).toHours();

        List<WorkspaceCancellationRuleModel> rules = java.util.Collections.emptyList();
        if (booking.getWorkspace() != null) {
            rules = cancellationRuleRepository.findByWorkspaceIdOrderByMinHoursBeforeStartDesc(booking.getWorkspace().getId());
        }

        List<BookingCancellationPreviewDto.CancellationRuleItemDto> ruleItems = new java.util.ArrayList<>();
        for (WorkspaceCancellationRuleModel r : rules) {
            ruleItems.add(BookingCancellationPreviewDto.CancellationRuleItemDto.builder()
                    .minHoursBeforeStart(r.getMinHoursBeforeStart())
                    .refundPercent(r.getRefundPercent())
                    .label("Trước " + r.getMinHoursBeforeStart() + "h: hoàn " + r.getRefundPercent() + "%")
                    .build());
        }

        BigDecimal refundPercent = BigDecimal.ZERO;
        BigDecimal refundAmount = BigDecimal.ZERO;
        String explanation;

        boolean isHostOrAdmin = isHost || isAdmin;
        if (isHostOrAdmin) {
            refundPercent = BigDecimal.valueOf(100);
            refundAmount = booking.getFinalPrice() != null ? booking.getFinalPrice() : BigDecimal.ZERO;
            explanation = "Organizer/Host hủy đơn: Khách hàng được hoàn trả 100% toàn bộ chi phí theo chính sách bảo vệ người dùng.";
        } else if (booking.getStatus() == BookingStatus.PENDING_PAYMENT || booking.getStatus() == BookingStatus.PENDING_APPROVAL) {
            refundPercent = BigDecimal.ZERO;
            refundAmount = BigDecimal.ZERO;
            explanation = "Đơn đặt chỗ đang ở trạng thái chờ thanh toán/chờ duyệt. Chỗ ngồi sẽ được giải phóng ngay lập tức mà không phát sinh phí.";
        } else if (hoursBeforeStart <= 0) {
            refundPercent = BigDecimal.ZERO;
            refundAmount = BigDecimal.ZERO;
            explanation = "Đã quá thời gian bắt đầu sử dụng không gian. Không thể hoàn tiền.";
        } else {
            for (WorkspaceCancellationRuleModel r : rules) {
                if (hoursBeforeStart >= r.getMinHoursBeforeStart()) {
                    refundPercent = r.getRefundPercent();
                    break;
                }
            }
            if (refundPercent.compareTo(BigDecimal.ZERO) > 0 && booking.getFinalPrice() != null) {
                refundAmount = booking.getFinalPrice()
                        .multiply(refundPercent)
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            }
            explanation = "Hủy trước " + hoursBeforeStart + " giờ. Áp dụng chính sách hoàn trả " + refundPercent + "% giá trị đơn hàng.";
        }

        return BookingCancellationPreviewDto.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .status(booking.getStatus())
                .startTime(booking.getStartTime())
                .hoursBeforeStart(hoursBeforeStart)
                .finalPrice(booking.getFinalPrice())
                .refundPercent(refundPercent)
                .refundAmount(refundAmount)
                .isHostCancellation(isHostOrAdmin)
                .canCancel(canCancel)
                .cancellationPolicyExplanation(explanation)
                .rules(ruleItems)
                .build();
    }

    @Override
    @Transactional
    public BookingResponseDto cancelBooking(Long customerId, Long bookingId, String cancelReason) {
        BookingModel booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đơn đặt chỗ với ID: " + bookingId));

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
                // Host/Admin cancellation -> Full 100% refund
                refundPercent = BigDecimal.valueOf(100);
                refundAmount = booking.getFinalPrice() != null ? booking.getFinalPrice() : BigDecimal.ZERO;
            } else {
                // Customer cancellation -> Calculate from rules
                long hoursBeforeStart = Duration.between(now, booking.getStartTime()).toHours();
                if (hoursBeforeStart > 0 && booking.getWorkspace() != null) {
                    List<WorkspaceCancellationRuleModel> rules = cancellationRuleRepository
                            .findByWorkspaceIdOrderByMinHoursBeforeStartDesc(booking.getWorkspace().getId());
                    for (WorkspaceCancellationRuleModel r : rules) {
                        if (hoursBeforeStart >= r.getMinHoursBeforeStart()) {
                            refundPercent = r.getRefundPercent();
                            break;
                        }
                    }
                    if (refundPercent.compareTo(BigDecimal.ZERO) > 0 && booking.getFinalPrice() != null) {
                        refundAmount = booking.getFinalPrice()
                                .multiply(refundPercent)
                                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                    }
                }
            }
        }

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
        if (refundAmount.compareTo(BigDecimal.ZERO) > 0 && refundRequestRepository != null && paymentTransactionRepository != null) {
            try {
                List<PaymentTransactionModel> txs = paymentTransactionRepository.findByBookingId(updated.getId());
                if (txs != null && !txs.isEmpty()) {
                    PaymentTransactionModel tx = txs.get(0);
                    RefundRequestModel refund = new RefundRequestModel();
                    refund.setBooking(updated);
                    refund.setPaymentTransaction(tx);
                    refund.setRequestedBy(actor);
                    refund.setSource(cancelSource == CancelSource.ORGANIZER ? RefundSource.ORGANIZER_CANCEL : RefundSource.CUSTOMER_CANCEL);
                    refund.setReason(updated.getCancelReason());
                    refund.setRequestedAmount(refundAmount);
                    refund.setStatus(RefundStatus.PENDING);
                    refundRequestRepository.save(refund);
                }
            } catch (Exception e) {
                log.warn("Failed to create refund request record for cancelled booking {}: {}", updated.getId(), e.getMessage());
            }
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
            // 15-minute renewed hold window for customer to complete payment
            booking.setHoldExpiresAt(LocalDateTime.now().plusMinutes(15));
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

            auditService.log(
                    b.getCustomer(),
                    "BOOKING",
                    "EXPIRE_HOLD",
                    "Booking",
                    b.getId(),
                    "Đơn giữ chỗ " + b.getBookingCode() + " đã hết hạn 15 phút và tự động giải phóng"
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

    private void validateOperatingHours(Long workspaceId, LocalDateTime startTime, LocalDateTime endTime) {
        int dayOfWeek = startTime.getDayOfWeek().getValue(); // 1 = Monday ... 7 = Sunday
        List<WorkspaceOperatingHourModel> operatingHours = operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspaceId);

        if (operatingHours.isEmpty()) {
            return; // No restricted hours configured
        }

        WorkspaceOperatingHourModel dayHour = operatingHours.stream()
                .filter(h -> h.getId() != null && Objects.equals(h.getId().getDayOfWeek(), dayOfWeek))
                .findFirst()
                .orElse(null);

        if (dayHour == null) {
            return;
        }

        if (dayHour.isClosed()) {
            throw new BadRequestException("Không gian làm việc đóng cửa vào " + getDayOfWeekName(dayOfWeek));
        }

        if (dayHour.getOpenTime() != null && startTime.toLocalTime().isBefore(dayHour.getOpenTime())) {
            throw new BadRequestException("Thời gian bắt đầu (" + startTime.toLocalTime()
                    + ") trước giờ mở cửa của cơ sở (" + dayHour.getOpenTime() + ")");
        }

        if (dayHour.getCloseTime() != null && endTime.toLocalTime().isAfter(dayHour.getCloseTime())) {
            throw new BadRequestException("Thời gian kết thúc (" + endTime.toLocalTime()
                    + ") sau giờ đóng cửa của cơ sở (" + dayHour.getCloseTime() + ")");
        }
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
            LocalDateTime startTime, LocalDateTime endTime, PriceType priceType) {

        PriceType effectivePriceType = priceType != null ? priceType : PriceType.HOURLY;

        BigDecimal unitPrice = BigDecimal.ZERO;
        if (effectivePriceType == PriceType.HOURLY) {
            if (resource.getPricePerHour() != null) {
                unitPrice = resource.getPricePerHour();
            } else if (resource.getResourceType() != null && resource.getResourceType().getPricePerHour() != null) {
                unitPrice = resource.getResourceType().getPricePerHour();
            }
        } else if (effectivePriceType == PriceType.DAILY && resource.getResourceType() != null) {
            unitPrice = resource.getResourceType().getPricePerDay() != null
                    ? resource.getResourceType().getPricePerDay()
                    : BigDecimal.ZERO;
        }

        long totalMinutes = Duration.between(startTime, endTime).toMinutes();
        BigDecimal durationHours = BigDecimal.valueOf(totalMinutes)
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);

        BigDecimal baseAmount = unitPrice.multiply(durationHours).setScale(2, RoundingMode.HALF_UP);

        // Check active pricing rules
        BigDecimal surchargeAmount = BigDecimal.ZERO;
        List<PricingRuleModel> rules = pricingRuleRepository.findByWorkspaceId(workspace.getId());
        for (PricingRuleModel rule : rules) {
            if (!rule.isActive()) continue;
            if (rule.getMultiplier() != null && rule.getMultiplier().compareTo(BigDecimal.ONE) > 0) {
                BigDecimal ruleSurcharge = baseAmount.multiply(rule.getMultiplier().subtract(BigDecimal.ONE));
                surchargeAmount = surchargeAmount.add(ruleSurcharge);
            }
            if (rule.getFixedAmount() != null && rule.getFixedAmount().compareTo(BigDecimal.ZERO) > 0) {
                surchargeAmount = surchargeAmount.add(rule.getFixedAmount());
            }
        }
        surchargeAmount = surchargeAmount.setScale(2, RoundingMode.HALF_UP);

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
        List<WorkspaceCancellationRuleModel> rules = cancellationRuleRepository.findByWorkspaceIdOrderByMinHoursBeforeStartDesc(workspaceId);
        List<Map<String, Object>> list = new ArrayList<>();
        for (WorkspaceCancellationRuleModel r : rules) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("minHoursBeforeStart", r.getMinHoursBeforeStart());
            item.put("refundPercent", r.getRefundPercent());
            list.add(item);
        }
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            return "[]";
        }
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
}
