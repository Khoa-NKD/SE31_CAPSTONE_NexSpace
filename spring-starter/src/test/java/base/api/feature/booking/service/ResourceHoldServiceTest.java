package base.api.feature.booking.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.dto.request.HoldResourceRequestDto;
import base.api.feature.booking.dto.response.HoldResourceResponseDto;
import base.api.feature.booking.event.ResourceHoldExpiredEvent;
import base.api.feature.booking.event.ResourceHoldReleasedEvent;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.booking.service.impl.ResourceHoldServiceImpl;
import base.api.feature.governance.repository.IPlatformSettingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.notification.service.INotificationService;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.feature.pricing.repository.IPricingRuleRepository;
import base.api.feature.resource.dto.LockedResourceContext;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.service.IResourceLockService;
import base.api.feature.workspace.repository.IWorkspaceCancellationRuleRepository;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
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
import org.springframework.context.ApplicationEventPublisher;
import vn.payos.PayOS;

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
    @Mock
    private IPaymentTransactionRepository paymentTransactionRepository;
    @Mock
    private ApplicationEventPublisher applicationEventPublisher;
    @Mock
    private PayOS payOS;
    @Mock
    private INotificationService notificationService;
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

    @Test
    void holdRejectsPartyLargerThanCapacityAfterMaintenance() {
        var request = HoldResourceRequestDto.builder().resourceId(mockResource.getId())
                .startTime(baseStartTime).endTime(baseEndTime).partySize(10).build();
        when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
        when(resourceLockService.acquireResourceLock(mockResource.getId(), baseStartTime, baseEndTime))
                .thenReturn(LockedResourceContext.builder().targetResource(mockResource).availableCapacity(9).build());
        assertThatThrownBy(() -> holdService.holdResource(mockCustomer.getId(), request))
                .isInstanceOf(ConflictException.class).hasMessageContaining("ghế khả dụng");
    }

    @Test
    void holdChargesRentalAndConfiguredVatWithoutCustomerFees() {
        mockResource.setPricePerHour(new BigDecimal("500000"));
        var vat = new base.api.shared.entity.governance.PlatformSettingModel();
        vat.setSettingValue("10");
        var obsoleteFee = new base.api.shared.entity.governance.PlatformSettingModel();
        obsoleteFee.setSettingValue("2");
        when(platformSettingRepository.findById(anyString())).thenAnswer(invocation -> {
            String key = invocation.getArgument(0);
            return switch (key) {
                case "payment.vat_percent" -> Optional.of(vat);
                case "payment.service_fee_percent" -> Optional.of(obsoleteFee);
                default -> Optional.empty();
            };
        });
        var request = HoldResourceRequestDto.builder().resourceId(mockResource.getId()).startTime(baseStartTime)
                .endTime(baseStartTime.plusHours(2)).priceType(PriceType.HOURLY).build();
        when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
        when(resourceLockService.acquireResourceLock(mockResource.getId(), request.getStartTime(), request.getEndTime()))
                .thenReturn(LockedResourceContext.builder().targetResource(mockResource).build());
        when(bookingRepository.save(any(BookingModel.class))).thenAnswer(invocation -> {
            var booking = invocation.getArgument(0, BookingModel.class);
            booking.setId(789L);
            assertThat(booking.getBaseAmount()).isEqualByComparingTo("1000000");
            assertThat(booking.getTaxAmount()).isEqualByComparingTo("100000");
            assertThat(booking.getServiceFeeAmount()).isZero();
            assertThat(booking.getPlatformFeeAmount()).isEqualByComparingTo("100000");
            return booking;
        });

        var held = holdService.holdResource(mockCustomer.getId(), request);
        assertThat(held.getFinalPrice()).isEqualByComparingTo("1100000");
    }

    @Test
    void monthlyHoldIsRejectedBeforeReusingOrSavingAnything() {
        var request=HoldResourceRequestDto.builder().resourceId(mockResource.getId()).startTime(baseStartTime)
                .endTime(baseEndTime).priceType(PriceType.MONTHLY).build();
        assertThatThrownBy(()->holdService.holdResource(mockCustomer.getId(),request))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("tháng");
        verify(bookingRepository,never()).findActiveHoldByCustomerAndResource(any(),any(),any(),any(),any());
        verify(bookingRepository,never()).save(any());
    }

    @Test
    void dailyHoldUsesTheSameBaseRateAsThePreview() {
        mockResource.getResourceType().setPricePerDay(new BigDecimal("200000.00"));
        var request=HoldResourceRequestDto.builder().resourceId(mockResource.getId()).startTime(baseStartTime)
                .endTime(baseEndTime).priceType(PriceType.DAILY).build();
        when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
        when(resourceLockService.acquireResourceLock(mockResource.getId(),baseStartTime,baseEndTime))
                .thenReturn(LockedResourceContext.builder().targetResource(mockResource).build());
        when(bookingRepository.save(any(BookingModel.class))).thenAnswer(invocation->{var b=invocation.getArgument(0,BookingModel.class);b.setId(789L);return b;});
        var response=holdService.holdResource(mockCustomer.getId(),request);
        assertThat(response.getBaseAmount()).isEqualByComparingTo("200000.00");
        verify(bookingRepository).save(argThat(b->b.getPriceType()==PriceType.DAILY&&b.getBaseAmount().compareTo(new BigDecimal("200000.00"))==0));
    }

    @Test
    void cannotChangePriceTypeWhenReusingAnActiveHold() {
        var request = HoldResourceRequestDto.builder().resourceId(mockResource.getId())
                .startTime(baseStartTime).endTime(baseEndTime).priceType(PriceType.DAILY).build();
        var existing = new BookingModel();
        existing.setPriceType(PriceType.HOURLY);
        when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
        when(bookingRepository.findActiveHoldByCustomerAndResource(eq(mockCustomer.getId()),
                eq(mockResource.getId()), eq(baseStartTime), eq(baseEndTime), any()))
                .thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> holdService.holdResource(mockCustomer.getId(), request))
                .isInstanceOf(ConflictException.class).hasMessageContaining("loại giá khác");
        verify(bookingRepository, never()).save(any());
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

        @Test
        @DisplayName("Khi cấu hình DB booking.max_active_holds = 1 -> Khách hàng có 1 hold active lập tức bị chặn theo đúng số trong DB")
        void holdResource_WhenMaxActiveHoldsConfiguredInDb_ShouldRespectDbValue() {
            HoldResourceRequestDto request = HoldResourceRequestDto.builder()
                    .resourceId(mockResource.getId())
                    .startTime(baseStartTime)
                    .endTime(baseEndTime)
                    .build();

            base.api.shared.entity.governance.PlatformSettingModel setting = new base.api.shared.entity.governance.PlatformSettingModel();
            setting.setSettingKey("booking.max_active_holds");
            setting.setSettingValue("1");

            when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
            when(bookingRepository.findActiveHoldByCustomerAndResource(any(), any(), any(), any(), any()))
                    .thenReturn(Optional.empty());
            lenient().when(platformSettingRepository.findById("booking.max_active_holds")).thenReturn(Optional.of(setting));
            when(bookingRepository.countActiveHoldsByCustomer(eq(mockCustomer.getId()), any()))
                    .thenReturn(1L);

            assertThatThrownBy(() -> holdService.holdResource(mockCustomer.getId(), request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Bạn chỉ được giữ tối đa 1 chỗ cùng lúc");

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
        @DisplayName("Khi cấu hình DB booking.hold_ttl_minutes = 7 -> Hold hết hạn sau đúng 7 phút")
        void holdResource_WhenHoldDurationConfiguredInDbAs7Minutes_ShouldExpireIn7Minutes() {
            HoldResourceRequestDto request = HoldResourceRequestDto.builder()
                    .resourceId(mockResource.getId())
                    .startTime(baseStartTime)
                    .endTime(baseEndTime)
                    .partySize(1)
                    .priceType(PriceType.HOURLY)
                    .build();

            base.api.shared.entity.governance.PlatformSettingModel setting = new base.api.shared.entity.governance.PlatformSettingModel();
            setting.setSettingKey("booking.hold_ttl_minutes");
            setting.setSettingValue("7");

            when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
            when(bookingRepository.findActiveHoldByCustomerAndResource(any(), any(), any(), any(), any()))
                    .thenReturn(Optional.empty());
            lenient().when(platformSettingRepository.findById("booking.hold_ttl_minutes")).thenReturn(Optional.of(setting));
            lenient().when(platformSettingRepository.findById("booking.max_active_holds")).thenReturn(Optional.empty());
            lenient().when(platformSettingRepository.findById("booking_max_active_holds")).thenReturn(Optional.empty());
            when(bookingRepository.countActiveHoldsByCustomer(eq(mockCustomer.getId()), any()))
                    .thenReturn(0L);

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
                b.setId(790L);
                return b;
            });

            HoldResourceResponseDto response = holdService.holdResource(mockCustomer.getId(), request);

            assertThat(response).isNotNull();
            assertThat(response.getBookingId()).isEqualTo(790L);
            assertThat(response.getTtlSeconds()).isBetween(415L, 425L);
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

    @Nested
    @DisplayName("Kiểm thử Khách hàng Chủ động Hủy/Nhả Phiên Giữ Chỗ (Manual Release API)")
    class ReleaseHoldTests {

        @Test
        @DisplayName("Nhả hold thành công: chuyển sang CANCELLED, xóa holdExpiresAt, ghi audit log và phát ResourceHoldReleasedEvent")
        void releaseHold_WhenValid_ShouldCancelAndPublishEvent() {
            BookingModel booking = new BookingModel();
            booking.setId(701L);
            booking.setBookingCode("BK-701-HOLD");
            booking.setCustomer(mockCustomer);
            booking.setResource(mockResource);
            booking.setWorkspace(mockWorkspace);
            booking.setStatus(BookingStatus.PENDING_PAYMENT);
            booking.setHoldExpiresAt(LocalDateTime.now().plusMinutes(7));

            when(bookingRepository.findById(701L)).thenReturn(Optional.of(booking));
            when(bookingRepository.save(any(BookingModel.class))).thenAnswer(i -> i.getArgument(0));

            HoldResourceResponseDto response = holdService.releaseHold(mockCustomer.getId(), 701L);

            assertThat(response).isNotNull();
            assertThat(response.getBookingId()).isEqualTo(701L);
            assertThat(booking.getStatus()).isEqualTo(BookingStatus.CANCELLED);
            assertThat(booking.getHoldExpiresAt()).isNull();
            assertThat(booking.getCancelledAt()).isNotNull();
            assertThat(booking.getCancelSource()).isEqualTo(CancelSource.CUSTOMER);

            verify(auditService, times(1)).log(eq(mockCustomer), eq("BOOKING"), eq("RELEASE_HOLD"), eq("Booking"), eq(701L), anyString());
            verify(applicationEventPublisher, times(1)).publishEvent(any(ResourceHoldReleasedEvent.class));
            verify(notificationService, times(1)).sendBookingCancelledNotification(eq(booking), eq(BigDecimal.ZERO), anyString());
        }

        @Test
        @DisplayName("Strict Ownership: Khách hàng khác cố gắng nhả hold của người khác -> Ném NotFoundException để bảo mật")
        void releaseHold_WhenNotOwner_ShouldThrowNotFoundException() {
            UserModel otherCustomer = new UserModel();
            otherCustomer.setId(999L);

            BookingModel booking = new BookingModel();
            booking.setId(702L);
            booking.setCustomer(otherCustomer);

            when(bookingRepository.findById(702L)).thenReturn(Optional.of(booking));

            assertThatThrownBy(() -> holdService.releaseHold(mockCustomer.getId(), 702L))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("Không tìm thấy đơn giữ chỗ");

            verify(bookingRepository, never()).save(any());
            verify(applicationEventPublisher, never()).publishEvent(any());
        }

        @Test
        @DisplayName("State Machine Defense: Đơn đã CONFIRMED -> Không cho phép release-hold, ném BadRequestException")
        void releaseHold_WhenBookingAlreadyConfirmed_ShouldThrowBadRequestException() {
            BookingModel booking = new BookingModel();
            booking.setId(703L);
            booking.setCustomer(mockCustomer);
            booking.setStatus(BookingStatus.CONFIRMED);

            when(bookingRepository.findById(703L)).thenReturn(Optional.of(booking));

            assertThatThrownBy(() -> holdService.releaseHold(mockCustomer.getId(), 703L))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Đơn đặt chỗ đã thanh toán thành công");

            verify(bookingRepository, never()).save(any());
        }

        @Test
        @DisplayName("Idempotent Release: Đơn đã CANCELLED trước đó -> Trả về kết quả mà không lỗi và không đổi trạng thái")
        void releaseHold_WhenAlreadyCancelled_ShouldReturnIdempotentDto() {
            BookingModel booking = new BookingModel();
            booking.setId(704L);
            booking.setBookingCode("BK-704-CANCELLED");
            booking.setCustomer(mockCustomer);
            booking.setResource(mockResource);
            booking.setWorkspace(mockWorkspace);
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setHoldExpiresAt(null);

            when(bookingRepository.findById(704L)).thenReturn(Optional.of(booking));

            HoldResourceResponseDto response = holdService.releaseHold(mockCustomer.getId(), 704L);

            assertThat(response).isNotNull();
            assertThat(response.getBookingId()).isEqualTo(704L);
            verify(bookingRepository, never()).save(any());
            verify(applicationEventPublisher, never()).publishEvent(any());
        }
    }

    @Nested
    @DisplayName("Kiểm thử Phòng vệ Tấn công Rolling Hold & Cooldown Re-Hold")
    class AntiAbuseTests {

        @Test
        @DisplayName("Chống Rolling Hold Attack: Khi gia hạn nhiều lần chạm trần 15 phút từ createdAt -> Không cho phép gia hạn vượt quá trần")
        void holdResource_WhenRollingHoldHitsHardCeiling_ShouldNotExtendPastCeiling() {
            HoldResourceRequestDto request = HoldResourceRequestDto.builder()
                    .resourceId(mockResource.getId())
                    .startTime(baseStartTime)
                    .endTime(baseEndTime)
                    .build();

            when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));

            LocalDateTime now = LocalDateTime.now();
            LocalDateTime originalCreatedAt = now.minusMinutes(14); // Đã tạo 14 phút trước, trần 15 phút
            LocalDateTime currentHoldExpiry = now.plusMinutes(1); // Còn 1 phút nữa hết hạn

            BookingModel existingHold = new BookingModel();
            existingHold.setId(666L);
            existingHold.setBookingCode("BK-666-ROLLING");
            existingHold.setCustomer(mockCustomer);
            existingHold.setResource(mockResource);
            existingHold.setWorkspace(mockWorkspace);
            existingHold.setStartTime(baseStartTime);
            existingHold.setEndTime(baseEndTime);
            existingHold.setStatus(BookingStatus.PENDING_PAYMENT);
            existingHold.setHoldExpiresAt(currentHoldExpiry);
            existingHold.setCreatedAt(originalCreatedAt);

            when(bookingRepository.findActiveHoldByCustomerAndResource(
                    eq(mockCustomer.getId()), eq(mockResource.getId()), eq(baseStartTime), eq(baseEndTime), any()))
                    .thenReturn(Optional.of(existingHold));
            lenient().when(bookingRepository.save(any(BookingModel.class))).thenAnswer(i -> i.getArgument(0));

            HoldResourceResponseDto response = holdService.holdResource(mockCustomer.getId(), request);

            assertThat(response).isNotNull();
            assertThat(response.isReused()).isTrue();
            // Expiry không thể vượt quá createdAt + 15 phút
            LocalDateTime maxAllowed = originalCreatedAt.plusMinutes(15);
            assertThat(existingHold.getHoldExpiresAt()).isBeforeOrEqualTo(maxAllowed);
        }

        @Test
        @DisplayName("Chống Hoarding Loop: Vừa hủy hoặc để hết hạn trong vòng 30s -> Chặn giữ lại ngay bằng BadRequestException")
        void holdResource_WhenInCooldownPeriod_ShouldThrowBadRequestException() {
            HoldResourceRequestDto request = HoldResourceRequestDto.builder()
                    .resourceId(mockResource.getId())
                    .startTime(baseStartTime)
                    .endTime(baseEndTime)
                    .build();

            when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
            when(bookingRepository.findActiveHoldByCustomerAndResource(any(), any(), any(), any(), any()))
                    .thenReturn(Optional.empty());
            when(bookingRepository.existsRecentReleasedOrExpiredHold(eq(mockCustomer.getId()), eq(mockResource.getId()), any()))
                    .thenReturn(true);

            assertThatThrownBy(() -> holdService.holdResource(mockCustomer.getId(), request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Bạn vừa hủy hoặc để hết hạn phiên giữ chỗ cho chỗ ngồi này");

            verify(resourceLockService, never()).acquireResourceLock(any(), any(), any());
        }

        @Test
        @DisplayName("Theo dõi hành vi: Hold quá 3 lần mà không thanh toán -> Block 20 phút do nghi vấn spam hold")
        void holdResource_WhenUserHasOver3UnpaidHolds_ShouldBlockFor20MinutesWithSpamWarning() {
            HoldResourceRequestDto request = HoldResourceRequestDto.builder()
                    .resourceId(mockResource.getId())
                    .startTime(baseStartTime)
                    .endTime(baseEndTime)
                    .build();

            when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
            when(bookingRepository.findActiveHoldByCustomerAndResource(any(), any(), any(), any(), any()))
                    .thenReturn(Optional.empty());

            // Giả lập 3 đơn hold trước đó bị hủy / hết hạn không thanh toán
            LocalDateTime now = LocalDateTime.now();
            BookingModel b1 = new BookingModel();
            b1.setId(101L);
            b1.setUpdatedAt(now.minusMinutes(5)); // Lần hủy gần nhất cách đây 5 phút (trong vòng 20 phút block)

            BookingModel b2 = new BookingModel();
            b2.setId(102L);
            b2.setUpdatedAt(now.minusMinutes(25));

            BookingModel b3 = new BookingModel();
            b3.setId(103L);
            b3.setUpdatedAt(now.minusMinutes(40));

            when(bookingRepository.findRecentUnpaidHolds(eq(mockCustomer.getId()), any()))
                    .thenReturn(List.of(b1, b2, b3));

            assertThatThrownBy(() -> holdService.holdResource(mockCustomer.getId(), request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("nghi vấn có hành vi spam hold chỗ")
                    .hasMessageContaining("khóa quyền giữ chỗ trong vòng");

            verify(resourceLockService, never()).acquireResourceLock(any(), any(), any());
            verify(bookingRepository, never()).save(any());
        }

        @Test
        @DisplayName("Reset số lượt: Sau khi thanh toán thành công -> Số lần hold không thanh toán được reset về 0 ngay lập tức")
        void holdResource_WhenUserPaidSuccessfully_ShouldResetUnpaidHoldsCountToZero() {
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

            LocalDateTime now = LocalDateTime.now();
            // Khách có đơn thanh toán thành công cách đây 2 phút
            when(bookingRepository.findLatestSuccessfulBookingCreatedAt(eq(mockCustomer.getId())))
                    .thenReturn(Optional.of(now.minusMinutes(2)));

            // Các đơn hủy trước thời điểm thanh toán thành công bị loại bỏ, findRecentUnpaidHolds trả về rỗng
            when(bookingRepository.findRecentUnpaidHolds(eq(mockCustomer.getId()), any()))
                    .thenReturn(Collections.emptyList());

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
                b.setId(901L);
                return b;
            });

            HoldResourceResponseDto response = holdService.holdResource(mockCustomer.getId(), request);

            assertThat(response).isNotNull();
            assertThat(response.getRemainingHoldAttempts()).isEqualTo(3); // Reset về tối đa 3 lượt!
            assertThat(response.getMaxHoldAttempts()).isEqualTo(3);
            assertThat(response.getPenaltyBlockMinutes()).isEqualTo(20);
        }

        @Test
        @DisplayName("Reset số lượt: Sau khi hết 20 phút phạt -> Số lần hold được reset về 3 lần và được giữ chỗ lại bình thường")
        void holdResource_WhenPenaltyPeriodEnds_ShouldResetHoldAttemptsToThree() {
            HoldResourceRequestDto request = HoldResourceRequestDto.builder()
                    .resourceId(mockResource.getId())
                    .startTime(baseStartTime)
                    .endTime(baseEndTime)
                    .partySize(1)
                    .priceType(PriceType.HOURLY)
                    .build();

            LocalDateTime now = LocalDateTime.now();
            // Khách từng bị phạt khóa đến 5 phút trước (hiện tại đã hết hạn phạt)
            mockCustomer.setBookingSuspendedUntil(now.minusMinutes(5));

            when(userRepository.findById(mockCustomer.getId())).thenReturn(Optional.of(mockCustomer));
            when(bookingRepository.findActiveHoldByCustomerAndResource(any(), any(), any(), any(), any()))
                    .thenReturn(Optional.empty());

            // Sau khi hết hạn phạt, findRecentUnpaidHolds từ mốc bookingSuspendedUntil trả về rỗng
            when(bookingRepository.findRecentUnpaidHolds(eq(mockCustomer.getId()), argThat(time -> time != null && time.isAfter(now.minusMinutes(10)))))
                    .thenReturn(Collections.emptyList());

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
                b.setId(902L);
                return b;
            });

            HoldResourceResponseDto response = holdService.holdResource(mockCustomer.getId(), request);

            assertThat(response).isNotNull();
            assertThat(response.getBookingId()).isEqualTo(902L);
            assertThat(response.getRemainingHoldAttempts()).isEqualTo(3);
            assertThat(response.getIsBookingSuspended()).isFalse();
        }
    }

    @Nested
    @DisplayName("Kiểm thử Quét và Nhả Lock Tự động (Auto-Release Engine)")
    class ExpireOutdatedHoldsTests {

        @Test
        @DisplayName("Quét và nhả hold quá hạn: set EXPIRED, null holdExpiresAt, ghi audit SYSTEM và phát ResourceHoldExpiredEvent")
        void expireOutdatedHolds_WhenExpiredHoldExists_ShouldExpireAndPublishEvent() {
            BookingModel expiredBooking = new BookingModel();
            expiredBooking.setId(801L);
            expiredBooking.setBookingCode("BK-801-EXPIRED");
            expiredBooking.setCustomer(mockCustomer);
            expiredBooking.setResource(mockResource);
            expiredBooking.setWorkspace(mockWorkspace);
            expiredBooking.setStatus(BookingStatus.PENDING_PAYMENT);
            expiredBooking.setHoldExpiresAt(LocalDateTime.now().minusMinutes(2));

            when(bookingRepository.findExpiredHoldBookings(eq(BookingStatus.PENDING_PAYMENT), any()))
                    .thenReturn(List.of(expiredBooking));
            when(paymentTransactionRepository.findByBookingId(801L)).thenReturn(Collections.emptyList());
            when(bookingRepository.save(any(BookingModel.class))).thenAnswer(i -> i.getArgument(0));

            int releasedCount = holdService.expireOutdatedHolds();

            assertThat(releasedCount).isEqualTo(1);
            assertThat(expiredBooking.getStatus()).isEqualTo(BookingStatus.EXPIRED);
            assertThat(expiredBooking.getHoldExpiresAt()).isNull();

            verify(auditService, times(1)).log(
                    eq(mockCustomer), eq(AuditActorType.SYSTEM), eq("BOOKING"), eq("BOOKING_EXPIRED"),
                    eq("Booking"), eq(801L), anyString(), anyString(), anyString(), any()
            );
            verify(applicationEventPublisher, times(1)).publishEvent(any(ResourceHoldExpiredEvent.class));
        }

        @Test
        @DisplayName("Chống Race Condition: Đơn có giao dịch thanh toán SUCCESS -> Bỏ qua không expire để webhook hoàn tất CONFIRMED")
        void expireOutdatedHolds_WhenBookingHasSuccessfulPayment_ShouldSkipExpiration() {
            BookingModel expiredBooking = new BookingModel();
            expiredBooking.setId(802L);
            expiredBooking.setBookingCode("BK-802-PAID");
            expiredBooking.setStatus(BookingStatus.PENDING_PAYMENT);
            expiredBooking.setHoldExpiresAt(LocalDateTime.now().minusMinutes(2));

            PaymentTransactionModel successTx = new PaymentTransactionModel();
            successTx.setId(901L);
            successTx.setStatus(PaymentStatus.SUCCESS);

            when(bookingRepository.findExpiredHoldBookings(eq(BookingStatus.PENDING_PAYMENT), any()))
                    .thenReturn(List.of(expiredBooking));
            when(paymentTransactionRepository.findByBookingId(802L)).thenReturn(List.of(successTx));

            int releasedCount = holdService.expireOutdatedHolds();

            assertThat(releasedCount).isEqualTo(0);
            assertThat(expiredBooking.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT); // Giữ nguyên
            verify(bookingRepository, never()).save(any());
            verify(applicationEventPublisher, never()).publishEvent(any(ResourceHoldExpiredEvent.class));
        }
    }
}
