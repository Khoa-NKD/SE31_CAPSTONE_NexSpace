package base.api.feature.auth.mapper;

import base.api.feature.auth.dto.response.UserDto;
import base.api.shared.entity.UserModel;

public final class UserMapper {
  private UserMapper() {}

  public static UserDto toDto(UserModel user) {
    return UserDto.builder()
        .id(user.getId())
        .email(user.getEmail())
        .fullName(user.getFullName())
        .phone(user.getPhone())
        .birthDate(user.getBirthDate())
        .address(user.getAddress())
        .avatarUrl(user.getAvatarUrl())
        .verified(user.isVerified())
        .status(user.getStatus())
        .role(user.getRole())
        .createdAt(user.getCreatedAt())
        .updatedAt(user.getUpdatedAt())
        .build();
  }
}
