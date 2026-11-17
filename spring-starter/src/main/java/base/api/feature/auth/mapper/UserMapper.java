package base.api.feature.auth.mapper;

import base.api.feature.auth.dto.response.UserDto;
import base.api.shared.entity.UserModel;

public final class UserMapper {

    private UserMapper() {
    }

    public static UserDto toDto(UserModel user) {
        if (user == null) {
            return null;
        }
        return UserDto.builder()
                .id(user.getId())
                .userName(user.getUserName())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .gender(user.getGender())
                .birthDate(user.getBirthDate())
                .avatar(user.getAvatar())
                .verified(user.isVerified())
                .twoFactorEnabled(user.isTwoFactorEnabled())
                .status(user.getStatus())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .lockedUntil(user.getLockedUntil())
                .build();
    }
}
