package base.api.feature.auth.dto.response;

import base.api.shared.enums.*;
import java.time.*;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class UserDto {
  UUID id;
  String email;
  String fullName;
  String phone;
  LocalDate birthDate;
  String address;
  String avatarUrl;
  boolean verified;
  UserStatus status;
  UserRole role;
  LocalDateTime createdAt;
  LocalDateTime updatedAt;
}
