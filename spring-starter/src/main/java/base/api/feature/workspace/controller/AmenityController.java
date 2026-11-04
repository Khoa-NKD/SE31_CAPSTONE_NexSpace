package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.CreateAmenityDto;
import base.api.feature.workspace.dto.request.UpdateAmenityDto;
import base.api.feature.workspace.dto.response.AmenityResponseDto;
import base.api.feature.workspace.service.IAmenityService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/amenities")
@RequiredArgsConstructor
@Tag(name = "Amenities", description = "API quản lý và tra cứu danh mục tiện ích không gian")
public class AmenityController extends BaseAPIController {

    private final IAmenityService amenityService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tiện ích đang kích hoạt", description = "Trả về toàn bộ danh mục tiện ích chuẩn của hệ thống")
    public ResponseEntity<ApiResponse<List<AmenityResponseDto>>> getActiveAmenities() {
        List<AmenityResponseDto> list = amenityService.getActiveAmenities();
        return success(list, "Lấy danh sách tiện ích thành công");
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết tiện ích", description = "Lấy thông tin chi tiết một tiện ích theo ID")
    public ResponseEntity<ApiResponse<AmenityResponseDto>> getAmenityById(@PathVariable Long id) {
        AmenityResponseDto amenity = amenityService.getAmenityById(id);
        return success(amenity, "Lấy thông tin tiện ích thành công");
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Tạo tiện ích mới", description = "Chỉ Admin có quyền tạo tiện ích mới như Wi-Fi, bãi đỗ xe, máy in, cà phê...")
    public ResponseEntity<ApiResponse<AmenityResponseDto>> createAmenity(
            @Valid @RequestBody CreateAmenityDto dto
    ) {
        Long actorId = getCurrentUserId();
        AmenityResponseDto created = amenityService.createAmenity(actorId, dto);
        return created(created, "Tạo tiện ích mới thành công");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Cập nhật tiện ích", description = "Chỉ Admin có quyền cập nhật tên, icon, mô tả và phân loại tiện ích")
    public ResponseEntity<ApiResponse<AmenityResponseDto>> updateAmenity(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAmenityDto dto
    ) {
        Long actorId = getCurrentUserId();
        AmenityResponseDto updated = amenityService.updateAmenity(actorId, id, dto);
        return success(updated, "Cập nhật tiện ích thành công");
    }
}
