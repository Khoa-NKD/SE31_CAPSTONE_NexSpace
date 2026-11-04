package base.api.feature.auth.controller;

import base.api.feature.auth.dto.response.UserDto;
import base.api.feature.auth.service.IUserService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller quản lý hồ sơ người dùng cá nhân (Customer, Organizer, Admin).
 */
@RestController
@RequestMapping({"/api/v1/users", "/api/users"})
@RequiredArgsConstructor
@Tag(name = "Người dùng - Hồ sơ cá nhân", description = "Quản lý thông tin tài khoản và hồ sơ cá nhân")
public class UserController extends BaseAPIController {

    private final IUserService userService;

    @Operation(summary = "Xem hồ sơ cá nhân", description = "Lấy toàn bộ thông tin hồ sơ của tài khoản đang đăng nhập từ JWT")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getMyProfile() {
        return success(userService.getById(getCurrentUserId()), "Lấy thông tin hồ sơ thành công");
    }
}

