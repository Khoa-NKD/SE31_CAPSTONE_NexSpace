package base.api.feature.booking.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.dto.request.CalculatePriceRequestDto;
import base.api.feature.booking.dto.request.CreateBookingRequestDto;
import base.api.feature.booking.dto.response.BookingCancellationPreviewDto;
import base.api.feature.booking.dto.response.BookingResponseDto;
import base.api.feature.booking.dto.response.PriceCalculationResponseDto;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.booking.service.impl.BookingServiceImpl;
import base.api.feature.governance.repository.IPlatformSettingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.feature.payment.repository.IRefundRequestRepository;
import base.api.feature.pricing.repository.IPricingRuleRepository;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.repository.IResourceBlockedSlotRepository;
import base.api.feature.resource.repository.ResourceUsageRepository;
import base.api.feature.workspace.repository.IWorkspaceCancellationRuleRepository;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.FloorPlanModel;
import base.api.shared.entity.resource.ResourceBlockedSlotModel;
import base.api.shared.entity.resource.ResourceTypeModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.entity.workspace.WorkspaceOperatingHourModel;
import base.api.shared.enums.*;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import base.api.shared.security.CurrentUserProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private IBookingRepository bookingRepository;

    @Mock
    private IBookableResourceRepository resourceRepository;

    @Mock
    private IWorkspaceRepository workspaceRepository;

    @Mock
    private base.api.feature.organizer.repository.IOrganizerProfileRepository organizerProfiles;

    @Mock
    private IUserRepository userRepository;

    @Mock
    private IWorkspaceOperatingHourRepository operatingHourRepository;

    @Mock
    private IWorkspaceCancellationRuleRepository cancellationRuleRepository;

    @Mock
    private IResourceBlockedSlotRepository blockedSlotRepository;

    @Mock
    private IPlatformSettingRepository platformSettingRepository;

    @Mock
    private IPricingRuleRepository pricingRuleRepository;

    @Mock
    private ResourceUsageRepository resourceUsageRepository;

    @Mock
    private IAuditService auditService;

    @Mock
    private IRefundRequestRepository refundRequestRepository;

    @Mock
    private IPaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private BookingServiceImpl bookingService;

    private UserModel mockCustomer;
    private UserModel mockHost;
    private WorkspaceModel mockWorkspace;
    private FloorPlanModel mockFloorPlan;
    private ResourceTypeModel mockResourceType;
    private BookableResourceModel mockResource;
    private LocalDateTime futureMondayStart;
    private LocalDateTime futureMondayEnd;

    @BeforeEach
    void setUp() {
        mockCustomer = new UserModel();
        mockCustomer.setId(100L);
        mockCustomer.setFirstName("Minh");
        mockCustomer.setLastName("Nguyen");
        mockCustomer.setEmail("minh.nguyen@example.com");
        mockCustomer.setStatus(UserStatus.ACTIVE);

        mockHost = new UserModel();
        mockHost.setId(200L);
        mockHost.setFirstName("Host");
        mockHost.setLastName("NexSpace");
        mockHost.setStatus(UserStatus.ACTIVE);

        mockWorkspace = new WorkspaceModel();
        mockWorkspace.setId(1L);
        mockWorkspace.setName("NexSpace Central Tower");
        mockWorkspace.setOrganizer(mockHost);
        mockWorkspace.setStatus(WorkspaceStatus.ACTIVE);
        mockWorkspace.setBookingConfirmationMode(BookingConfirmationMode.INSTANT);

        mockFloorPlan = new FloorPlanModel();
        mockFloorPlan.setId(10L);
        mockFloorPlan.setName("Level 14");
        mockFloorPlan.setFloorNumber(14);
        mockFloorPlan.setWorkspace(mockWorkspace);

        mockResourceType = new ResourceTypeModel();
        mockResourceType.setId(20L);
        mockResourceType.setName("Executive Hot Desk");
        mockResourceType.setCategory(ResourceCategory.DESK);
        mockResourceType.setPricePerHour(new BigDecimal("50000.00"));
        mockResourceType.setActive(true);

        mockResource = new BookableResourceModel();
        mockResource.setId(42L);
        mockResource.setLabel("Desk A-01");
        mockResource.setName("Desk A-01 Window View");
        mockResource.setFloorPlan(mockFloorPlan);
        mockResource.setResourceType(mockResourceType);
        mockResource.setPricePerHour(new BigDecimal("50000.00"));
        mockResource.setStatus(BookableResourceStatus.ACTIVE);

        // A future Monday from 09:00 to 13:00 (4 hours)
        futureMondayStart = LocalDateTime.now().plusWeeks(1)
                .with(TemporalAdjusters.next(DayOfWeek.MONDAY))
                .withHour(9).withMinute(0).withSecond(0).withNano(0);
        futureMondayEnd = futureMondayStart.plusHours(4);
    }

    @Test
    void suspendedOrganizerCannotReceiveNewBookingOrHold() {
        var profile = new base.api.shared.entity.organizer.OrganizerProfileModel();
        profile.setSuspended(true);
        var request = CreateBookingRequestDto.builder().workspaceId(mockWorkspace.getId())
                .resourceId(mockResource.getId()).build();
        when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
        when(workspaceRepository.findById(mockWorkspace.getId())).thenReturn(Optional.of(mockWorkspace));
        when(organizerProfiles.findByOrganizerIdForBooking(mockHost.getId())).thenReturn(Optional.of(profile));

        assertThatThrownBy(() -> bookingService.createBooking(mockCustomer.getId(), request))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("tạm ngưng");
        verifyNoInteractions(resourceRepository, bookingRepository);
    }

    @Test
    void rejectsDirectBookingOfAnActiveSeatInsideARoom() {
        mockResource.setParentRoom(new BookableResourceModel());
        var request = CreateBookingRequestDto.builder()
                .workspaceId(mockWorkspace.getId())
                .resourceId(mockResource.getId())
                .build();
        when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
        when(workspaceRepository.findById(mockWorkspace.getId())).thenReturn(Optional.of(mockWorkspace));
        when(resourceRepository.findByIdForUpdate(mockResource.getId())).thenReturn(Optional.of(mockResource));

        assertThatThrownBy(() -> bookingService.createBooking(mockCustomer.getId(), request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đặt nguyên phòng");
    }

    @Test
    @DisplayName("Tạo đơn đặt chỗ thành công với chế độ INSTANT (Giữ chỗ 15 phút, PENDING_PAYMENT)")
    void testCreateBooking_Success_Instant() {
        CreateBookingRequestDto dto = CreateBookingRequestDto.builder()
                .workspaceId(mockWorkspace.getId())
                .resourceId(mockResource.getId())
                .startTime(futureMondayStart)
                .endTime(futureMondayEnd)
                .partySize(1)
                .priceType(PriceType.HOURLY)
                .build();

        when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
        when(workspaceRepository.findById(mockWorkspace.getId())).thenReturn(Optional.of(mockWorkspace));
        when(resourceRepository.findByIdForUpdate(mockResource.getId())).thenReturn(Optional.of(mockResource));

        // Operating hours: Monday opens 08:00 to 22:00
        WorkspaceOperatingHourModel operatingHour = new WorkspaceOperatingHourModel();
        operatingHour.setId(new WorkspaceOperatingHourModel.Key(mockWorkspace.getId(), 1));
        operatingHour.setOpenTime(LocalTime.of(8, 0));
        operatingHour.setCloseTime(LocalTime.of(22, 0));
        operatingHour.setClosed(false);
        when(operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(mockWorkspace.getId()))
                .thenReturn(List.of(operatingHour));

        when(bookingRepository.findConflictingBookingsWithHold(any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(blockedSlotRepository.findConflictingBlockedSlots(any(), any(), any()))
                .thenReturn(Collections.emptyList());

        when(bookingRepository.existsByBookingCode(any())).thenReturn(false);
        when(bookingRepository.save(any(BookingModel.class))).thenAnswer(invocation -> {
            BookingModel b = invocation.getArgument(0);
            b.setId(999L);
            return b;
        });

        BookingResponseDto result = bookingService.createBooking(mockCustomer.getId(), dto);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(999L);
        assertThat(result.getBookingCode()).startsWith("BK-");
        assertThat(result.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        assertThat(result.getHoldExpiresAt()).isAfter(LocalDateTime.now());
        assertThat(result.getResourceCode()).isEqualTo("Desk A-01");
        assertThat(result.getDurationHours()).isEqualByComparingTo(new BigDecimal("4.00"));
        // 4 hrs * 50,000 = 200,000 base. VAT 8% = 16,000. Total = 216,000.
        assertThat(result.getBaseAmount()).isEqualByComparingTo(new BigDecimal("200000.00"));
        assertThat(result.getTaxAmount()).isEqualByComparingTo(new BigDecimal("16000.00"));
        assertThat(result.getFinalPrice()).isEqualByComparingTo(new BigDecimal("216000.00"));

        verify(auditService, times(1)).log(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Ném ConflictException khi phát hiện trùng lịch với đặt chỗ khác")
    void testCreateBooking_ThrowsConflictException_WhenOverlap() {
        CreateBookingRequestDto dto = CreateBookingRequestDto.builder()
                .workspaceId(mockWorkspace.getId())
                .resourceId(mockResource.getId())
                .startTime(futureMondayStart)
                .endTime(futureMondayEnd)
                .partySize(1)
                .priceType(PriceType.HOURLY)
                .build();

        when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
        when(workspaceRepository.findById(mockWorkspace.getId())).thenReturn(Optional.of(mockWorkspace));
        when(resourceRepository.findByIdForUpdate(mockResource.getId())).thenReturn(Optional.of(mockResource));

        WorkspaceOperatingHourModel operatingHour = new WorkspaceOperatingHourModel();
        operatingHour.setId(new WorkspaceOperatingHourModel.Key(mockWorkspace.getId(), 1));
        operatingHour.setOpenTime(LocalTime.of(8, 0));
        operatingHour.setCloseTime(LocalTime.of(22, 0));
        operatingHour.setClosed(false);
        when(operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(mockWorkspace.getId()))
                .thenReturn(List.of(operatingHour));

        BookingModel existingConflict = new BookingModel();
        existingConflict.setId(555L);
        when(bookingRepository.findConflictingBookingsWithHold(any(), any(), any(), any(), any()))
                .thenReturn(List.of(existingConflict));

        assertThatThrownBy(() -> bookingService.createBooking(mockCustomer.getId(), dto))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Chỗ ngồi/phòng đã có người đặt");

        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("Ném BadRequestException khi thời gian đặt nằm ngoài giờ mở cửa của cơ sở")
    void testCreateBooking_ThrowsBadRequest_WhenOutsideOperatingHours() {
        // Book from 06:00 to 10:00 (workspace opens at 08:00)
        LocalDateTime earlyStart = futureMondayStart.withHour(6);
        LocalDateTime earlyEnd = earlyStart.plusHours(4);

        CreateBookingRequestDto dto = CreateBookingRequestDto.builder()
                .workspaceId(mockWorkspace.getId())
                .resourceId(mockResource.getId())
                .startTime(earlyStart)
                .endTime(earlyEnd)
                .partySize(1)
                .priceType(PriceType.HOURLY)
                .build();

        when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
        when(workspaceRepository.findById(mockWorkspace.getId())).thenReturn(Optional.of(mockWorkspace));
        when(resourceRepository.findByIdForUpdate(mockResource.getId())).thenReturn(Optional.of(mockResource));

        WorkspaceOperatingHourModel operatingHour = new WorkspaceOperatingHourModel();
        operatingHour.setId(new WorkspaceOperatingHourModel.Key(mockWorkspace.getId(), 1));
        operatingHour.setOpenTime(LocalTime.of(8, 0));
        operatingHour.setCloseTime(LocalTime.of(22, 0));
        operatingHour.setClosed(false);
        when(operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(mockWorkspace.getId()))
                .thenReturn(List.of(operatingHour));

        assertThatThrownBy(() -> bookingService.createBooking(mockCustomer.getId(), dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("trước giờ mở cửa");

        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("Tạm tính chi phí calculatePrice tính toán chính xác")
    void testCalculatePrice_Success() {
        CalculatePriceRequestDto dto = CalculatePriceRequestDto.builder()
                .workspaceId(mockWorkspace.getId())
                .resourceId(mockResource.getId())
                .startTime(futureMondayStart)
                .endTime(futureMondayEnd)
                .priceType(PriceType.HOURLY)
                .build();

        when(workspaceRepository.findById(mockWorkspace.getId())).thenReturn(Optional.of(mockWorkspace));
        when(resourceRepository.findById(mockResource.getId())).thenReturn(Optional.of(mockResource));

        PriceCalculationResponseDto calc = bookingService.calculatePrice(dto);

        assertThat(calc).isNotNull();
        assertThat(calc.getDurationHours()).isEqualByComparingTo(new BigDecimal("4.00"));
        assertThat(calc.getBaseAmount()).isEqualByComparingTo(new BigDecimal("200000.00"));
        assertThat(calc.getTaxAmount()).isEqualByComparingTo(new BigDecimal("16000.00"));
        assertThat(calc.getFinalPrice()).isEqualByComparingTo(new BigDecimal("216000.00"));
    }

    @Test
    @DisplayName("Tạm tính chi phí calculatePrice ném BadRequestException khi chọn khung giờ ngoài giờ mở cửa")
    void testCalculatePrice_ThrowsBadRequest_WhenOutsideOperatingHours() {
        LocalDateTime earlyStart = futureMondayStart.withHour(6);
        LocalDateTime earlyEnd = earlyStart.plusHours(4);

        CalculatePriceRequestDto dto = CalculatePriceRequestDto.builder()
                .workspaceId(mockWorkspace.getId())
                .resourceId(mockResource.getId())
                .startTime(earlyStart)
                .endTime(earlyEnd)
                .priceType(PriceType.HOURLY)
                .build();

        when(workspaceRepository.findById(mockWorkspace.getId())).thenReturn(Optional.of(mockWorkspace));
        when(resourceRepository.findById(mockResource.getId())).thenReturn(Optional.of(mockResource));

        WorkspaceOperatingHourModel operatingHour = new WorkspaceOperatingHourModel();
        operatingHour.setId(new WorkspaceOperatingHourModel.Key(mockWorkspace.getId(), 1));
        operatingHour.setOpenTime(LocalTime.of(8, 0));
        operatingHour.setCloseTime(LocalTime.of(22, 0));
        operatingHour.setClosed(false);
        when(operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(mockWorkspace.getId()))
                .thenReturn(List.of(operatingHour));

        assertThatThrownBy(() -> bookingService.calculatePrice(dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("trước giờ mở cửa");
    }

    @Test
    @DisplayName("Strict Ownership: getBookingById ném NotFoundException khi người gọi không phải chủ nhân")
    void testGetBookingById_StrictOwnershipDefense() {
        BookingModel booking = new BookingModel();
        booking.setId(999L);
        booking.setCustomer(mockCustomer); // Owned by 100L
        booking.setWorkspace(mockWorkspace); // Host is 200L

        when(bookingRepository.findById(999L)).thenReturn(Optional.of(booking));

        // An unrelated user 300L tries to access
        assertThatThrownBy(() -> bookingService.getBookingById(300L, 999L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Không tìm thấy đơn đặt chỗ");
    }

    @Test
    @DisplayName("Organizer (Host) xem chi tiết đơn đặt chỗ thuộc workspace của mình thành công")
    void testGetBookingById_OrganizerAccess_Success() {
        BookingModel booking = new BookingModel();
        booking.setId(999L);
        booking.setBookingCode("BK-20261120-HOST01");
        booking.setCustomer(mockCustomer); // Customer 100L
        booking.setWorkspace(mockWorkspace); // Host 200L
        booking.setResource(mockResource);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setStartTime(futureMondayStart);
        booking.setEndTime(futureMondayEnd);
        booking.setFinalPrice(new BigDecimal("216000.00"));

        when(bookingRepository.findById(999L)).thenReturn(Optional.of(booking));

        BookingResponseDto result = bookingService.getBookingById(mockHost.getId(), 999L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(999L);
        assertThat(result.getBookingCode()).isEqualTo("BK-20261120-HOST01");
    }

    @Test
    @DisplayName("Admin xem chi tiết bất kỳ đơn đặt chỗ nào trên toàn sàn thành công")
    void testGetBookingById_AdminAccess_Success() {
        BookingModel booking = new BookingModel();
        booking.setId(999L);
        booking.setBookingCode("BK-20261120-ADMIN01");
        booking.setCustomer(mockCustomer); // Customer 100L
        booking.setWorkspace(mockWorkspace); // Host 200L
        booking.setResource(mockResource);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setStartTime(futureMondayStart);
        booking.setEndTime(futureMondayEnd);
        booking.setFinalPrice(new BigDecimal("216000.00"));

        when(bookingRepository.findById(999L)).thenReturn(Optional.of(booking));
        when(currentUserProvider.isAdmin()).thenReturn(true);

        // Admin with ID 777L accesses
        BookingResponseDto result = bookingService.getBookingById(777L, 999L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(999L);
        assertThat(result.getBookingCode()).isEqualTo("BK-20261120-ADMIN01");
    }

    @Test
    @DisplayName("Kiểm tra toàn vẹn dữ liệu Database: Mọi trường của BookingModel đều được khởi tạo chính xác khi lưu")
    void testCreateBooking_DatabaseModelPersistenceIntegrity() {
        CreateBookingRequestDto dto = CreateBookingRequestDto.builder()
                .workspaceId(mockWorkspace.getId())
                .resourceId(mockResource.getId())
                .startTime(futureMondayStart)
                .endTime(futureMondayEnd)
                .partySize(1)
                .priceType(PriceType.HOURLY)
                .notes("Ghế cạnh cửa sổ có sạc 65W")
                .build();

        when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
        when(workspaceRepository.findById(mockWorkspace.getId())).thenReturn(Optional.of(mockWorkspace));
        when(resourceRepository.findByIdForUpdate(mockResource.getId())).thenReturn(Optional.of(mockResource));

        WorkspaceOperatingHourModel operatingHour = new WorkspaceOperatingHourModel();
        operatingHour.setId(new WorkspaceOperatingHourModel.Key(mockWorkspace.getId(), 1));
        operatingHour.setOpenTime(LocalTime.of(8, 0));
        operatingHour.setCloseTime(LocalTime.of(22, 0));
        operatingHour.setClosed(false);
        when(operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(mockWorkspace.getId()))
                .thenReturn(List.of(operatingHour));

        when(bookingRepository.findConflictingBookingsWithHold(any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(blockedSlotRepository.findConflictingBlockedSlots(any(), any(), any()))
                .thenReturn(Collections.emptyList());

        org.mockito.ArgumentCaptor<BookingModel> modelCaptor = org.mockito.ArgumentCaptor.forClass(BookingModel.class);
        when(bookingRepository.save(modelCaptor.capture())).thenAnswer(invocation -> invocation.getArgument(0));

        bookingService.createBooking(mockCustomer.getId(), dto);

        BookingModel savedModel = modelCaptor.getValue();
        assertThat(savedModel).isNotNull();
        assertThat(savedModel.getCustomer()).isEqualTo(mockCustomer);
        assertThat(savedModel.getWorkspace()).isEqualTo(mockWorkspace);
        assertThat(savedModel.getResource()).isEqualTo(mockResource);
        assertThat(savedModel.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        assertThat(savedModel.getStartTime()).isEqualTo(futureMondayStart);
        assertThat(savedModel.getEndTime()).isEqualTo(futureMondayEnd);
        assertThat(savedModel.getHoldExpiresAt()).isNotNull();
        assertThat(savedModel.getHoldExpiresAt()).isAfter(LocalDateTime.now().plusMinutes(14));
        assertThat(savedModel.getBookingCode()).matches("^BK-[0-9]{8}-[A-F0-9]{6}$");
        assertThat(savedModel.getQrTokenHash()).isNotNull().hasSize(64);
        assertThat(savedModel.getBaseAmount()).isEqualByComparingTo(new BigDecimal("200000.00"));
        assertThat(savedModel.getTaxAmount()).isEqualByComparingTo(new BigDecimal("16000.00"));
        assertThat(savedModel.getFinalPrice()).isEqualByComparingTo(new BigDecimal("216000.00"));
        assertThat(savedModel.getPricingSnapshot()).contains("finalPrice");
    }

    @Test
    @DisplayName("Ném BadRequestException khi thời gian kết thúc trước thời gian bắt đầu")
    void testCreateBooking_ThrowsBadRequest_WhenEndTimeBeforeStartTime() {
        when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
        when(workspaceRepository.findById(mockWorkspace.getId())).thenReturn(Optional.of(mockWorkspace));
        when(resourceRepository.findByIdForUpdate(mockResource.getId())).thenReturn(Optional.of(mockResource));

        CreateBookingRequestDto dto = CreateBookingRequestDto.builder()
                .workspaceId(mockWorkspace.getId())
                .resourceId(mockResource.getId())
                .startTime(futureMondayEnd)
                .endTime(futureMondayStart)
                .partySize(1)
                .priceType(PriceType.HOURLY)
                .build();

        assertThatThrownBy(() -> bookingService.createBooking(mockCustomer.getId(), dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Thời gian kết thúc phải diễn ra sau thời gian bắt đầu");
    }

    @Test
    @DisplayName("Ném BadRequestException khi chỗ ngồi bị vô hiệu hóa (DISABLED)")
    void testCreateBooking_ThrowsBadRequest_WhenResourceDisabled() {
        mockResource.setStatus(BookableResourceStatus.DISABLED);

        CreateBookingRequestDto dto = CreateBookingRequestDto.builder()
                .workspaceId(mockWorkspace.getId())
                .resourceId(mockResource.getId())
                .startTime(futureMondayStart)
                .endTime(futureMondayEnd)
                .partySize(1)
                .priceType(PriceType.HOURLY)
                .build();

        when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
        when(workspaceRepository.findById(mockWorkspace.getId())).thenReturn(Optional.of(mockWorkspace));
        when(resourceRepository.findByIdForUpdate(mockResource.getId())).thenReturn(Optional.of(mockResource));

        assertThatThrownBy(() -> bookingService.createBooking(mockCustomer.getId(), dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Chỗ ngồi/phòng hiện không ở trạng thái hoạt động");
    }

    @Test
    @DisplayName("Tạo đơn đặt chỗ thành công với chế độ MANUAL_APPROVAL (PENDING_APPROVAL)")
    void testCreateBooking_Success_ManualApproval() {
        mockWorkspace.setBookingConfirmationMode(BookingConfirmationMode.MANUAL_APPROVAL);

        CreateBookingRequestDto dto = CreateBookingRequestDto.builder()
                .workspaceId(mockWorkspace.getId())
                .resourceId(mockResource.getId())
                .startTime(futureMondayStart)
                .endTime(futureMondayEnd)
                .partySize(1)
                .priceType(PriceType.HOURLY)
                .build();

        when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
        when(workspaceRepository.findById(mockWorkspace.getId())).thenReturn(Optional.of(mockWorkspace));
        when(resourceRepository.findByIdForUpdate(mockResource.getId())).thenReturn(Optional.of(mockResource));

        WorkspaceOperatingHourModel operatingHour = new WorkspaceOperatingHourModel();
        operatingHour.setId(new WorkspaceOperatingHourModel.Key(mockWorkspace.getId(), 1));
        operatingHour.setOpenTime(LocalTime.of(8, 0));
        operatingHour.setCloseTime(LocalTime.of(22, 0));
        operatingHour.setClosed(false);
        when(operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(mockWorkspace.getId()))
                .thenReturn(List.of(operatingHour));

        when(bookingRepository.findConflictingBookingsWithHold(any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(blockedSlotRepository.findConflictingBlockedSlots(any(), any(), any()))
                .thenReturn(Collections.emptyList());

        when(bookingRepository.save(any(BookingModel.class))).thenAnswer(invocation -> {
            BookingModel b = invocation.getArgument(0);
            b.setId(1001L);
            return b;
        });

        BookingResponseDto result = bookingService.createBooking(mockCustomer.getId(), dto);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(BookingStatus.PENDING_APPROVAL);
        assertThat(result.getHoldExpiresAt()).isNotNull();
    }

    @Test
    @DisplayName("Tra cứu thẻ thông hành getBookingByCode chính chủ thành công")
    void testGetBookingByCode_Success() {
        BookingModel booking = new BookingModel();
        booking.setId(888L);
        booking.setBookingCode("BK-20261120-ABC123");
        booking.setCustomer(mockCustomer);
        booking.setWorkspace(mockWorkspace);
        booking.setResource(mockResource);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setStartTime(futureMondayStart);
        booking.setEndTime(futureMondayEnd);
        booking.setFinalPrice(new BigDecimal("216000.00"));

        when(bookingRepository.findByBookingCode("BK-20261120-ABC123"))
                .thenReturn(Optional.of(booking));

        BookingResponseDto result = bookingService.getBookingByCode(mockCustomer.getId(), "BK-20261120-ABC123");

        assertThat(result).isNotNull();
        assertThat(result.getBookingCode()).isEqualTo("BK-20261120-ABC123");
        assertThat(result.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
    }

    @Test
    @DisplayName("Hủy đơn đặt chỗ đang trong trạng thái PENDING_PAYMENT thành công")
    void testCancelBooking_Success() {
        BookingModel booking = new BookingModel();
        booking.setId(99L);
        booking.setBookingCode("BK-20261120-PENDING");
        booking.setCustomer(mockCustomer);
        booking.setWorkspace(mockWorkspace);
        booking.setResource(mockResource);
        booking.setStatus(BookingStatus.PENDING_PAYMENT);
        booking.setHoldExpiresAt(LocalDateTime.now().plusMinutes(10));
        booking.setStartTime(futureMondayStart);
        booking.setEndTime(futureMondayEnd);
        booking.setFinalPrice(new BigDecimal("100000.00"));

        when(bookingRepository.findById(99L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(BookingModel.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));

        BookingResponseDto result = bookingService.cancelBooking(mockCustomer.getId(), 99L, "Không có nhu cầu");

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(result.getHoldExpiresAt()).isNull();
        assertThat(result.getCancelReason()).isEqualTo("Không có nhu cầu");
        assertThat(result.getCancelSource()).isEqualTo("CUSTOMER");
        assertThat(result.getCancelledAt()).isNotNull();
        verify(bookingRepository, times(1)).save(booking);
        verify(auditService, times(1)).log(eq(mockCustomer), eq("BOOKING"), eq("CANCEL"), eq("Booking"), eq(99L), anyString());
    }

    @Test
    @DisplayName("Hủy đơn CONFIRMED bởi Customer: Áp dụng chính sách hoàn tiền 100% khi hủy trước 24h")
    void testCancelBooking_Confirmed_Customer_100PercentRefund() {
        BookingModel booking = new BookingModel();
        booking.setId(1001L);
        booking.setBookingCode("BK-CONF-1001");
        booking.setCustomer(mockCustomer);
        booking.setWorkspace(mockWorkspace);
        booking.setResource(mockResource);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setStartTime(LocalDateTime.now().plusHours(48)); // 48h before start
        booking.setEndTime(LocalDateTime.now().plusHours(56));
        booking.setFinalPrice(new BigDecimal("500000.00"));

        base.api.shared.entity.workspace.WorkspaceCancellationRuleModel rule24h = new base.api.shared.entity.workspace.WorkspaceCancellationRuleModel();
        rule24h.setMinHoursBeforeStart(24);
        rule24h.setRefundPercent(new BigDecimal("100.00"));

        when(bookingRepository.findById(1001L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(BookingModel.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
        when(cancellationRuleRepository.findByWorkspaceIdOrderByMinHoursBeforeStartDesc(mockWorkspace.getId()))
                .thenReturn(List.of(rule24h));

        BookingResponseDto result = bookingService.cancelBooking(mockCustomer.getId(), 1001L, "Thay đổi lịch trình công tác");

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(result.getCancelSource()).isEqualTo("CUSTOMER");
        assertThat(result.getCancelReason()).isEqualTo("Thay đổi lịch trình công tác");
        assertThat(result.getRefundPercent()).isEqualByComparingTo("100.00");
        assertThat(result.getRefundAmount()).isEqualByComparingTo("500000.00");
        assertThat(result.getCancelledAt()).isNotNull();
    }

    @Test
    @DisplayName("Hủy đơn CONFIRMED bởi Organizer: Luôn hoàn tiền 100% bất kể thời gian trước giờ bắt đầu")
    void testCancelBooking_Confirmed_Organizer_FullRefund() {
        BookingModel booking = new BookingModel();
        booking.setId(1002L);
        booking.setBookingCode("BK-CONF-1002");
        booking.setCustomer(mockCustomer);
        booking.setWorkspace(mockWorkspace);
        booking.setResource(mockResource);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setStartTime(LocalDateTime.now().plusHours(2)); // Only 2h before start
        booking.setEndTime(LocalDateTime.now().plusHours(6));
        booking.setFinalPrice(new BigDecimal("800000.00"));

        when(bookingRepository.findById(1002L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(BookingModel.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById(mockHost.getId())).thenReturn(Optional.of(mockHost));

        BookingResponseDto result = bookingService.cancelBooking(mockHost.getId(), 1002L, "Sự cố mất điện đột xuất tại tòa nhà");

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(result.getCancelSource()).isEqualTo("ORGANIZER");
        assertThat(result.getCancelReason()).isEqualTo("Sự cố mất điện đột xuất tại tòa nhà");
        assertThat(result.getRefundPercent()).isEqualByComparingTo("100.00");
        assertThat(result.getRefundAmount()).isEqualByComparingTo("800000.00");
    }

    @Test
    @DisplayName("Xem trước chính sách hủy (getCancellationPreview) trả về đầy đủ mốc hoàn tiền và số tiền ước tính")
    void testGetCancellationPreview_Success() {
        BookingModel booking = new BookingModel();
        booking.setId(1003L);
        booking.setBookingCode("BK-PREVIEW-1003");
        booking.setCustomer(mockCustomer);
        booking.setWorkspace(mockWorkspace);
        booking.setResource(mockResource);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setStartTime(LocalDateTime.now().plusHours(30)); // 30h before
        booking.setEndTime(LocalDateTime.now().plusHours(34));
        booking.setFinalPrice(new BigDecimal("600000.00"));

        base.api.shared.entity.workspace.WorkspaceCancellationRuleModel rule24h = new base.api.shared.entity.workspace.WorkspaceCancellationRuleModel();
        rule24h.setMinHoursBeforeStart(24);
        rule24h.setRefundPercent(new BigDecimal("100.00"));

        base.api.shared.entity.workspace.WorkspaceCancellationRuleModel rule12h = new base.api.shared.entity.workspace.WorkspaceCancellationRuleModel();
        rule12h.setMinHoursBeforeStart(12);
        rule12h.setRefundPercent(new BigDecimal("50.00"));

        when(bookingRepository.findById(1003L)).thenReturn(Optional.of(booking));
        when(cancellationRuleRepository.findByWorkspaceIdOrderByMinHoursBeforeStartDesc(mockWorkspace.getId()))
                .thenReturn(List.of(rule24h, rule12h));

        BookingCancellationPreviewDto preview = bookingService.getCancellationPreview(mockCustomer.getId(), 1003L);

        assertThat(preview).isNotNull();
        assertThat(preview.getBookingId()).isEqualTo(1003L);
        assertThat(preview.isCanCancel()).isTrue();
        assertThat(preview.isHostCancellation()).isFalse();
        assertThat(preview.getRefundPercent()).isEqualByComparingTo("100.00");
        assertThat(preview.getRefundAmount()).isEqualByComparingTo("600000.00");
        assertThat(preview.getRules()).hasSize(2);
    }

    @Test
    @DisplayName("Hủy đơn đặt chỗ ném BadRequest khi đơn đã ở trạng thái CANCELLED")
    void testCancelBooking_ThrowsBadRequest_WhenAlreadyCancelled() {
        BookingModel booking = new BookingModel();
        booking.setId(99L);
        booking.setCustomer(mockCustomer);
        booking.setStatus(BookingStatus.CANCELLED);

        when(bookingRepository.findById(99L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.cancelBooking(mockCustomer.getId(), 99L, "Thử hủy lại"))
                .isInstanceOf(base.api.shared.exception.BadRequestException.class)
                .hasMessageContaining("Không thể hủy đơn đặt chỗ ở trạng thái hiện tại: CANCELLED");
    }

    @Test
    @DisplayName("Tự động quét và giải phóng các đơn giữ chỗ đã hết hạn 15 phút (expireOutdatedHolds)")
    void testExpireOutdatedHolds_Success() {
        BookingModel expiredBooking1 = new BookingModel();
        expiredBooking1.setId(101L);
        expiredBooking1.setBookingCode("BK-EXPIRED-1");
        expiredBooking1.setCustomer(mockCustomer);
        expiredBooking1.setStatus(BookingStatus.PENDING_PAYMENT);
        expiredBooking1.setHoldExpiresAt(LocalDateTime.now().minusMinutes(5));

        BookingModel expiredBooking2 = new BookingModel();
        expiredBooking2.setId(102L);
        expiredBooking2.setBookingCode("BK-EXPIRED-2");
        expiredBooking2.setCustomer(mockCustomer);
        expiredBooking2.setStatus(BookingStatus.PENDING_PAYMENT);
        expiredBooking2.setHoldExpiresAt(LocalDateTime.now().minusMinutes(1));

        when(bookingRepository.findByStatusAndHoldExpiresAtBefore(eq(BookingStatus.PENDING_PAYMENT), any(LocalDateTime.class)))
                .thenReturn(List.of(expiredBooking1, expiredBooking2));

        int expiredCount = bookingService.expireOutdatedHolds();

        assertThat(expiredCount).isEqualTo(2);
        assertThat(expiredBooking1.getStatus()).isEqualTo(BookingStatus.EXPIRED);
        assertThat(expiredBooking2.getStatus()).isEqualTo(BookingStatus.EXPIRED);
        verify(bookingRepository, times(2)).save(any(BookingModel.class));
    }

    @Test
    @DisplayName("getMyBookings - Lấy toàn bộ danh sách đặt chỗ của khách hàng khi không lọc status")
    void testGetMyBookings_WithoutStatus() {
        BookingModel b1 = new BookingModel();
        b1.setId(201L);
        b1.setBookingCode("BK-MY-01");
        b1.setCustomer(mockCustomer);
        b1.setWorkspace(mockWorkspace);
        b1.setResource(mockResource);
        b1.setStatus(BookingStatus.CONFIRMED);
        b1.setStartTime(futureMondayStart);
        b1.setEndTime(futureMondayEnd);
        b1.setFinalPrice(new BigDecimal("150000.00"));

        PageRequestDTO pageRequest = new PageRequestDTO();
        pageRequest.setPage(1);
        pageRequest.setSize(10);
        when(bookingRepository.findByCustomerIdOrderByCreatedAtDesc(eq(mockCustomer.getId()), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(b1)));

        PageResponseDTO<BookingResponseDto> result = bookingService.getMyBookings(mockCustomer.getId(), null, pageRequest);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getBookingCode()).isEqualTo("BK-MY-01");
        verify(bookingRepository, times(1)).findByCustomerIdOrderByCreatedAtDesc(eq(mockCustomer.getId()), any(PageRequest.class));
        verify(bookingRepository, never()).findByCustomerIdAndStatusOrderByCreatedAtDesc(any(), any(), any());
    }

    @Test
    @DisplayName("getMyBookings - Lọc danh sách đặt chỗ của khách hàng theo trạng thái PENDING_PAYMENT")
    void testGetMyBookings_WithStatus() {
        BookingModel b1 = new BookingModel();
        b1.setId(202L);
        b1.setBookingCode("BK-MY-02");
        b1.setCustomer(mockCustomer);
        b1.setWorkspace(mockWorkspace);
        b1.setResource(mockResource);
        b1.setStatus(BookingStatus.PENDING_PAYMENT);
        b1.setStartTime(futureMondayStart);
        b1.setEndTime(futureMondayEnd);
        b1.setFinalPrice(new BigDecimal("120000.00"));

        PageRequestDTO pageRequest = new PageRequestDTO();
        pageRequest.setPage(1);
        pageRequest.setSize(10);
        when(bookingRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(eq(mockCustomer.getId()), eq(BookingStatus.PENDING_PAYMENT), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(b1)));

        PageResponseDTO<BookingResponseDto> result = bookingService.getMyBookings(mockCustomer.getId(), BookingStatus.PENDING_PAYMENT, pageRequest);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        verify(bookingRepository, times(1)).findByCustomerIdAndStatusOrderByCreatedAtDesc(eq(mockCustomer.getId()), eq(BookingStatus.PENDING_PAYMENT), any(PageRequest.class));
        verify(bookingRepository, never()).findByCustomerIdOrderByCreatedAtDesc(any(), any());
    }

    @Test
    @DisplayName("getOrganizerBookings - Organizer xem danh sách booking theo workspace, ngày và trạng thái")
    void testGetOrganizerBookings_Success() {
        BookingModel b1 = new BookingModel();
        b1.setId(301L);
        b1.setBookingCode("BK-ORG-TEST-1");
        b1.setCustomer(mockCustomer);
        b1.setWorkspace(mockWorkspace);
        b1.setResource(mockResource);
        b1.setStatus(BookingStatus.CONFIRMED);
        b1.setStartTime(futureMondayStart);
        b1.setEndTime(futureMondayEnd);
        b1.setFinalPrice(new BigDecimal("250000.00"));

        PageRequestDTO pageRequest = new PageRequestDTO();
        pageRequest.setPage(1);
        pageRequest.setSize(10);

        when(workspaceRepository.findById(mockWorkspace.getId())).thenReturn(Optional.of(mockWorkspace));
        when(bookingRepository.findOrganizerBookings(
                eq(mockHost.getId()),
                eq(mockWorkspace.getId()),
                eq(BookingStatus.CONFIRMED),
                any(LocalDateTime.class),
                any(LocalDateTime.class),
                any(),
                any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(b1)));

        PageResponseDTO<BookingResponseDto> result = bookingService.getOrganizerBookings(
                mockHost.getId(),
                mockWorkspace.getId(),
                BookingStatus.CONFIRMED,
                futureMondayStart.toLocalDate(),
                null,
                null,
                pageRequest);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getBookingCode()).isEqualTo("BK-ORG-TEST-1");
        assertThat(result.getContent().get(0).getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        verify(bookingRepository, times(1)).findOrganizerBookings(
                eq(mockHost.getId()),
                eq(mockWorkspace.getId()),
                eq(BookingStatus.CONFIRMED),
                any(),
                any(),
                any(),
                any());
    }

    @Test
    @DisplayName("getOrganizerBookings - Ném NotFoundException khi Organizer không sở hữu Workspace")
    void testGetOrganizerBookings_ThrowsNotFound_WhenNotOwner() {
        UserModel otherOrganizer = new UserModel();
        otherOrganizer.setId(888L);
        mockWorkspace.setOrganizer(otherOrganizer);

        when(workspaceRepository.findById(mockWorkspace.getId())).thenReturn(Optional.of(mockWorkspace));

        PageRequestDTO pageRequest = new PageRequestDTO();
        pageRequest.setPage(1);
        pageRequest.setSize(10);

        assertThatThrownBy(() -> bookingService.getOrganizerBookings(
                mockHost.getId(),
                mockWorkspace.getId(),
                BookingStatus.CONFIRMED,
                null,
                null,
                null,
                pageRequest))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Không tìm thấy không gian làm việc với ID: " + mockWorkspace.getId());

        mockWorkspace.setOrganizer(mockHost); // restore
    }

    @Test
    @DisplayName("getOrganizerCalendarEvents - Organizer lấy sự kiện lịch thành công")
    void testGetOrganizerCalendarEvents_Success() {
        BookingModel b1 = new BookingModel();
        b1.setId(701L);
        b1.setBookingCode("BK-CAL-TEST-1");
        b1.setCustomer(mockCustomer);
        b1.setWorkspace(mockWorkspace);
        b1.setResource(mockResource);
        b1.setStatus(BookingStatus.CONFIRMED);
        b1.setStartTime(futureMondayStart);
        b1.setEndTime(futureMondayEnd);
        b1.setFinalPrice(new BigDecimal("150000.00"));

        when(workspaceRepository.findById(mockWorkspace.getId())).thenReturn(Optional.of(mockWorkspace));
        when(bookingRepository.findOrganizerCalendarBookings(
                eq(mockHost.getId()),
                eq(mockWorkspace.getId()),
                eq(BookingStatus.CONFIRMED),
                any(LocalDateTime.class),
                any(LocalDateTime.class)))
                .thenReturn(List.of(b1));

        List<BookingResponseDto> result = bookingService.getOrganizerCalendarEvents(
                mockHost.getId(),
                mockWorkspace.getId(),
                BookingStatus.CONFIRMED,
                futureMondayStart.toLocalDate(),
                null,
                null);

        assertThat(result).isNotNull().hasSize(1);
        assertThat(result.get(0).getBookingCode()).isEqualTo("BK-CAL-TEST-1");
        assertThat(result.get(0).getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        verify(bookingRepository, times(1)).findOrganizerCalendarBookings(
                eq(mockHost.getId()),
                eq(mockWorkspace.getId()),
                eq(BookingStatus.CONFIRMED),
                any(),
                any());
    }

    @Test
    @DisplayName("getOrganizerCalendarEvents - Ném NotFoundException khi Organizer không sở hữu Workspace")
    void testGetOrganizerCalendarEvents_ThrowsNotFound_WhenNotOwner() {
        UserModel otherOrganizer = new UserModel();
        otherOrganizer.setId(888L);
        mockWorkspace.setOrganizer(otherOrganizer);

        when(workspaceRepository.findById(mockWorkspace.getId())).thenReturn(Optional.of(mockWorkspace));

        assertThatThrownBy(() -> bookingService.getOrganizerCalendarEvents(
                mockHost.getId(),
                mockWorkspace.getId(),
                BookingStatus.CONFIRMED,
                futureMondayStart.toLocalDate(),
                null,
                null))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Không tìm thấy không gian làm việc với ID: " + mockWorkspace.getId());

        mockWorkspace.setOrganizer(mockHost); // restore
    }

    @Test
    @DisplayName("approveBooking - Phê duyệt đơn đặt chỗ có phí thành công chuyển sang PENDING_PAYMENT")
    void testApproveBooking_Success_PaidBooking() {
        BookingModel booking = new BookingModel();
        booking.setId(901L);
        booking.setBookingCode("BK-APP-TEST-01");
        booking.setCustomer(mockCustomer);
        booking.setWorkspace(mockWorkspace);
        booking.setResource(mockResource);
        booking.setStatus(BookingStatus.PENDING_APPROVAL);
        booking.setStartTime(futureMondayStart);
        booking.setEndTime(futureMondayEnd);
        booking.setFinalPrice(new BigDecimal("200000.00"));

        when(bookingRepository.findById(901L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(BookingModel.class))).thenAnswer(i -> i.getArgument(0));

        BookingResponseDto result = bookingService.approveBooking(mockHost.getId(), 901L);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        assertThat(result.getHoldExpiresAt()).isNotNull();
    }

    @Test
    @DisplayName("approveBooking - Phê duyệt đơn đặt chỗ miễn phí thành công chuyển thẳng sang CONFIRMED")
    void testApproveBooking_Success_FreeBooking() {
        BookingModel booking = new BookingModel();
        booking.setId(902L);
        booking.setBookingCode("BK-APP-TEST-02");
        booking.setCustomer(mockCustomer);
        booking.setWorkspace(mockWorkspace);
        booking.setResource(mockResource);
        booking.setStatus(BookingStatus.PENDING_APPROVAL);
        booking.setStartTime(futureMondayStart);
        booking.setEndTime(futureMondayEnd);
        booking.setFinalPrice(BigDecimal.ZERO);

        when(bookingRepository.findById(902L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(BookingModel.class))).thenAnswer(i -> i.getArgument(0));

        BookingResponseDto result = bookingService.approveBooking(mockHost.getId(), 902L);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(result.getHoldExpiresAt()).isNull();
    }

    @Test
    @DisplayName("approveBooking - Ném BadRequestException khi trạng thái không phải PENDING_APPROVAL")
    void testApproveBooking_ThrowsBadRequest_WhenNotPendingApproval() {
        BookingModel booking = new BookingModel();
        booking.setId(903L);
        booking.setBookingCode("BK-APP-TEST-03");
        booking.setCustomer(mockCustomer);
        booking.setWorkspace(mockWorkspace);
        booking.setStatus(BookingStatus.CONFIRMED); // Đã confirmed

        when(bookingRepository.findById(903L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.approveBooking(mockHost.getId(), 903L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Chỉ có thể phê duyệt đơn đặt chỗ đang chờ duyệt (PENDING_APPROVAL)");
    }

    @Test
    @DisplayName("rejectBooking - Từ chối duyệt đơn đặt chỗ thành công chuyển sang CANCELLED và ghi nhận lý do")
    void testRejectBooking_Success() {
        BookingModel booking = new BookingModel();
        booking.setId(904L);
        booking.setBookingCode("BK-REJ-TEST-04");
        booking.setCustomer(mockCustomer);
        booking.setWorkspace(mockWorkspace);
        booking.setResource(mockResource);
        booking.setStatus(BookingStatus.PENDING_APPROVAL);
        booking.setStartTime(futureMondayStart);
        booking.setEndTime(futureMondayEnd);
        booking.setFinalPrice(new BigDecimal("300000.00"));

        when(bookingRepository.findById(904L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(BookingModel.class))).thenAnswer(i -> i.getArgument(0));

        BookingResponseDto result = bookingService.rejectBooking(mockHost.getId(), 904L, "Phòng cần sửa chữa đột xuất");

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(result.getCancelReason()).isEqualTo("Phòng cần sửa chữa đột xuất");
        assertThat(result.getCancelSource()).isEqualTo("ORGANIZER");
        assertThat(result.getHoldExpiresAt()).isNull();
    }
}
