package base.api.feature.resource.service.impl;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.resource.dto.response.DeskAvailabilityResponseDto;
import base.api.feature.resource.dto.response.RoomAvailabilityResponseDto;
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
import base.api.shared.enums.ResourceOccupancyStatus;
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
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResourceAvailabilityServiceImpl implements IResourceAvailabilityService {

    private static final int ROOM_CLEANING_BUFFER_MINUTES = 15;

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

        // 5. Truy vấn các booking xung đột của bàn (Batch Query chống N+1)
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

        // 6. Truy vấn các slot bị chặn xung đột của bàn (Batch Query chống N+1)
        List<ResourceBlockedSlotModel> overlappingBlockedSlots = blockedSlotRepository.findActiveBlockedSlotsByResourceIds(
                deskIds,
                startTime,
                endTime
        );

        Map<Long, List<ResourceBlockedSlotModel>> blockedSlotsByResourceId = overlappingBlockedSlots.stream()
                .filter(s -> s.getResource() != null)
                .collect(Collectors.groupingBy(s -> s.getResource().getId()));

        // 7. Chiều Ghế con -> Phòng cha (Child Desk -> Parent Room):
        // Nếu bàn thuộc một phòng (parentRoom != null) và phòng đó đang bị đặt nguyên căn hoặc bị khóa,
        // thì bàn con tự động chuyển thành BOOKED.
        List<Long> parentRoomIds = desks.stream()
                .map(BookableResourceModel::getParentRoom)
                .filter(Objects::nonNull)
                .map(BookableResourceModel::getId)
                .distinct()
                .toList();

        Map<Long, ResourceStateResolver.ResourceResolutionResult> parentRoomResolutions = Collections.emptyMap();
        if (!parentRoomIds.isEmpty()) {
            LocalDateTime roomBufferStartTime = startTime.minusMinutes(ROOM_CLEANING_BUFFER_MINUTES);
            LocalDateTime roomBufferEndTime = endTime.plusMinutes(ROOM_CLEANING_BUFFER_MINUTES);

            List<BookingModel> parentRoomBookings = bookingRepository.findOverlappingBookingsByResourceIds(
                    parentRoomIds,
                    CONFIRMED_BOOKING_STATUSES,
                    BookingStatus.PENDING_PAYMENT,
                    now,
                    roomBufferStartTime,
                    roomBufferEndTime
            );

            Map<Long, List<BookingModel>> parentBookingsMap = parentRoomBookings.stream()
                    .filter(b -> b.getResource() != null)
                    .collect(Collectors.groupingBy(b -> b.getResource().getId()));

            List<ResourceBlockedSlotModel> parentRoomBlockedSlots = blockedSlotRepository.findActiveBlockedSlotsByResourceIds(
                    parentRoomIds,
                    roomBufferStartTime,
                    roomBufferEndTime
            );

            Map<Long, List<ResourceBlockedSlotModel>> parentBlockedSlotsMap = parentRoomBlockedSlots.stream()
                    .filter(s -> s.getResource() != null)
                    .collect(Collectors.groupingBy(s -> s.getResource().getId()));

            // Phân giải trạng thái cho từng phòng cha
            Map<Long, BookableResourceModel> parentRoomsById = desks.stream()
                    .map(BookableResourceModel::getParentRoom)
                    .filter(Objects::nonNull)
                    .distinct()
                    .collect(Collectors.toMap(BookableResourceModel::getId, r -> r, (r1, r2) -> r1));

            parentRoomResolutions = parentRoomsById.entrySet().stream()
                    .collect(Collectors.toMap(
                            Map.Entry::getKey,
                            entry -> ResourceStateResolver.resolve(
                                    entry.getValue(),
                                    parentBookingsMap.getOrDefault(entry.getKey(), Collections.emptyList()),
                                    parentBlockedSlotsMap.getOrDefault(entry.getKey(), Collections.emptyList()),
                                    now,
                                    currentUserId
                            )
                    ));
        }

        // 8. Phân giải trạng thái cho từng bàn và ánh xạ sang DTO
        Map<Long, ResourceStateResolver.ResourceResolutionResult> finalParentRoomResolutions = parentRoomResolutions;
        return desks.stream()
                .map(desk -> mapToDeskAvailabilityResponse(
                        desk,
                        bookingsByResourceId.getOrDefault(desk.getId(), Collections.emptyList()),
                        blockedSlotsByResourceId.getOrDefault(desk.getId(), Collections.emptyList()),
                        finalParentRoomResolutions,
                        now,
                        currentUserId
                ))
                .toList();
    }

    @Override
    public List<RoomAvailabilityResponseDto> checkRoomAvailability(
            Long workspaceId,
            Long floorPlanId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Integer minCapacity,
            Long currentUserId
    ) {
        // 1. Thẩm định tham số cơ bản
        validateInput(workspaceId, startTime, endTime);

        if (minCapacity != null && minCapacity <= 0) {
            throw new BadRequestException("Sức chứa tối thiểu phải lớn hơn 0");
        }

        // 2. Kiểm tra sự tồn tại của Workspace
        if (!workspaceRepository.existsById(workspaceId)) {
            throw new NotFoundException("Không tìm thấy không gian làm việc với mã: " + workspaceId);
        }

        // 3. Kiểm tra giờ hoạt động của Workspace
        validateOperatingHours(workspaceId, startTime, endTime);

        // 4. Lấy danh sách các phòng (ROOM) thuộc workspace/floorPlan có sức chứa >= minCapacity
        List<BookableResourceModel> rooms = bookableResourceRepository.findRoomResourcesForAvailability(
                workspaceId,
                floorPlanId,
                ResourceCategory.ROOM,
                minCapacity,
                BookableResourceStatus.ARCHIVED
        );

        if (rooms.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> roomIds = rooms.stream()
                .map(BookableResourceModel::getId)
                .toList();

        LocalDateTime now = LocalDateTime.now();

        // 5. Thẩm định đệm thời gian dọn dẹp (Turnaround Buffer - 15 phút) cho phòng
        LocalDateTime roomBufferStartTime = startTime.minusMinutes(ROOM_CLEANING_BUFFER_MINUTES);
        LocalDateTime roomBufferEndTime = endTime.plusMinutes(ROOM_CLEANING_BUFFER_MINUTES);

        // 6. Truy vấn các booking xung đột của phòng (có tính buffer dọn dẹp)
        List<BookingModel> roomBookings = bookingRepository.findOverlappingBookingsByResourceIds(
                roomIds,
                CONFIRMED_BOOKING_STATUSES,
                BookingStatus.PENDING_PAYMENT,
                now,
                roomBufferStartTime,
                roomBufferEndTime
        );

        Map<Long, List<BookingModel>> roomBookingsMap = roomBookings.stream()
                .filter(b -> b.getResource() != null)
                .collect(Collectors.groupingBy(b -> b.getResource().getId()));

        // 7. Truy vấn các slot bị chặn của phòng (có tính buffer dọn dẹp)
        List<ResourceBlockedSlotModel> roomBlockedSlots = blockedSlotRepository.findActiveBlockedSlotsByResourceIds(
                roomIds,
                roomBufferStartTime,
                roomBufferEndTime
        );

        Map<Long, List<ResourceBlockedSlotModel>> roomBlockedSlotsMap = roomBlockedSlots.stream()
                .filter(s -> s.getResource() != null)
                .collect(Collectors.groupingBy(s -> s.getResource().getId()));

        // 8. Chiều Phòng -> Ghế con (Room -> Child Desks Conflict Check):
        // Truy vấn tất cả bàn làm việc con thuộc các phòng này
        List<BookableResourceModel> childDesks = bookableResourceRepository.findChildDesksByRoomIds(
                roomIds,
                BookableResourceStatus.ARCHIVED
        );

        Map<Long, List<BookableResourceModel>> childDesksByRoomId = childDesks.stream()
                .filter(d -> d.getParentRoom() != null)
                .collect(Collectors.groupingBy(d -> d.getParentRoom().getId()));

        List<Long> childDeskIds = childDesks.stream()
                .map(BookableResourceModel::getId)
                .toList();

        Map<Long, List<BookingModel>> childBookingsMap = Collections.emptyMap();
        Map<Long, List<ResourceBlockedSlotModel>> childBlockedSlotsMap = Collections.emptyMap();

        if (!childDeskIds.isEmpty()) {
            List<BookingModel> childBookings = bookingRepository.findOverlappingBookingsByResourceIds(
                    childDeskIds,
                    CONFIRMED_BOOKING_STATUSES,
                    BookingStatus.PENDING_PAYMENT,
                    now,
                    startTime,
                    endTime
            );

            childBookingsMap = childBookings.stream()
                    .filter(b -> b.getResource() != null)
                    .collect(Collectors.groupingBy(b -> b.getResource().getId()));

            List<ResourceBlockedSlotModel> childBlockedSlots = blockedSlotRepository.findActiveBlockedSlotsByResourceIds(
                    childDeskIds,
                    startTime,
                    endTime
            );

            childBlockedSlotsMap = childBlockedSlots.stream()
                    .filter(s -> s.getResource() != null)
                    .collect(Collectors.groupingBy(s -> s.getResource().getId()));
        }

        // 9. Phân giải trạng thái cho từng phòng và ánh xạ sang DTO
        Map<Long, List<BookingModel>> finalChildBookingsMap = childBookingsMap;
        Map<Long, List<ResourceBlockedSlotModel>> finalChildBlockedSlotsMap = childBlockedSlotsMap;

        return rooms.stream()
                .map(room -> mapToRoomAvailabilityResponse(
                        room,
                        roomBookingsMap.getOrDefault(room.getId(), Collections.emptyList()),
                        roomBlockedSlotsMap.getOrDefault(room.getId(), Collections.emptyList()),
                        childDesksByRoomId.getOrDefault(room.getId(), Collections.emptyList()),
                        finalChildBookingsMap,
                        finalChildBlockedSlotsMap,
                        startTime,
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
            throw new BadRequestException("Đặt chỗ chỉ áp dụng trong cùng một ngày hoạt động");
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
            Map<Long, ResourceStateResolver.ResourceResolutionResult> parentRoomResolutions,
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

        ResourceOccupancyStatus finalStatus = resolution.status();
        boolean isOccupiedByMe = resolution.isOccupiedByMe();
        LocalDateTime holdExpiresAt = resolution.holdExpiresAt();

        // Kiểm tra xung đột Ghế con -> Phòng cha:
        // Nếu phòng cha đang bị đặt/giữ/khóa và bàn chưa bị booked trực tiếp,
        // bàn con chuyển sang trạng thái BOOKED do phòng cha bị chiếm
        if (desk.getParentRoom() != null) {
            ResourceStateResolver.ResourceResolutionResult parentResolution =
                    parentRoomResolutions.get(desk.getParentRoom().getId());

            if (parentResolution != null && parentResolution.status() != ResourceOccupancyStatus.AVAILABLE) {
                if (finalStatus == ResourceOccupancyStatus.AVAILABLE) {
                    finalStatus = ResourceOccupancyStatus.BOOKED;
                    if (parentResolution.isOccupiedByMe()) {
                        isOccupiedByMe = true;
                    }
                }
            }
        }

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
                .status(finalStatus)
                .holdExpiresAt(holdExpiresAt)
                .isOccupiedByMe(isOccupiedByMe)
                .posX(desk.getPosX())
                .posY(desk.getPosY())
                .width(desk.getWidth())
                .height(desk.getHeight())
                .rotation(desk.getRotation())
                .build();
    }

    private RoomAvailabilityResponseDto mapToRoomAvailabilityResponse(
            BookableResourceModel room,
            List<BookingModel> roomBookings,
            List<ResourceBlockedSlotModel> roomBlockedSlots,
            List<BookableResourceModel> childDesks,
            Map<Long, List<BookingModel>> childBookingsMap,
            Map<Long, List<ResourceBlockedSlotModel>> childBlockedSlotsMap,
            LocalDateTime startTime,
            LocalDateTime now,
            Long currentUserId
    ) {
        // 1. Phân giải trạng thái trực tiếp của phòng (có tính buffer 15 phút)
        ResourceStateResolver.ResourceResolutionResult directResolution = ResourceStateResolver.resolve(
                room,
                roomBookings,
                roomBlockedSlots,
                now,
                currentUserId
        );

        // 2. Chiều Phòng -> Ghế con: Kiểm tra tình trạng của các bàn làm việc con bên trong phòng
        int occupiedChildDeskCount = 0;
        for (BookableResourceModel childDesk : childDesks) {
            ResourceStateResolver.ResourceResolutionResult childResolution = ResourceStateResolver.resolve(
                    childDesk,
                    childBookingsMap.getOrDefault(childDesk.getId(), Collections.emptyList()),
                    childBlockedSlotsMap.getOrDefault(childDesk.getId(), Collections.emptyList()),
                    now,
                    currentUserId
            );

            if (childResolution.status() == ResourceOccupancyStatus.BOOKED
                    || childResolution.status() == ResourceOccupancyStatus.HOLDING
                    || childResolution.status() == ResourceOccupancyStatus.BLOCKED) {
                occupiedChildDeskCount++;
            }
        }

        boolean hasConflictingDesks = occupiedChildDeskCount > 0;

        // 3. Phân định trạng thái hiển thị cuối cùng của phòng:
        // Nếu phòng trực tiếp là DISABLED/BLOCKED/BOOKED/HOLDING -> giữ nguyên
        // Nếu phòng trực tiếp là AVAILABLE nhưng có ghế con bị chiếm -> chuyển thành BOOKED
        ResourceOccupancyStatus finalStatus = directResolution.status();
        if (finalStatus == ResourceOccupancyStatus.AVAILABLE && hasConflictingDesks) {
            finalStatus = ResourceOccupancyStatus.BOOKED;
        }

        // 4. Tính toán thời gian đệm dọn dẹp vệ sinh (Turnaround Cleaning Buffer)
        // Kiểm tra xem phòng có đang trong khoảng đệm 15 phút sau một ca sử dụng trước đó không
        boolean isCleaningInProgress = roomBookings.stream()
                .anyMatch(b -> b.getEndTime() != null
                        && !b.getEndTime().isAfter(startTime)
                        && b.getEndTime().plusMinutes(ROOM_CLEANING_BUFFER_MINUTES).isAfter(startTime));

        LocalDateTime nextAvailableAt = null;
        if (isCleaningInProgress || finalStatus != ResourceOccupancyStatus.AVAILABLE) {
            nextAvailableAt = roomBookings.stream()
                    .filter(b -> b.getEndTime() != null)
                    .map(b -> b.getEndTime().plusMinutes(ROOM_CLEANING_BUFFER_MINUTES))
                    .filter(t -> t.isAfter(startTime))
                    .max(java.util.Comparator.naturalOrder())
                    .orElse(null);
        }

        Integer effectiveCapacity = room.getCapacityOverride() != null
                ? room.getCapacityOverride()
                : (room.getResourceType() != null ? room.getResourceType().getCapacity() : 1);

        BigDecimal effectivePricePerHour = room.getPricePerHour() != null
                ? room.getPricePerHour()
                : (room.getResourceType() != null ? room.getResourceType().getPricePerHour() : null);

        return RoomAvailabilityResponseDto.builder()
                .roomId(room.getId())
                .label(room.getLabel())
                .name(room.getName())
                .zoneName(room.getZoneName())
                .capacity(effectiveCapacity)
                .pricePerHour(effectivePricePerHour)
                .status(finalStatus)
                .holdExpiresAt(directResolution.holdExpiresAt())
                .isOccupiedByMe(directResolution.isOccupiedByMe())
                .hasConflictingDesks(hasConflictingDesks)
                .occupiedChildDeskCount(occupiedChildDeskCount)
                .isCleaningInProgress(isCleaningInProgress)
                .nextAvailableAt(nextAvailableAt)
                .cleaningBufferMinutes(ROOM_CLEANING_BUFFER_MINUTES)
                .posX(room.getPosX())
                .posY(room.getPosY())
                .width(room.getWidth())
                .height(room.getHeight())
                .rotation(room.getRotation())
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
