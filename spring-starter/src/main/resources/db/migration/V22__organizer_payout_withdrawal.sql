-- ==============================================================================
-- Flyway Migration V22: Organizer Payout & Withdrawal System
-- Support Manual Withdrawal, Daily Auto-Payout with Admin Approval, and Balance Segregation
-- ==============================================================================

-- 1. Bổ sung bank_bin vào bảng organizer_profile nếu chưa có
SET @bank_bin_col_count = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'organizer_profile'
      AND COLUMN_NAME = 'bank_bin'
);
SET @sql_bank_bin = IF(@bank_bin_col_count = 0, 'ALTER TABLE `organizer_profile` ADD COLUMN `bank_bin` VARCHAR(20) NULL AFTER `bank_name`', 'SELECT 1');
PREPARE stmt_bank_bin FROM @sql_bank_bin;
EXECUTE stmt_bank_bin;
DEALLOCATE PREPARE stmt_bank_bin;

-- 2. Bảng cấu hình chế độ chi trả (Payout Setting) của từng Organizer
CREATE TABLE IF NOT EXISTS `organizer_payout_setting` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `organizer_id` BIGINT NOT NULL,
  `payout_mode` VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
  `auto_payout_hour` INT NOT NULL DEFAULT 9,
  `approval_status` VARCHAR(30) NOT NULL DEFAULT 'NONE',
  `pending_auto_payout_hour` INT NULL,
  `request_note` VARCHAR(500) NULL,
  `admin_feedback` VARCHAR(500) NULL,
  `requested_at` DATETIME(6) NULL,
  `reviewed_by` BIGINT NULL,
  `reviewed_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uk_organizer_payout_setting_org` (`organizer_id`),
  CONSTRAINT `fk_organizer_payout_setting_user` FOREIGN KEY (`organizer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_organizer_payout_setting_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng các đợt rút tiền / chi trả (Organizer Withdrawal Batch)
CREATE TABLE IF NOT EXISTS `organizer_withdrawal_batch` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `batch_code` VARCHAR(50) NOT NULL UNIQUE,
  `organizer_id` BIGINT NOT NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `payout_type` VARCHAR(20) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
  `bank_name` VARCHAR(100) NOT NULL,
  `bank_bin` VARCHAR(20) NULL,
  `bank_account_number` VARCHAR(100) NOT NULL,
  `bank_account_holder` VARCHAR(100) NOT NULL,
  `payos_reference` VARCHAR(100) NULL,
  `error_reason` VARCHAR(500) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX `ix_withdrawal_batch_organizer` (`organizer_id`, `status`),
  CONSTRAINT `fk_withdrawal_batch_user` FOREIGN KEY (`organizer_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bổ sung trường withdrawal_batch_id vào organizer_payout để link các đơn chi trả theo đợt
SET @batch_col_count = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'organizer_payout'
      AND COLUMN_NAME = 'withdrawal_batch_id'
);
SET @sql_batch_col = IF(@batch_col_count = 0, 'ALTER TABLE `organizer_payout` ADD COLUMN `withdrawal_batch_id` BIGINT NULL AFTER `payout_reference`, ADD CONSTRAINT `fk_organizer_payout_batch` FOREIGN KEY (`withdrawal_batch_id`) REFERENCES `organizer_withdrawal_batch` (`id`)', 'SELECT 1');
PREPARE stmt_batch_col FROM @sql_batch_col;
EXECUTE stmt_batch_col;
DEALLOCATE PREPARE stmt_batch_col;
