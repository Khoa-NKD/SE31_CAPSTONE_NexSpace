package base.api.feature.booking.controller;

import base.api.feature.booking.dto.response.ResourceAvailabilityDto;
import base.api.feature.booking.service.IBookingService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping({"/api/v1/public/workspaces", "/api/public/workspaces"})
@RequiredArgsConstructor
@Tag(name = "Public Workspaces - Availability", description = "API công khai tra cứu chỗ trống theo thời gian")
public class PublicBookingAvailabilityController extends BaseAPIController {

    private final IBookingService bookingService;

    @Operation(summary = "Tra cứu chỗ trống trên sơ đồ tầng theo khung giờ")
    @GetMapping("/{workspaceId}/availability")
    public ResponseEntity<ApiResponse<List<ResourceAvailabilityDto>>> getAvailability(
            @PathVariable Long workspaceId,
            @RequestParam(required = false) Long floorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        return success(bookingService.getFloorAvailability(workspaceId, floorId, startTime, endTime));
    }
}
