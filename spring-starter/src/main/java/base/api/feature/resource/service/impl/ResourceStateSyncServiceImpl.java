package base.api.feature.resource.service.impl;

import base.api.feature.booking.event.ResourceBookingCancelledEvent;
import base.api.feature.booking.event.ResourceBookingConfirmedEvent;
import base.api.feature.booking.event.ResourceHoldCreatedEvent;
import base.api.feature.booking.event.ResourceHoldExpiredEvent;
import base.api.feature.booking.event.ResourceHoldReleasedEvent;
import base.api.feature.resource.event.ResourceAvailabilityChangedEvent;
import base.api.feature.resource.event.ResourceAvailabilityEventType;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.service.IResourceStateSyncService;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.enums.BookableResourceStatus;
import base.api.shared.enums.ResourceCategory;
import base.api.shared.enums.ResourceOccupancyStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Triển khai Động cơ Đồng bộ Trạng thái Chỗ (State Synchronization Engine).
 * Xử lý nhất quán các điểm chuyển dịch vòng đời và đồng bộ hai chiều ROOM - DESK.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResourceStateSyncServiceImpl implements IResourceStateSyncService {

    private final ApplicationEventPublisher eventPublisher;
    private final IBookableResourceRepository resourceRepository;

    @Override
    public void syncOnHoldCreated(BookingModel booking) {
        if (booking == null || booking.getResource() == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        BookableResourceModel resource = booking.getResource();
        Long workspaceId = booking.getWorkspace() != null ? booking.getWorkspace().getId() : null;
        Long customerId = booking.getCustomer() != null ? booking.getCustomer().getId() : null;
        Long parentRoomId = resource.getParentRoom() != null ? resource.getParentRoom().getId() : null;

        // 1. Phát sự kiện chung ResourceAvailabilityChangedEvent cho tài nguyên chính
        ResourceAvailabilityChangedEvent mainEvent = ResourceAvailabilityChangedEvent.builder()
                .workspaceId(workspaceId)
                .resourceId(resource.getId())
                .resourceLabel(resource.getLabel())
                .parentRoomId(parentRoomId)
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .customerId(customerId)
                .newStatus(ResourceOccupancyStatus.HOLDING)
                .eventType(ResourceAvailabilityEventType.HOLD_CREATED)
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .holdExpiresAt(booking.getHoldExpiresAt())
                .occurredAt(now)
                .build();
        eventPublisher.publishEvent(mainEvent);

        // 2. Phát sự kiện chuyên biệt ResourceHoldCreatedEvent
        ResourceHoldCreatedEvent specificEvent = ResourceHoldCreatedEvent.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .workspaceId(workspaceId)
                .resourceId(resource.getId())
                .customerId(customerId)
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .holdExpiresAt(booking.getHoldExpiresAt())
                .createdAt(now)
                .build();
        eventPublisher.publishEvent(specificEvent);

        // 3. Đồng bộ hai chiều: Nếu tài nguyên chính là ROOM, phát event cập nhật cho toàn bộ child DESK
        syncChildDesksForRoom(resource, workspaceId, booking, ResourceOccupancyStatus.BOOKED, ResourceAvailabilityEventType.HOLD_CREATED, now);

        log.info("State synchronized [HOLD_CREATED]: bookingCode={}, resourceId={}, newStatus=HOLDING",
                booking.getBookingCode(), resource.getId());
    }

    @Override
    public void syncOnHoldReleased(BookingModel booking) {
        if (booking == null || booking.getResource() == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        BookableResourceModel resource = booking.getResource();
        Long workspaceId = booking.getWorkspace() != null ? booking.getWorkspace().getId() : null;
        Long customerId = booking.getCustomer() != null ? booking.getCustomer().getId() : null;
        Long parentRoomId = resource.getParentRoom() != null ? resource.getParentRoom().getId() : null;

        ResourceAvailabilityChangedEvent mainEvent = ResourceAvailabilityChangedEvent.builder()
                .workspaceId(workspaceId)
                .resourceId(resource.getId())
                .resourceLabel(resource.getLabel())
                .parentRoomId(parentRoomId)
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .customerId(customerId)
                .newStatus(ResourceOccupancyStatus.AVAILABLE)
                .eventType(ResourceAvailabilityEventType.HOLD_RELEASED)
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .holdExpiresAt(null)
                .occurredAt(now)
                .build();
        eventPublisher.publishEvent(mainEvent);

        ResourceHoldReleasedEvent specificEvent = ResourceHoldReleasedEvent.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .workspaceId(workspaceId)
                .resourceId(resource.getId())
                .customerId(customerId)
                .releasedAt(now)
                .build();
        eventPublisher.publishEvent(specificEvent);

        syncChildDesksForRoom(resource, workspaceId, booking, ResourceOccupancyStatus.AVAILABLE, ResourceAvailabilityEventType.HOLD_RELEASED, now);

        log.info("State synchronized [HOLD_RELEASED]: bookingCode={}, resourceId={}, newStatus=AVAILABLE",
                booking.getBookingCode(), resource.getId());
    }

    @Override
    public void syncOnHoldExpired(BookingModel booking) {
        if (booking == null || booking.getResource() == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        BookableResourceModel resource = booking.getResource();
        Long workspaceId = booking.getWorkspace() != null ? booking.getWorkspace().getId() : null;
        Long customerId = booking.getCustomer() != null ? booking.getCustomer().getId() : null;
        Long parentRoomId = resource.getParentRoom() != null ? resource.getParentRoom().getId() : null;

        ResourceAvailabilityChangedEvent mainEvent = ResourceAvailabilityChangedEvent.builder()
                .workspaceId(workspaceId)
                .resourceId(resource.getId())
                .resourceLabel(resource.getLabel())
                .parentRoomId(parentRoomId)
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .customerId(customerId)
                .newStatus(ResourceOccupancyStatus.AVAILABLE)
                .eventType(ResourceAvailabilityEventType.HOLD_EXPIRED)
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .holdExpiresAt(null)
                .occurredAt(now)
                .build();
        eventPublisher.publishEvent(mainEvent);

        ResourceHoldExpiredEvent specificEvent = ResourceHoldExpiredEvent.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .workspaceId(workspaceId)
                .resourceId(resource.getId())
                .customerId(customerId)
                .expiredAt(now)
                .build();
        eventPublisher.publishEvent(specificEvent);

        syncChildDesksForRoom(resource, workspaceId, booking, ResourceOccupancyStatus.AVAILABLE, ResourceAvailabilityEventType.HOLD_EXPIRED, now);

        log.info("State synchronized [HOLD_EXPIRED]: bookingCode={}, resourceId={}, newStatus=AVAILABLE",
                booking.getBookingCode(), resource.getId());
    }

    @Override
    public void syncOnBookingConfirmed(BookingModel booking) {
        if (booking == null || booking.getResource() == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        BookableResourceModel resource = booking.getResource();
        Long workspaceId = booking.getWorkspace() != null ? booking.getWorkspace().getId() : null;
        Long customerId = booking.getCustomer() != null ? booking.getCustomer().getId() : null;
        Long parentRoomId = resource.getParentRoom() != null ? resource.getParentRoom().getId() : null;

        ResourceAvailabilityChangedEvent mainEvent = ResourceAvailabilityChangedEvent.builder()
                .workspaceId(workspaceId)
                .resourceId(resource.getId())
                .resourceLabel(resource.getLabel())
                .parentRoomId(parentRoomId)
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .customerId(customerId)
                .newStatus(ResourceOccupancyStatus.BOOKED)
                .eventType(ResourceAvailabilityEventType.BOOKING_CONFIRMED)
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .holdExpiresAt(null)
                .occurredAt(now)
                .build();
        eventPublisher.publishEvent(mainEvent);

        ResourceBookingConfirmedEvent specificEvent = ResourceBookingConfirmedEvent.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .workspaceId(workspaceId)
                .resourceId(resource.getId())
                .customerId(customerId)
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .confirmedAt(now)
                .build();
        eventPublisher.publishEvent(specificEvent);

        syncChildDesksForRoom(resource, workspaceId, booking, ResourceOccupancyStatus.BOOKED, ResourceAvailabilityEventType.BOOKING_CONFIRMED, now);

        log.info("State synchronized [BOOKING_CONFIRMED]: bookingCode={}, resourceId={}, newStatus=BOOKED",
                booking.getBookingCode(), resource.getId());
    }

    @Override
    public void syncOnBookingCancelled(BookingModel booking) {
        if (booking == null || booking.getResource() == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        BookableResourceModel resource = booking.getResource();
        Long workspaceId = booking.getWorkspace() != null ? booking.getWorkspace().getId() : null;
        Long customerId = booking.getCustomer() != null ? booking.getCustomer().getId() : null;
        Long parentRoomId = resource.getParentRoom() != null ? resource.getParentRoom().getId() : null;

        ResourceAvailabilityChangedEvent mainEvent = ResourceAvailabilityChangedEvent.builder()
                .workspaceId(workspaceId)
                .resourceId(resource.getId())
                .resourceLabel(resource.getLabel())
                .parentRoomId(parentRoomId)
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .customerId(customerId)
                .newStatus(ResourceOccupancyStatus.AVAILABLE)
                .eventType(ResourceAvailabilityEventType.BOOKING_CANCELLED)
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .holdExpiresAt(null)
                .occurredAt(now)
                .build();
        eventPublisher.publishEvent(mainEvent);

        ResourceBookingCancelledEvent specificEvent = ResourceBookingCancelledEvent.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .workspaceId(workspaceId)
                .resourceId(resource.getId())
                .customerId(customerId)
                .cancelSource(booking.getCancelSource())
                .cancelReason(booking.getCancelReason())
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .cancelledAt(now)
                .build();
        eventPublisher.publishEvent(specificEvent);

        syncChildDesksForRoom(resource, workspaceId, booking, ResourceOccupancyStatus.AVAILABLE, ResourceAvailabilityEventType.BOOKING_CANCELLED, now);

        log.info("State synchronized [BOOKING_CANCELLED]: bookingCode={}, resourceId={}, newStatus=AVAILABLE",
                booking.getBookingCode(), resource.getId());
    }

    private void syncChildDesksForRoom(
            BookableResourceModel room,
            Long workspaceId,
            BookingModel booking,
            ResourceOccupancyStatus childNewStatus,
            ResourceAvailabilityEventType eventType,
            LocalDateTime now
    ) {
        if (room == null || room.getResourceType() == null || room.getResourceType().getCategory() != ResourceCategory.ROOM) {
            return;
        }

        List<BookableResourceModel> childDesks = resourceRepository.findChildDesksByRoomIds(
                Collections.singletonList(room.getId()),
                BookableResourceStatus.ARCHIVED
        );

        if (childDesks.isEmpty()) {
            return;
        }

        for (BookableResourceModel desk : childDesks) {
            ResourceAvailabilityChangedEvent childEvent = ResourceAvailabilityChangedEvent.builder()
                    .workspaceId(workspaceId)
                    .resourceId(desk.getId())
                    .resourceLabel(desk.getLabel())
                    .parentRoomId(room.getId())
                    .bookingId(booking.getId())
                    .bookingCode(booking.getBookingCode())
                    .customerId(booking.getCustomer() != null ? booking.getCustomer().getId() : null)
                    .newStatus(childNewStatus)
                    .eventType(eventType)
                    .startTime(booking.getStartTime())
                    .endTime(booking.getEndTime())
                    .holdExpiresAt(booking.getHoldExpiresAt())
                    .occurredAt(now)
                    .build();
            eventPublisher.publishEvent(childEvent);
        }

        log.debug("Synchronized {} child desks for room {}", childDesks.size(), room.getId());
    }
}

