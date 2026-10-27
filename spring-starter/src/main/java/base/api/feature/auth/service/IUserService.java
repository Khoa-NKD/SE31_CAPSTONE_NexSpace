package base.api.feature.auth.service;

import base.api.feature.auth.dto.request.ChangePasswordDto;
import base.api.feature.auth.dto.request.UpdateProfileDto;
import base.api.feature.auth.dto.response.UserDto;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import java.util.UUID;
import org.springframework.data.domain.Page;

public interface IUserService {

  UserDto getById(UUID userId);

  UserDto updateProfile(UUID userId, UpdateProfileDto dto);

  void changePassword(UUID userId, ChangePasswordDto dto);

  Page<UserDto> getUserPage(PageRequestDTO pageRequest, UserRole role, UserStatus status);

  UserDto updateUserStatus(UUID actorId, UUID targetUserId, UserStatus status);
}
