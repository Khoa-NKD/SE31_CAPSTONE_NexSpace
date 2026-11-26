package base.api.feature.resource.controller;

import base.api.feature.resource.service.PublicFloorMapService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;

import jakarta.validation.constraints.Positive;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/public/workspaces", "/api/public/workspaces"})
@RequiredArgsConstructor
@Validated
public class PublicFloorMapController extends BaseAPIController {
    private final PublicFloorMapService service;

    @GetMapping("/{workspaceId}/floor-maps")
    public ResponseEntity<ApiResponse<List<PublicFloorMapService.FloorView>>> maps(
            @PathVariable @Positive Long workspaceId) {
        return success(service.maps(workspaceId));
    }

    @GetMapping("/{workspaceId}/resources/{resourceId}")
    public ResponseEntity<ApiResponse<base.api.feature.resource.dto.response.PublicResourceDetailDto>> resourceDetail(
            @PathVariable @Positive Long workspaceId,
            @PathVariable @Positive Long resourceId) {
        return success(service.resourceDetail(workspaceId, resourceId), "Lấy chi tiết chỗ ngồi thành công");
    }

    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> invalidIdentifier() {
        return ResponseEntity.badRequest().body(new ApiResponse<>(false, null,
            "Invalid workspace identifier", 400, null));
    }
}
