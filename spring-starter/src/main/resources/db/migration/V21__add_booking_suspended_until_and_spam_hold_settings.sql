-- V21: Bổ sung cột booking_suspended_until cho bảng users và cấu hình spam hold cho platform_setting

ALTER TABLE `users`
  ADD COLUMN `booking_suspended_until` DATETIME NULL COMMENT 'Thời điểm hết hạn tạm khóa quyền đặt chỗ do vi phạm spam hold/hủy quá số lần quy định';

INSERT INTO `platform_setting` (`setting_key`, `category`, `setting_value`, `value_type`, `description`, `updated_at`, `updated_by`)
VALUES 
  ('booking.spam_hold_threshold', 'BOOKING', '3', 'INTEGER', 'Số lần giữ/hủy chỗ chưa thanh toán tối đa cho phép trước khi bị phạt', UTC_TIMESTAMP(6), NULL),
  ('booking_spam_hold_threshold', 'BOOKING', '3', 'INTEGER', 'Bí danh số lần giữ/hủy chỗ chưa thanh toán tối đa', UTC_TIMESTAMP(6), NULL),
  ('booking.spam_hold_block_minutes', 'BOOKING', '20', 'INTEGER', 'Thời gian phạt tạm khóa quyền đặt chỗ khi vượt ngưỡng vi phạm (phút)', UTC_TIMESTAMP(6), NULL),
  ('booking_spam_hold_block_minutes', 'BOOKING', '20', 'INTEGER', 'Bí danh thời gian phạt tạm khóa quyền đặt chỗ (phút)', UTC_TIMESTAMP(6), NULL)
ON DUPLICATE KEY UPDATE `updated_at` = UTC_TIMESTAMP(6);
