package base.api.shared.entity;

import base.api.shared.enums.UserRole;
import jakarta.persistence.*;

@Converter(autoApply = true)
public class UserRoleConverter implements AttributeConverter<UserRole, String> {
  public String convertToDatabaseColumn(UserRole value) {
    return value == null ? null : value.getValue();
  }

  public UserRole convertToEntityAttribute(String value) {
    return value == null ? null : UserRole.fromValue(value);
  }
}
