-- V16: Bổ sung cấu hình booking.max_active_holds và các bí danh cho platform_setting
-- Cho phép quản trị viên thay đổi số lượng giữ chỗ tối đa và thời gian giữ chỗ trực tiếp trong database

INSERT INTO `platform_setting` (`setting_key`, `category`, `setting_value`, `value_type`, `description`, `updated_at`, `updated_by`)
VALUES 
  ('booking.max_active_holds', 'BOOKING', '3', 'INTEGER', 'Số lượng chỗ giữ tạm thời tối đa cùng lúc của một khách hàng', UTC_TIMESTAMP(6), NULL),
  ('booking_max_active_holds', 'BOOKING', '3', 'INTEGER', 'Bí danh cấu hình số lượng chỗ giữ tạm thời tối đa cùng lúc', UTC_TIMESTAMP(6), NULL),
  ('booking_hold_minutes', 'BOOKING', '10', 'INTEGER', 'Bí danh cấu hình thời gian giữ chỗ tạm thời (phút)', UTC_TIMESTAMP(6), NULL)
ON DUPLICATE KEY UPDATE `updated_at` = UTC_TIMESTAMP(6);

