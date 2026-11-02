package base.api.shared.enums;

/**
 * Role hệ thống. Thêm role mới ở đây — {@code DataInitializer} sẽ tự seed vào bảng roles.
 * Spring Security authority tương ứng: {@code ROLE_<name>}.
 */
public enum UserRole {
    ADMIN,
    USER
}
