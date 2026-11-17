package base.api.feature.booking.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.dto.request.HoldResourceRequestDto;
import base.api.feature.booking.dto.response.HoldResourceResponseDto;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.booking.service.impl.ResourceHoldServiceImpl;
import base.api.feature.governance.repository.IPlatformSettingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.pricing.repository.IPricingRuleRepository;
import base.api.feature.resource.dto.LockedResourceContext;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.service.IResourceLockService;
import base.api.feature.workspace.repository.IWorkspaceCancellationRuleRepository;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.FloorPlanModel;
import base.api.shared.entity.resource.ResourceTypeModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.entity.workspace.WorkspaceOperatingHourModel;
import base.api.shared.enums.*;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResourceHoldServiceTest {

    @Mock
    private IUserRepository userRepository;
    @Mock
    private IBookableResourceRepository resourceRepository;
    @Mock
    private IBookingRepository bookingRepository;
    @Mock
    private IResourceLockService resourceLockService;
    @Mock
    private IWorkspaceOperatingHourRepository operatingHourRepository;
    @Mock
    private IWorkspaceCancellationRuleRepository cancellationRuleRepository;
    @Mock
    private IOrganizerProfileRepository organizerProfiles;
    @Mock
    private IPricingRuleRepository pricingRuleRepository;
    @Mock
    private IPlatformSettingRepository platformSettingRepository;
    @Mock
    private IAuditService auditService;
    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private ResourceHoldServiceImpl holdService;

    private UserModel mockCustomer;
    private WorkspaceModel mockWorkspace;
    private BookableResourceModel mockResource;
    private LocalDateTime baseStartTime;
    private LocalDateTime baseEndTime;

    @BeforeEach
    void setUp() {
        mockCustomer = new UserModel();
        mockCustomer.setId(10L);
        mockCustomer.setEmail("customer@nexspace.vn");
        mockCustomer.setFirstName("Minh");
        mockCustomer.setLastName("Nguyen");
        mockCustomer.setStatus(UserStatus.ACTIVE);

        mockWorkspace = new WorkspaceModel();
        mockWorkspace.setId(1L);
        mockWorkspace.setName("NexSpace Da Nang");
        mockWorkspace.setStatus(WorkspaceStatus.ACTIVE);
        mockWorkspace.setBookingConfirmationMode(BookingConfirmationMode.INSTANT);

        ResourceTypeModel resourceType = new ResourceTypeModel();
        resourceType.setId(5L);
        resourceType.setName("Dedicated Desk");
        resourceType.setCategory(ResourceCategory.DESK);
        resourceType.setActive(true);
        resourceType.setPricePerHour(BigDecimal.valueOf(50000));

        FloorPlanModel floorPlan = new FloorPlanModel();
        floorPlan.setId(20L);
        floorPlan.setWorkspace(mockWorkspace);

        mockResource = new BookableResourceModel();
        mockResource.setId(101L);
        mockResource.setLabel("D-01");
        mockResource.setName("Focus Desk 01");
        mockResource.setStatus(BookableResourceStatus.ACTIVE);
        mockResource.setFloorPlan(floorPlan);
        mockResource.setResourceType(resourceType);
        mockResource.setPricePerHour(BigDecimal.valueOf(50000));

        baseStartTime = LocalDateTime.now().plusDays(1).withHour(9).withMinute(0).withSecond(0).withNano(0);
        baseEndTime = baseStartTime.plusHours(3);
    }

    private void mockOperatingHours() {
        WorkspaceOperatingHourModel woh = new WorkspaceOperatingHourModel();
        woh.setId(new WorkspaceOperatingHourModel.Key(mockWorkspace.getId(), baseStartTime.getDayOfWeek().getValue() % 7));
        woh.setClosed(false);
        woh.setOpenTime(LocalTime.of(7, 0));
        woh.setCloseTime(LocalTime.of(22, 0));

        when(operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(mockWorkspace.getId()))
                .thenReturn(List.of(woh));
    }

    @Nested
    @DisplayName("Kiểm thử Quy tắc Idempotent Active Hold Reuse")
    class IdempotentReuseTests {

        @Test
        @DisplayName("Khi cùng khách hàng gửi yêu cầu hold cho cùng tài nguyên và thời gian còn hạn -> Tái sử dụng hold cũ, isReused = true")
        void holdResource_WhenActiveHoldExistsForSameCustomerAndTime_ShouldReuseHold() {
            HoldResourceRequestDto request = HoldResourceRequestDto.builder()
                    .resourceId(mockResource.getId())
                    .startTime(baseStartTime)
                    .endTime(baseEndTime)
                    .build();

            when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));

            BookingModel existingHold = new BookingModel();
            existingHold.setId(555L);
            existingHold.setBookingCode("BK-20261125-ABCD12");
            existingHold.setCustomer(mockCustomer);
            existingHold.setResource(mockResource);
            existingHold.setWorkspace(mockWorkspace);
            existingHold.setStartTime(baseStartTime);
            existingHold.setEndTime(baseEndTime);
            existingHold.setStatus(BookingStatus.PENDING_PAYMENT);
            existingHold.setHoldExpiresAt(LocalDateTime.now().plusMinutes(8));
            existingHold.setBaseAmount(BigDecimal.valueOf(150000));
            existingHold.setFinalPrice(BigDecimal.valueOf(165000));

            when(bookingRepository.findActiveHoldByCustomerAndResource(
                    eq(mockCustomer.getId()), eq(mockResource.getId()), eq(baseStartTime), eq(baseEndTime), any()))
                    .thenReturn(Optional.of(existingHold));

            HoldResourceResponseDto response = holdService.holdResource(mockCustomer.getId(), request);

            assertThat(response).isNotNull();
            assertThat(response.getBookingId()).isEqualTo(555L);
            assertThat(response.getBookingCode()).isEqualTo("BK-20261125-ABCD12");
            assertThat(response.isReused()).isTrue();
            assertThat(response.getServerTime()).isNotNull();
            assertThat(response.getTtlSeconds()).isGreaterThan(0);

            // Không gọi lock mới và không tạo booking mới
            verify(resourceLockService, never()).acquireResourceLock(any(), any(), any());
            verify(bookingRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Kiểm thử Giới hạn số lượng Hold Active (Chống đầu cơ/spam)")
    class ActiveHoldLimitTests {

        @Test
        @DisplayName("Khi khách hàng đã có 3 hold active đồng thời -> Lập tức chặn bằng BadRequestException")
        void holdResource_WhenCustomerHasReachedMax3ActiveHolds_ShouldThrowBadRequestException() {
            HoldResourceRequestDto request = HoldResourceRequestDto.builder()
                    .resourceId(mockResource.getId())
                    .startTime(baseStartTime)
                    .endTime(baseEndTime)
                    .build();

            when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
            when(bookingRepository.findActiveHoldByCustomerAndResource(any(), any(), any(), any(), any()))
                    .thenReturn(Optional.empty());
            when(bookingRepository.countActiveHoldsByCustomer(eq(mockCustomer.getId()), any()))
                    .thenReturn(3L);

            assertThatThrownBy(() -> holdService.holdResource(mockCustomer.getId(), request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Bạn chỉ được giữ tối đa 3 chỗ cùng lúc");

            verify(resourceLockService, never()).acquireResourceLock(any(), any(), any());
        }
    }

    @Nested
    @DisplayName("Kiểm thử Luồng Giữ chỗ Thành công & Khóa bi quan Concurrency")
    class SuccessfulHoldTests {

        @Test
        @DisplayName("Giữ chỗ mới thành công: Lock tài nguyên ID ASC, tính giá, lưu PENDING_PAYMENT và trả về DTO chuẩn")
        void holdResource_WhenValid_ShouldLockAndCreateHold() {
            HoldResourceRequestDto request = HoldResourceRequestDto.builder()
                    .resourceId(mockResource.getId())
                    .startTime(baseStartTime)
                    .endTime(baseEndTime)
                    .partySize(1)
                    .priceType(PriceType.HOURLY)
                    .build();

            when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
            when(bookingRepository.findActiveHoldByCustomerAndResource(any(), any(), any(), any(), any()))
                    .thenReturn(Optional.empty());
            when(bookingRepository.countActiveHoldsByCustomer(eq(mockCustomer.getId()), any()))
                    .thenReturn(1L); // Có 1 hold, dưới hạn 3

            LockedResourceContext lockContext = LockedResourceContext.builder()
                    .targetResource(mockResource)
                    .lockedResources(List.of(mockResource))
                    .lockedResourceIds(List.of(mockResource.getId()))
                    .startTime(baseStartTime)
                    .endTime(baseEndTime)
                    .build();

            when(resourceLockService.acquireResourceLock(mockResource.getId(), baseStartTime, baseEndTime))
                    .thenReturn(lockContext);

            mockOperatingHours();
            when(pricingRuleRepository.findByWorkspaceId(mockWorkspace.getId())).thenReturn(Collections.emptyList());
            when(cancellationRuleRepository.findByWorkspaceIdOrderByMinHoursBeforeStartDesc(mockWorkspace.getId()))
                    .thenReturn(Collections.emptyList());
            when(bookingRepository.existsByBookingCode(any())).thenReturn(false);

            when(bookingRepository.save(any(BookingModel.class))).thenAnswer(invocation -> {
                BookingModel b = invocation.getArgument(0);
                b.setId(789L);
                return b;
            });

            HoldResourceResponseDto response = holdService.holdResource(mockCustomer.getId(), request);

            assertThat(response).isNotNull();
            assertThat(response.getBookingId()).isEqualTo(789L);
            assertThat(response.getResourceId()).isEqualTo(mockResource.getId());
            assertThat(response.getWorkspaceId()).isEqualTo(mockWorkspace.getId());
            assertThat(response.isReused()).isFalse();
            assertThat(response.getHoldExpiresAt()).isAfter(LocalDateTime.now());
            assertThat(response.getServerTime()).isNotNull();
            assertThat(response.getTtlSeconds()).isGreaterThan(0);
            assertThat(response.getBaseAmount()).isEqualByComparingTo(new BigDecimal("150000.00")); // 3h * 50,000

            verify(auditService, times(1)).log(any(), any(), any(), any(), any(), any());
        }

        @Test
        @DisplayName("Khi tài nguyên bị xung đột bởi người khác đặt trước -> Ném ConflictException từ ResourceLockService")
        void holdResource_WhenResourceIsAlreadyHeldBySomeoneElse_ShouldThrowConflictException() {
            HoldResourceRequestDto request = HoldResourceRequestDto.builder()
                    .resourceId(mockResource.getId())
                    .startTime(baseStartTime)
                    .endTime(baseEndTime)
                    .build();

            when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
            when(bookingRepository.findActiveHoldByCustomerAndResource(any(), any(), any(), any(), any()))
                    .thenReturn(Optional.empty());
            when(bookingRepository.countActiveHoldsByCustomer(eq(mockCustomer.getId()), any()))
                    .thenReturn(0L);

            when(resourceLockService.acquireResourceLock(mockResource.getId(), baseStartTime, baseEndTime))
                    .thenThrow(new ConflictException("Chỗ ngồi hoặc phòng đã có người đặt hoặc đang giữ chỗ trong khoảng thời gian này"));

            assertThatThrownBy(() -> holdService.holdResource(mockCustomer.getId(), request))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("đã có người đặt hoặc đang giữ chỗ");
        }
    }

    @Nested
    @DisplayName("Kiểm thử Tra cứu Active Hold")
    class GetActiveHoldTests {

        @Test
        @DisplayName("Tra cứu thành công khi có hold PENDING_PAYMENT còn hạn")
        void getActiveHold_WhenHoldExists_ShouldReturnDto() {
            BookingModel activeBooking = new BookingModel();
            activeBooking.setId(888L);
            activeBooking.setBookingCode("BK-888");
            activeBooking.setCustomer(mockCustomer);
            activeBooking.setResource(mockResource);
            activeBooking.setWorkspace(mockWorkspace);
            activeBooking.setStatus(BookingStatus.PENDING_PAYMENT);
            activeBooking.setHoldExpiresAt(LocalDateTime.now().plusMinutes(5));
            activeBooking.setStartTime(baseStartTime);
            activeBooking.setEndTime(baseEndTime);
            activeBooking.setBaseAmount(BigDecimal.valueOf(100000));
            activeBooking.setFinalPrice(BigDecimal.valueOf(110000));

            when(bookingRepository.findByCustomerIdAndStatus(mockCustomer.getId(), BookingStatus.PENDING_PAYMENT))
                    .thenReturn(List.of(activeBooking));

            HoldResourceResponseDto dto = holdService.getActiveHold(mockCustomer.getId(), mockResource.getId());

            assertThat(dto).isNotNull();
            assertThat(dto.getBookingId()).isEqualTo(888L);
            assertThat(dto.getResourceId()).isEqualTo(mockResource.getId());
        }

        @Test
        @DisplayName("Tra cứu ném NotFoundException khi không có hold nào còn hạn")
        void getActiveHold_WhenNoHold_ShouldThrowNotFoundException() {
            when(bookingRepository.findByCustomerIdAndStatus(mockCustomer.getId(), BookingStatus.PENDING_PAYMENT))
                    .thenReturn(Collections.emptyList());

            assertThatThrownBy(() -> holdService.getActiveHold(mockCustomer.getId(), mockResource.getId()))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("Không tìm thấy phiên giữ chỗ đang hiệu lực");
        }
    }
}
