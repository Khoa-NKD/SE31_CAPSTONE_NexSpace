package base.api.feature.resource.controller;

import base.api.feature.resource.dto.response.DeskAvailabilityResponseDto;
import base.api.feature.resource.dto.response.RoomAvailabilityResponseDto;
import base.api.feature.resource.service.IResourceAvailabilityService;
import base.api.feature.resource.service.ISseEmitterService;
import base.api.shared.dto.ApiResponse;
import base.api.shared.enums.ResourceOccupancyStatus;
import base.api.shared.security.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PublicAvailabilityController Unit Tests")
class PublicAvailabilityControllerTest {

    @Mock
    private IResourceAvailabilityService resourceAvailabilityService;

    @Mock
    private ISseEmitterService sseEmitterService;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private PublicAvailabilityController controller;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(controller, "currentUserProvider", currentUserProvider);
    }

    @Test
    @DisplayName("streamAvailability - Mở kết nối SSE stream thành công và gọi sseEmitterService.subscribe")
    void streamAvailability_Success() {
        Long workspaceId = 10L;
        SseEmitter mockEmitter = new SseEmitter();
        when(sseEmitterService.subscribe(workspaceId)).thenReturn(mockEmitter);

        SseEmitter result = controller.streamAvailability(workspaceId);

        assertThat(result).isSameAs(mockEmitter);
        verify(sseEmitterService).subscribe(workspaceId);
    }

    @Test
    @DisplayName("getDeskAvailability - Trả về danh sách bàn kèm ApiResponse chuẩn")
    void getDeskAvailability_Success() {
        LocalDateTime start = LocalDateTime.now().plusHours(1);
        LocalDateTime end = start.plusHours(2);
        when(currentUserProvider.getCurrentUser()).thenReturn(Optional.empty());

        DeskAvailabilityResponseDto deskDto = DeskAvailabilityResponseDto.builder()
                .resourceId(101L)
                .label("D-01")
                .name("Bàn làm việc Focus 01")
                .zoneName("Quiet Zone")
                .parentRoomId(null)
                .pricePerHour(new BigDecimal("35000.00"))
                .status(ResourceOccupancyStatus.AVAILABLE)
                .holdExpiresAt(null)
                .isOccupiedByMe(false)
                .build();

        when(resourceAvailabilityService.checkDeskAvailability(eq(1L), eq(2L), eq(start), eq(end), eq(null)))
                .thenReturn(List.of(deskDto));

        ResponseEntity<ApiResponse<List<DeskAvailabilityResponseDto>>> response =
                controller.getDeskAvailability(1L, 2L, start, end);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getSuccess()).isTrue();
        assertThat(response.getBody().getData()).hasSize(1);
        assertThat(response.getBody().getData().get(0).getLabel()).isEqualTo("D-01");
    }

    @Test
    @DisplayName("getRoomAvailability - Trả về danh sách phòng kèm ApiResponse chuẩn")
    void getRoomAvailability_Success() {
        LocalDateTime start = LocalDateTime.now().plusHours(1);
        LocalDateTime end = start.plusHours(2);
        when(currentUserProvider.getCurrentUser()).thenReturn(Optional.empty());

        RoomAvailabilityResponseDto roomDto = RoomAvailabilityResponseDto.builder()
                .roomId(201L)
                .label("R-01")
                .name("Phòng họp Sáng Tạo")
                .capacity(8)
                .pricePerHour(new BigDecimal("250000.00"))
                .status(ResourceOccupancyStatus.AVAILABLE)
                .hasConflictingDesks(false)
                .occupiedChildDeskCount(0)
                .build();

        when(resourceAvailabilityService.checkRoomAvailability(eq(1L), eq(null), eq(start), eq(end), eq(6), eq(null)))
                .thenReturn(List.of(roomDto));

        ResponseEntity<ApiResponse<List<RoomAvailabilityResponseDto>>> response =
                controller.getRoomAvailability(1L, null, start, end, 6);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getSuccess()).isTrue();
        assertThat(response.getBody().getData()).hasSize(1);
        assertThat(response.getBody().getData().get(0).getName()).isEqualTo("Phòng họp Sáng Tạo");
    }
}
