package base.api.shared.enums;

/**
 * Role hệ thống. Thêm role mới ở đây — {@code DataInitializer} sẽ tự seed vào bảng roles.
 * Spring Security authority tương ứng: {@code ROLE_<name>}.
 * Ánh xạ thiết kế NexSpace: USER = Customer, ORGANIZER = Organizer, ADMIN = Administrator.
 */
public enum UserRole {
    ADMIN,
    USER,
    ORGANIZER
}
