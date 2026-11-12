package base.api.feature.auth.controller;

import base.api.feature.auth.dto.request.DeleteAccountDto;
import base.api.feature.auth.dto.request.UpdateAvatarDto;
import base.api.feature.auth.dto.request.UpdateProfileDto;
import base.api.feature.auth.dto.response.UserDto;
import base.api.feature.auth.service.IUserService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller quản lý hồ sơ người dùng cá nhân (Customer, Organizer, Admin).
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Người dùng - Hồ sơ cá nhân", description = "Quản lý thông tin tài khoản và hồ sơ cá nhân")
public class UserController extends BaseAPIController {

    private final IUserService userService;

    @Operation(summary = "Xem hồ sơ cá nhân", description = "Lấy toàn bộ thông tin hồ sơ của tài khoản đang đăng nhập từ JWT")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getMyProfile() {
        return success(userService.getById(getCurrentUserId()), "Lấy thông tin hồ sơ thành công");
    }

    @Operation(summary = "Cập nhật hồ sơ cá nhân (JSON)", description = "Cập nhật thông tin cá nhân; trường avatar có thể dùng link ảnh trên mạng (Cách 1)")
    @PutMapping(value = "/me", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<UserDto>> updateMyProfile(@Valid @RequestBody UpdateProfileDto dto) {
        return success(userService.updateProfile(getCurrentUserId(), dto), "Cập nhật hồ sơ thành công");
    }

    @Operation(summary = "Cập nhật hồ sơ cá nhân (Multipart)", description = "Cập nhật hồ sơ cá nhân với 2 cách tải avatar: đính kèm file ảnh từ máy (Cách 2) hoặc nhập link ảnh trên mạng (Cách 1)")
    @PutMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserDto>> updateMyProfileMultipart(
            @Valid @org.springframework.web.bind.annotation.ModelAttribute base.api.feature.auth.dto.request.UpdateProfileMultipartDto dto) {
        return success(userService.updateProfileWithMultipart(getCurrentUserId(), dto), "Cập nhật hồ sơ thành công");
    }

    @Operation(summary = "Cập nhật ảnh đại diện (Multipart: File từ máy tính HOẶC Link online)", description = "Hỗ trợ 2 cách: Đính kèm file ảnh từ máy tính ('file') HOẶC nhập link ảnh trên mạng ('avatarUrl' hoặc 'avatar')")
    @PutMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserDto>> updateMyAvatarMultipart(
            @Valid @org.springframework.web.bind.annotation.ModelAttribute base.api.feature.auth.dto.request.UpdateAvatarMultipartDto dto) {
        return success(userService.updateAvatar(getCurrentUserId(), dto), "Cập nhật ảnh đại diện thành công");
    }

    @Operation(summary = "Cập nhật ảnh đại diện bằng đường dẫn mạng (JSON)", description = "Cập nhật ảnh đại diện thông qua link ảnh online (http:// hoặc https://) gửi dạng JSON")
    @PutMapping(value = "/me/avatar", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<UserDto>> updateMyAvatarUrl(@Valid @RequestBody UpdateAvatarDto dto) {
        return success(userService.updateAvatarUrl(getCurrentUserId(), dto.getEffectiveUrl()), "Cập nhật ảnh đại diện thành công");
    }

    @Operation(summary = "Xóa ảnh đại diện", description = "Xóa ảnh đại diện hiện tại và đưa về trạng thái mặc định")
    @DeleteMapping("/me/avatar")
    public ResponseEntity<ApiResponse<UserDto>> deleteMyAvatar() {
        return success(userService.deleteAvatar(getCurrentUserId()), "Xóa ảnh đại diện thành công");
    }

    @Operation(summary = "Tự xóa tài khoản cá nhân", description = "Người dùng tự xóa tài khoản của chính mình. Yêu cầu nhập mật khẩu xác nhận, tài khoản chuyển sang trạng thái DELETED và thu hồi phiên đăng nhập.")
    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> deleteMyAccount(@Valid @RequestBody DeleteAccountDto dto) {
        userService.deleteMyAccount(getCurrentUserId(), dto);
        return success(null, "Tài khoản của bạn đã được xóa thành công");
    }
}
