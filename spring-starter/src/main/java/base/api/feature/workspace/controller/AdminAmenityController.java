package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.AmenityFilterDto;
import base.api.feature.workspace.dto.response.AmenityResponseDto;
import base.api.feature.workspace.service.IAmenityService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/amenities")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Amenities", description = "API quản trị danh mục tiện ích toàn hệ thống")
public class AdminAmenityController extends BaseAPIController {

    private final IAmenityService amenityService;

    @GetMapping
    @Operation(summary = "Danh sách quản trị tiện ích có phân trang và bộ lọc", description = "Tra cứu danh sách tiện ích toàn diện cho Admin")
    public ResponseEntity<ApiResponse<PageResponseDTO<AmenityResponseDto>>> listAmenities(
            @ParameterObject AmenityFilterDto filter
    ) {
        Page<AmenityResponseDto> page = amenityService.listAmenities(filter);
        return successPage(page);
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Bật/tắt trạng thái kích hoạt của tiện ích", description = "Chuyển đổi trạng thái hiển thị của tiện ích")
    public ResponseEntity<ApiResponse<Void>> toggleAmenityStatus(
            @PathVariable Long id,
            @RequestParam boolean active
    ) {
        Long actorId = getCurrentUserId();
        amenityService.toggleAmenityStatus(actorId, id, active);
        String msg = active ? "Kích hoạt tiện ích thành công" : "Vô hiệu hóa tiện ích thành công";
        return success(null, msg);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa tiện ích", description = "Admin xóa tiện ích khỏi hệ thống")
    public ResponseEntity<ApiResponse<Void>> deleteAmenity(@PathVariable Long id) {
        Long actorId = getCurrentUserId();
        amenityService.deleteAmenity(actorId, id);
        return success(null, "Xóa tiện ích thành công");
    }
}
