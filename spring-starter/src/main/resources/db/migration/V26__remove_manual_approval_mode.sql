-- V26: Loai bo hoan toan che do MANUAL_APPROVAL, chuyen 100% khong gian sang INSTANT
-- Dam bao platform_setting co cau hinh thoi gian giu cho dong

UPDATE `workspace`
SET `booking_confirmation_mode` = 'INSTANT'
WHERE `booking_confirmation_mode` = 'MANUAL_APPROVAL';

INSERT INTO `platform_setting` (`setting_key`, `category`, `setting_value`, `value_type`, `description`, `updated_at`, `updated_by`)
VALUES 
  ('booking.hold_ttl_minutes', 'BOOKING', '15', 'INTEGER', 'Thời gian giữ chỗ tạm thời trước khi thanh toán (phút)', UTC_TIMESTAMP(6), NULL)
ON DUPLICATE KEY UPDATE `updated_at` = UTC_TIMESTAMP(6);
