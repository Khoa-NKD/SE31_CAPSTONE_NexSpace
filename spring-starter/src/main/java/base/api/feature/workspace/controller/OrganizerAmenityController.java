package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.AmenityFilterDto;
import base.api.feature.workspace.dto.request.CreateAmenityDto;
import base.api.feature.workspace.dto.request.UpdateAmenityDto;
import base.api.feature.workspace.dto.response.AmenityResponseDto;
import base.api.feature.workspace.service.IAmenityService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/organizer/amenities")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ORGANIZER')")
@Tag(name = "Organizer Amenities", description = "API quản lý bộ danh mục tiện ích riêng của đối tác (Organizer)")
public class OrganizerAmenityController extends BaseAPIController {

    private final IAmenityService amenityService;

    @GetMapping
    @Operation(summary = "Danh sách tiện ích riêng của đối tác có phân trang và bộ lọc", description = "Tra cứu toàn bộ tiện ích custom do đối tác tạo")
    public ResponseEntity<ApiResponse<PageResponseDTO<AmenityResponseDto>>> listMyAmenities(
            @ParameterObject AmenityFilterDto filter
    ) {
        Long organizerId = getCurrentUserId();
        Page<AmenityResponseDto> page = amenityService.listOrganizerAmenities(organizerId, filter);
        return successPage(page);
    }

    @GetMapping("/available")
    @Operation(summary = "Lấy tất cả tiện ích riêng của đối tác", description = "Lấy danh sách các tiện ích riêng đang kích hoạt do chính đối tác tạo")
    public ResponseEntity<ApiResponse<List<AmenityResponseDto>>> getAvailableAmenities() {
        Long organizerId = getCurrentUserId();
        List<AmenityResponseDto> list = amenityService.getAvailableAmenitiesForOrganizer(organizerId);
        return success(list, "Lấy danh sách tiện ích của đối tác thành công");
    }

    @PostMapping
    @Operation(summary = "Đối tác tạo tiện ích riêng mới", description = "Tạo một tiện ích riêng thuộc quyền sở hữu của đối tác đăng nhập")
    public ResponseEntity<ApiResponse<AmenityResponseDto>> createMyAmenity(
            @Valid @RequestBody CreateAmenityDto dto
    ) {
        Long organizerId = getCurrentUserId();
        AmenityResponseDto created = amenityService.createOrganizerAmenity(organizerId, dto);
        return created(created, "Tạo tiện ích đối tác thành công");
    }

    @PutMapping("/{id}")
    @Operation(summary = "Đối tác cập nhật tiện ích riêng", description = "Chỉ cho phép cập nhật tiện ích do chính đối tác tạo")
    public ResponseEntity<ApiResponse<AmenityResponseDto>> updateMyAmenity(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAmenityDto dto
    ) {
        Long organizerId = getCurrentUserId();
        AmenityResponseDto updated = amenityService.updateOrganizerAmenity(organizerId, id, dto);
        return success(updated, "Cập nhật tiện ích đối tác thành công");
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Bật/tắt trạng thái kích hoạt của tiện ích đối tác", description = "Chuyển đổi trạng thái sử dụng tiện ích của đối tác")
    public ResponseEntity<ApiResponse<Void>> toggleMyAmenityStatus(
            @PathVariable Long id,
            @RequestParam boolean active
    ) {
        Long organizerId = getCurrentUserId();
        amenityService.toggleOrganizerAmenityStatus(organizerId, id, active);
        String msg = active ? "Kích hoạt tiện ích thành công" : "Vô hiệu hóa tiện ích thành công";
        return success(null, msg);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Đối tác xóa tiện ích riêng", description = "Xóa tiện ích riêng nếu chưa được gán vào không gian nào")
    public ResponseEntity<ApiResponse<Void>> deleteMyAmenity(@PathVariable Long id) {
        Long organizerId = getCurrentUserId();
        amenityService.deleteOrganizerAmenity(organizerId, id);
        return success(null, "Xóa tiện ích đối tác thành công");
    }
}

