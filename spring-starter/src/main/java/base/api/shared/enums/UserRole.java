package base.api.shared.enums;

/**
 * Role hệ thống (được khởi tạo qua Flyway migration & scripts/db/init_data.py).
 * Spring Security authority tương ứng: {@code ROLE_<name>}.
 * Ánh xạ thiết kế NexSpace: USER = Customer, ORGANIZER = Organizer, ADMIN = Administrator.
 */
public enum UserRole {
    ADMIN,
    USER,
    ORGANIZER
}
