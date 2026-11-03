package base.api.feature.auth.service;

import base.api.feature.auth.dto.request.ChangePasswordDto;
import base.api.feature.auth.dto.request.UpdateProfileDto;
import base.api.feature.auth.dto.response.UserDto;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import org.springframework.data.domain.Page;

public interface IUserService {

    UserDto getById(Long userId);

    UserDto updateProfile(Long userId, UpdateProfileDto dto);

    void changePassword(Long userId, ChangePasswordDto dto);

    Page<UserDto> getUserPage(PageRequestDTO pageRequest, UserRole role, UserStatus status);

    UserDto updateUserStatus(Long actorId, Long targetUserId, UserStatus status);

    UserDto updateUserStatus(Long actorId, Long targetUserId, UserStatus status, String reason);
}
