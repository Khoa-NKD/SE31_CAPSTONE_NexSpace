package base.api.feature.resource.service;

import base.api.feature.booking.event.ResourceBookingCancelledEvent;
import base.api.feature.booking.event.ResourceBookingConfirmedEvent;
import base.api.feature.booking.event.ResourceHoldCreatedEvent;
import base.api.feature.booking.event.ResourceHoldExpiredEvent;
import base.api.feature.booking.event.ResourceHoldReleasedEvent;
import base.api.feature.resource.event.ResourceAvailabilityChangedEvent;
import base.api.feature.resource.event.ResourceAvailabilityEventType;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.service.impl.ResourceStateSyncServiceImpl;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.ResourceTypeModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.CancelSource;
import base.api.shared.enums.ResourceCategory;
import base.api.shared.enums.ResourceOccupancyStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Kiểm thử Động cơ Đồng bộ Trạng thái Chỗ (ResourceStateSyncService)")
class ResourceStateSyncServiceTest {

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private IBookableResourceRepository resourceRepository;

    @InjectMocks
    private ResourceStateSyncServiceImpl stateSyncService;

    private WorkspaceModel workspace;
    private UserModel customer;
    private BookableResourceModel deskResource;
    private BookingModel booking;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime holdExpiresAt;

    @BeforeEach
    void setUp() {
        workspace = new WorkspaceModel();
        workspace.setId(10L);

        customer = new UserModel();
        customer.setId(99L);

        deskResource = new BookableResourceModel();
        deskResource.setId(101L);
        deskResource.setLabel("D-01");

        startTime = LocalDateTime.now().plusHours(1);
        endTime = LocalDateTime.now().plusHours(3);
        holdExpiresAt = LocalDateTime.now().plusMinutes(10);

        booking = new BookingModel();
        booking.setId(501L);
        booking.setBookingCode("BK-20261119-ABCD");
        booking.setWorkspace(workspace);
        booking.setCustomer(customer);
        booking.setResource(deskResource);
        booking.setStartTime(startTime);
        booking.setEndTime(endTime);
        booking.setHoldExpiresAt(holdExpiresAt);
    }

    @Test
    @DisplayName("Đồng bộ khi tạo Hold: phát cả ResourceAvailabilityChangedEvent và ResourceHoldCreatedEvent")
    void shouldPublishEventsOnHoldCreated() {
        // When
        stateSyncService.syncOnHoldCreated(booking);

        // Then
        ArgumentCaptor<Object> eventCaptor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, atLeast(2)).publishEvent(eventCaptor.capture());

        List<Object> publishedEvents = eventCaptor.getAllValues();

        ResourceAvailabilityChangedEvent changedEvent = publishedEvents.stream()
                .filter(ResourceAvailabilityChangedEvent.class::isInstance)
                .map(ResourceAvailabilityChangedEvent.class::cast)
                .findFirst()
                .orElse(null);

        assertThat(changedEvent).isNotNull();
        assertThat(changedEvent.getResourceId()).isEqualTo(101L);
        assertThat(changedEvent.getWorkspaceId()).isEqualTo(10L);
        assertThat(changedEvent.getNewStatus()).isEqualTo(ResourceOccupancyStatus.HOLDING);
        assertThat(changedEvent.getEventType()).isEqualTo(ResourceAvailabilityEventType.HOLD_CREATED);
        assertThat(changedEvent.getBookingCode()).isEqualTo("BK-20261119-ABCD");
        assertThat(changedEvent.getHoldExpiresAt()).isEqualTo(holdExpiresAt);

        ResourceHoldCreatedEvent createdEvent = publishedEvents.stream()
                .filter(ResourceHoldCreatedEvent.class::isInstance)
                .map(ResourceHoldCreatedEvent.class::cast)
                .findFirst()
                .orElse(null);

