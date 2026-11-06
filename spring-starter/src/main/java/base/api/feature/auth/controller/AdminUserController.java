package base.api.feature.auth.controller;

import base.api.feature.auth.dto.request.UpdateUserRoleDto;
import base.api.feature.auth.dto.request.UpdateUserStatusDto;
import base.api.feature.auth.dto.response.UserDto;
import base.api.feature.auth.service.IUserService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Quản lý tài khoản người dùng bởi Quản trị viên (chỉ ADMIN).
 * Mọi thao tác khóa / mở khóa đều được bảo vệ và ghi vết qua Audit Log (BR-31).
 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin - Users", description = "Quản lý tài khoản (chỉ ADMIN)")
public class AdminUserController extends BaseAPIController {

    private final IUserService userService;

    @Operation(summary = "Xem danh sách người dùng (phân trang, tìm kiếm, lọc)")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponseDTO<UserDto>>> getUsers(
            @ModelAttribute PageRequestDTO pageRequest,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) UserStatus status) {
        return successPage(userService.getUserPage(pageRequest, role, status));
    }

    @Operation(summary = "Xem chi tiết hồ sơ người dùng theo ID", description = "Trả về thông tin hồ sơ chi tiết của người dùng cho Quản trị viên, che chắn dữ liệu nhạy cảm")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getUser(@PathVariable Long id) {
        return success(userService.getById(id));
    }

    @Operation(summary = "Khóa / mở khóa user", description = "Cập nhật trạng thái tài khoản, thiết lập thời hạn khóa và tự động ghi vết Audit Log theo BR-31")
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<UserDto>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusDto dto) {
        return success(userService.updateUserStatus(getCurrentUserId(), id, dto.getStatus(), dto.getReason(), dto.getLockedUntil()),
                "Cập nhật trạng thái thành công");
    }

    @Operation(summary = "Gán và thay đổi vai trò người dùng (chỉ ADMIN)", description = "Thay đổi vai trò người dùng (USER, ORGANIZER, ADMIN), thu hồi các phiên đăng nhập hiện tại và tự động ghi vết Audit Log")
    @PatchMapping("/{id}/role")
    public ResponseEntity<ApiResponse<UserDto>> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRoleDto dto) {
        return success(userService.updateUserRole(getCurrentUserId(), id, dto.getRole(), dto.getReason()),
                "Cập nhật vai trò thành công");
    }

    @Operation(summary = "Gán và thay đổi vai trò người dùng (chỉ ADMIN) - Hỗ trợ phương thức PUT", hidden = true)
    @PutMapping("/{id}/role")
    public ResponseEntity<ApiResponse<UserDto>> updateRolePut(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRoleDto dto) {
        return updateRole(id, dto);
    }
}
