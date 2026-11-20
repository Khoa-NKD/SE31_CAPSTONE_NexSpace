package base.api.feature.resource.listener;

import base.api.feature.resource.dto.response.ResourceAvailabilityEventPayloadDto;
import base.api.feature.resource.event.ResourceAvailabilityChangedEvent;
import base.api.feature.resource.event.ResourceAvailabilityEventType;
import base.api.feature.resource.service.ISseEmitterService;
import base.api.shared.enums.ResourceOccupancyStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
@DisplayName("ResourceAvailabilityEventListener Unit Tests")
class ResourceAvailabilityEventListenerTest {

    @Mock
    private ISseEmitterService sseEmitterService;

    @InjectMocks
    private ResourceAvailabilityEventListener listener;

    @Test
    @DisplayName("onResourceAvailabilityChanged - Tiếp nhận sự kiện hợp lệ, map sang payload và gọi broadcast")
    void onResourceAvailabilityChanged_ValidEvent_BroadcastsPayload() {
        LocalDateTime now = LocalDateTime.now();
        ResourceAvailabilityChangedEvent event = ResourceAvailabilityChangedEvent.builder()
                .workspaceId(10L)
                .resourceId(101L)
                .resourceLabel("D-01")
                .parentRoomId(null)
                .bookingId(55L)
                .bookingCode("BK-20261120-001")
                .customerId(99L)
                .newStatus(ResourceOccupancyStatus.HOLDING)
                .eventType(ResourceAvailabilityEventType.HOLD_CREATED)
                .startTime(now.plusHours(1))
                .endTime(now.plusHours(3))
                .holdExpiresAt(now.plusMinutes(10))
                .occurredAt(now)
                .build();

        listener.onResourceAvailabilityChanged(event);

        ArgumentCaptor<ResourceAvailabilityEventPayloadDto> payloadCaptor =
                ArgumentCaptor.forClass(ResourceAvailabilityEventPayloadDto.class);

        verify(sseEmitterService).broadcast(
                eq(10L),
                eq(ResourceAvailabilityEventListener.SSE_EVENT_NAME),
                payloadCaptor.capture()
        );

        ResourceAvailabilityEventPayloadDto payload = payloadCaptor.getValue();
        assertThat(payload.getWorkspaceId()).isEqualTo(10L);
        assertThat(payload.getResourceId()).isEqualTo(101L);
        assertThat(payload.getResourceLabel()).isEqualTo("D-01");
        assertThat(payload.getNewStatus()).isEqualTo(ResourceOccupancyStatus.HOLDING);
        assertThat(payload.getEventType()).isEqualTo(ResourceAvailabilityEventType.HOLD_CREATED);
        assertThat(payload.getCustomerId()).isEqualTo(99L);
        assertThat(payload.getBookingCode()).isEqualTo("BK-20261120-001");
    }

    @Test
    @DisplayName("onResourceAvailabilityChanged - Bỏ qua khi event null hoặc thiếu workspaceId")
    void onResourceAvailabilityChanged_NullOrMissingWorkspace_DoesNothing() {
        listener.onResourceAvailabilityChanged(null);
        verifyNoInteractions(sseEmitterService);

        ResourceAvailabilityChangedEvent missingWorkspaceEvent = ResourceAvailabilityChangedEvent.builder()
                .workspaceId(null)
                .resourceId(101L)
                .build();

        listener.onResourceAvailabilityChanged(missingWorkspaceEvent);
        verifyNoInteractions(sseEmitterService);
    }
}
