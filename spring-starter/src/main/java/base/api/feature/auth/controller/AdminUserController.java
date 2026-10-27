package base.api.feature.auth.controller;

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
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Ví dụ endpoint phân quyền theo role: /api/v1/admin/** chỉ Administrator (xem SecurityConfig),
 * đồng thời minh họa @PreAuthorize ở mức method.
 */
@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMINISTRATOR')")
@Tag(name = "Admin - Users", description = "Quản lý tài khoản (chỉ Administrator)")
public class AdminUserController extends BaseAPIController {

  private final IUserService userService;

  @Operation(summary = "Danh sách user (phân trang, tìm kiếm, lọc)")
  @GetMapping
  public ResponseEntity<ApiResponse<PageResponseDTO<UserDto>>> getUsers(
      @Valid @ModelAttribute PageRequestDTO pageRequest,
      @RequestParam(required = false) UserRole role,
      @RequestParam(required = false) UserStatus status) {
    return successPage(userService.getUserPage(pageRequest, role, status));
  }

  @Operation(summary = "Chi tiết user")
  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<UserDto>> getUser(@PathVariable UUID id) {
    return success(userService.getById(id));
  }

  @Operation(summary = "Khóa / mở khóa user")
  @PatchMapping("/{id}/status")
  public ResponseEntity<ApiResponse<UserDto>> updateStatus(
      @PathVariable UUID id, @Valid @RequestBody UpdateUserStatusDto dto) {
    return success(
        userService.updateUserStatus(getCurrentUserId(), id, dto.getStatus()),
        "Cập nhật trạng thái thành công");
  }
}
