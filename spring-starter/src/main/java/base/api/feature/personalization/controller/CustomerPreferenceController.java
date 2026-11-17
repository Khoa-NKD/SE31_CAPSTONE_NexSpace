package base.api.feature.personalization.controller;

import base.api.feature.personalization.dto.request.UpdateCustomerPreferenceDto;
import base.api.feature.personalization.dto.response.CustomerPreferenceDto;
import base.api.feature.personalization.service.ICustomerPreferenceService;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller quản lý sở thích không gian cá nhân của khách hàng (Customer Preferences).
 * Đảm bảo chỉ khách hàng sở hữu mới có quyền truy cập và thao tác trên cấu hình của chính mình.
 */
@RestController
@RequestMapping("/api/customer-preferences")
@RequiredArgsConstructor
@Tag(name = "Customer - Preferences", description = "Quản lý sở thích không gian cá nhân của khách hàng")
public class CustomerPreferenceController extends BaseAPIController {

    private final ICustomerPreferenceService customerPreferenceService;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Xem sở thích không gian cá nhân", description = "Lấy thông tin cấu hình sở thích không gian của khách hàng hiện tại")
    public ResponseEntity<ApiResponse<CustomerPreferenceDto>> getMyPreferences() {
        Long actorId = getCurrentUserId();
        CustomerPreferenceDto data = customerPreferenceService.getMyPreferences(actorId);
        return success(data, "Lấy thông tin sở thích thành công");
    }

    @PostMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Thiết lập sở thích không gian cá nhân", description = "Tạo mới thông tin sở thích không gian của khách hàng (chỉ được tạo 1 lần duy nhất)")
    public ResponseEntity<ApiResponse<CustomerPreferenceDto>> createMyPreferences(
            @Valid @RequestBody UpdateCustomerPreferenceDto request) {
        Long actorId = getCurrentUserId();
        CustomerPreferenceDto data = customerPreferenceService.createMyPreferences(actorId, request);
        return created(data, "Thiết lập sở thích không gian thành công");
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Cập nhật sở thích không gian cá nhân", description = "Tạo mới hoặc cập nhật thông tin sở thích không gian của khách hàng")
    public ResponseEntity<ApiResponse<CustomerPreferenceDto>> updateMyPreferences(
            @Valid @RequestBody UpdateCustomerPreferenceDto request) {
        Long actorId = getCurrentUserId();
        CustomerPreferenceDto data = customerPreferenceService.updateMyPreferences(actorId, request);
        return success(data, "Cập nhật sở thích không gian thành công");
    }

    @DeleteMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Xóa sở thích không gian cá nhân", description = "Xóa bỏ cấu hình sở thích không gian của khách hàng về mặc định")
    public ResponseEntity<ApiResponse<Void>> deleteMyPreferences() {
        Long actorId = getCurrentUserId();
        customerPreferenceService.deleteMyPreferences(actorId);
        return success(null, "Xóa sở thích không gian thành công");
    }
}

