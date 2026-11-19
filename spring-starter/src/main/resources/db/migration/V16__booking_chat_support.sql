-- V16: Booking Chat Support Tables
CREATE TABLE IF NOT EXISTS `booking_conversation` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` BIGINT NOT NULL,
  `customer_id` BIGINT NOT NULL,
  `organizer_id` BIGINT NOT NULL,
  `workspace_id` BIGINT NOT NULL,
  `last_message_at` DATETIME NULL,
  `last_message_preview` VARCHAR(500) NULL,
  `customer_unread_count` INT NOT NULL DEFAULT 0,
  `organizer_unread_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `uk_booking_conversation_booking` UNIQUE (`booking_id`),
  CONSTRAINT `fk_booking_conv_booking` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_booking_conv_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_booking_conv_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_booking_conv_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX `ix_booking_conv_customer` ON `booking_conversation` (`customer_id`, `last_message_at`);
CREATE INDEX `ix_booking_conv_organizer` ON `booking_conversation` (`organizer_id`, `last_message_at`);
CREATE INDEX `ix_booking_conv_workspace` ON `booking_conversation` (`workspace_id`);

CREATE TABLE IF NOT EXISTS `booking_chat_message` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` BIGINT NOT NULL,
  `sender_id` BIGINT NOT NULL,
  `message_type` VARCHAR(20) NOT NULL DEFAULT 'TEXT',
  `content` TEXT NOT NULL,
  `attachment_url` VARCHAR(500) NULL,
  `attachment_name` VARCHAR(255) NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_chat_msg_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `booking_conversation` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_msg_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX `ix_chat_msg_conv_created` ON `booking_chat_message` (`conversation_id`, `created_at`);
CREATE INDEX `ix_chat_msg_conv_id_desc` ON `booking_chat_message` (`conversation_id`, `id` DESC);
