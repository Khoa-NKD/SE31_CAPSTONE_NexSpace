package base.api.feature.resource.mapper;

import base.api.feature.resource.dto.response.DeskAvailabilityResponseDto;
import base.api.feature.resource.dto.response.ResourceAvailabilityEventPayloadDto;
import base.api.feature.resource.dto.response.RoomAvailabilityResponseDto;
import base.api.feature.resource.event.ResourceAvailabilityChangedEvent;
import base.api.feature.resource.event.ResourceAvailabilityEventType;
import base.api.feature.resource.service.ResourceStateResolver;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.ResourceTypeModel;
import base.api.shared.enums.ResourceCategory;
import base.api.shared.enums.ResourceOccupancyStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Kiểm thử Bộ ánh xạ Khả dụng Tài nguyên (ResourceAvailabilityMapper)")
class ResourceAvailabilityMapperTest {

    @Test
    @DisplayName("Ánh xạ thành công bàn làm việc Desk sang DeskAvailabilityResponseDto")
    void shouldMapDeskToResponseDtoCorrectly() {
        // Given
        BookableResourceModel desk = new BookableResourceModel();
        desk.setId(101L);
        desk.setLabel("D-01");
        desk.setName("Bàn Focus 01");
        desk.setZoneName("Quiet Zone");
        desk.setPricePerHour(BigDecimal.valueOf(35000));
        desk.setPosX(BigDecimal.valueOf(10));
        desk.setPosY(BigDecimal.valueOf(20));
        desk.setWidth(BigDecimal.valueOf(60));
        desk.setHeight(BigDecimal.valueOf(80));

        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(10);
        ResourceStateResolver.ResourceResolutionResult resolution =
                ResourceStateResolver.ResourceResolutionResult.holding(expiresAt, true);

        // When
        DeskAvailabilityResponseDto dto = ResourceAvailabilityMapper.toDeskResponse(desk, resolution, 201L);

        // Then
        assertThat(dto).isNotNull();
        assertThat(dto.getResourceId()).isEqualTo(101L);
        assertThat(dto.getLabel()).isEqualTo("D-01");
        assertThat(dto.getName()).isEqualTo("Bàn Focus 01");
        assertThat(dto.getParentRoomId()).isEqualTo(201L);
        assertThat(dto.getStatus()).isEqualTo(ResourceOccupancyStatus.HOLDING);
        assertThat(dto.getHoldExpiresAt()).isEqualTo(expiresAt);
        assertThat(dto.getIsOccupiedByMe()).isTrue();
        assertThat(dto.getPricePerHour()).isEqualByComparingTo(BigDecimal.valueOf(35000));
    }

    @Test
    @DisplayName("Ánh xạ thành công phòng họp Room sang RoomAvailabilityResponseDto")
    void shouldMapRoomToResponseDtoCorrectly() {
        // Given
        ResourceTypeModel type = new ResourceTypeModel();
        type.setCategory(ResourceCategory.ROOM);
        type.setCapacity(10);
        type.setPricePerHour(BigDecimal.valueOf(250000));

        BookableResourceModel room = new BookableResourceModel();
        room.setId(201L);
        room.setLabel("R-01");
        room.setName("Phòng Họp Sáng Tạo");
        room.setZoneName("Meeting Area");
        room.setResourceType(type);

        // When
        RoomAvailabilityResponseDto dto = ResourceAvailabilityMapper.toRoomResponse(
                room,
                ResourceOccupancyStatus.AVAILABLE,
                null,
                false,
                false,
                0,
                false,
                null,
                15
        );

        // Then
        assertThat(dto).isNotNull();
        assertThat(dto.getRoomId()).isEqualTo(201L);
        assertThat(dto.getLabel()).isEqualTo("R-01");
        assertThat(dto.getCapacity()).isEqualTo(10);
        assertThat(dto.getPricePerHour()).isEqualByComparingTo(BigDecimal.valueOf(250000));
        assertThat(dto.getStatus()).isEqualTo(ResourceOccupancyStatus.AVAILABLE);
        assertThat(dto.getHasConflictingDesks()).isFalse();
        assertThat(dto.getOccupiedChildDeskCount()).isZero();
        assertThat(dto.getCleaningBufferMinutes()).isEqualTo(15);
    }

    @Test
    @DisplayName("Chuyển đổi sự kiện miền ResourceAvailabilityChangedEvent sang DTO Event Payload")
    void shouldConvertEventToPayloadDtoCorrectly() {
        // Given
        LocalDateTime now = LocalDateTime.now();
        ResourceAvailabilityChangedEvent event = ResourceAvailabilityChangedEvent.builder()
                .workspaceId(1L)
                .resourceId(101L)
                .resourceLabel("D-01")
                .parentRoomId(null)
                .bookingId(501L)
                .bookingCode("BK-20261119-ABCD")
                .customerId(99L)
                .newStatus(ResourceOccupancyStatus.HOLDING)
                .eventType(ResourceAvailabilityEventType.HOLD_CREATED)
                .startTime(now.plusHours(1))
                .endTime(now.plusHours(3))
                .holdExpiresAt(now.plusMinutes(10))
                .occurredAt(now)
                .build();

        // When
        ResourceAvailabilityEventPayloadDto payload = ResourceAvailabilityMapper.toEventPayloadDto(event);

        // Then
        assertThat(payload).isNotNull();
        assertThat(payload.getWorkspaceId()).isEqualTo(1L);
        assertThat(payload.getResourceId()).isEqualTo(101L);
        assertThat(payload.getResourceLabel()).isEqualTo("D-01");
        assertThat(payload.getBookingCode()).isEqualTo("BK-20261119-ABCD");
        assertThat(payload.getNewStatus()).isEqualTo(ResourceOccupancyStatus.HOLDING);
        assertThat(payload.getEventType()).isEqualTo(ResourceAvailabilityEventType.HOLD_CREATED);
        assertThat(payload.getHoldExpiresAt()).isEqualTo(now.plusMinutes(10));
    }
}

