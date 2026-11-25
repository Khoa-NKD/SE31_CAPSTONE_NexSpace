package base.api.feature.resource.service;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.resource.dto.response.DeskAvailabilityResponseDto;
import base.api.feature.resource.dto.response.RoomAvailabilityResponseDto;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.repository.IResourceBlockedSlotRepository;
import base.api.feature.resource.service.impl.ResourceAvailabilityServiceImpl;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.ResourceTypeModel;
import base.api.shared.entity.workspace.WorkspaceOperatingHourModel;
import base.api.shared.enums.BookableResourceStatus;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.ResourceCategory;
import base.api.shared.enums.ResourceOccupancyStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResourceAvailabilityServiceTest {
    @Mock private base.api.feature.operations.repository.MaintenanceGroupRepository maintenanceGroups;


    @Mock
    private IWorkspaceRepository workspaceRepository;

    @Mock
    private IWorkspaceOperatingHourRepository operatingHourRepository;

    @Mock
    private IBookableResourceRepository bookableResourceRepository;

    @Mock
    private IBookingRepository bookingRepository;

    @Mock
    private IResourceBlockedSlotRepository blockedSlotRepository;

    @InjectMocks
    private ResourceAvailabilityServiceImpl availabilityService;

    private Long workspaceId = 1L;
    private LocalDate targetDate;
    private LocalDateTime validStartTime;
    private LocalDateTime validEndTime;

    @BeforeEach
    void setUp() {
        // Chọn một ngày cố định trong tương lai
        targetDate = LocalDate.now().plusDays(3);
        validStartTime = targetDate.atTime(9, 0);
        validEndTime = targetDate.atTime(12, 0);
    }

    @Test
    @DisplayName("Ném lỗi khi thời gian bắt đầu trong quá khứ")
    void checkDeskAvailability_WhenStartTimeInPast_ShouldThrowBadRequest() {
        LocalDateTime pastStartTime = LocalDateTime.now().minusHours(1);
        LocalDateTime futureEndTime = LocalDateTime.now().plusHours(2);

        assertThatThrownBy(() -> availabilityService.checkDeskAvailability(workspaceId, null, pastStartTime, futureEndTime, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("quá khứ");
    }

    @Test
    @DisplayName("Ném lỗi khi thời gian kết thúc trước thời gian bắt đầu")
    void checkDeskAvailability_WhenEndTimeBeforeStartTime_ShouldThrowBadRequest() {
        LocalDateTime start = targetDate.atTime(14, 0);
        LocalDateTime end = targetDate.atTime(10, 0);

        assertThatThrownBy(() -> availabilityService.checkDeskAvailability(workspaceId, null, start, end, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("sau thời gian bắt đầu");
    }

    @Test
    @DisplayName("Ném lỗi khi không tìm thấy Workspace")
    void checkDeskAvailability_WhenWorkspaceNotFound_ShouldThrowNotFound() {
        when(workspaceRepository.existsById(workspaceId)).thenReturn(false);

        assertThatThrownBy(() -> availabilityService.checkDeskAvailability(workspaceId, null, validStartTime, validEndTime, null))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Không tìm thấy không gian");
    }

    @Test
    @DisplayName("Ném lỗi khi không gian đóng cửa vào ngày yêu cầu")
    void checkDeskAvailability_WhenClosedOnDay_ShouldThrowBadRequest() {
        when(workspaceRepository.existsById(workspaceId)).thenReturn(true);

        DayOfWeek dayOfWeek = targetDate.getDayOfWeek();
        WorkspaceOperatingHourModel closedHour = new WorkspaceOperatingHourModel();
        closedHour.setId(new WorkspaceOperatingHourModel.Key(workspaceId, dayOfWeek.getValue()));
        closedHour.setClosed(true);

        when(operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspaceId))
                .thenReturn(List.of(closedHour));

        assertThatThrownBy(() -> availabilityService.checkDeskAvailability(workspaceId, null, validStartTime, validEndTime, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("ngoài giờ hoạt động");
    }

    @Test
    @DisplayName("Ném lỗi khi khung giờ yêu cầu nằm ngoài giờ hoạt động")
    void checkDeskAvailability_WhenOutsideOperatingHours_ShouldThrowBadRequest() {
        when(workspaceRepository.existsById(workspaceId)).thenReturn(true);

        DayOfWeek dayOfWeek = targetDate.getDayOfWeek();
        WorkspaceOperatingHourModel operatingHour = new WorkspaceOperatingHourModel();
        operatingHour.setId(new WorkspaceOperatingHourModel.Key(workspaceId, dayOfWeek.getValue()));
        operatingHour.setClosed(false);
        operatingHour.setOpenTime(LocalTime.of(8, 0));
        operatingHour.setCloseTime(LocalTime.of(18, 0));

        when(operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspaceId))
                .thenReturn(List.of(operatingHour));

        // Yêu cầu bắt đầu sớm hơn giờ mở cửa (07:00 < 08:00)
        LocalDateTime earlyStart = targetDate.atTime(7, 0);
        LocalDateTime earlyEnd = targetDate.atTime(10, 0);

        assertThatThrownBy(() -> availabilityService.checkDeskAvailability(workspaceId, null, earlyStart, earlyEnd, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("ngoài giờ hoạt động");
    }

    @Test
    @DisplayName("Tra cứu thành công và trả về danh sách bàn kèm trạng thái AVAILABLE")
    void checkDeskAvailability_WhenValid_ShouldReturnAvailableDesks() {
        when(workspaceRepository.existsById(workspaceId)).thenReturn(true);

        DayOfWeek dayOfWeek = targetDate.getDayOfWeek();
        WorkspaceOperatingHourModel operatingHour = new WorkspaceOperatingHourModel();
        operatingHour.setId(new WorkspaceOperatingHourModel.Key(workspaceId, dayOfWeek.getValue()));
        operatingHour.setClosed(false);
        operatingHour.setOpenTime(LocalTime.of(8, 0));
        operatingHour.setCloseTime(LocalTime.of(22, 0));

        when(operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspaceId))
                .thenReturn(List.of(operatingHour));

        ResourceTypeModel resourceType = new ResourceTypeModel();
        resourceType.setCategory(ResourceCategory.DESK);
        resourceType.setPricePerHour(new BigDecimal("30000.00"));

        BookableResourceModel desk = new BookableResourceModel();
        desk.setId(101L);
        desk.setLabel("D-01");
        desk.setName("Bàn Focus 01");
        desk.setZoneName("Quiet Zone");
        desk.setStatus(BookableResourceStatus.ACTIVE);
        desk.setResourceType(resourceType);
        desk.setPricePerHour(new BigDecimal("35000.00"));

        when(bookableResourceRepository.findDeskResourcesForAvailability(
                eq(workspaceId), eq(null), eq(ResourceCategory.DESK), eq(BookableResourceStatus.ARCHIVED)))
                .thenReturn(List.of(desk));

        when(bookingRepository.findOverlappingBookingsByResourceIds(
                any(), any(), any(), any(), eq(validStartTime), eq(validEndTime)))
                .thenReturn(Collections.emptyList());

        when(blockedSlotRepository.findActiveBlockedSlotsByResourceIds(
                any(), eq(validStartTime), eq(validEndTime)))
                .thenReturn(Collections.emptyList());

        List<DeskAvailabilityResponseDto> response = availabilityService.checkDeskAvailability(
                workspaceId, null, validStartTime, validEndTime, 42L
        );

        assertThat(response).hasSize(1);
        DeskAvailabilityResponseDto item = response.get(0);
        assertThat(item.getResourceId()).isEqualTo(101L);
        assertThat(item.getLabel()).isEqualTo("D-01");
        assertThat(item.getPricePerHour()).isEqualByComparingTo(new BigDecimal("35000.00"));
        assertThat(item.getStatus()).isEqualTo(ResourceOccupancyStatus.AVAILABLE);
        assertThat(item.getIsOccupiedByMe()).isFalse();
    }

    @Test
    @DisplayName("checkRoomAvailability: Ném lỗi khi minCapacity <= 0")
    void checkRoomAvailability_WhenMinCapacityInvalid_ShouldThrowBadRequest() {
        assertThatThrownBy(() -> availabilityService.checkRoomAvailability(workspaceId, null, validStartTime, validEndTime, 0, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Sức chứa tối thiểu phải lớn hơn 0");
    }

    @Test
    @DisplayName("checkRoomAvailability: Phòng trống và không có ghế con xung đột -> AVAILABLE")
    void checkRoomAvailability_WhenAvailable_ShouldReturnAvailableRoom() {
        when(workspaceRepository.existsById(workspaceId)).thenReturn(true);

        DayOfWeek dayOfWeek = targetDate.getDayOfWeek();
        WorkspaceOperatingHourModel operatingHour = new WorkspaceOperatingHourModel();
        operatingHour.setId(new WorkspaceOperatingHourModel.Key(workspaceId, dayOfWeek.getValue()));
        operatingHour.setClosed(false);
        operatingHour.setOpenTime(LocalTime.of(8, 0));
        operatingHour.setCloseTime(LocalTime.of(22, 0));

        when(operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspaceId))
                .thenReturn(List.of(operatingHour));

        ResourceTypeModel roomType = new ResourceTypeModel();
        roomType.setCategory(ResourceCategory.ROOM);
        roomType.setCapacity(10);
        roomType.setPricePerHour(new BigDecimal("200000.00"));

        BookableResourceModel room = new BookableResourceModel();
        room.setId(201L);
        room.setLabel("R-01");
        room.setName("Phòng họp Sáng Tạo");
        room.setStatus(BookableResourceStatus.ACTIVE);
        room.setResourceType(roomType);

        when(bookableResourceRepository.findRoomResourcesForAvailability(
                eq(workspaceId), eq(null), eq(ResourceCategory.ROOM), eq(6), eq(BookableResourceStatus.ARCHIVED)))
                .thenReturn(List.of(room));

        when(bookingRepository.findOverlappingBookingsByResourceIds(
                any(), any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        when(blockedSlotRepository.findActiveBlockedSlotsByResourceIds(
                any(), any(), any()))
                .thenReturn(Collections.emptyList());

        when(bookableResourceRepository.findChildDesksByRoomIds(
                any(), eq(BookableResourceStatus.ARCHIVED)))
                .thenReturn(Collections.emptyList());

        List<RoomAvailabilityResponseDto> response = availabilityService.checkRoomAvailability(
                workspaceId, null, validStartTime, validEndTime, 6, 42L
        );

        assertThat(response).hasSize(1);
        RoomAvailabilityResponseDto item = response.get(0);
        assertThat(item.getRoomId()).isEqualTo(201L);
        assertThat(item.getLabel()).isEqualTo("R-01");
        assertThat(item.getCapacity()).isEqualTo(10);
        assertThat(item.getPricePerHour()).isEqualByComparingTo(new BigDecimal("200000.00"));
        assertThat(item.getStatus()).isEqualTo(ResourceOccupancyStatus.AVAILABLE);
        assertThat(item.getHasConflictingDesks()).isFalse();
        assertThat(item.getOccupiedChildDeskCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("checkRoomAvailability: Phòng chưa bị đặt nhưng có ghế con bị BOOKED -> Phòng bị đánh dấu BOOKED và hasConflictingDesks = true")
    void checkRoomAvailability_WhenChildDeskIsBooked_ShouldMarkRoomAsBookedWithConflictFlag() {
        when(workspaceRepository.existsById(workspaceId)).thenReturn(true);

        DayOfWeek dayOfWeek = targetDate.getDayOfWeek();
        WorkspaceOperatingHourModel operatingHour = new WorkspaceOperatingHourModel();
        operatingHour.setId(new WorkspaceOperatingHourModel.Key(workspaceId, dayOfWeek.getValue()));
        operatingHour.setClosed(false);
        operatingHour.setOpenTime(LocalTime.of(8, 0));
        operatingHour.setCloseTime(LocalTime.of(22, 0));

        when(operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspaceId))
                .thenReturn(List.of(operatingHour));

        ResourceTypeModel roomType = new ResourceTypeModel();
        roomType.setCategory(ResourceCategory.ROOM);
        roomType.setCapacity(8);
        roomType.setPricePerHour(new BigDecimal("250000.00"));

        BookableResourceModel room = new BookableResourceModel();
        room.setId(201L);
        room.setLabel("R-01");
        room.setName("Phòng họp Sáng Tạo");
        room.setStatus(BookableResourceStatus.ACTIVE);
        room.setResourceType(roomType);

        when(bookableResourceRepository.findRoomResourcesForAvailability(
                eq(workspaceId), eq(null), eq(ResourceCategory.ROOM), eq(null), eq(BookableResourceStatus.ARCHIVED)))
                .thenReturn(List.of(room));

        // Không có booking trực tiếp cho phòng
        when(bookingRepository.findOverlappingBookingsByResourceIds(
                eq(List.of(201L)), any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        when(blockedSlotRepository.findActiveBlockedSlotsByResourceIds(
                eq(List.of(201L)), any(), any()))
                .thenReturn(Collections.emptyList());

        // Có 1 ghế con thuộc phòng này
        ResourceTypeModel deskType = new ResourceTypeModel();
        deskType.setCategory(ResourceCategory.DESK);

        BookableResourceModel childDesk = new BookableResourceModel();
        childDesk.setId(101L);
        childDesk.setLabel("SEAT-01");
        childDesk.setStatus(BookableResourceStatus.ACTIVE);
        childDesk.setResourceType(deskType);
        childDesk.setParentRoom(room);

        when(bookableResourceRepository.findChildDesksByRoomIds(
                eq(List.of(201L)), eq(BookableResourceStatus.ARCHIVED)))
                .thenReturn(List.of(childDesk));

        // Ghế con có 1 booking CONFIRMED
        BookingModel childBooking = new BookingModel();
        childBooking.setId(999L);
        childBooking.setResource(childDesk);
        childBooking.setStatus(BookingStatus.CONFIRMED);

        when(bookingRepository.findOverlappingBookingsByResourceIds(
                eq(List.of(101L)), any(), any(), any(), eq(validStartTime), eq(validEndTime)))
                .thenReturn(List.of(childBooking));

        when(blockedSlotRepository.findActiveBlockedSlotsByResourceIds(
                eq(List.of(101L)), eq(validStartTime), eq(validEndTime)))
                .thenReturn(Collections.emptyList());

        List<RoomAvailabilityResponseDto> response = availabilityService.checkRoomAvailability(
                workspaceId, null, validStartTime, validEndTime, null, null
        );

        assertThat(response).hasSize(1);
        RoomAvailabilityResponseDto item = response.get(0);
        assertThat(item.getRoomId()).isEqualTo(201L);
        assertThat(item.getStatus()).isEqualTo(ResourceOccupancyStatus.BOOKED);
        assertThat(item.getHasConflictingDesks()).isTrue();
        assertThat(item.getOccupiedChildDeskCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("checkDeskAvailability: Chiều Ghế con -> Phòng cha: Bàn con có phòng cha bị đặt -> Bàn con tự động chuyển thành BOOKED")
    void checkDeskAvailability_WhenParentRoomIsBooked_ShouldMarkChildDeskAsBooked() {
        when(workspaceRepository.existsById(workspaceId)).thenReturn(true);

        DayOfWeek dayOfWeek = targetDate.getDayOfWeek();
        WorkspaceOperatingHourModel operatingHour = new WorkspaceOperatingHourModel();
        operatingHour.setId(new WorkspaceOperatingHourModel.Key(workspaceId, dayOfWeek.getValue()));
        operatingHour.setClosed(false);
        operatingHour.setOpenTime(LocalTime.of(8, 0));
        operatingHour.setCloseTime(LocalTime.of(22, 0));

        when(operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspaceId))
                .thenReturn(List.of(operatingHour));

        BookableResourceModel parentRoom = new BookableResourceModel();
        parentRoom.setId(201L);
        parentRoom.setLabel("R-01");
        parentRoom.setStatus(BookableResourceStatus.ACTIVE);

        ResourceTypeModel deskType = new ResourceTypeModel();
        deskType.setCategory(ResourceCategory.DESK);

        BookableResourceModel childDesk = new BookableResourceModel();
        childDesk.setId(101L);
        childDesk.setLabel("SEAT-01");
        childDesk.setStatus(BookableResourceStatus.ACTIVE);
        childDesk.setResourceType(deskType);
        childDesk.setParentRoom(parentRoom);

        when(bookableResourceRepository.findDeskResourcesForAvailability(
                eq(workspaceId), eq(null), eq(ResourceCategory.DESK), eq(BookableResourceStatus.ARCHIVED)))
                .thenReturn(List.of(childDesk));

        // Bàn con không có booking trực tiếp
        when(bookingRepository.findOverlappingBookingsByResourceIds(
                eq(List.of(101L)), any(), any(), any(), eq(validStartTime), eq(validEndTime)))
                .thenReturn(Collections.emptyList());

        when(blockedSlotRepository.findActiveBlockedSlotsByResourceIds(
                eq(List.of(101L)), eq(validStartTime), eq(validEndTime)))
                .thenReturn(Collections.emptyList());

        // Nhưng phòng cha 201L có booking CONFIRMED
        BookingModel parentBooking = new BookingModel();
        parentBooking.setId(888L);
        parentBooking.setResource(parentRoom);
        parentBooking.setStatus(BookingStatus.CONFIRMED);

        when(bookingRepository.findOverlappingBookingsByResourceIds(
                eq(List.of(201L)), any(), any(), any(), any(), any()))
                .thenReturn(List.of(parentBooking));

        when(blockedSlotRepository.findActiveBlockedSlotsByResourceIds(
                eq(List.of(201L)), any(), any()))
                .thenReturn(Collections.emptyList());

        List<DeskAvailabilityResponseDto> response = availabilityService.checkDeskAvailability(
                workspaceId, null, validStartTime, validEndTime, 42L
        );

        assertThat(response).hasSize(1);
        DeskAvailabilityResponseDto item = response.get(0);
        assertThat(item.getResourceId()).isEqualTo(101L);
        assertThat(item.getParentRoomId()).isEqualTo(201L);
        assertThat(item.getStatus()).isEqualTo(ResourceOccupancyStatus.BOOKED);
    }

    @Test
    @DisplayName("checkRoomAvailability: Phòng đang trong khoảng đệm dọn dẹp (15 phút) -> isCleaningInProgress = true và nextAvailableAt = 11:15")
    void checkRoomAvailability_WhenInCleaningBuffer_ShouldFlagCleaningAndShowNextAvailableTime() {
        when(workspaceRepository.existsById(workspaceId)).thenReturn(true);

        DayOfWeek dayOfWeek = targetDate.getDayOfWeek();
        WorkspaceOperatingHourModel operatingHour = new WorkspaceOperatingHourModel();
        operatingHour.setId(new WorkspaceOperatingHourModel.Key(workspaceId, dayOfWeek.getValue()));
        operatingHour.setClosed(false);
        operatingHour.setOpenTime(LocalTime.of(8, 0));
        operatingHour.setCloseTime(LocalTime.of(22, 0));

        when(operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspaceId))
                .thenReturn(List.of(operatingHour));

        ResourceTypeModel roomType = new ResourceTypeModel();
        roomType.setCategory(ResourceCategory.ROOM);
        roomType.setCapacity(6);

        BookableResourceModel room = new BookableResourceModel();
        room.setId(301L);
        room.setLabel("R-03");
        room.setStatus(BookableResourceStatus.ACTIVE);
        room.setResourceType(roomType);

        when(bookableResourceRepository.findRoomResourcesForAvailability(
                eq(workspaceId), eq(null), eq(ResourceCategory.ROOM), eq(null), eq(BookableResourceStatus.ARCHIVED)))
                .thenReturn(List.of(room));

        // Booking trước kết thúc lúc 11:00 (đúng thời điểm khách muốn bắt đầu)
        LocalDateTime queryStart = targetDate.atTime(11, 0);
        LocalDateTime queryEnd = targetDate.atTime(12, 0);

        BookingModel previousBooking = new BookingModel();
        previousBooking.setId(777L);
        previousBooking.setResource(room);
        previousBooking.setStartTime(targetDate.atTime(9, 0));
        previousBooking.setEndTime(queryStart); // 11:00
        previousBooking.setStatus(BookingStatus.CONFIRMED);

        when(bookingRepository.findOverlappingBookingsByResourceIds(
                eq(List.of(301L)), any(), any(), any(), any(), any()))
                .thenReturn(List.of(previousBooking));

        when(blockedSlotRepository.findActiveBlockedSlotsByResourceIds(
                eq(List.of(301L)), any(), any()))
                .thenReturn(Collections.emptyList());

        when(bookableResourceRepository.findChildDesksByRoomIds(
                eq(List.of(301L)), eq(BookableResourceStatus.ARCHIVED)))
                .thenReturn(Collections.emptyList());

        List<RoomAvailabilityResponseDto> response = availabilityService.checkRoomAvailability(
                workspaceId, null, queryStart, queryEnd, null, null
        );

        assertThat(response).hasSize(1);
        RoomAvailabilityResponseDto item = response.get(0);
        assertThat(item.getRoomId()).isEqualTo(301L);
        assertThat(item.getStatus()).isEqualTo(ResourceOccupancyStatus.BOOKED);
        assertThat(item.getIsCleaningInProgress()).isTrue();
        assertThat(item.getCleaningBufferMinutes()).isEqualTo(15);
        assertThat(item.getNextAvailableAt()).isEqualTo(targetDate.atTime(11, 15));
    }
}