        assertThat(createdEvent).isNotNull();
        assertThat(createdEvent.getBookingId()).isEqualTo(501L);
        assertThat(createdEvent.getResourceId()).isEqualTo(101L);
    }

    @Test
    @DisplayName("Đồng bộ khi tạo Hold cho ROOM: phát event cho cả phòng cha và toàn bộ bàn con")
    void shouldPublishEventsForRoomAndChildDesksOnHoldCreated() {
        // Given
        ResourceTypeModel roomType = new ResourceTypeModel();
        roomType.setCategory(ResourceCategory.ROOM);

        BookableResourceModel roomResource = new BookableResourceModel();
        roomResource.setId(201L);
        roomResource.setLabel("R-01");
        roomResource.setResourceType(roomType);

        booking.setResource(roomResource);

        BookableResourceModel childDesk1 = new BookableResourceModel();
        childDesk1.setId(101L);
        childDesk1.setLabel("D-01");

        BookableResourceModel childDesk2 = new BookableResourceModel();
        childDesk2.setId(102L);
        childDesk2.setLabel("D-02");

        when(resourceRepository.findChildDesksByRoomIds(eq(List.of(201L)), any()))
                .thenReturn(List.of(childDesk1, childDesk2));

        // When
        stateSyncService.syncOnHoldCreated(booking);

        // Then
        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, atLeast(4)).publishEvent(captor.capture());

        List<ResourceAvailabilityChangedEvent> changedEvents = captor.getAllValues().stream()
                .filter(ResourceAvailabilityChangedEvent.class::isInstance)
                .map(ResourceAvailabilityChangedEvent.class::cast)
                .toList();

        // 1 event cho Room (HOLDING) + 2 event cho 2 bàn con (BOOKED)
        assertThat(changedEvents).hasSize(3);

        ResourceAvailabilityChangedEvent roomEvent = changedEvents.stream()
                .filter(e -> e.getResourceId().equals(201L))
                .findFirst().orElse(null);
        assertThat(roomEvent).isNotNull();
        assertThat(roomEvent.getNewStatus()).isEqualTo(ResourceOccupancyStatus.HOLDING);

        List<ResourceAvailabilityChangedEvent> childEvents = changedEvents.stream()
                .filter(e -> e.getParentRoomId() != null && e.getParentRoomId().equals(201L))
                .toList();
        assertThat(childEvents).hasSize(2);
        assertThat(childEvents).allMatch(e -> e.getNewStatus() == ResourceOccupancyStatus.BOOKED);
    }

    @Test
    @DisplayName("Đồng bộ khi nhả Hold: phát event trạng thái AVAILABLE và ResourceHoldReleasedEvent")
    void shouldPublishEventsOnHoldReleased() {
        // When
        stateSyncService.syncOnHoldReleased(booking);

        // Then
        ArgumentCaptor<Object> eventCaptor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, atLeast(2)).publishEvent(eventCaptor.capture());

        List<Object> publishedEvents = eventCaptor.getAllValues();

        ResourceAvailabilityChangedEvent changedEvent = publishedEvents.stream()
                .filter(ResourceAvailabilityChangedEvent.class::isInstance)
                .map(ResourceAvailabilityChangedEvent.class::cast)
                .findFirst()
                .orElse(null);

        assertThat(changedEvent).isNotNull();
        assertThat(changedEvent.getNewStatus()).isEqualTo(ResourceOccupancyStatus.AVAILABLE);
        assertThat(changedEvent.getEventType()).isEqualTo(ResourceAvailabilityEventType.HOLD_RELEASED);

        ResourceHoldReleasedEvent releasedEvent = publishedEvents.stream()
                .filter(ResourceHoldReleasedEvent.class::isInstance)
                .map(ResourceHoldReleasedEvent.class::cast)
                .findFirst()
                .orElse(null);

        assertThat(releasedEvent).isNotNull();
        assertThat(releasedEvent.getBookingId()).isEqualTo(501L);
    }

    @Test
    @DisplayName("Đồng bộ khi Hold hết hạn: phát event trạng thái AVAILABLE và ResourceHoldExpiredEvent")
    void shouldPublishEventsOnHoldExpired() {
        // When
        stateSyncService.syncOnHoldExpired(booking);

        // Then
        ArgumentCaptor<Object> eventCaptor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, atLeast(2)).publishEvent(eventCaptor.capture());

        List<Object> publishedEvents = eventCaptor.getAllValues();

        ResourceAvailabilityChangedEvent changedEvent = publishedEvents.stream()
                .filter(ResourceAvailabilityChangedEvent.class::isInstance)
                .map(ResourceAvailabilityChangedEvent.class::cast)
                .findFirst()
                .orElse(null);

        assertThat(changedEvent).isNotNull();
        assertThat(changedEvent.getNewStatus()).isEqualTo(ResourceOccupancyStatus.AVAILABLE);
        assertThat(changedEvent.getEventType()).isEqualTo(ResourceAvailabilityEventType.HOLD_EXPIRED);

        ResourceHoldExpiredEvent expiredEvent = publishedEvents.stream()
                .filter(ResourceHoldExpiredEvent.class::isInstance)
                .map(ResourceHoldExpiredEvent.class::cast)
                .findFirst()
                .orElse(null);

        assertThat(expiredEvent).isNotNull();
        assertThat(expiredEvent.getBookingId()).isEqualTo(501L);
    }

    @Test
    @DisplayName("Đồng bộ khi thanh toán thành công (Booking Confirmed): chuyển trạng thái sang BOOKED")
    void shouldPublishEventsOnBookingConfirmed() {
        // When
        stateSyncService.syncOnBookingConfirmed(booking);

        // Then
        ArgumentCaptor<Object> eventCaptor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, atLeast(2)).publishEvent(eventCaptor.capture());

        List<Object> publishedEvents = eventCaptor.getAllValues();

        ResourceAvailabilityChangedEvent changedEvent = publishedEvents.stream()
                .filter(ResourceAvailabilityChangedEvent.class::isInstance)
                .map(ResourceAvailabilityChangedEvent.class::cast)
                .findFirst()
                .orElse(null);

        assertThat(changedEvent).isNotNull();
        assertThat(changedEvent.getNewStatus()).isEqualTo(ResourceOccupancyStatus.BOOKED);
        assertThat(changedEvent.getEventType()).isEqualTo(ResourceAvailabilityEventType.BOOKING_CONFIRMED);

        ResourceBookingConfirmedEvent confirmedEvent = publishedEvents.stream()
                .filter(ResourceBookingConfirmedEvent.class::isInstance)
                .map(ResourceBookingConfirmedEvent.class::cast)
                .findFirst()
                .orElse(null);

        assertThat(confirmedEvent).isNotNull();
        assertThat(confirmedEvent.getBookingId()).isEqualTo(501L);
    }

    @Test
    @DisplayName("Đồng bộ khi hủy đơn (Booking Cancelled): chuyển trạng thái sang AVAILABLE")
    void shouldPublishEventsOnBookingCancelled() {
        // Given
        booking.setCancelSource(CancelSource.CUSTOMER);
        booking.setCancelReason("Khách hàng thay đổi kế hoạch");

        // When
        stateSyncService.syncOnBookingCancelled(booking);

        // Then
        ArgumentCaptor<Object> eventCaptor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, atLeast(2)).publishEvent(eventCaptor.capture());

        List<Object> publishedEvents = eventCaptor.getAllValues();

        ResourceAvailabilityChangedEvent changedEvent = publishedEvents.stream()
                .filter(ResourceAvailabilityChangedEvent.class::isInstance)
                .map(ResourceAvailabilityChangedEvent.class::cast)
                .findFirst()
                .orElse(null);

        assertThat(changedEvent).isNotNull();
        assertThat(changedEvent.getNewStatus()).isEqualTo(ResourceOccupancyStatus.AVAILABLE);
        assertThat(changedEvent.getEventType()).isEqualTo(ResourceAvailabilityEventType.BOOKING_CANCELLED);

        ResourceBookingCancelledEvent cancelledEvent = publishedEvents.stream()
                .filter(ResourceBookingCancelledEvent.class::isInstance)
                .map(ResourceBookingCancelledEvent.class::cast)
                .findFirst()
                .orElse(null);

        assertThat(cancelledEvent).isNotNull();
        assertThat(cancelledEvent.getBookingId()).isEqualTo(501L);
        assertThat(cancelledEvent.getCancelReason()).isEqualTo("Khách hàng thay đổi kế hoạch");
    }
}

