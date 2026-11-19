-- Migration V18: Add bank details to refund_request table for PayOS payouts and refunds
ALTER TABLE `refund_request`
  ADD COLUMN `bank_name` VARCHAR(100) NULL AFTER `reason`,
  ADD COLUMN `bank_bin` VARCHAR(20) NULL AFTER `bank_name`,
  ADD COLUMN `bank_account_number` VARCHAR(50) NULL AFTER `bank_bin`,
  ADD COLUMN `bank_account_name` VARCHAR(150) NULL AFTER `bank_account_number`;
