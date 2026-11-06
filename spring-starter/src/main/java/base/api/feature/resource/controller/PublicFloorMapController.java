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
@RequestMapping("/api/public/workspaces")
@RequiredArgsConstructor
@Validated
public class PublicFloorMapController extends BaseAPIController {
    private final PublicFloorMapService service;

    @GetMapping("/{workspaceId}/floor-maps")
    public ResponseEntity<ApiResponse<List<PublicFloorMapService.FloorView>>> maps(
            @PathVariable @Positive Long workspaceId) {
        return success(service.maps(workspaceId));
    }

    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> invalidIdentifier() {
        return ResponseEntity.badRequest().body(new ApiResponse<>(false, null,
            "Invalid workspace identifier", 400, null));
    }
}
