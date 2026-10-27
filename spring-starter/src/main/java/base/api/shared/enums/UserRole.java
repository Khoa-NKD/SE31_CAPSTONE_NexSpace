package base.api.shared.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum UserRole {
  CUSTOMER("Customer"),
  ORGANIZER("Organizer"),
  ADMINISTRATOR("Administrator");
  private final String value;

  UserRole(String value) {
    this.value = value;
  }

  @JsonValue
  public String getValue() {
    return value;
  }

  @JsonCreator
  public static UserRole fromValue(String value) {
    for (UserRole role : values())
      if (role.value.equalsIgnoreCase(value) || role.name().equalsIgnoreCase(value)) return role;
    throw new IllegalArgumentException("Vai trò không hợp lệ");
  }
}
