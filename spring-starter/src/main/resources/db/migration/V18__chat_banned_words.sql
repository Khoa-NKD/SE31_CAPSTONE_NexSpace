-- V17: Chat Banned Words Table & Initial Dictionary
DROP TABLE IF EXISTS `chat_banned_word`;

CREATE TABLE `chat_banned_word` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `word` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'PROFANITY',
  `replacement` VARCHAR(50) NOT NULL DEFAULT '***',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `uk_chat_banned_word` UNIQUE (`word`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX `ix_chat_banned_word_active` ON `chat_banned_word` (`is_active`);

INSERT INTO `chat_banned_word` (`word`, `category`, `replacement`, `is_active`) VALUES
('địt', 'PROFANITY', '***', TRUE),
('đụ', 'PROFANITY', '***', TRUE),
('đù', 'PROFANITY', '***', TRUE),
('đm', 'PROFANITY', '***', TRUE),
('đcm', 'PROFANITY', '***', TRUE),
('dcm', 'PROFANITY', '***', TRUE),
('dkm', 'PROFANITY', '***', TRUE),
('đkm', 'PROFANITY', '***', TRUE),
('đậu má', 'PROFANITY', '***', TRUE),
('địt mẹ', 'PROFANITY', '***', TRUE),
('đụ má', 'PROFANITY', '***', TRUE),
('vcl', 'PROFANITY', '***', TRUE),
('vkl', 'PROFANITY', '***', TRUE),
('vloz', 'PROFANITY', '***', TRUE),
('lồn', 'PROFANITY', '***', TRUE),
('cặc', 'PROFANITY', '***', TRUE),
('con cặc', 'PROFANITY', '***', TRUE),
('buồi', 'PROFANITY', '***', TRUE),
('dái', 'PROFANITY', '***', TRUE),
('đĩ', 'PROFANITY', '***', TRUE),
('con đĩ', 'PROFANITY', '***', TRUE),
('phò', 'PROFANITY', '***', TRUE),
('chó đẻ', 'PROFANITY', '***', TRUE),
('thằng chó', 'PROFANITY', '***', TRUE),
('đồ chó', 'PROFANITY', '***', TRUE),
('mẹ kiếp', 'PROFANITY', '***', TRUE),
('chết tiệt', 'PROFANITY', '***', TRUE),
('ngu vcl', 'PROFANITY', '***', TRUE),
('cút mẹ', 'PROFANITY', '***', TRUE),
('clgt', 'PROFANITY', '***', TRUE),
('cc', 'PROFANITY', '***', TRUE),
('fuck', 'PROFANITY', '***', TRUE),
('fucking', 'PROFANITY', '***', TRUE),
('shit', 'PROFANITY', '***', TRUE),
('bitch', 'PROFANITY', '***', TRUE),
('asshole', 'PROFANITY', '***', TRUE),
('bastard', 'PROFANITY', '***', TRUE),
('dick', 'PROFANITY', '***', TRUE),
('pussy', 'PROFANITY', '***', TRUE);
