package base.api.shared.entity;

import base.api.shared.enums.UserStatus;
import jakarta.persistence.*;

@Converter(autoApply = true)
public class UserStatusConverter implements AttributeConverter<UserStatus, String> {
  public String convertToDatabaseColumn(UserStatus value) {
    return value == null ? null : value.getValue();
  }

  public UserStatus convertToEntityAttribute(String value) {
    return value == null ? null : UserStatus.fromValue(value);
  }
}
