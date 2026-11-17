#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NexSpace Master Data Seeder (`seed_master_data.py`)
===================================================
Seeds idempotent master catalog tables required for NexSpace operations:
1. `roles`                 — System RBAC roles (ADMIN, USER, ORGANIZER)
2. `business_type`         — Legal business types (Vietnamese / English)
3. `amenity`               — 15 standard workspace & coworking amenities (TECH, SPACE, COMFORT)
4. `platform_setting`      — System governance & business settings (BOOKING, PAYMENT, SECURITY, UPLOAD, NOTIFICATION)
5. `notification_template` — Bilingual (vi / en) Email & In-App notification templates

Usage:
  python3 spring-starter/scripts/db/seed_master_data.py
"""

from __future__ import annotations

from db_helper import DatabaseExecutor, load_db_config, sql_literal

ROLES_DATA = [
    (1, "ADMIN", "ADMIN role — Quản trị viên hệ thống NexSpace"),
    (2, "USER", "USER role — Khách hàng cá nhân & doanh nghiệp thuê không gian"),
    (3, "ORGANIZER", "ORGANIZER role — Đối tác vận hành không gian làm việc (Workspace Host)"),
]

BUSINESS_TYPES_DATA = [
    (1, "JOINT_STOCK", "Công ty cổ phần", "Joint stock company", 10),
    (2, "LIMITED_LIABILITY", "Công ty trách nhiệm hữu hạn", "Limited liability company", 20),
    (3, "SOLE_PROPRIETOR", "Doanh nghiệp tư nhân", "Sole proprietor", 30),
    (4, "HOUSEHOLD_BUSINESS", "Hộ kinh doanh", "Household business", 40),
    (5, "OTHER", "Loại hình khác", "Other business", 50),
]

AMENITIES_DATA = [
    # TECH (1..5)
    (
        1,
        "High-speed WiFi (1 Gbps)",
        "TECH",
        "Wifi",
        "Đường truyền cáp quang đối xứng 1 Gbps, phủ sóng Wi-Fi 6 toàn sàn kèm mạng khách biệt lập",
        True,
    ),
    (
        2,
        "Soundproof Phone Booth",
        "TECH",
        "PhoneCall",
        "Buồng gọi điện cách âm tiêu chuẩn studio 38dB, trang bị quạt thông gió và đèn làm việc",
        True,
    ),
    (
        3,
        "Wireless Screen Casting",
        "TECH",
        "Cast",
        "Trình chiếu không dây 4K độ trễ thấp hỗ trợ AirPlay, Miracast và Google Chromecast",
        True,
    ),
    (
        4,
        "Dual Monitors Station",
        "TECH",
        "Monitor",
        "Trạm làm việc 2 màn hình 27-inch 4K IPS kèm cáp USB-C sạc nhanh 90W",
        True,
    ),
    (
        5,
        "High-speed Network Printer",
        "TECH",
        "Printer",
        "Máy in laser màu đa năng A3/A4 hỗ trợ in hai mặt và scan tài liệu tốc độ cao",
        True,
    ),
    # SPACE (6..11)
    (
        6,
        "Herman Miller Chairs",
        "SPACE",
        "Armchair",
        "Ghế công thái học Herman Miller Aeron hỗ trợ cột sống cho ngày làm việc dài",
        True,
    ),
    (
        7,
        "Standing Desks",
        "SPACE",
        "MoveVertical",
        "Bàn nâng hạ chiều cao tự động 2 motor với bộ nhớ vị trí đứng/ngồi linh hoạt",
        True,
    ),
    (
        8,
        "Private Lockers",
        "SPACE",
        "Lock",
        "Tủ cá nhân khóa mã số điện tử an toàn cho laptop và vật dụng cá nhân",
        True,
    ),
    (
        9,
        "Hot Shower Facility",
        "SPACE",
        "ShowerHead",
        "Phòng tắm nước nóng riêng biệt kèm khăn sạch và tủ đồ cho thành viên tập thể thao",
        True,
    ),
    (
        10,
        "Dedicated Bike Storage",
        "SPACE",
        "Bike",
        "Khu vực đỗ xe đạp và xe máy điện trong nhà có camera giám sát 24/7",
        True,
    ),
    (
        11,
        "Executive Meeting Room",
        "SPACE",
        "Presentation",
        "Phòng họp tiêu chuẩn điều hành 12–20 người với màn hình hội nghị 75-inch 4K",
        True,
    ),
    # COMFORT (12..15)
    (
        12,
        "Specialty Espresso Bar",
        "COMFORT",
        "Coffee",
        "Quầy cà phê Arabica Cầu Đất pha máy tự động, trà thảo mộc và cold brew miễn phí",
        True,
    ),
    (
        13,
        "Filtered Water Station",
        "COMFORT",
        "Droplets",
        "Trạm nước lọc RO nóng/lạnh và nước khoáng có ga phục vụ không giới hạn",
        True,
    ),
    (
        14,
        "Catering & Pantry Kitchen",
        "COMFORT",
        "Utensils",
        "Khu bếp pantry đầy đủ tủ lạnh, lò vi sóng, máy rửa chén và khu vực ăn trưa",
        True,
    ),
    (
        15,
        "Wellness & Nap Pod",
        "COMFORT",
        "Heart",
        "Khu vực nghỉ trưa yên tĩnh với ghế thư giãn không trọng lực và âm thanh trắng",
        True,
    ),
]

PLATFORM_SETTINGS_DATA = [
    # BOOKING
    (
        "booking.hold_ttl_minutes",
        "BOOKING",
        "15",
        "INTEGER",
        "Thời gian giữ chỗ tạm thời (phút) khi chờ thanh toán PayOS trước khi tự động giải phóng slot",
    ),
    (
        "booking.min_advance_minutes",
        "BOOKING",
        "30",
        "INTEGER",
        "Thời gian tối thiểu (phút) trước giờ bắt đầu để khách hàng được phép đặt chỗ mới",
    ),
    (
        "booking.max_advance_days",
        "BOOKING",
        "90",
        "INTEGER",
        "Số ngày tối đa trong tương lai khách hàng có thể đặt trước không gian",
    ),
    (
        "booking.checkin_grace_minutes",
        "BOOKING",
        "30",
        "INTEGER",
        "Thời gian ân hạn check-in (phút) trước và sau giờ bắt đầu đặt chỗ",
    ),
    # PAYMENT
    (
        "payment.platform_commission_percent",
        "PAYMENT",
        "10.00",
        "DECIMAL",
        "Tỷ lệ hoa hồng nền tảng NexSpace (%) khấu trừ trên doanh thu mỗi đơn đặt chỗ thành công",
    ),
    (
        "payment.service_fee_percent",
        "PAYMENT",
        "2.50",
        "DECIMAL",
        "Phí dịch vụ vận hành cổng thanh toán (%) tính trên giá trị cơ bản của đơn đặt chỗ",
    ),
    (
        "payment.vat_percent",
        "PAYMENT",
        "8.00",
        "DECIMAL",
        "Thuế giá trị gia tăng VAT (%) áp dụng cho dịch vụ cho thuê không gian làm việc",
    ),
    (
        "payment.payos_checkout_ttl_minutes",
        "PAYMENT",
        "15",
        "INTEGER",
        "Thời hạn hiệu lực của mã QR thanh toán PayOS (phút)",
    ),
    (
        "payment.payout_release_delay_hours",
        "PAYMENT",
        "24",
        "INTEGER",
        "Số giờ đối soát sau khi hoàn tất booking (COMPLETED) trước khi giải ngân cho Organizer",
    ),
    # SECURITY
    (
        "security.max_failed_login_attempts",
        "SECURITY",
        "5",
        "INTEGER",
        "Số lần đăng nhập sai liên tiếp tối đa trước khi tạm khóa tài khoản (BR-03)",
    ),
    (
        "security.lockout_duration_minutes",
        "SECURITY",
        "15",
        "INTEGER",
        "Thời gian tạm khóa tài khoản (phút) sau khi vượt ngưỡng đăng nhập sai",
    ),
    # UPLOAD
    (
        "upload.max_file_size_mb",
        "UPLOAD",
        "5",
        "INTEGER",
        "Dung lượng tối đa cho mỗi tệp tải lên (MB) theo quy định BR-37",
    ),
    (
        "upload.allowed_document_types",
        "UPLOAD",
        '["application/pdf","image/png","image/jpeg","image/webp"]',
        "JSON",
        "Danh sách định dạng MIME hợp lệ cho hồ sơ pháp lý KYC và ảnh không gian",
    ),
    # NOTIFICATION
    (
        "notification.email_enabled",
        "NOTIFICATION",
        "true",
        "BOOLEAN",
        "Bật/tắt gửi email thông báo tự động qua SMTP cho các sự kiện đặt chỗ và duyệt hồ sơ",
    ),
]

NOTIFICATION_TEMPLATES_DATA = [
    (
        1,
        "BOOKING_CONFIRMED",
        "EMAIL",
        "vi",
        "[NexSpace] Xác nhận đặt chỗ thành công #{{bookingCode}}",
        "Xin chào {{customerName}},\n\nĐơn đặt chỗ #{{bookingCode}} tại {{workspaceName}} ({{resourceLabel}}) từ {{startTime}} đến {{endTime}} đã được xác nhận.\nMã QR check-in của bạn đã sẵn sàng trên ứng dụng NexSpace.",
        True,
    ),
    (
        2,
        "BOOKING_CONFIRMED",
        "IN_APP",
        "vi",
        "Đặt chỗ #{{bookingCode}} đã được xác nhận",
        "Chỗ ngồi/phòng {{resourceLabel}} tại {{workspaceName}} đã sẵn sàng đón bạn lúc {{startTime}}.",
        True,
    ),
    (
        3,
        "BOOKING_CANCELLED",
        "EMAIL",
        "vi",
        "[NexSpace] Thông báo hủy đặt chỗ #{{bookingCode}}",
        "Xin chào {{customerName}},\n\nĐơn đặt chỗ #{{bookingCode}} tại {{workspaceName}} đã được hủy. Lý do: {{cancelReason}}.",
        True,
    ),
    (
        4,
        "PAYMENT_SUCCESS",
        "EMAIL",
        "vi",
        "[NexSpace] Biên lai thanh toán đơn hàng #{{orderCode}}",
        "Cảm ơn bạn đã thanh toán {{amount}} VND cho đơn đặt chỗ #{{bookingCode}} trên hệ thống NexSpace.",
        True,
    ),
    (
        5,
        "ORGANIZER_APPROVED",
        "EMAIL",
        "vi",
        "[NexSpace] Hồ sơ đối tác {{legalName}} đã được phê duyệt",
        "Chúc mừng {{representativeName}}! Hồ sơ đối tác {{legalName}} đã được Ban quản trị NexSpace phê duyệt. Bạn có thể bắt đầu đăng tải và vận hành không gian làm việc ngay hôm nay.",
        True,
    ),
    (
        6,
        "ORGANIZER_REVISION_REQUESTED",
        "EMAIL",
        "vi",
        "[NexSpace] Yêu cầu bổ sung hồ sơ đối tác {{legalName}}",
        "Xin chào {{representativeName}},\n\nBan quản trị NexSpace đề nghị bổ sung/chỉnh sửa tài liệu cho hồ sơ {{legalName}}: {{reviewFeedback}}.",
        True,
    ),
    (
        7,
        "WORKSPACE_APPROVED",
        "EMAIL",
        "vi",
        "[NexSpace] Không gian {{workspaceName}} đã được kích hoạt trên sàn",
        "Không gian làm việc {{workspaceName}} đã vượt qua kiểm duyệt chất lượng và chính thức hiển thị công khai trên NexSpace Marketplace.",
        True,
    ),
    (
        8,
        "REFUND_PROCESSED",
        "EMAIL",
        "vi",
        "[NexSpace] Hoàn tiền thành công cho đơn #{{bookingCode}}",
        "Khoản hoàn tiền {{approvedAmount}} VND cho đơn #{{bookingCode}} đã được chuyển về tài khoản thanh toán của bạn. Mã tham chiếu: {{refundReference}}.",
        True,
    ),
]


def build_master_data_sql() -> str:
    """Generates idempotent SQL statements for all master tables."""
    lines = [
        "-- ===================================================================",
        "-- NexSpace Master Data Seed (Roles, Business Types, Amenities, Config)",
        "-- ===================================================================",
    ]

    # 1. Roles
    lines.append("\n-- 1. System Roles (`roles`)")
    for role_id, name, desc in ROLES_DATA:
        lines.append(
            f"INSERT INTO `roles` (`id`, `name`, `description`, `created_at`, `updated_at`) "
            f"VALUES ({role_id}, {sql_literal(name)}, {sql_literal(desc)}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    # 2. Business Types
    lines.append("\n-- 2. Legal Business Types (`business_type`)")
    for bt_id, code, name_vi, name_en, sort_order in BUSINESS_TYPES_DATA:
        lines.append(
            f"INSERT INTO `business_type` (`id`, `code`, `name_vi`, `name_en`, `sort_order`, `created_at`, `updated_at`) "
            f"VALUES ({bt_id}, {sql_literal(code)}, {sql_literal(name_vi)}, {sql_literal(name_en)}, {sort_order}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `name_vi` = VALUES(`name_vi`), `name_en` = VALUES(`name_en`), `sort_order` = VALUES(`sort_order`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    # 3. Amenities
    lines.append("\n-- 3. Standard Coworking & Workspace Amenities (`amenity`)")
    for am_id, name, category, icon, desc, is_active in AMENITIES_DATA:
        lines.append(
            f"INSERT INTO `amenity` (`id`, `name`, `category`, `icon`, `description`, `is_active`, `created_at`, `updated_at`) "
            f"VALUES ({am_id}, {sql_literal(name)}, {sql_literal(category)}, {sql_literal(icon)}, {sql_literal(desc)}, {sql_literal(is_active)}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `category` = VALUES(`category`), `icon` = VALUES(`icon`), `description` = VALUES(`description`), `is_active` = VALUES(`is_active`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    # 4. Platform Settings
    lines.append("\n-- 4. Platform Governance Settings (`platform_setting`)")
    for key, category, value, val_type, desc in PLATFORM_SETTINGS_DATA:
        lines.append(
            f"INSERT INTO `platform_setting` (`setting_key`, `category`, `setting_value`, `value_type`, `description`, `updated_at`, `updated_by`) "
            f"VALUES ({sql_literal(key)}, {sql_literal(category)}, {sql_literal(value)}, {sql_literal(val_type)}, {sql_literal(desc)}, UTC_TIMESTAMP(6), NULL) "
            f"ON DUPLICATE KEY UPDATE `category` = VALUES(`category`), `setting_value` = VALUES(`setting_value`), `value_type` = VALUES(`value_type`), `description` = VALUES(`description`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    # 5. Notification Templates
    lines.append("\n-- 5. Notification Templates (`notification_template`)")
    for tpl_id, event_type, channel, lang, subject, body, is_active in NOTIFICATION_TEMPLATES_DATA:
        lines.append(
            f"INSERT INTO `notification_template` (`id`, `event_type`, `channel`, `language`, `subject_template`, `body_template`, `is_active`, `created_at`, `updated_at`) "
            f"VALUES ({tpl_id}, {sql_literal(event_type)}, {sql_literal(channel)}, {sql_literal(lang)}, {sql_literal(subject)}, {sql_literal(body)}, {sql_literal(is_active)}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `subject_template` = VALUES(`subject_template`), `body_template` = VALUES(`body_template`), `is_active` = VALUES(`is_active`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    return "\n".join(lines) + "\n"


def seed_master_data(executor: DatabaseExecutor | None = None) -> None:
    db = executor or DatabaseExecutor(load_db_config())
    print("-> Đang khởi tạo dữ liệu Master Catalog (roles, business_type, amenity, platform_setting, notification_template)...")
    sql = build_master_data_sql()
    db.execute_sql_script(sql)
    counts = db.get_table_counts(["roles", "business_type", "amenity", "platform_setting", "notification_template"])
    print("   [OK] Hoàn tất Master Data:")
    for tbl, cnt in counts.items():
        print(f"        - {tbl:<24}: {cnt} bản ghi")


if __name__ == "__main__":
    seed_master_data()

