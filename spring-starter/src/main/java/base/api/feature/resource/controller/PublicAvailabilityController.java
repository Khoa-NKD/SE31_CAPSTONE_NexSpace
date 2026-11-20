package base.api.feature.resource.controller;

import base.api.feature.resource.dto.response.DeskAvailabilityResponseDto;
import base.api.feature.resource.dto.response.RoomAvailabilityResponseDto;
import base.api.feature.resource.service.IResourceAvailabilityService;
import base.api.feature.resource.service.ISseEmitterService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.security.AuthUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/public/availability")
@RequiredArgsConstructor
@Validated
@Tag(name = "Điều phối Chỗ trống Thời gian thực", description = "Các API công khai tra cứu tình trạng khả dụng và lịch đặt chỗ theo thời gian thực")
public class PublicAvailabilityController extends BaseAPIController {

    private final IResourceAvailabilityService resourceAvailabilityService;
    private final ISseEmitterService sseEmitterService;

    @Operation(
            summary = "Kiểm tra chỗ trống (Desk Availability)",
            description = "Tra cứu tình trạng khả dụng của tất cả bàn làm việc trong một không gian (hoặc tầng cụ thể) trong khoảng thời gian xác định."
    )
    @GetMapping("/desks")
    public ResponseEntity<ApiResponse<List<DeskAvailabilityResponseDto>>> getDeskAvailability(
            @Parameter(description = "Mã không gian làm việc", required = true, example = "1")
            @RequestParam @NotNull(message = "Mã không gian làm việc không được để trống") Long workspaceId,

            @Parameter(description = "Mã sơ đồ tầng (tuỳ chọn lọc theo tầng cụ thể)", example = "2")
            @RequestParam(required = false) Long floorPlanId,

            @Parameter(description = "Thời gian bắt đầu (định dạng ISO-8601)", required = true, example = "2026-11-13T09:00:00")
            @RequestParam @NotNull(message = "Thời gian bắt đầu không được để trống")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,

            @Parameter(description = "Thời gian kết thúc (định dạng ISO-8601)", required = true, example = "2026-11-13T12:00:00")
            @RequestParam @NotNull(message = "Thời gian kết thúc không được để trống")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime
    ) {
        Long currentUserId = currentUserProvider.getCurrentUser()
                .map(AuthUser::getId)
                .orElse(null);

        List<DeskAvailabilityResponseDto> result = resourceAvailabilityService.checkDeskAvailability(
                workspaceId,
                floorPlanId,
                startTime,
                endTime,
                currentUserId
        );

        return success(result, "Tra cứu chỗ trống thành công");
    }

    @Operation(
            summary = "Kiểm tra phòng trống (Room Availability)",
            description = "Tra cứu tình trạng khả dụng của tất cả các phòng họp/phòng riêng trong một không gian trong khoảng thời gian xác định, bao gồm kiểm tra xung đột hai chiều với các ghế con và khoảng đệm dọn dẹp."
    )
    @GetMapping("/rooms")
    public ResponseEntity<ApiResponse<List<RoomAvailabilityResponseDto>>> getRoomAvailability(
            @Parameter(description = "Mã không gian làm việc", required = true, example = "1")
            @RequestParam @NotNull(message = "Mã không gian làm việc không được để trống") Long workspaceId,

            @Parameter(description = "Mã sơ đồ tầng (tuỳ chọn lọc theo tầng cụ thể)", example = "2")
            @RequestParam(required = false) Long floorPlanId,

            @Parameter(description = "Thời gian bắt đầu (định dạng ISO-8601)", required = true, example = "2026-11-13T14:00:00")
            @RequestParam @NotNull(message = "Thời gian bắt đầu không được để trống")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,

            @Parameter(description = "Thời gian kết thúc (định dạng ISO-8601)", required = true, example = "2026-11-13T16:00:00")
            @RequestParam @NotNull(message = "Thời gian kết thúc không được để trống")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,

            @Parameter(description = "Sức chứa tối thiểu (tuỳ chọn)", example = "6")
            @RequestParam(required = false) Integer minCapacity
    ) {
        Long currentUserId = currentUserProvider.getCurrentUser()
                .map(AuthUser::getId)
                .orElse(null);

        List<RoomAvailabilityResponseDto> result = resourceAvailabilityService.checkRoomAvailability(
                workspaceId,
                floorPlanId,
                startTime,
                endTime,
                minCapacity,
                currentUserId
        );

        return success(result, "Tra cứu phòng trống thành công");
    }

    @Operation(
            summary = "Đăng ký nhận luồng sự kiện chỗ trống thời gian thực (SSE Stream)",
            description = "Mở kết nối Server-Sent Events (SSE) để nhận các thông báo thay đổi trạng thái khả dụng của tài nguyên (giữ chỗ, đặt chỗ, hủy chỗ, hết hạn) trong không gian làm việc theo thời gian thực."
    )
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAvailability(
            @Parameter(description = "Mã không gian làm việc", required = true, example = "1")
            @RequestParam @NotNull(message = "Mã không gian làm việc không được để trống") Long workspaceId
    ) {
        return sseEmitterService.subscribe(workspaceId);
    }
}

