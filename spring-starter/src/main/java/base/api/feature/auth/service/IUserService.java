package base.api.feature.auth.service;

import base.api.feature.auth.dto.request.ChangePasswordDto;
import base.api.feature.auth.dto.request.DeleteAccountDto;
import base.api.feature.auth.dto.request.UpdateProfileDto;
import base.api.feature.auth.dto.response.UserDto;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;

public interface IUserService {

    UserDto getById(Long userId);

    UserDto updateProfile(Long userId, UpdateProfileDto dto);

    UserDto updateProfileWithMultipart(Long userId, base.api.feature.auth.dto.request.UpdateProfileMultipartDto dto);

    UserDto uploadAvatar(Long userId, MultipartFile file);

    UserDto updateAvatarUrl(Long userId, String avatarUrl);

    UserDto updateAvatar(Long userId, base.api.feature.auth.dto.request.UpdateAvatarMultipartDto dto);

    UserDto deleteAvatar(Long userId);

    void changePassword(Long userId, ChangePasswordDto dto);

    Page<UserDto> getUserPage(PageRequestDTO pageRequest, UserRole role, UserStatus status);

    UserDto updateUserStatus(Long actorId, Long targetUserId, UserStatus status);

    UserDto updateUserStatus(Long actorId, Long targetUserId, UserStatus status, String reason);

    UserDto updateUserStatus(Long actorId, Long targetUserId, UserStatus status, String reason, LocalDateTime lockedUntil);

    UserDto updateUserRole(Long actorId, Long targetUserId, UserRole role, String reason);

    void deleteMyAccount(Long userId, DeleteAccountDto dto);
}
