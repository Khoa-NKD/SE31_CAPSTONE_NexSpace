package base.api.feature.auth.dto.response;

import base.api.shared.enums.UserGender;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Value
@Builder
public class UserDto {
    Long id;
    String userName;
    String email;
    String firstName;
    String lastName;
    String fullName;
    String phone;
    UserGender gender;
    LocalDate birthDate;
    String avatar;
    boolean verified;
    UserStatus status;
    UserRole role;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
