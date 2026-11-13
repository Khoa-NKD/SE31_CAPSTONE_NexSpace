package base.api.feature.resource.service.impl;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.resource.dto.response.DeskAvailabilityResponseDto;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.repository.IResourceBlockedSlotRepository;
import base.api.feature.resource.service.IResourceAvailabilityService;
import base.api.feature.resource.service.ResourceStateResolver;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.ResourceBlockedSlotModel;
import base.api.shared.entity.workspace.WorkspaceOperatingHourModel;
import base.api.shared.enums.BookableResourceStatus;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.ResourceCategory;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResourceAvailabilityServiceImpl implements IResourceAvailabilityService {

    private static final Set<BookingStatus> CONFIRMED_BOOKING_STATUSES = Set.of(
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.PENDING_APPROVAL
    );

    private final IWorkspaceRepository workspaceRepository;
    private final IWorkspaceOperatingHourRepository operatingHourRepository;
    private final IBookableResourceRepository bookableResourceRepository;
    private final IBookingRepository bookingRepository;
    private final IResourceBlockedSlotRepository blockedSlotRepository;

    @Override
    public List<DeskAvailabilityResponseDto> checkDeskAvailability(
            Long workspaceId,
            Long floorPlanId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Long currentUserId
    ) {
        // 1. Thẩm định tham số cơ bản
        validateInput(workspaceId, startTime, endTime);

        // 2. Kiểm tra sự tồn tại của Workspace
        if (!workspaceRepository.existsById(workspaceId)) {
            throw new NotFoundException("Không tìm thấy không gian làm việc với mã: " + workspaceId);
        }

        // 3. Kiểm tra giờ hoạt động của Workspace
        validateOperatingHours(workspaceId, startTime, endTime);

        // 4. Lấy danh sách tất cả các bàn (DESK) thuộc workspace/floorPlan
        List<BookableResourceModel> desks = bookableResourceRepository.findDeskResourcesForAvailability(
                workspaceId,
                floorPlanId,
                ResourceCategory.DESK,
                BookableResourceStatus.ARCHIVED
        );

        if (desks.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> deskIds = desks.stream()
                .map(BookableResourceModel::getId)
                .toList();

        LocalDateTime now = LocalDateTime.now();

        // 5. Truy vấn các booking xung đột (Batch Query chống N+1)
        List<BookingModel> overlappingBookings = bookingRepository.findOverlappingBookingsByResourceIds(
                deskIds,
                CONFIRMED_BOOKING_STATUSES,
                BookingStatus.PENDING_PAYMENT,
                now,
                startTime,
                endTime
        );

        Map<Long, List<BookingModel>> bookingsByResourceId = overlappingBookings.stream()
                .filter(b -> b.getResource() != null)
                .collect(Collectors.groupingBy(b -> b.getResource().getId()));

        // 6. Truy vấn các slot bị chặn xung đột (Batch Query chống N+1)
        List<ResourceBlockedSlotModel> overlappingBlockedSlots = blockedSlotRepository.findActiveBlockedSlotsByResourceIds(
                deskIds,
                startTime,
                endTime
        );

        Map<Long, List<ResourceBlockedSlotModel>> blockedSlotsByResourceId = overlappingBlockedSlots.stream()
                .filter(s -> s.getResource() != null)
                .collect(Collectors.groupingBy(s -> s.getResource().getId()));

        // 7. Phân giải trạng thái cho từng bàn và ánh xạ sang DTO
        return desks.stream()
                .map(desk -> mapToDeskAvailabilityResponse(
                        desk,
                        bookingsByResourceId.getOrDefault(desk.getId(), Collections.emptyList()),
                        blockedSlotsByResourceId.getOrDefault(desk.getId(), Collections.emptyList()),
                        now,
                        currentUserId
                ))
                .toList();
    }

    private void validateInput(Long workspaceId, LocalDateTime startTime, LocalDateTime endTime) {
        if (workspaceId == null) {
            throw new BadRequestException("Mã không gian làm việc không được để trống");
        }
        if (startTime == null || endTime == null) {
            throw new BadRequestException("Thời gian bắt đầu và kết thúc không được để trống");
        }

        LocalDateTime nowWithTolerance = LocalDateTime.now().minusMinutes(2);
        if (startTime.isBefore(nowWithTolerance)) {
            throw new BadRequestException("Thời gian bắt đầu không được trong quá khứ");
        }

        if (!endTime.isAfter(startTime)) {
            throw new BadRequestException("Thời gian kết thúc phải sau thời gian bắt đầu");
        }

        if (!startTime.toLocalDate().equals(endTime.toLocalDate())) {
            throw new BadRequestException("Đặt bàn làm việc chỉ áp dụng trong cùng một ngày hoạt động");
        }
    }

    private void validateOperatingHours(Long workspaceId, LocalDateTime startTime, LocalDateTime endTime) {
        DayOfWeek requestedDay = startTime.getDayOfWeek();
        int dayOfWeekValue = requestedDay.getValue(); // 1 = Thứ 2 ... 7 = Chủ nhật

        List<WorkspaceOperatingHourModel> operatingHours = operatingHourRepository
                .findByWorkspaceIdOrderByDayOfWeekAsc(workspaceId);

        WorkspaceOperatingHourModel todayHour = operatingHours.stream()
                .filter(h -> h.getId() != null && h.getId().getDayOfWeek() != null && h.getId().getDayOfWeek() == dayOfWeekValue)
                .findFirst()
                .orElse(null);

        if (todayHour == null || todayHour.isClosed()) {
            throw new BadRequestException("Không gian không mở cửa vào ngày " + getDayOfWeekVietnamese(requestedDay));
        }

        LocalTime openTime = todayHour.getOpenTime();
        LocalTime closeTime = todayHour.getCloseTime();
        LocalTime requestedStartTime = startTime.toLocalTime();
        LocalTime requestedEndTime = endTime.toLocalTime();

        if (openTime != null && requestedStartTime.isBefore(openTime)) {
            throw new BadRequestException(String.format(
                    "Thời gian bắt đầu (%s) sớm hơn giờ mở cửa của không gian (%s)",
                    requestedStartTime, openTime
            ));
        }

        if (closeTime != null && requestedEndTime.isAfter(closeTime)) {
            throw new BadRequestException(String.format(
                    "Thời gian kết thúc (%s) muộn hơn giờ đóng cửa của không gian (%s)",
                    requestedEndTime, closeTime
            ));
        }
    }

    private DeskAvailabilityResponseDto mapToDeskAvailabilityResponse(
            BookableResourceModel desk,
            List<BookingModel> bookings,
            List<ResourceBlockedSlotModel> blockedSlots,
            LocalDateTime now,
            Long currentUserId
    ) {
        ResourceStateResolver.ResourceResolutionResult resolution = ResourceStateResolver.resolve(
                desk,
                bookings,
                blockedSlots,
                now,
                currentUserId
        );

        BigDecimal effectivePricePerHour = desk.getPricePerHour() != null
                ? desk.getPricePerHour()
                : (desk.getResourceType() != null ? desk.getResourceType().getPricePerHour() : null);

        Long parentRoomId = desk.getParentRoom() != null ? desk.getParentRoom().getId() : null;

        return DeskAvailabilityResponseDto.builder()
                .resourceId(desk.getId())
                .label(desk.getLabel())
                .name(desk.getName())
                .zoneName(desk.getZoneName())
                .parentRoomId(parentRoomId)
                .pricePerHour(effectivePricePerHour)
                .status(resolution.status())
                .holdExpiresAt(resolution.holdExpiresAt())
                .isOccupiedByMe(resolution.isOccupiedByMe())
                .posX(desk.getPosX())
                .posY(desk.getPosY())
                .width(desk.getWidth())
                .height(desk.getHeight())
                .rotation(desk.getRotation())
                .build();
    }

    private String getDayOfWeekVietnamese(DayOfWeek day) {
        return switch (day) {
            case MONDAY -> "Thứ Hai";
            case TUESDAY -> "Thứ Ba";
            case WEDNESDAY -> "Thứ Tư";
            case THURSDAY -> "Thứ Năm";
            case FRIDAY -> "Thứ Sáu";
            case SATURDAY -> "Thứ Bảy";
            case SUNDAY -> "Chủ Nhật";
        };
    }
}

