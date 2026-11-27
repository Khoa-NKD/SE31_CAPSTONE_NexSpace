-- V32: Cấu hình phí hoa hồng sàn (10%), thuế VAT (8%), và phí chuyển tiếp trung gian (0đ) trong platform_setting
INSERT INTO `platform_setting` (`setting_key`, `category`, `setting_value`, `value_type`, `description`, `updated_at`, `updated_by`)
VALUES 
  ('payment.platform_commission_percent', 'PAYMENT', '10.0', 'DECIMAL', 'Tỷ lệ phí hoa hồng sàn Marketplace (%)', UTC_TIMESTAMP(6), NULL),
  ('commission_percent', 'PAYMENT', '10.0', 'DECIMAL', 'Bí danh tỷ lệ phí hoa hồng sàn (%)', UTC_TIMESTAMP(6), NULL),
  ('payment.vat_percent', 'PAYMENT', '8.0', 'DECIMAL', 'Thuế suất VAT hệ thống (%)', UTC_TIMESTAMP(6), NULL),
  ('vat_percent', 'PAYMENT', '8.0', 'DECIMAL', 'Bí danh thuế suất VAT (%)', UTC_TIMESTAMP(6), NULL),
  ('payment.service_fee_percent', 'PAYMENT', '0', 'DECIMAL', 'Phí xử lý chuyển tiếp trung gian theo tỷ lệ (%)', UTC_TIMESTAMP(6), NULL),
  ('payment.gateway_fee_percent', 'PAYMENT', '0', 'DECIMAL', 'Phí cổng chuyển tiếp trung gian theo tỷ lệ (%)', UTC_TIMESTAMP(6), NULL),
  ('payment.gateway_fee_flat', 'PAYMENT', '0', 'DECIMAL', 'Phí cố định chuyển tiếp trung gian qua cổng thanh toán (VNĐ)', UTC_TIMESTAMP(6), NULL),
  ('gateway_pass_through_fee', 'PAYMENT', '0', 'DECIMAL', 'Phí chuyển tiếp trung gian trực tiếp (0đ)', UTC_TIMESTAMP(6), NULL)
ON DUPLICATE KEY UPDATE 
  `setting_value` = VALUES(`setting_value`),
  `value_type` = VALUES(`value_type`),
  `category` = VALUES(`category`),
  `description` = VALUES(`description`),
  `updated_at` = UTC_TIMESTAMP(6);
