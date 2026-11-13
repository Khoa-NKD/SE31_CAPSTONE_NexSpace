package base.api.feature.resource.controller;

import base.api.feature.resource.dto.response.DeskAvailabilityResponseDto;
import base.api.feature.resource.service.IResourceAvailabilityService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.security.AuthUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/public/availability")
@RequiredArgsConstructor
@Validated
@Tag(name = "Điều phối Chỗ trống Thời gian thực", description = "Các API công khai tra cứu tình trạng khả dụng và lịch đặt chỗ theo thời gian thực")
public class PublicAvailabilityController extends BaseAPIController {

    private final IResourceAvailabilityService resourceAvailabilityService;

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
}

