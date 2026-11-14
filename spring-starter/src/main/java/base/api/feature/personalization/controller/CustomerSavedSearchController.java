package base.api.feature.personalization.controller;

import base.api.feature.personalization.dto.request.CreateSavedSearchFilterDto;
import base.api.feature.personalization.dto.response.SavedSearchFilterDto;
import base.api.feature.personalization.service.ISavedSearchFilterService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller quản lý các bộ lọc tìm kiếm đã lưu của khách hàng.
 */
@RestController
@RequestMapping("/api/customer/saved-searches")
@RequiredArgsConstructor
@Tag(name = "Customer - Saved Searches", description = "Quản lý các bộ lọc tìm kiếm yêu thích đã lưu của khách hàng")
public class CustomerSavedSearchController extends BaseAPIController {

    private final ISavedSearchFilterService savedSearchFilterService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lấy danh sách các bộ lọc đã lưu", description = "Lấy toàn bộ các bộ lọc tìm kiếm mà khách hàng hiện tại đã lưu")
    public ResponseEntity<ApiResponse<List<SavedSearchFilterDto>>> getMySavedFilters() {
        Long actorId = getCurrentUserId();
        List<SavedSearchFilterDto> data = savedSearchFilterService.getMySavedFilters(actorId);
        return success(data, "Lấy danh sách bộ lọc đã lưu thành công");
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lưu bộ lọc tìm kiếm mới", description = "Lưu lại cấu hình bộ lọc tìm kiếm hiện tại với một tên gọi gợi nhớ")
    public ResponseEntity<ApiResponse<SavedSearchFilterDto>> createSavedFilter(
            @Valid @RequestBody CreateSavedSearchFilterDto request) {
        Long actorId = getCurrentUserId();
        SavedSearchFilterDto data = savedSearchFilterService.createSavedFilter(actorId, request);
        return created(data, "Lưu bộ lọc tìm kiếm thành công");
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Xóa bộ lọc đã lưu", description = "Xóa một bộ lọc tìm kiếm đã lưu theo ID")
    public ResponseEntity<ApiResponse<Void>> deleteSavedFilter(@PathVariable("id") Long id) {
        Long actorId = getCurrentUserId();
        savedSearchFilterService.deleteSavedFilter(actorId, id);
        return success(null, "Xóa bộ lọc tìm kiếm thành công");
    }
}

