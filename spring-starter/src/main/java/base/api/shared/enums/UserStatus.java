package base.api.shared.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum UserStatus {
  UNVERIFIED("Unverified"),
  ACTIVE("Active"),
  LOCKED("Locked"),
  DEACTIVATED("Deactivated");
  private final String value;

  UserStatus(String value) {
    this.value = value;
  }

  @JsonValue
  public String getValue() {
    return value;
  }

  @JsonCreator
  public static UserStatus fromValue(String value) {
    for (UserStatus status : values())
      if (status.value.equalsIgnoreCase(value) || status.name().equalsIgnoreCase(value))
        return status;
    throw new IllegalArgumentException("Trạng thái không hợp lệ");
  }
}
