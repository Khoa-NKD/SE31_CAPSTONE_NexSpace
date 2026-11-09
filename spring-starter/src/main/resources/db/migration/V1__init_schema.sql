-- =============================================================================
-- NexSpace Backend — Flyway Migration V1: Initial Database Schema
-- Database: MySQL 8.x / MariaDB (utf8mb4 / utf8mb4_general_ci)
-- Total Tables: 44 domain tables across Identity, Organizer, Workspace,
--               Resource, Pricing, Booking, Payment, Review, Personalization,
--               and Governance modules.
-- =============================================================================

SET NAMES utf8mb4;
SET TIME_ZONE = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;

-- =============================================================================
-- 1. IDENTITY & AUTHENTICATION MODULE
-- =============================================================================

CREATE TABLE IF NOT EXISTS `roles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `description` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `name` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKofx66keruapi6vyqpv6f2or37` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `avatar` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gender` enum('FEMALE','MALE','OTHER') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE','LOCKED') COLLATE utf8mb4_general_ci NOT NULL,
  `user_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `is_verified` bit(1) NOT NULL,
  `role_id` bigint NOT NULL,
  `email_verified_at` datetime(6) DEFAULT NULL,
  `facebook_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `failed_login_count` int NOT NULL DEFAULT '0',
  `google_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_login_at` datetime(6) DEFAULT NULL,
  `locked_until` datetime(6) DEFAULT NULL,
  `phone_verified_at` datetime(6) DEFAULT NULL,
  `preferred_locale` varchar(5) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'vi',
  `two_factor_enabled` bit(1) NOT NULL DEFAULT b'0',
  `two_factor_secret` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK6dotkott2kjsp8vw4d0m25fb7` (`email`),
  UNIQUE KEY `UKk8d0f2n7n88w1a16yhua64onx` (`user_name`),
  UNIQUE KEY `UKjmubronqnn4q0cwe2egqsgvnl` (`facebook_id`),
  UNIQUE KEY `UKovh8xmu9ac27t18m56gri58i1` (`google_id`),
  KEY `FKp56c1712k691lhsyewcssf40f` (`role_id`),
  CONSTRAINT `FKp56c1712k691lhsyewcssf40f` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `user_session` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `device_info` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `expires_at` datetime(6) NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_activity_at` datetime(6) NOT NULL,
  `push_token` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `refresh_token_hash` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `revoked_at` datetime(6) DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK84ms56ygqly5rtdtgcfo97v2v` (`refresh_token_hash`),
  KEY `ix_user_session_user` (`user_id`,`expires_at`),
  CONSTRAINT `FKlr29o11uswdgcnn8swu3q15f8` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `user_verification` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `attempt_count` int NOT NULL,
  `code_hash` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `consumed_at` datetime(6) DEFAULT NULL,
  `destination` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `purpose` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_user_verification_lookup` (`destination`,`purpose`,`created_at`),
  KEY `FKtj9xd3vagu4sh7xk3ep9c2wx6` (`user_id`),
  CONSTRAINT `FKtj9xd3vagu4sh7xk3ep9c2wx6` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `email_verification_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `expires_at` datetime(6) NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `used` bit(1) NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKewmvysc7e9y6uy7og2c21axa9` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `expires_at` datetime(6) NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `used` bit(1) NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK71lqwbwtklmljk3qlsugr1mig` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `revoked_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `expires_at` datetime(6) NOT NULL,
  `token_hash` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK2ele31feocsuq970bht2vmy4j` (`token_hash`),
  KEY `idx_revoked_tokens_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 2. ORGANIZER ONBOARDING & KYC MODULE
-- =============================================================================

CREATE TABLE IF NOT EXISTS `business_type` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `code` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `name_en` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `name_vi` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_business_type_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `organizer_profile` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `address` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bank_account_holder` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bank_account_number` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `business_type` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_email` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_phone` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `legal_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `representative_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `review_feedback` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reviewed_at` datetime(6) DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `submitted_at` datetime(6) DEFAULT NULL,
  `tax_id` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `organizer_id` bigint NOT NULL,
  `reviewed_by` bigint DEFAULT NULL,
  `registration_reason` varchar(2000) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_suspended` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKkabqonxu5vw7d1nwy4s11l969` (`organizer_id`),
  KEY `ix_organizer_profile_tax_id` (`tax_id`),
  KEY `ix_organizer_profile_queue` (`status`,`submitted_at`),
  KEY `FKa2uxebdfgs306l1jcx5prubpa` (`reviewed_by`),
  CONSTRAINT `FKa2uxebdfgs306l1jcx5prubpa` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `FKp7akvmpujjvuu37srua3fa3xe` FOREIGN KEY (`organizer_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `organizer_document` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `uploaded_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `admin_feedback` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_current` bit(1) NOT NULL,
  `document_type` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_general_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `organizer_profile_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_organizer_document_profile` (`organizer_profile_id`,`is_current`),
  CONSTRAINT `FK29yfw76f9gafmm1a47teciyq9` FOREIGN KEY (`organizer_profile_id`) REFERENCES `organizer_profile` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 3. WORKSPACE & CATALOG MODULE
-- =============================================================================

CREATE TABLE IF NOT EXISTS `amenity` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `is_active` bit(1) NOT NULL,
  `category` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `icon` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKtojea3b0gq1a796dt56ml4xdr` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `workspace` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `address` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `area_sqm` decimal(10,2) DEFAULT NULL,
  `booking_confirmation_mode` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `district` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `entry_instructions` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `featured_order` int DEFAULT NULL,
  `featured_until` datetime(6) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `review_feedback` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reviewed_at` datetime(6) DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `submitted_at` datetime(6) DEFAULT NULL,
  `support_phone` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `organizer_id` bigint NOT NULL,
  `reviewed_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_workspace_organizer` (`organizer_id`,`created_at`),
  KEY `ix_workspace_discovery` (`city`,`district`),
  KEY `ix_workspace_review_queue` (`status`,`submitted_at`),
  KEY `FKldqancguxcqsrrtg2sht4171u` (`reviewed_by`),
  CONSTRAINT `FKher0o4wpu4bm39cba6m2xw4yy` FOREIGN KEY (`organizer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKldqancguxcqsrrtg2sht4171u` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `workspace_operating_hour` (
  `day_of_week` tinyint NOT NULL,
  `close_time` time(6) DEFAULT NULL,
  `is_closed` bit(1) NOT NULL,
  `open_time` time(6) DEFAULT NULL,
  `workspace_id` bigint NOT NULL,
  PRIMARY KEY (`day_of_week`,`workspace_id`),
  KEY `FKsauokitmiek1pp0ag6lwusn36` (`workspace_id`),
  CONSTRAINT `FKsauokitmiek1pp0ag6lwusn36` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_woh_valid` CHECK (((`is_closed` = 1) or (`close_time` > `open_time`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `workspace_cancellation_rule` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `min_hours_before_start` int NOT NULL,
  `refund_percent` decimal(5,2) NOT NULL,
  `workspace_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_wcr_workspace_hours` (`workspace_id`,`min_hours_before_start`),
  CONSTRAINT `FK6qe436jd2e1y5qanujp9ag4hs` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_wcr_percent` CHECK ((`refund_percent` between 0 and 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 4. BUILDING, FLOOR PLAN & BOOKABLE RESOURCE MODULE
-- =============================================================================

CREATE TABLE IF NOT EXISTS `building` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `organizer_id` bigint NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `address` varchar(500) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_building_owner_name` (`organizer_id`,`name`),
  CONSTRAINT `fk_building_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `building_floor` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `building_id` bigint NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `floor_number` int NOT NULL,
  `canvas_width` decimal(10,2) NOT NULL,
  `canvas_height` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_building_floor_number` (`building_id`,`floor_number`),
  CONSTRAINT `fk_building_floor_building` FOREIGN KEY (`building_id`) REFERENCES `building` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `ck_building_floor_dimensions` CHECK (((`canvas_width` between 1 and 100000) and (`canvas_height` between 1 and 100000))),
  CONSTRAINT `ck_building_floor_number` CHECK ((`floor_number` between -(20) and 500))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `floor_plan` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `background_url` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `draft_layout_json` longtext COLLATE utf8mb4_general_ci,
  `floor_number` int NOT NULL,
  `layout_json` longtext COLLATE utf8mb4_general_ci,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `published_at` datetime(6) DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `version` int NOT NULL,
  `workspace_id` bigint NOT NULL,
  `building_floor_id` bigint DEFAULT NULL,
  `usage_x` decimal(10,2) DEFAULT NULL,
  `usage_y` decimal(10,2) DEFAULT NULL,
  `usage_width` decimal(10,2) DEFAULT NULL,
  `usage_height` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_floor_plan_workspace_floor` (`workspace_id`,`floor_number`),
  UNIQUE KEY `ux_floor_plan_workspace_physical` (`workspace_id`,`building_floor_id`),
  KEY `ix_floor_plan_physical` (`building_floor_id`),
  CONSTRAINT `fk_floor_plan_physical_floor` FOREIGN KEY (`building_floor_id`) REFERENCES `building_floor` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FKq63dxarsi0eqhcs4d4q9b4qkp` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`),
  CONSTRAINT `ck_floor_plan_allocation` CHECK ((((`building_floor_id` is null) and (`usage_x` is null) and (`usage_y` is null) and (`usage_width` is null) and (`usage_height` is null)) or ((`building_floor_id` is not null) and (`usage_x` is not null) and (`usage_y` is not null) and (`usage_width` is not null) and (`usage_height` is not null) and (`usage_x` >= 0) and (`usage_y` >= 0) and (`usage_width` > 0) and (`usage_height` > 0))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `resource_type` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `is_active` bit(1) NOT NULL,
  `capacity` int NOT NULL,
  `category` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `price_per_day` decimal(18,2) DEFAULT NULL,
  `price_per_hour` decimal(18,2) DEFAULT NULL,
  `price_per_month` decimal(18,2) DEFAULT NULL,
  `workspace_id` bigint NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_resource_type_workspace_name` (`workspace_id`,`name`),
  CONSTRAINT `FKcxqie74c359x1iavw55pkeqod` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`),
  CONSTRAINT `ck_resource_type_has_price` CHECK (((`price_per_hour` is not null) or (`price_per_day` is not null) or (`price_per_month` is not null)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `bookable_resource` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `capacity_override` int DEFAULT NULL,
  `description` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `height` decimal(8,2) DEFAULT NULL,
  `label` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `noise_level` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `pos_x` decimal(10,2) DEFAULT NULL,
  `pos_y` decimal(10,2) DEFAULT NULL,
  `price_per_hour` decimal(18,2) DEFAULT NULL,
  `rotation` decimal(6,2) NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `width` decimal(8,2) DEFAULT NULL,
  `zone_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `floor_plan_id` bigint NOT NULL,
  `resource_type_id` bigint NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `parent_room_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_bookable_resource_floor_label` (`floor_plan_id`,`label`),
  KEY `FKj8mkwq61jbafllkfr6ikdmyxk` (`resource_type_id`),
  KEY `FK_bookable_resource_parent_room` (`parent_room_id`),
  CONSTRAINT `FK_bookable_resource_parent_room` FOREIGN KEY (`parent_room_id`) REFERENCES `bookable_resource` (`id`),
  CONSTRAINT `FKhyq425j40kekx9tbvgu46cj5u` FOREIGN KEY (`floor_plan_id`) REFERENCES `floor_plan` (`id`),
  CONSTRAINT `FKj8mkwq61jbafllkfr6ikdmyxk` FOREIGN KEY (`resource_type_id`) REFERENCES `resource_type` (`id`),
  CONSTRAINT `ck_bookable_resource_price` CHECK (((`price_per_hour` is null) or (`price_per_hour` > 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `resource_blocked_slot` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `end_time` datetime(6) NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `start_time` datetime(6) NOT NULL,
  `created_by` bigint NOT NULL,
  `resource_id` bigint NOT NULL,
  `block_type` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'BLOCKED',
  PRIMARY KEY (`id`),
  KEY `ix_rbs_resource_time` (`resource_id`,`start_time`),
  KEY `FKjjwv4nx1yqgxrs7wb1s4r9juu` (`created_by`),
  CONSTRAINT `FK7sb85s7bcfavlb2he1sp5qmqb` FOREIGN KEY (`resource_id`) REFERENCES `bookable_resource` (`id`),
  CONSTRAINT `FKjjwv4nx1yqgxrs7wb1s4r9juu` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `ck_rbs_time` CHECK ((`end_time` > `start_time`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `is_cover` bit(1) NOT NULL,
  `display_order` int NOT NULL,
  `media_type` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `url` varchar(500) COLLATE utf8mb4_general_ci NOT NULL,
  `resource_id` bigint DEFAULT NULL,
  `workspace_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_media_owner` (`workspace_id`,`resource_id`,`display_order`),
  KEY `FKkvg4oeke317edu8w7rdhay2oc` (`resource_id`),
  CONSTRAINT `FKkvg4oeke317edu8w7rdhay2oc` FOREIGN KEY (`resource_id`) REFERENCES `bookable_resource` (`id`),
  CONSTRAINT `FKsdvbq12lwr6m562eax7dqcta7` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `workspace_amenity` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `addon_price_per_hour` decimal(18,2) DEFAULT NULL,
  `amenity_id` bigint NOT NULL,
  `resource_id` bigint DEFAULT NULL,
  `workspace_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_workspace_amenity` (`workspace_id`,`resource_id`,`amenity_id`),
  KEY `FKnjpv4b0c442ikmk1h02ft8svo` (`amenity_id`),
  KEY `FK8usx2lvvdnok001uisk2ui6nt` (`resource_id`),
  CONSTRAINT `FK8usx2lvvdnok001uisk2ui6nt` FOREIGN KEY (`resource_id`) REFERENCES `bookable_resource` (`id`),
  CONSTRAINT `FKk8b7qxpb5txvxnd03hff0pett` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FKnjpv4b0c442ikmk1h02ft8svo` FOREIGN KEY (`amenity_id`) REFERENCES `amenity` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `workspace_asset` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `asset_code` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `next_maintenance_date` date DEFAULT NULL,
  `note` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `purchase_price` decimal(18,2) DEFAULT NULL,
  `quantity` int NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `warranty_until` date DEFAULT NULL,
  `amenity_id` bigint DEFAULT NULL,
  `resource_id` bigint DEFAULT NULL,
  `workspace_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_workspace_asset_code` (`workspace_id`,`asset_code`),
  KEY `ix_workspace_asset_status` (`workspace_id`,`status`),
  KEY `ix_workspace_asset_maintenance_due` (`status`,`next_maintenance_date`),
  KEY `FKg0xoi4r5bftdeocr7eeat5x86` (`amenity_id`),
  KEY `FKjgl4i40bxv21kuqq77svlebiu` (`resource_id`),
  CONSTRAINT `FKg0xoi4r5bftdeocr7eeat5x86` FOREIGN KEY (`amenity_id`) REFERENCES `amenity` (`id`),
  CONSTRAINT `FKjgl4i40bxv21kuqq77svlebiu` FOREIGN KEY (`resource_id`) REFERENCES `bookable_resource` (`id`),
  CONSTRAINT `FKr96yyfpv4fnhtysxpql2nqwlx` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_workspace_asset_quantity` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 5. PRICING, DISCOUNT & MEMBERSHIP MODULE
-- =============================================================================

CREATE TABLE IF NOT EXISTS `pricing_rule` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `is_active` bit(1) NOT NULL,
  `end_date` date DEFAULT NULL,
  `end_time` time(6) DEFAULT NULL,
  `fixed_amount` decimal(18,2) NOT NULL,
  `modifier_type` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `multiplier` decimal(5,2) NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `priority` int NOT NULL,
  `start_date` date DEFAULT NULL,
  `start_time` time(6) DEFAULT NULL,
  `resource_id` bigint DEFAULT NULL,
  `resource_type_id` bigint DEFAULT NULL,
  `workspace_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_pricing_rule_workspace` (`workspace_id`,`is_active`),
  KEY `FKlisg85wjrra6cc1hh9etcla3y` (`resource_id`),
  KEY `FKhhew8gy9fdbyr3apc9bpqekqr` (`resource_type_id`),
  CONSTRAINT `FK41u97c1kgfplhj313921qdweu` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`),
  CONSTRAINT `FKhhew8gy9fdbyr3apc9bpqekqr` FOREIGN KEY (`resource_type_id`) REFERENCES `resource_type` (`id`),
  CONSTRAINT `FKlisg85wjrra6cc1hh9etcla3y` FOREIGN KEY (`resource_id`) REFERENCES `bookable_resource` (`id`),
  CONSTRAINT `ck_pricing_rule_multiplier` CHECK ((`multiplier` > 0)),
  CONSTRAINT `ck_pricing_rule_scope` CHECK (((`resource_type_id` is null) or (`resource_id` is null)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `discount_rule` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `code` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `discount_type` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `discount_value` decimal(18,2) NOT NULL,
  `end_at` datetime(6) NOT NULL,
  `max_discount_amount` decimal(18,2) DEFAULT NULL,
  `min_booking_amount` decimal(18,2) DEFAULT NULL,
  `min_duration_minutes` int DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `is_public` bit(1) NOT NULL,
  `start_at` datetime(6) NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `usage_limit_per_customer` int DEFAULT NULL,
  `usage_limit_total` int DEFAULT NULL,
  `created_by` bigint NOT NULL,
  `resource_type_id` bigint DEFAULT NULL,
  `workspace_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKgncc1xe1jhdw8h9n7sd2gcoka` (`code`),
  KEY `ix_discount_rule_active` (`workspace_id`,`status`,`start_at`,`end_at`),
  KEY `FK7ih5th148a2pk3601unkd1yfm` (`created_by`),
  KEY `FKs86ei6o08dn7dgmvdep7q8rhq` (`resource_type_id`),
  CONSTRAINT `FK7ih5th148a2pk3601unkd1yfm` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `FK7xqyly7tsm51vy5o7fgoga51u` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`),
  CONSTRAINT `FKs86ei6o08dn7dgmvdep7q8rhq` FOREIGN KEY (`resource_type_id`) REFERENCES `resource_type` (`id`),
  CONSTRAINT `ck_discount_rule_period` CHECK ((`end_at` > `start_at`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `membership_plan` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `is_active` bit(1) NOT NULL,
  `applicable_category` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `benefits_desc` text COLLATE utf8mb4_general_ci,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `price` decimal(18,2) NOT NULL,
  `quota_amount` decimal(10,2) NOT NULL,
  `quota_unit` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `validity_days` int NOT NULL,
  `organizer_id` bigint NOT NULL,
  `workspace_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_membership_plan_organizer` (`organizer_id`,`is_active`),
  KEY `FK9uvi9fnj76dmkn5jw8k3g3t9w` (`workspace_id`),
  CONSTRAINT `FK9uvi9fnj76dmkn5jw8k3g3t9w` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`),
  CONSTRAINT `FKdg0x1ao7d9qw3fjwk48t72x3a` FOREIGN KEY (`organizer_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `membership_subscription` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `end_date` datetime(6) DEFAULT NULL,
  `plan_snapshot` text COLLATE utf8mb4_general_ci NOT NULL,
  `price_paid` decimal(18,2) NOT NULL,
  `quota_total` decimal(10,2) NOT NULL,
  `quota_used` decimal(10,2) NOT NULL,
  `start_date` datetime(6) DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `customer_id` bigint NOT NULL,
  `plan_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_membership_subscription_customer` (`customer_id`,`status`),
  KEY `FKcy5jv2omnjgjw7d94usm12oev` (`plan_id`),
  CONSTRAINT `FKcx8hrhfqwhgup5y81gjloatul` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKcy5jv2omnjgjw7d94usm12oev` FOREIGN KEY (`plan_id`) REFERENCES `membership_plan` (`id`),
  CONSTRAINT `ck_membership_subscription_quota` CHECK (((`quota_used` >= 0) and (`quota_used` <= `quota_total`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 6. BOOKING, PAYMENT, PAYOUT & REFUND MODULE
-- =============================================================================

CREATE TABLE IF NOT EXISTS `booking` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `addon_amount` decimal(18,2) NOT NULL,
  `base_amount` decimal(18,2) NOT NULL,
  `booking_code` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `cancel_reason` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cancel_source` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cancellation_policy_snapshot` text COLLATE utf8mb4_general_ci,
  `cancelled_at` datetime(6) DEFAULT NULL,
  `checked_in_at` datetime(6) DEFAULT NULL,
  `checked_out_at` datetime(6) DEFAULT NULL,
  `discount_amount` decimal(18,2) NOT NULL,
  `end_time` datetime(6) NOT NULL,
  `final_price` decimal(18,2) NOT NULL,
  `hold_expires_at` datetime(6) DEFAULT NULL,
  `party_size` int NOT NULL,
  `platform_fee_amount` decimal(18,2) NOT NULL,
  `price_type` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `pricing_snapshot` text COLLATE utf8mb4_general_ci,
  `qr_token_hash` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `quota_used_amount` decimal(10,2) NOT NULL,
  `service_fee_amount` decimal(18,2) NOT NULL,
  `source` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `start_time` datetime(6) NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `surcharge_amount` decimal(18,2) NOT NULL,
  `tax_amount` decimal(18,2) NOT NULL,
  `checked_in_by` bigint DEFAULT NULL,
  `customer_id` bigint NOT NULL,
  `discount_rule_id` bigint DEFAULT NULL,
  `rescheduled_from_id` bigint DEFAULT NULL,
  `resource_id` bigint NOT NULL,
  `subscription_id` bigint DEFAULT NULL,
  `workspace_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKgrbhxwawj7ixsr2jeto2vrx34` (`booking_code`),
  UNIQUE KEY `UK3613uu66t2ch9lpcch7ssuvsv` (`qr_token_hash`),
  KEY `ix_booking_resource_time` (`resource_id`,`start_time`),
  KEY `ix_booking_customer` (`customer_id`,`start_time`),
  KEY `ix_booking_workspace` (`workspace_id`,`status`,`start_time`),
  KEY `ix_booking_hold_expiry` (`status`,`hold_expires_at`),
  KEY `FKcub3xo1afocpofs67dcijvgdo` (`checked_in_by`),
  KEY `FK7y4lcfe4svw4rp3w3w7htg10a` (`discount_rule_id`),
  KEY `FK164ykugevoucn42qkjsdforjq` (`rescheduled_from_id`),
  KEY `FKv8id73mr9mlcvb102gb0eobn` (`subscription_id`),
  CONSTRAINT `FK164ykugevoucn42qkjsdforjq` FOREIGN KEY (`rescheduled_from_id`) REFERENCES `booking` (`id`),
  CONSTRAINT `FK4o5k48orbwi2bkfe5141v3pu8` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`),
  CONSTRAINT `FK7y4lcfe4svw4rp3w3w7htg10a` FOREIGN KEY (`discount_rule_id`) REFERENCES `discount_rule` (`id`),
  CONSTRAINT `FKcub3xo1afocpofs67dcijvgdo` FOREIGN KEY (`checked_in_by`) REFERENCES `users` (`id`),
  CONSTRAINT `FKi6acxjdewt9mpp5ki4j9qucom` FOREIGN KEY (`resource_id`) REFERENCES `bookable_resource` (`id`),
  CONSTRAINT `FKkp65eh2qfgadj8yqc8r0xb04w` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKv8id73mr9mlcvb102gb0eobn` FOREIGN KEY (`subscription_id`) REFERENCES `membership_subscription` (`id`),
  CONSTRAINT `ck_booking_time` CHECK ((`end_time` > `start_time`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `payment_transaction` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL,
  `checkout_url` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `expires_at` datetime(6) DEFAULT NULL,
  `failure_reason` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gateway_transaction_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `order_code` bigint NOT NULL,
  `paid_at` datetime(6) DEFAULT NULL,
  `received_amount` decimal(18,2) DEFAULT NULL,
  `reconciliation_note` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reconciliation_status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `webhook_payload` longtext COLLATE utf8mb4_general_ci,
  `booking_id` bigint DEFAULT NULL,
  `subscription_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKhe37crtf79t684837mgytgsno` (`order_code`),
  KEY `ix_payment_reconciliation` (`reconciliation_status`,`created_at`),
  KEY `FK70e4huqemy2g36mn9np7i5uxy` (`booking_id`),
  KEY `FKcxrjkhwonbt9rwn0n64nhbxvj` (`subscription_id`),
  CONSTRAINT `FK70e4huqemy2g36mn9np7i5uxy` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`),
  CONSTRAINT `FKcxrjkhwonbt9rwn0n64nhbxvj` FOREIGN KEY (`subscription_id`) REFERENCES `membership_subscription` (`id`),
  CONSTRAINT `ck_payment_one_owner` CHECK ((((`booking_id` is not null) and (`subscription_id` is null)) or ((`booking_id` is null) and (`subscription_id` is not null))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 7. GOVERNANCE, SUPPORT CASE & AUDIT MODULE
-- =============================================================================

CREATE TABLE IF NOT EXISTS `support_case` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `case_code` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `case_type` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `detection_context` text COLLATE utf8mb4_general_ci,
  `priority` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `reason` text COLLATE utf8mb4_general_ci NOT NULL,
  `resolution_action` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `resolution_amount` decimal(18,2) DEFAULT NULL,
  `resolution_note` text COLLATE utf8mb4_general_ci,
  `resolved_at` datetime(6) DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `target_entity` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `target_id` bigint NOT NULL,
  `assigned_to` bigint DEFAULT NULL,
  `booking_id` bigint DEFAULT NULL,
  `reporter_id` bigint DEFAULT NULL,
  `resolved_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK3rt1qhi9rpai2gmmipy8g787i` (`case_code`),
  KEY `ix_support_case_target` (`target_entity`,`target_id`),
  KEY `ix_support_case_queue` (`status`,`priority`,`created_at`),
  KEY `FKnn5ru0sp6nfdowhf3f9ur8qvh` (`assigned_to`),
  KEY `FKh7ca1hsjo0u8ps73u0e47igxn` (`booking_id`),
  KEY `FKoc0ehse6tm7watagekghrewk7` (`reporter_id`),
  KEY `FKjq714sk01my1ik0749x5t86md` (`resolved_by`),
  CONSTRAINT `FKh7ca1hsjo0u8ps73u0e47igxn` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`),
  CONSTRAINT `FKjq714sk01my1ik0749x5t86md` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `FKnn5ru0sp6nfdowhf3f9ur8qvh` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`),
  CONSTRAINT `FKoc0ehse6tm7watagekghrewk7` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`),
  CONSTRAINT `ck_support_case_reporter` CHECK (((`reporter_id` is not null) or (`case_type` = 'SYSTEM_ALERT')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `support_case_message` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `attachment_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `attachment_url` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `body` text COLLATE utf8mb4_general_ci,
  `is_internal` bit(1) NOT NULL,
  `sender_id` bigint DEFAULT NULL,
  `support_case_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_support_case_message_case` (`support_case_id`,`created_at`),
  KEY `FKdbfyecf6ggdc9i86794t6j53a` (`sender_id`),
  CONSTRAINT `FK7opj8gvxglkfxpkfox9dcnifa` FOREIGN KEY (`support_case_id`) REFERENCES `support_case` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FKdbfyecf6ggdc9i86794t6j53a` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`),
  CONSTRAINT `ck_scm_has_content` CHECK (((`body` is not null) or (`attachment_url` is not null)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `asset_maintenance_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `completed_at` datetime(6) DEFAULT NULL,
  `cost` decimal(18,2) DEFAULT NULL,
  `description` varchar(1000) COLLATE utf8mb4_general_ci NOT NULL,
  `maintenance_type` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `performed_by` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `result_note` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `scheduled_at` datetime(6) DEFAULT NULL,
  `started_at` datetime(6) DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `asset_id` bigint NOT NULL,
  `blocked_slot_id` bigint DEFAULT NULL,
  `reported_by` bigint DEFAULT NULL,
  `support_case_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_asset_maintenance_log_asset` (`asset_id`,`created_at`),
  KEY `ix_asset_maintenance_log_status` (`status`,`scheduled_at`),
  KEY `FKl6lik7kxcrn5qqi5q7dsipqav` (`blocked_slot_id`),
  KEY `FKjdqsne9nittbers6kuqu202u7` (`reported_by`),
  KEY `FKl0lbi8n222fipkuyxbdeu9hio` (`support_case_id`),
  CONSTRAINT `FK1n6w3v1aamx6dv9pqnsbrmrsg` FOREIGN KEY (`asset_id`) REFERENCES `workspace_asset` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FKjdqsne9nittbers6kuqu202u7` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`),
  CONSTRAINT `FKl0lbi8n222fipkuyxbdeu9hio` FOREIGN KEY (`support_case_id`) REFERENCES `support_case` (`id`),
  CONSTRAINT `FKl6lik7kxcrn5qqi5q7dsipqav` FOREIGN KEY (`blocked_slot_id`) REFERENCES `resource_blocked_slot` (`id`),
  CONSTRAINT `ck_aml_period` CHECK (((`completed_at` is null) or (`started_at` is null) or (`completed_at` >= `started_at`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `organizer_payout` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `eligible_at` datetime(6) NOT NULL,
  `gross_amount` decimal(18,2) NOT NULL,
  `paid_at` datetime(6) DEFAULT NULL,
  `payout_amount` decimal(18,2) NOT NULL,
  `payout_reference` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `platform_fee_amount` decimal(18,2) NOT NULL,
  `refund_deduction_amount` decimal(18,2) NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `booking_id` bigint NOT NULL,
  `organizer_id` bigint NOT NULL,
  `support_case_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKo0nv0a92t7b8d5vshyop0w302` (`booking_id`),
  KEY `ix_organizer_payout_organizer` (`organizer_id`,`status`),
  KEY `ix_organizer_payout_eligible` (`status`,`eligible_at`),
  KEY `FK4gxe9v9ii5o48x2dsb6759kd4` (`support_case_id`),
  CONSTRAINT `FK4gxe9v9ii5o48x2dsb6759kd4` FOREIGN KEY (`support_case_id`) REFERENCES `support_case` (`id`),
  CONSTRAINT `FKh6px00em0459ttbnymribl4qp` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`),
  CONSTRAINT `FKie1f3ygmlq6dmb2xwqke6di4d` FOREIGN KEY (`organizer_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `refund_request` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `admin_note` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `approved_amount` decimal(18,2) DEFAULT NULL,
  `processed_at` datetime(6) DEFAULT NULL,
  `reason` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `refund_reference` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `requested_amount` decimal(18,2) NOT NULL,
  `reviewed_at` datetime(6) DEFAULT NULL,
  `source` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `booking_id` bigint NOT NULL,
  `payment_transaction_id` bigint NOT NULL,
  `requested_by` bigint DEFAULT NULL,
  `reviewed_by` bigint DEFAULT NULL,
  `support_case_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_refund_queue` (`status`,`created_at`),
  KEY `FK5hw4vkg6p8o7y8jjsp6xr3jvy` (`booking_id`),
  KEY `FK8o2o2b4cswnddshg0yvj1xe4a` (`payment_transaction_id`),
  KEY `FKnh6c1uuv3eg06b64sfgy1bulv` (`requested_by`),
  KEY `FKedin39fpy2vohslo7slp5njcd` (`reviewed_by`),
  KEY `FKhqo4l63knyj8e5ab2ec98ubg2` (`support_case_id`),
  CONSTRAINT `FK5hw4vkg6p8o7y8jjsp6xr3jvy` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`),
  CONSTRAINT `FK8o2o2b4cswnddshg0yvj1xe4a` FOREIGN KEY (`payment_transaction_id`) REFERENCES `payment_transaction` (`id`),
  CONSTRAINT `FKedin39fpy2vohslo7slp5njcd` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `FKhqo4l63knyj8e5ab2ec98ubg2` FOREIGN KEY (`support_case_id`) REFERENCES `support_case` (`id`),
  CONSTRAINT `FKnh6c1uuv3eg06b64sfgy1bulv` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `platform_setting` (
  `setting_key` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `setting_value` text COLLATE utf8mb4_general_ci NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `value_type` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`setting_key`),
  KEY `FKqb97nwhx8r8viqhjsvfdp8812` (`updated_by`),
  CONSTRAINT `FKqb97nwhx8r8viqhjsvfdp8812` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `actor_type` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `entity_id` bigint DEFAULT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `module` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `new_value` longtext COLLATE utf8mb4_general_ci,
  `old_value` longtext COLLATE utf8mb4_general_ci,
  `reason` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_audit_log_entity` (`entity_type`,`entity_id`,`created_at`),
  KEY `ix_audit_log_user` (`user_id`,`created_at`),
  CONSTRAINT `FKk4alalwu62gj4tfbgfefll3tu` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 8. REVIEW, NOTIFICATION & PERSONALIZATION MODULE
-- =============================================================================

CREATE TABLE IF NOT EXISTS `customer_review` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `content` text COLLATE utf8mb4_general_ci,
  `dimension_ratings` text COLLATE utf8mb4_general_ci,
  `moderation_reason` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `organizer_reply` text COLLATE utf8mb4_general_ci,
  `photo_urls` text COLLATE utf8mb4_general_ci,
  `rating` tinyint NOT NULL,
  `replied_at` datetime(6) DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `booking_id` bigint NOT NULL,
  `workspace_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK4nov7c3ei04n3hrxcuqpvkdyk` (`booking_id`),
  KEY `ix_customer_review_public` (`workspace_id`,`status`,`created_at`),
  CONSTRAINT `FK5hr9j925iktlpely8nr96bgiv` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`),
  CONSTRAINT `FKdidxuxcdgkas6j7glor0hh280` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`),
  CONSTRAINT `ck_customer_review_rating` CHECK ((`rating` between 1 and 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `review_reaction` (
  `created_at` datetime(6) DEFAULT NULL,
  `customer_id` bigint NOT NULL,
  `review_id` bigint NOT NULL,
  PRIMARY KEY (`customer_id`,`review_id`),
  KEY `FKiabqk2nbxhae1pq3635o0owqt` (`review_id`),
  CONSTRAINT `FKhaoq76rl7uufsssx0uu2u3y6` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKiabqk2nbxhae1pq3635o0owqt` FOREIGN KEY (`review_id`) REFERENCES `customer_review` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `notification_template` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `is_active` bit(1) NOT NULL,
  `body_template` text COLLATE utf8mb4_general_ci NOT NULL,
  `channel` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `event_type` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `language` varchar(5) COLLATE utf8mb4_general_ci NOT NULL,
  `subject_template` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_notification_template` (`event_type`,`channel`,`language`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `user_notification` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `content` text COLLATE utf8mb4_general_ci NOT NULL,
  `email_status` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `push_status` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_read` bit(1) NOT NULL,
  `related_entity_id` bigint DEFAULT NULL,
  `related_entity_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `retry_count` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `type` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_user_notification_inbox` (`user_id`,`is_read`,`created_at`),
  KEY `ix_user_notification_outbox` (`email_status`,`push_status`),
  CONSTRAINT `FKc2d7aih8weit50jlu4q57cvs` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `customer_preference` (
  `customer_id` bigint NOT NULL,
  `amenity_ids_json` text COLLATE utf8mb4_general_ci,
  `budget_max` decimal(18,2) DEFAULT NULL,
  `budget_min` decimal(18,2) DEFAULT NULL,
  `districts_json` text COLLATE utf8mb4_general_ci,
  `noise_level` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `purpose` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `resource_category` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`customer_id`),
  CONSTRAINT `FKjsedeieskkt8ahuoqv2q0x8t3` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `favorite_workspace` (
  `created_at` datetime(6) DEFAULT NULL,
  `group_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customer_id` bigint NOT NULL,
  `workspace_id` bigint NOT NULL,
  PRIMARY KEY (`customer_id`,`workspace_id`),
  KEY `FK7ekysfc284lo8nigxpedfoa6h` (`workspace_id`),
  CONSTRAINT `FK2mxiheusom7bcscpt13nabgp5` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK7ekysfc284lo8nigxpedfoa6h` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `saved_search_filter` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `criteria_json` text COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `customer_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_saved_search_filter_name` (`customer_id`,`name`),
  CONSTRAINT `FKksjky86uk4wx0iquy87rl083f` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `recommendation_event` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `occurred_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `event_type` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `rank_position` int DEFAULT NULL,
  `request_key` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `booking_id` bigint DEFAULT NULL,
  `customer_id` bigint DEFAULT NULL,
  `workspace_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_recommendation_event_metrics` (`event_type`,`occurred_at`),
  KEY `ix_recommendation_event_request` (`request_key`),
  KEY `FKeg29rjxwf1s8eh4nofqe9fa6t` (`booking_id`),
  KEY `FKo1skq74q65x6sjmx50gni5dkk` (`customer_id`),
  KEY `FKtl1r4qtmntthgy7piq8i5ggg7` (`workspace_id`),
  CONSTRAINT `FKeg29rjxwf1s8eh4nofqe9fa6t` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`),
  CONSTRAINT `FKo1skq74q65x6sjmx50gni5dkk` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKtl1r4qtmntthgy7piq8i5ggg7` FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 9. BASELINE SYSTEM MASTER CATALOG (IDEMPOTENT)
-- =============================================================================

INSERT IGNORE INTO `roles` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
  (1, 'ADMIN', 'ADMIN role — Quản trị viên hệ thống NexSpace', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
  (2, 'USER', 'USER role — Khách hàng cá nhân & doanh nghiệp thuê không gian', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
  (3, 'ORGANIZER', 'ORGANIZER role — Đối tác vận hành không gian làm việc (Workspace Host)', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6));

INSERT IGNORE INTO `business_type` (`code`, `name_vi`, `name_en`, `sort_order`, `created_at`, `updated_at`) VALUES
  ('JOINT_STOCK', 'Công ty cổ phần', 'Joint stock company', 10, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
  ('LIMITED_LIABILITY', 'Công ty trách nhiệm hữu hạn', 'Limited liability company', 20, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
  ('SOLE_PROPRIETOR', 'Doanh nghiệp tư nhân', 'Sole proprietor', 30, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
  ('HOUSEHOLD_BUSINESS', 'Hộ kinh doanh', 'Household business', 40, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
  ('OTHER', 'Loại hình khác', 'Other business', 50, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6));

SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;

