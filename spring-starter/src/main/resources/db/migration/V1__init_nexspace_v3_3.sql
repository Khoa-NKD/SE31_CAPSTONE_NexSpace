-- Flyway V1: NexSpace v3.3 initial schema (MySQL 8.4 LTS).
-- Source: NexSpace_v3.3_MOCK_PROJECT_NEXSPACE.sql
-- Source SHA-256: b28aba025016101476c032c1372a5083e746ac417e08085c9df4f819b1175c70
-- Adaptation: removed hard-coded USE so Flyway migrates the configured database.
-- All source DDL, constraints, indexes and triggers are preserved.
-- Fresh empty databases only; no seed data and no starter-auth compatibility tables.

-- NAMING REVISION: 2026-10-26, NEXSPACE v3.3 physical naming for Docker/Linux.
-- Team conventions (not MySQL-required prefixes):
-- m_ = master/domain reference and supporting master detail
-- t_ = business transaction, operational instance and transaction detail
-- cfg_ = editable configuration, policy and user preference
-- rel_ = association / junction / relationship state
-- log_ = audit and event history (may have processing metadata)
-- Singular snake_case; columns remain unchanged; indexes/constraints/triggers
-- are lowercase and refer to the new physical table names.
-- This is a fresh-install schema, NOT a rename migration.
-- If old tables already exist, do not run alongside them; migrate names first.
-- Business string values such as 'Booking' and 'Workspace' are unchanged.
-- Do not change lower_case_table_names on an initialized Docker volume.
-- Shared use: run schema deployment once; application sessions use UTC.

-- NEXSPACE v3.3 | MySQL 8.4 LTS-compatible physical schema
-- Source: design + Vietnamese explanation v3.3 (47 tables / 721 business columns).
-- Flyway target database must already exist; selected by the JDBC URL.
-- Fresh installation: expected source table names must not already exist.
-- No CREATE DATABASE, DROP, TRUNCATE, seed records, or FOREIGN_KEY_CHECKS=0.
-- DDL autocommits in MySQL. Stop on the first error; do not blindly rerun
-- after a partial execution. Inspect the objects already created first.
-- UUIDs: CHAR(36) ascii_bin, supplied by the application, canonical lowercase.
-- Notification_Delivery alone maps source NEWSEQUENTIALID to DEFAULT (UUID()).
-- UUID() is not a SQL Server sequential UUID; application UUIDv7 is preferred
-- for new IDs if supported. Use ROW-based replication for generated defaults.
-- All DATETIME values are UTC; operating/pricing TIME values are local.
-- Configure ALL application connections to time_zone='+00:00' as well.
-- Native JSON validates JSON syntax, not business shape or referenced IDs.
-- 5 virtual helper columns preserve filtered UNIQUE constraints.
-- MySQL has no SQL Server INCLUDE/filtered nonunique indexes: see inline notes.
-- All physical table names use lowercase snake_case with category prefixes.
-- Default local database: MOCK_PROJECT_NEXSPACE; other environments use the JDBC URL.

SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET SESSION time_zone = '+00:00';
SET SESSION sql_mode = 'STRICT_TRANS_TABLES,ONLY_FULL_GROUP_BY,ERROR_FOR_DIVISION_BY_ZERO,NO_ZERO_DATE,NO_ZERO_IN_DATE,NO_ENGINE_SUBSTITUTION';


-- m_app_user (source App_User): Stores account, profile and role of every person who logs in: Customers, Organizers and Administrators.
-- Customer, Organizer and Administrator are fixed business roles; Role_Permission stores editable allowed actions and scopes. User_Verification_Challenge enforces expiring, single-use recovery/verification proofs. Locking or password reset revokes active sessions; confidential TOTP secrets are encrypted. Account-control actions require Audit_Log.
CREATE TABLE `m_app_user` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `email` VARCHAR(255) NOT NULL COMMENT 'Login identifier; unique, compared case-insensitively.',
  `password_hash` VARCHAR(255) COLLATE utf8mb4_0900_bin NULL COMMENT 'bcrypt/Argon2 hash only, never plain text. NULL for accounts that only use social login.',
  `password_changed_at` DATETIME(6) NULL COMMENT 'Password change timestamp; reset challenge is separately consumed in User_Verification_Challenge. Timestamp alone is not a single-use proof.',
  `full_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NULL,
  `date_of_birth` DATE NULL COMMENT 'Profile field required by SRS 3.3.1.',
  `address` VARCHAR(500) NULL COMMENT 'Profile field required by SRS 3.3.1.',
  `avatar_url` VARCHAR(500) NULL COMMENT 'Cloudinary URL; image <= 5 MB, JPG/PNG (BR-37).',
  `role` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL COMMENT 'Drives RBAC (BR-29).',
  `status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Unverified' COMMENT 'Unverified until the email is verified (BR-01). Locked = temporary lock (BR-03) or by Administrator. Deactivated = disabled by Administrator (M02-UC09).',
  `email_verified_at` DATETIME(6) NULL COMMENT 'Time the email ownership was confirmed; NULL while Unverified.',
  `two_factor_enabled` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'M01-UC06/UC07; TOTP challenge before creating a full authenticated session.',
  `two_factor_secret` VARCHAR(255) NULL COMMENT 'Encrypted TOTP secret; NULL when 2FA is off.',
  `failed_login_count` INT NOT NULL DEFAULT 0 COMMENT 'Consecutive wrong passwords; reset to 0 after a successful login (BR-03).',
  `locked_until` DATETIME(6) NULL COMMENT 'Temporary lock expiry; NULL when not locked.',
  `last_login_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `company_name` VARCHAR(255) NULL,
  `preferred_locale` VARCHAR(10) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'en',
  `timezone` VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  `phone_verified_at` DATETIME(6) NULL,
  `lock_reason` VARCHAR(500) NULL,
  `locked_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `deactivated_at` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_m_app_user_email` (`email`),
  -- Source INCLUDE (full_name, email) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_m_app_user_role_status` (`role`, `status`),
  KEY `ix_m_app_user_locked_by` (`locked_by`),
  CONSTRAINT `ck_m_app_user_role` CHECK (`role` IN ('Customer', 'Organizer', 'Administrator')),
  CONSTRAINT `ck_m_app_user_status` CHECK (`status` IN ('Unverified', 'Active', 'Locked', 'Deactivated')),
  CONSTRAINT `ck_m_app_user_two_factor_enabled` CHECK (`two_factor_enabled` IN (0, 1)),
  CONSTRAINT `ck_m_app_user_preferred_locale` CHECK (`preferred_locale` IN ('en', 'vi')),
  CONSTRAINT `ck_m_app_user_login_count` CHECK (failed_login_count >= 0)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores account, profile and role of every person who logs in: Customers, Organizers and Administrators.';

-- t_user_session (source User_Session): Stores one login session (refresh token hash, device, expiry) per device for a user account.
-- Supports secure multi-device sessions, "View Active Sessions" and "Terminate Active Session". Only a hash of the refresh token is stored, so a database leak does not expose usable tokens. Reset Password revokes all sessions of the user.
CREATE TABLE `t_user_session` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Owner of the session.',
  `refresh_token_hash` VARCHAR(255) COLLATE utf8mb4_0900_bin NOT NULL COMMENT 'Hash of the refresh token, never the raw token.',
  `ip_address` VARCHAR(45) NULL COMMENT 'Long enough for IPv6.',
  `device_info` VARCHAR(255) NULL COMMENT 'Browser/OS or app/device name shown in Active Sessions.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Login time.',
  `last_activity_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last time the refresh token was used (M01-UC07).',
  `expires_at` DATETIME(6) NOT NULL,
  `is_revoked` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '1 = signed out or terminated.',
  `revoked_at` DATETIME(6) NULL,
  `push_device_token` VARCHAR(500) COLLATE utf8mb4_0900_bin NULL COMMENT 'Encrypted provider token, optional for this session; cleared on logout/revocation. Multi-device delivery queries active sessions.',
  `push_provider` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_t_user_session_token` (`refresh_token_hash`),
  -- Source INCLUDE (last_activity_at, device_info) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_t_user_session_user_active` (`user_id`, `is_revoked`, `expires_at`),
  CONSTRAINT `ck_t_user_session_is_revoked` CHECK (`is_revoked` IN (0, 1)),
  CONSTRAINT `ck_t_user_session_push_provider` CHECK (`push_provider` IN ('FCM', 'APNS', 'WebPush')),
  CONSTRAINT `ck_t_user_session_expiry` CHECK (expires_at > created_at)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores one login session (refresh token hash, device, expiry) per device for a user account.';

-- rel_user_social_account (source User_Social_Account): Links a NexSpace account to an external OAuth identity (Google, Facebook).
-- One NexSpace user can link at most one account per provider, and one external identity can belong to only one NexSpace user. A new provider is a new enum value, not a new column. If Better Auth is used, map this table to its account table.
CREATE TABLE `rel_user_social_account` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'NexSpace account the identity belongs to.',
  `provider` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL,
  `provider_user_id` VARCHAR(100) COLLATE utf8mb4_0900_bin NOT NULL COMMENT 'Stable user id returned by the provider (not the email).',
  `provider_email` VARCHAR(255) NULL COMMENT 'Email reported by the provider at link time.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_rel_user_social_account_provider_uid` (`provider`, `provider_user_id`),
  UNIQUE KEY `ux_rel_user_social_account_user_provider` (`user_id`, `provider`),
  CONSTRAINT `ck_rel_user_social_account_provider` CHECK (`provider` IN ('Google', 'Facebook'))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Links a NexSpace account to an external OAuth identity (Google, Facebook).';

-- cfg_customer_workspace_preference (source Customer_Workspace_Preference): Stores one Customer preference set: budget, location input, resource category, noise level and purpose. Preferred amenities are in Customer_Preference_Amenity.
-- One preference set per Customer (UNIQUE customer_id). Preferred amenities are relational rows in Customer_Preference_Amenity, with a real Amenity FK and no duplicate choices. target_districts remains a bounded JSON input read by customer_id; it is not scanned across customers. Validate city/district context in the application. Preferences never change booking history (M02-UC05).
CREATE TABLE `cfg_customer_workspace_preference` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `customer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'UNIQUE enforces one preference set per Customer.',
  `target_districts` JSON NULL COMMENT 'Example: ["Hai Chau","Son Tra"]; matched against Workspace.district. CHECK ISJSON(). CHECK (target_districts IS NULL OR ISJSON(target_districts) = 1).',
  `budget_min` DECIMAL(18,2) NULL COMMENT 'VND per billing unit. CHECK budget_min <= budget_max.',
  `budget_max` DECIMAL(18,2) NULL COMMENT 'VND per billing unit.',
  `preferred_resource_category` VARCHAR(10) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Any' COMMENT 'Desk or room preference (SRS: resource type).',
  `preferred_noise_level` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NULL COMMENT 'Matched against Floor_Section.noise_level (same value list).',
  `purpose` VARCHAR(30) COLLATE utf8mb4_0900_as_cs NULL COMMENT 'Intended purpose of use (SRS: purpose).',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_cfg_customer_workspace_preference_customer` (`customer_id`),
  CONSTRAINT `ck_cfg_customer_workspace_preference_preferred_resource_category` CHECK (`preferred_resource_category` IN ('Desk', 'Room', 'Any')),
  CONSTRAINT `ck_cfg_customer_workspace_preference_preferred_noise_level` CHECK (`preferred_noise_level` IN ('Quiet', 'Moderate', 'Lively')),
  CONSTRAINT `ck_cfg_customer_workspace_preference_purpose` CHECK (`purpose` IN ('Study', 'Freelance', 'Team_Work', 'Meeting', 'Event', 'Other')),
  CONSTRAINT `ck_cfg_customer_workspace_preference_budget` CHECK ((budget_min IS NULL OR budget_min >= 0) AND (budget_max IS NULL OR budget_max >= 0) AND (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores one Customer preference set: budget, location input, resource category, noise level and purpose. Preferred amenities are in Customer_Preference_Amenity.';

-- cfg_saved_search_filter (source Saved_Search_Filter): Stores a named set of search criteria that a Customer saves for reuse.
-- criteria is a JSON snapshot of the filters (location, price, amenities, resource type, rating, sort). Applying a filter only reads this row; it never changes workspace data (M08-UC09).
CREATE TABLE `cfg_saved_search_filter` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `customer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` VARCHAR(100) NOT NULL COMMENT 'Name chosen by the Customer. UNIQUE per Customer.',
  `criteria` JSON NOT NULL COMMENT 'Search criteria snapshot. CHECK ISJSON(). CHECK (criteria IS NULL OR ISJSON(criteria) = 1).',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_cfg_saved_search_filter_customer_name` (`customer_id`, `name`)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores a named set of search criteria that a Customer saves for reuse.';

-- m_favorite_group (source Favorite_Group): Stores the named groups a Customer creates to organise favorite workspaces.
-- Groups are their own rows so they can exist while empty and be renamed once. A favorite is filed in at most one group through Customer_Favorite_Workspace.favorite_group_id. Deleting a group first sets that column to NULL for its favorites (the FK is NO ACTION to avoid multiple cascade paths in SQL Server), so the workspaces stay in the favorites list (M13-UC08).
CREATE TABLE `m_favorite_group` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `customer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` VARCHAR(100) NOT NULL COMMENT 'UNIQUE per Customer.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_m_favorite_group_customer_name` (`customer_id`, `name`)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores the named groups a Customer creates to organise favorite workspaces.';

-- rel_customer_favorite_workspace (source Customer_Favorite_Workspace): Stores "this Customer saved this workspace as a favorite" and the optional group the favorite is filed in.
-- Composite primary key (customer_id, workspace_id) prevents duplicate favorites (M13-UC01). favorite_group_id files the favorite in one group (M13-UC09/UC10); NULL = not grouped. One group per favorite is enough for the SRS; if a workspace must later appear in several groups, add a junction table Favorite_Group_Item without changing any other table.
CREATE TABLE `rel_customer_favorite_workspace` (
  `customer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Composite primary key component.',
  `workspace_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Composite primary key component.',
  `favorite_group_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Group the favorite is filed in; NULL = not grouped.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Time the Customer saved the workspace.',
  PRIMARY KEY (`customer_id`, `workspace_id`),
  KEY `ix_rel_customer_favorite_workspace_workspace` (`workspace_id`),
  -- Source filtered index favorite_group_id IS NOT NULL -> ordinary MySQL composite index; queries must keep the predicate.
  KEY `ix_rel_customer_favorite_workspace_group` (`favorite_group_id`)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores "this Customer saved this workspace as a favorite" and the optional group the favorite is filed in.';

-- m_organizer_profile (source Organizer_Profile): Stores the single business profile of an Organizer: legal/business data, payout bank account, and its verification (onboarding) status reviewed by the Administrator.
-- Renamed from Organizer_Application: there is exactly one row per Organizer (UNIQUE organizer_id). It starts as the onboarding application and becomes the business profile after approval, so M03-UC01..UC09 all work on the same row. BR-04: required documents before submitting. BR-05: publishing is allowed only when status = Approved. Changing protected fields (legal name, tax id, bank account) sets status back to Pending_Admin_Review (re-verification, M03-UC09). Every decision is written to Audit_Log (BR-31), which keeps the review history. The bank account is encrypted and copied (masked) into Organizer_Payout when money is paid.
CREATE TABLE `m_organizer_profile` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `organizer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Organizer who owns the profile; UNIQUE = one profile per Organizer.',
  `enterprise_legal_name` VARCHAR(255) NULL COMMENT 'Nullable in Draft; mandatory before submission. CHECK draft-or-complete business identity, tax code, representative and address.',
  `tax_id` VARCHAR(50) NULL COMMENT 'Draft may be incomplete; validate as required before submit for review.',
  `representative_name` VARCHAR(100) NULL COMMENT 'Draft may be incomplete; validate as required before submit for review.',
  `headquarters_address` VARCHAR(500) NULL COMMENT 'Draft may be incomplete; validate as required before submit for review.',
  `contact_phone` VARCHAR(20) NULL COMMENT 'Draft may be incomplete; validate as required before submit for review.',
  `contact_email` VARCHAR(255) NULL COMMENT 'Draft may be incomplete; validate as required before submit for review.',
  `bank_name` VARCHAR(100) NULL COMMENT 'Required before the first payout.',
  `bank_account_number` VARCHAR(255) NULL COMMENT 'Stored encrypted; only the last 4 digits are displayed.',
  `bank_account_holder` VARCHAR(100) NULL,
  `status` VARCHAR(30) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Draft' COMMENT 'Verification state. Resubmit is allowed from Revision_Requested or a correctable Rejected state.',
  `submitted_at` DATETIME(6) NULL COMMENT 'Time of Submit / Resubmit.',
  `reviewed_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Administrator who reviewed the profile.',
  `reviewed_at` DATETIME(6) NULL,
  `review_feedback` VARCHAR(500) NULL COMMENT 'Reason for rejection or revision request shown in Application Status.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `entity_code` VARCHAR(30) NULL,
  `trade_name` VARCHAR(255) NULL,
  `business_entity_type` VARCHAR(30) COLLATE utf8mb4_0900_as_cs NULL,
  `business_category_code` VARCHAR(20) NULL,
  `charter_capital` DECIMAL(18,2) NULL COMMENT 'Optional business registry disclosure; no assumed government integration.',
  `application_version` INT NOT NULL DEFAULT 1,
  `assigned_reviewer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `review_started_at` DATETIME(6) NULL,
  `review_due_at` DATETIME(6) NULL,
  `bank_code` VARCHAR(30) NULL,
  `bank_verification_status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Unverified',
  `bank_verified_at` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_m_organizer_profile_organizer` (`organizer_id`),
  `_mysql_unique_1` TINYINT GENERATED ALWAYS AS (CASE WHEN status = 'Approved' AND tax_id IS NOT NULL THEN 1 ELSE NULL END) VIRTUAL,
  -- Source filtered UNIQUE: status = 'Approved' AND tax_id IS NOT NULL; nullable discriminator preserves uniqueness only for matching rows.
  UNIQUE KEY `ux_m_organizer_profile_tax_id_approved` (`tax_id`, `_mysql_unique_1`),
  KEY `ix_m_organizer_profile_queue` (`status`, `submitted_at`),
  KEY `ix_m_organizer_profile_reviewed_by` (`reviewed_by`),
  -- Source filter entity_code IS NOT NULL: MySQL UNIQUE already permits multiple NULL values.
  UNIQUE KEY `ux_m_organizer_profile_entity_code` (`entity_code`),
  KEY `ix_m_organizer_profile_assigned_reviewer_id` (`assigned_reviewer_id`),
  CONSTRAINT `ck_m_organizer_profile_status` CHECK (`status` IN ('Draft', 'Pending_Admin_Review', 'Approved', 'Rejected', 'Revision_Requested')),
  CONSTRAINT `ck_m_organizer_profile_business_entity_type` CHECK (`business_entity_type` IN ('Joint_Stock', 'Limited_Liability', 'Sole_Proprietor', 'Household_Business', 'Other')),
  CONSTRAINT `ck_m_organizer_profile_bank_verification_status` CHECK (`bank_verification_status` IN ('Unverified', 'Pending', 'Verified', 'Rejected')),
  CONSTRAINT `ck_m_organizer_profile_capital` CHECK (charter_capital >= 0),
  CONSTRAINT `ck_m_organizer_profile_application_version` CHECK (application_version >= 1),
  CONSTRAINT `ck_m_organizer_profile_submission` CHECK (status = 'Draft' OR (NULLIF(TRIM(enterprise_legal_name),'') IS NOT NULL AND NULLIF(TRIM(tax_id),'') IS NOT NULL AND NULLIF(TRIM(representative_name),'') IS NOT NULL AND NULLIF(TRIM(headquarters_address),'') IS NOT NULL))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores the single business profile of an Organizer: legal/business data, payout bank account, and its verification (onboarding) status reviewed by the Administrator.';

-- m_organizer_verification_document (source Organizer_Verification_Document): Stores each verification file (business license, ID card, other) uploaded for an Organizer profile.
-- Store Front and Back as separate current ID_Card rows; passport is an alternative identity proof. Preserve superseded versions for review history. Submitting requires the configured legal-document set. File policy is centrally configured; SRS baseline is <=5MB, JPG/PNG/PDF. External OCR/registry integration is optional and unverified.
CREATE TABLE `m_organizer_verification_document` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `organizer_profile_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Profile the document proves.',
  `document_type` VARCHAR(30) COLLATE utf8mb4_0900_as_cs NOT NULL COMMENT 'Business_License and ID_Card are required by BR-04.',
  `file_url` VARCHAR(500) NOT NULL COMMENT 'Cloudinary URL.',
  `file_name` VARCHAR(255) NOT NULL COMMENT 'Original file name.',
  `file_size_kb` INT NOT NULL COMMENT 'CHECK <= 5120 (BR-37).',
  `mime_type` VARCHAR(50) COLLATE utf8mb4_0900_as_cs NOT NULL COMMENT 'BR-37 supported formats.',
  `status` VARCHAR(30) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Pending',
  `admin_feedback` VARCHAR(500) NULL,
  `verified_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Administrator who recorded the verification result (M03-UC14).',
  `verified_at` DATETIME(6) NULL,
  `uploaded_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Upload or replace time.',
  `document_side` VARCHAR(10) COLLATE utf8mb4_0900_as_cs NULL,
  `document_number` VARCHAR(255) NULL COMMENT 'Encrypted when identity document number is retained.',
  `issued_at` DATE NULL,
  `expires_at` DATE NULL,
  `application_version` INT NOT NULL DEFAULT 1,
  `is_current` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `supersedes_document_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `ocr_result` JSON NULL COMMENT 'Optional parsed result from a future/manual adapter; no assumed government/biometric integration. ISJSON or NULL. CHECK (ocr_result IS NULL OR ISJSON(ocr_result) = 1).',
  `verification_method` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Manual',
  PRIMARY KEY (`id`),
  KEY `ix_m_organizer_verification_document_profile` (`organizer_profile_id`),
  KEY `ix_m_organizer_verification_document_verified_by` (`verified_by`),
  KEY `ix_m_organizer_verification_document_supersedes_document_id` (`supersedes_document_id`),
  CONSTRAINT `ck_m_organizer_verification_document_document_type` CHECK (`document_type` IN ('Business_License', 'ID_Card', 'Passport', 'Tax_Certificate', 'Bank_Certificate', 'Other')),
  CONSTRAINT `ck_m_organizer_verification_document_file_size_kb` CHECK (`file_size_kb` > 0 AND `file_size_kb` <= 5120),
  CONSTRAINT `ck_m_organizer_verification_document_mime_type` CHECK (`mime_type` IN ('image/jpeg', 'image/png', 'application/pdf')),
  CONSTRAINT `ck_m_organizer_verification_document_status` CHECK (`status` IN ('Pending', 'Verified', 'Rejected', 'Revision_Required')),
  CONSTRAINT `ck_m_organizer_verification_document_document_side` CHECK (`document_side` IN ('Front', 'Back', 'Both', 'NA')),
  CONSTRAINT `ck_m_organizer_verification_document_is_current` CHECK (`is_current` IN (0, 1)),
  CONSTRAINT `ck_m_organizer_verification_document_verification_method` CHECK (`verification_method` IN ('Manual', 'External_Service')),
  CONSTRAINT `ck_m_organizer_verification_document_validity` CHECK (expires_at IS NULL OR issued_at IS NULL OR expires_at >= issued_at),
  CONSTRAINT `ck_m_organizer_verification_document_application_version` CHECK (application_version >= 1)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores each verification file (business license, ID card, other) uploaded for an Organizer profile.';

-- m_workspace (source Workspace): Stores the coworking workspace (business object) an Organizer lists: information, location, review state, operating state and featured placement.
-- Public/bookable only when profile Approved, review Approved, operating Active, moderation Normal and is_listing_visible=1. Any new workspace or major layout/capacity update requires review (BR-06). Occupancy/rating/capacity KPIs are derived. Dates/times UTC; schedules in timezone. IoT gate controls are excluded by Report1 LI-01.
CREATE TABLE `m_workspace` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `organizer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Owning Organizer.',
  `name` VARCHAR(255) NULL COMMENT 'Draft may be incomplete. Mandatory and valid at submission/publishing; enforce workflow validation.',
  `description` LONGTEXT NULL,
  `address` VARCHAR(500) NULL COMMENT 'Draft may be incomplete. Mandatory and valid at submission/publishing; enforce workflow validation.',
  `district` VARCHAR(100) NULL COMMENT 'Draft may be incomplete. Mandatory and valid at submission/publishing; enforce workflow validation.',
  `city` VARCHAR(100) NULL COMMENT 'Draft may be incomplete. Mandatory and valid at submission/publishing; enforce workflow validation.',
  `latitude` DECIMAL(10,8) NULL COMMENT 'Set by Set Workspace Location (M04-UC06).',
  `longitude` DECIMAL(11,8) NULL,
  `timezone` VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh' COMMENT 'IANA time zone used to convert UTC times to local time (CR03).',
  `review_status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Draft' COMMENT 'Administrator review result (BR-06).',
  `operating_status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Inactive' COMMENT 'Organizer-controlled state (M04-UC05, UC08, UC09).',
  `moderation_status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Normal' COMMENT 'Suspended overrides operating_status (BR-07).',
  `submitted_at` DATETIME(6) NULL COMMENT 'Last time the workspace was submitted for review.',
  `reviewed_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Administrator who last approved/rejected.',
  `reviewed_at` DATETIME(6) NULL,
  `review_feedback` VARCHAR(500) NULL COMMENT 'Correction request shown when rejected.',
  `suspended_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Administrator who suspended it.',
  `suspended_at` DATETIME(6) NULL,
  `suspend_reason` VARCHAR(500) NULL,
  `featured_position` INT NULL COMMENT 'NULL = not featured; 1 = shown first on the Landing Page (M17-UC17..UC20). CHECK >= 1.',
  `featured_from` DATETIME(6) NULL COMMENT 'Start of the featured period.',
  `featured_to` DATETIME(6) NULL COMMENT 'End of the featured period. CHECK featured_to > featured_from.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `workspace_code` VARCHAR(30) NULL,
  `category` VARCHAR(30) COLLATE utf8mb4_0900_as_cs NULL,
  `short_description` VARCHAR(500) NULL,
  `usable_area_sqm` DECIMAL(10,2) NULL COMMENT 'Positive usable area from O05; do not persist derived total seat count.',
  `support_phone` VARCHAR(20) NULL,
  `support_email` VARCHAR(255) NULL,
  `postal_code` VARCHAR(20) NULL,
  `building_name` VARCHAR(255) NULL,
  `entry_instructions` VARCHAR(1000) NULL,
  `is_listing_visible` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `booking_confirmation_mode` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Instant',
  `check_in_lead_minutes` INT NOT NULL DEFAULT 15,
  `check_in_late_minutes` INT NOT NULL DEFAULT 30,
  `auto_block_public_holidays` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `version` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  -- Source INCLUDE (name, review_status, operating_status, moderation_status) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_m_workspace_organizer` (`organizer_id`, `created_at` DESC, `id` DESC),
  -- Source filtered index review_status = 'Approved' AND operating_status = 'Active' AND moderation_status = 'Normal' AND is_listing_visible = 1 -> ordinary MySQL composite index; queries must keep the predicate.
  -- Source INCLUDE (organizer_id, name, category, latitude, longitude) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_m_workspace_discovery` (`review_status`, `operating_status`, `moderation_status`, `is_listing_visible`, `city`, `district`, `id`),
  KEY `ix_m_workspace_review_queue` (`review_status`, `submitted_at`),
  -- Source filtered index featured_position IS NOT NULL -> ordinary MySQL composite index; queries must keep the predicate.
  KEY `ix_m_workspace_featured` (`featured_position`, `featured_from`, `featured_to`),
  KEY `ix_m_workspace_reviewed_by` (`reviewed_by`),
  KEY `ix_m_workspace_suspended_by` (`suspended_by`),
  -- Source filter workspace_code IS NOT NULL: MySQL UNIQUE already permits multiple NULL values.
  UNIQUE KEY `ux_m_workspace_workspace_code` (`workspace_code`),
  CONSTRAINT `ck_m_workspace_review_status` CHECK (`review_status` IN ('Draft', 'Pending', 'Approved', 'Rejected')),
  CONSTRAINT `ck_m_workspace_operating_status` CHECK (`operating_status` IN ('Active', 'Inactive', 'Archived')),
  CONSTRAINT `ck_m_workspace_moderation_status` CHECK (`moderation_status` IN ('Normal', 'Suspended')),
  CONSTRAINT `ck_m_workspace_category` CHECK (`category` IN ('Coworking_Hub', 'Business_Lounge', 'Creative_Studio', 'Serviced_Office', 'Other')),
  CONSTRAINT `ck_m_workspace_is_listing_visible` CHECK (`is_listing_visible` IN (0, 1)),
  CONSTRAINT `ck_m_workspace_booking_confirmation_mode` CHECK (`booking_confirmation_mode` IN ('Instant', 'Manual_Approval')),
  CONSTRAINT `ck_m_workspace_auto_block_public_holidays` CHECK (`auto_block_public_holidays` IN (0, 1)),
  CONSTRAINT `ck_m_workspace_version` CHECK (`version` >= 1),
  CONSTRAINT `ck_m_workspace_latitude` CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT `ck_m_workspace_longitude` CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT `ck_m_workspace_featured_position` CHECK (featured_position >= 1),
  CONSTRAINT `ck_m_workspace_featured_window` CHECK (featured_to IS NULL OR featured_from IS NULL OR featured_to > featured_from),
  CONSTRAINT `ck_m_workspace_area` CHECK (usable_area_sqm > 0),
  CONSTRAINT `ck_m_workspace_checkin_minutes` CHECK (check_in_lead_minutes >= 0 AND check_in_late_minutes >= 0)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores the coworking workspace (business object) an Organizer lists: information, location, review state, operating state and featured placement.';

-- cfg_workspace_operating_hour (source Workspace_Operating_Hour): Stores opening and closing time of a workspace for each day of the week.
-- UNIQUE(workspace_id, day_of_week). CHECK exactly one closed, 24-hour or valid timed window. One window per day; split shifts can be introduced later by adding sequence_no to the key.
CREATE TABLE `cfg_workspace_operating_hour` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `workspace_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `day_of_week` INT NOT NULL COMMENT '1 = Monday ... 7 = Sunday. UNIQUE (workspace_id, day_of_week).',
  `open_time` TIME(6) NULL COMMENT 'NULL when is_closed = 1.',
  `close_time` TIME(6) NULL COMMENT 'If ordinary same-day opening: close_time > open_time. Overnight: closes_next_day=1. Closed/24-hour schedules have NULL open/close times.',
  `is_closed` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '1 = closed all day.',
  `is_24_hours` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'If 1, open/close are NULL and the local day is fully open.',
  `closes_next_day` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'For overnight schedules only. CHECK valid combination with is_closed/is_24_hours.',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_cfg_workspace_operating_hour_workspace_day` (`workspace_id`, `day_of_week`),
  CONSTRAINT `ck_cfg_workspace_operating_hour_day_of_week` CHECK (`day_of_week` IN (1, 2, 3, 4, 5, 6, 7)),
  CONSTRAINT `ck_cfg_workspace_operating_hour_is_closed` CHECK (`is_closed` IN (0, 1)),
  CONSTRAINT `ck_cfg_workspace_operating_hour_is_24_hours` CHECK (`is_24_hours` IN (0, 1)),
  CONSTRAINT `ck_cfg_workspace_operating_hour_closes_next_day` CHECK (`closes_next_day` IN (0, 1)),
  CONSTRAINT `ck_cfg_workspace_operating_hour_schedule` CHECK ((is_closed = 1 AND is_24_hours = 0 AND closes_next_day = 0 AND open_time IS NULL AND close_time IS NULL) OR (is_closed = 0 AND is_24_hours = 1 AND closes_next_day = 0 AND open_time IS NULL AND close_time IS NULL) OR (is_closed = 0 AND is_24_hours = 0 AND open_time IS NOT NULL AND close_time IS NOT NULL AND open_time >= '00:00:00' AND open_time < '24:00:00' AND close_time >= '00:00:00' AND close_time < '24:00:00' AND ((closes_next_day = 0 AND close_time > open_time) OR (closes_next_day = 1 AND close_time < open_time))))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores opening and closing time of a workspace for each day of the week.';

-- cfg_workspace_cancellation_rule (source Workspace_Cancellation_Rule): Stores the tiered cancellation/refund policy of a workspace: how much is refunded depending on how early the booking is cancelled.
-- Use the highest eligible threshold in the policy version effective at checkout. Snapshot full rule tiers in Booking_Snapshot.cancellation_policy_snapshot. No overlapping duplicate active threshold periods per workspace. Customer self-cancel only before start (BR-18); facility-defect disputes use an Admin decision, not a cancellation tier.
CREATE TABLE `cfg_workspace_cancellation_rule` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `workspace_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `min_hours_before_start` INT NOT NULL COMMENT 'Tier threshold in hours. CHECK >= 0. UNIQUE per workspace among active rules.',
  `refund_percent` DECIMAL(5,2) NOT NULL COMMENT 'CHECK 0-100; applied to the refundable base of the booking.',
  `is_active` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `effective_from` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)),
  `effective_to` DATETIME(6) NULL,
  `service_fee_refundable` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `gateway_fee_refundable` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `no_show_refund_percent` DECIMAL(5,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  `_mysql_unique_2` TINYINT GENERATED ALWAYS AS (CASE WHEN is_active = 1 THEN 1 ELSE NULL END) VIRTUAL,
  -- Source filtered UNIQUE: is_active = 1; nullable discriminator preserves uniqueness only for matching rows.
  UNIQUE KEY `ux_cfg_workspace_cancellation_rule_tier` (`workspace_id`, `min_hours_before_start`, `_mysql_unique_2`),
  CONSTRAINT `ck_cfg_workspace_cancellation_rule_is_active` CHECK (`is_active` IN (0, 1)),
  CONSTRAINT `ck_cfg_workspace_cancellation_rule_service_fee_refundable` CHECK (`service_fee_refundable` IN (0, 1)),
  CONSTRAINT `ck_cfg_workspace_cancellation_rule_gateway_fee_refundable` CHECK (`gateway_fee_refundable` IN (0, 1)),
  CONSTRAINT `ck_cfg_workspace_cancellation_rule_threshold` CHECK (min_hours_before_start >= 0),
  CONSTRAINT `ck_cfg_workspace_cancellation_rule_refund` CHECK (refund_percent BETWEEN 0 AND 100 AND (no_show_refund_percent IS NULL OR no_show_refund_percent BETWEEN 0 AND 100)),
  CONSTRAINT `ck_cfg_workspace_cancellation_rule_effective_window` CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores the tiered cancellation/refund policy of a workspace: how much is refunded depending on how early the booking is cancelled.';

-- m_amenity (source Amenity): Platform-wide catalog of standard amenities (Wi-Fi, printer, free coffee...).
-- Maintained by the Administrator (M05-UC02..UC04); Organizers only pick from this catalog, which keeps names consistent for filtering. An amenity still used by a workspace is deactivated instead of deleted.
CREATE TABLE `m_amenity` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `name` VARCHAR(100) NOT NULL COMMENT 'Unique, so every workspace uses the same wording.',
  `description` VARCHAR(255) NULL COMMENT 'Required by M05-UC02.',
  `category` VARCHAR(30) COLLATE utf8mb4_0900_as_cs NOT NULL,
  `icon` VARCHAR(255) NULL,
  `is_active` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_m_amenity_name` (`name`),
  CONSTRAINT `ck_m_amenity_category` CHECK (`category` IN ('Tech', 'Comfort', 'Space')),
  CONSTRAINT `ck_m_amenity_is_active` CHECK (`is_active` IN (0, 1))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Platform-wide catalog of standard amenities (Wi-Fi, printer, free coffee...).';

-- rel_workspace_amenity (source Workspace_Amenity): Junction table: which amenities each workspace provides.
-- Composite primary key (workspace_id, amenity_id). Assign/remove = insert/delete a row.
CREATE TABLE `rel_workspace_amenity` (
  `workspace_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Composite primary key component.',
  `amenity_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Composite primary key component.',
  `details` VARCHAR(500) NULL,
  PRIMARY KEY (`workspace_id`, `amenity_id`),
  KEY `ix_rel_workspace_amenity_amenity` (`amenity_id`)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Junction table: which amenities each workspace provides.';

-- m_workspace_media (source Workspace_Media): Stores the images and 360-degree media of a workspace, with cover flag and display order.
-- Exactly one cover image per workspace (filtered unique index) and the cover must be an Image (CHECK is_cover = 0 OR media_type = Image). 360-degree files are processed asynchronously (CR17), so processing_status shows when they are ready. Floor-plan blueprints are in Floor_Plan.blueprint_image_url. BR-37: <= 5 MB.
CREATE TABLE `m_workspace_media` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `workspace_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `media_url` VARCHAR(500) NOT NULL COMMENT 'Cloudinary URL.',
  `media_type` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL,
  `caption` VARCHAR(255) NULL COMMENT 'Required by M05-UC09.',
  `is_cover` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Only one cover image per workspace.',
  `display_order` INT NOT NULL DEFAULT 0,
  `file_size_kb` INT NOT NULL COMMENT 'CHECK <= 5120 (BR-37).',
  `processing_status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Ready' COMMENT 'Mainly for 360-degree media processed in the background.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `mime_type` VARCHAR(50) COLLATE utf8mb4_0900_as_cs NULL COMMENT 'Rendered pictures JPG/PNG; PDF only for document/blueprint assets under configured policy.',
  `pixel_width` INT NULL,
  `pixel_height` INT NULL,
  `original_file_name` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  KEY `ix_m_workspace_media_workspace_order` (`workspace_id`, `display_order`),
  `_mysql_unique_3` TINYINT GENERATED ALWAYS AS (CASE WHEN is_cover = 1 THEN 1 ELSE NULL END) VIRTUAL,
  -- Source filtered UNIQUE: is_cover = 1; nullable discriminator preserves uniqueness only for matching rows.
  UNIQUE KEY `ux_m_workspace_media_cover` (`workspace_id`, `_mysql_unique_3`),
  CONSTRAINT `ck_m_workspace_media_media_type` CHECK (`media_type` IN ('Image', '360_Degree')),
  CONSTRAINT `ck_m_workspace_media_is_cover` CHECK (`is_cover` IN (0, 1)),
  CONSTRAINT `ck_m_workspace_media_file_size_kb` CHECK (`file_size_kb` > 0 AND `file_size_kb` <= 5120),
  CONSTRAINT `ck_m_workspace_media_processing_status` CHECK (`processing_status` IN ('Processing', 'Ready', 'Failed')),
  CONSTRAINT `ck_m_workspace_media_mime_type` CHECK (`mime_type` IN ('image/jpeg', 'image/png', 'application/pdf')),
  CONSTRAINT `ck_m_workspace_media_pixel_width` CHECK (`pixel_width` > 0),
  CONSTRAINT `ck_m_workspace_media_pixel_height` CHECK (`pixel_height` > 0)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores the images and 360-degree media of a workspace, with cover flag and display order.';

-- m_floor_plan (source Floor_Plan): Represents one floor of a workspace and its interactive floor-plan canvas (blueprint image and publish state).
-- Published geometry is authoritative for C05; O12 edits draft_layout_json. Save/publish validates resource/zone bounds and capacity, applies transforms and increments version atomically. Major changes set Workspace review Pending. CAD/DXF import/export is a UI extension, not a guaranteed integration.
CREATE TABLE `m_floor_plan` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `workspace_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` VARCHAR(100) NOT NULL COMMENT 'Example: Floor 2.',
  `floor_number` INT NOT NULL COMMENT 'UNIQUE (workspace_id, floor_number).',
  `blueprint_image_url` VARCHAR(500) NULL COMMENT 'Background image; pos_x/pos_y of resources are measured on it.',
  `canvas_width` INT NULL COMMENT 'Pixels.',
  `canvas_height` INT NULL COMMENT 'Pixels.',
  `status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Draft' COMMENT 'Customers see only Published floor plans.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `usable_area_sqm` DECIMAL(10,2) NULL,
  `meters_per_pixel` DECIMAL(12,6) NULL COMMENT 'Positive scale for converting canvas coordinates into meters.',
  `layout_json` JSON NULL COMMENT 'Non-bookable walls, doors, stairs and map decorations only. Do not duplicate bookable resource geometry. CHECK (layout_json IS NULL OR ISJSON(layout_json) = 1).',
  `draft_layout_json` JSON NULL COMMENT 'Unpublished editor snapshot referencing resource IDs; staged transforms are applied atomically after validation. CHECK (draft_layout_json IS NULL OR ISJSON(draft_layout_json) = 1).',
  `version` INT NOT NULL DEFAULT 1,
  `published_at` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_m_floor_plan_workspace_floor` (`workspace_id`, `floor_number`),
  CONSTRAINT `ck_m_floor_plan_status` CHECK (`status` IN ('Draft', 'Published')),
  CONSTRAINT `ck_m_floor_plan_version` CHECK (`version` >= 1),
  CONSTRAINT `ck_m_floor_plan_canvas` CHECK (canvas_width > 0 AND canvas_height > 0),
  CONSTRAINT `ck_m_floor_plan_area` CHECK (usable_area_sqm > 0),
  CONSTRAINT `ck_m_floor_plan_scale` CHECK (meters_per_pixel > 0)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Represents one floor of a workspace and its interactive floor-plan canvas (blueprint image and publish state).';

-- m_floor_section (source Floor_Section): Stores functional zones on a floor (Quiet Zone, Meeting Area...) with their noise level.
-- A section can be deleted only after its resources are moved (M06-UC09). noise_level uses the same value list as the Customer preference so matching is direct. A resource may have no section.
CREATE TABLE `m_floor_section` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `floor_plan_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` VARCHAR(100) NOT NULL COMMENT 'UNIQUE per floor plan.',
  `noise_level` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NULL COMMENT 'Matched with Customer_Workspace_Preference.preferred_noise_level.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `section_code` VARCHAR(30) NULL,
  `boundary_json` JSON NULL COMMENT 'Polygon vertices in floor-canvas coordinates; validate closed non-self-intersecting polygon. CHECK (boundary_json IS NULL OR ISJSON(boundary_json) = 1).',
  `display_color` VARCHAR(9) NULL,
  `usable_area_sqm` DECIMAL(10,2) NULL,
  `policy_note` VARCHAR(500) NULL,
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_m_floor_section_floor_name` (`floor_plan_id`, `name`),
  CONSTRAINT `ck_m_floor_section_noise_level` CHECK (`noise_level` IN ('Quiet', 'Moderate', 'Lively')),
  CONSTRAINT `ck_m_floor_section_area` CHECK (usable_area_sqm > 0)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores functional zones on a floor (Quiet Zone, Meeting Area...) with their noise level.';

-- m_resource_type (source Resource_Type): Catalog of the kinds of bookable resource a workspace offers (Hot Desk, 6-person Meeting Room...) with their base prices per hour, day and month.
-- Workspace-specific type is the fallback for capacity and base rates. Desk/Room remains the coarse category; subtype drives C01/C04 filters. Individual overrides are nullable columns on Bookable_Resource. Effective price/capacity use COALESCE(resource override, type default).
CREATE TABLE `m_resource_type` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `workspace_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` VARCHAR(100) NOT NULL COMMENT 'Free text chosen by the Organizer. UNIQUE (workspace_id, name).',
  `category` VARCHAR(10) COLLATE utf8mb4_0900_as_cs NOT NULL,
  `capacity` INT NOT NULL DEFAULT 1 COMMENT 'Maximum number of people. CHECK capacity > 0.',
  `price_per_hour` DECIMAL(18,2) NULL COMMENT 'VND; NULL = not sold by the hour. CHECK >= 0.',
  `price_per_day` DECIMAL(18,2) NULL COMMENT 'VND; NULL = not sold by the day.',
  `price_per_month` DECIMAL(18,2) NULL COMMENT 'VND; NULL = not sold by the month. CHECK at least one price is not NULL.',
  `is_active` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Inactive types cannot be assigned to new resources.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `subtype` VARCHAR(30) COLLATE utf8mb4_0900_as_cs NULL,
  `description` VARCHAR(1000) NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'VND',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_m_resource_type_workspace_name` (`workspace_id`, `name`),
  CONSTRAINT `ck_m_resource_type_category` CHECK (`category` IN ('Desk', 'Room')),
  CONSTRAINT `ck_m_resource_type_is_active` CHECK (`is_active` IN (0, 1)),
  CONSTRAINT `ck_m_resource_type_subtype` CHECK (`subtype` IN ('Hot_Desk', 'Dedicated_Desk', 'Meeting_Room', 'Phone_Booth', 'Private_Office', 'Event_Hall', 'Other')),
  CONSTRAINT `ck_m_resource_type_capacity` CHECK (capacity > 0),
  CONSTRAINT `ck_m_resource_type_rates` CHECK ((price_per_hour IS NULL OR price_per_hour >= 0) AND (price_per_day IS NULL OR price_per_day >= 0) AND (price_per_month IS NULL OR price_per_month >= 0) AND (price_per_hour IS NOT NULL OR price_per_day IS NOT NULL OR price_per_month IS NOT NULL))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Catalog of the kinds of bookable resource a workspace offers (Hot Desk, 6-person Meeting Room...) with their base prices per hour, day and month.';

-- m_bookable_resource (source Bookable_Resource): Represents one concrete seat, desk or room that a Customer can book, with its position on the floor plan.
-- O19 may save an unmapped Draft. Publishing and booking require both pos_x/pos_y, valid bounds, Published floor, active/visible resource and Approved workspace (BR-08). section_id must belong to floor_plan_id; Resource_Type workspace must match floor workspace. Clone creates a new label; preserve bookings on disable/archive.
CREATE TABLE `m_bookable_resource` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `floor_plan_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `section_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Optional: a resource may belong to no section.',
  `resource_type_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `label` VARCHAR(50) NOT NULL COMMENT 'Display code, e.g. HD-05. UNIQUE (floor_plan_id, label).',
  `pos_x` DECIMAL(10,2) NULL COMMENT 'Pixel position on the floor-plan image.',
  `pos_y` DECIMAL(10,2) NULL,
  `status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Disabled' COMMENT 'Active only after complete configuration; Disabled blocks new reservations. Existing paid reservations are handled explicitly, never silently deleted.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `public_name` VARCHAR(255) NULL,
  `description` VARCHAR(2000) NULL,
  `capacity_override` INT NULL COMMENT 'NULL inherits Resource_Type.capacity; positive when set.',
  `width_m` DECIMAL(8,2) NULL COMMENT 'Positive physical width.',
  `depth_m` DECIMAL(8,2) NULL,
  `rotation_degrees` DECIMAL(6,2) NOT NULL DEFAULT 0 COMMENT 'CHECK >=0 AND <360.',
  `shape` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Rectangle',
  `price_per_hour_override` DECIMAL(18,2) NULL,
  `price_per_day_override` DECIMAL(18,2) NULL,
  `price_per_month_override` DECIMAL(18,2) NULL,
  `maintenance_note` VARCHAR(500) NULL,
  `is_listing_visible` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `publication_status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Draft',
  `version` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_m_bookable_resource_floor_label` (`floor_plan_id`, `label`),
  KEY `ix_m_bookable_resource_type` (`resource_type_id`),
  KEY `ix_m_bookable_resource_section_id` (`section_id`),
  -- Source filtered index publication_status = 'Published' AND status = 'Active' AND is_listing_visible = 1 -> ordinary MySQL composite index; queries must keep the predicate.
  -- Source INCLUDE (label, capacity_override, price_per_hour_override, price_per_day_override, price_per_month_override) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_m_bookable_resource_public_list` (`publication_status`, `status`, `is_listing_visible`, `floor_plan_id`, `resource_type_id`, `id`),
  CONSTRAINT `ck_m_bookable_resource_status` CHECK (`status` IN ('Active', 'Disabled')),
  CONSTRAINT `ck_m_bookable_resource_shape` CHECK (`shape` IN ('Rectangle', 'Circle')),
  CONSTRAINT `ck_m_bookable_resource_is_listing_visible` CHECK (`is_listing_visible` IN (0, 1)),
  CONSTRAINT `ck_m_bookable_resource_publication_status` CHECK (`publication_status` IN ('Draft', 'Published', 'Archived')),
  CONSTRAINT `ck_m_bookable_resource_version` CHECK (`version` >= 1),
  CONSTRAINT `ck_m_bookable_resource_capacity` CHECK (capacity_override > 0),
  CONSTRAINT `ck_m_bookable_resource_coordinates` CHECK ((pos_x IS NULL AND pos_y IS NULL) OR (pos_x IS NOT NULL AND pos_y IS NOT NULL AND pos_x >= 0 AND pos_y >= 0)),
  CONSTRAINT `ck_m_bookable_resource_geometry` CHECK ((width_m IS NULL OR width_m > 0) AND (depth_m IS NULL OR depth_m > 0) AND rotation_degrees >= 0 AND rotation_degrees < 360),
  CONSTRAINT `ck_m_bookable_resource_rates` CHECK ((price_per_hour_override IS NULL OR price_per_hour_override >= 0) AND (price_per_day_override IS NULL OR price_per_day_override >= 0) AND (price_per_month_override IS NULL OR price_per_month_override >= 0)),
  CONSTRAINT `ck_m_bookable_resource_published` CHECK (publication_status <> 'Published' OR (pos_x IS NOT NULL AND pos_y IS NOT NULL AND width_m IS NOT NULL AND depth_m IS NOT NULL))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Represents one concrete seat, desk or room that a Customer can book, with its position on the floor plan.';

-- t_resource_blocked_time_slot (source Resource_Blocked_Time_Slot): Stores time ranges when an Organizer blocks a resource (maintenance, internal event) so it cannot be booked.
-- Block/booking overlap is checked in the same resource lock transaction as checkout. Reject conflicts with existing confirmed bookings unless an explicit audited cancellation/refund is completed. Zone-wide action expands into rows for each resource; scope_group_key joins the batch.
CREATE TABLE `t_resource_blocked_time_slot` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `resource_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `start_time` DATETIME(6) NOT NULL COMMENT 'UTC.',
  `end_time` DATETIME(6) NOT NULL COMMENT 'UTC. CHECK end_time > start_time.',
  `reason` VARCHAR(255) NULL,
  `status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Active' COMMENT 'Removed = unblocked (kept for history).',
  `created_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Organizer who created the block.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `scope_group_key` VARCHAR(50) NULL COMMENT 'Optional batch key when blocking a zone creates one row per resource.',
  `notify_affected_customers` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  -- Source filtered index status = 'Active' -> ordinary MySQL composite index; queries must keep the predicate.
  -- Source INCLUDE (end_time) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_t_resource_blocked_time_slot_resource_time` (`status`, `resource_id`, `start_time`),
  KEY `ix_t_resource_blocked_time_slot_created_by` (`created_by`),
  CONSTRAINT `ck_t_resource_blocked_time_slot_status` CHECK (`status` IN ('Active', 'Removed')),
  CONSTRAINT `ck_t_resource_blocked_time_slot_notify_affected_customers` CHECK (`notify_affected_customers` IN (0, 1)),
  CONSTRAINT `ck_t_resource_blocked_time_slot_time` CHECK (end_time > start_time)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores time ranges when an Organizer blocks a resource (maintenance, internal event) so it cannot be booked.';

-- cfg_pricing_rule (source Pricing_Rule): Stores price adjustment rules of a workspace (peak hour, weekend, holiday) expressed as a multiplier on the base price.
-- Scope = Workspace, Resource_Type or resource_id; never type and resource simultaneously. Referenced resource/type must belong to workspace. Multiplier mode requires multiplier>0 and no fixed amount; Fixed_Addition requires multiplier=1 and nonnegative fixed_amount_per_unit. Resolve overlaps by specificity then priority; combine only explicit stackable rules. Snapshot applied rules at checkout.
CREATE TABLE `cfg_pricing_rule` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `workspace_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `resource_type_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'NULL = applies to all resource types of the workspace.',
  `name` VARCHAR(100) NOT NULL,
  `modifier_type` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL,
  `start_time` TIME(6) NULL COMMENT 'Local time; required for Peak_Hour.',
  `end_time` TIME(6) NULL COMMENT 'Local time; required for Peak_Hour. CHECK end_time > start_time.',
  `start_date` DATE NULL COMMENT 'Required for Holiday; optional effective-from for other types.',
  `end_date` DATE NULL COMMENT 'Required for Holiday; optional effective-to for other types.',
  `multiplier` DECIMAL(5,2) NOT NULL COMMENT '1.25 = +25%; 0.90 = -10%. CHECK multiplier > 0.',
  `is_active` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `resource_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `adjustment_mode` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Multiplier',
  `fixed_amount_per_unit` DECIMAL(18,2) NULL,
  `priority` INT NOT NULL DEFAULT 0,
  `is_stackable` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `version` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  -- Source INCLUDE (resource_type_id, resource_id, priority) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_cfg_pricing_rule_workspace` (`workspace_id`, `is_active`, `modifier_type`),
  KEY `ix_cfg_pricing_rule_resource_type_id` (`resource_type_id`),
  KEY `ix_cfg_pricing_rule_resource_id` (`resource_id`),
  CONSTRAINT `ck_cfg_pricing_rule_modifier_type` CHECK (`modifier_type` IN ('Peak_Hour', 'Weekend', 'Holiday')),
  CONSTRAINT `ck_cfg_pricing_rule_is_active` CHECK (`is_active` IN (0, 1)),
  CONSTRAINT `ck_cfg_pricing_rule_adjustment_mode` CHECK (`adjustment_mode` IN ('Multiplier', 'Fixed_Addition')),
  CONSTRAINT `ck_cfg_pricing_rule_is_stackable` CHECK (`is_stackable` IN (0, 1)),
  CONSTRAINT `ck_cfg_pricing_rule_version` CHECK (`version` >= 1),
  CONSTRAINT `ck_cfg_pricing_rule_scope` CHECK (NOT (resource_id IS NOT NULL AND resource_type_id IS NOT NULL)),
  CONSTRAINT `ck_cfg_pricing_rule_multiplier` CHECK (multiplier > 0),
  CONSTRAINT `ck_cfg_pricing_rule_fixed` CHECK (fixed_amount_per_unit >= 0),
  CONSTRAINT `ck_cfg_pricing_rule_adjustment` CHECK (adjustment_mode <> 'Fixed_Addition' OR fixed_amount_per_unit IS NOT NULL),
  CONSTRAINT `ck_cfg_pricing_rule_time` CHECK (modifier_type <> 'Peak_Hour' OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time >= '00:00:00' AND end_time < '24:00:00' AND end_time > start_time)),
  CONSTRAINT `ck_cfg_pricing_rule_dates` CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT `ck_cfg_pricing_rule_holiday` CHECK (modifier_type <> 'Holiday' OR (start_date IS NOT NULL AND end_date IS NOT NULL))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores price adjustment rules of a workspace (peak hour, weekend, holiday) expressed as a multiplier on the base price.';

-- cfg_discount_rule (source Discount_Rule): Stores discount rules, voucher codes and promotional campaigns created by Organizers (for their workspace) or by the Administrator (platform-wide).
-- One voucher/automatic discount selected per booking under documented precedence; its terms are snapshotted. Resource/type scope must match workspace; no simultaneous resource and type scope. Reserve usage in the booking transaction; count paid/completed use and unexpired pending reservations, releasing on expiry/cancel. Public campaigns stay in this table.
CREATE TABLE `cfg_discount_rule` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `workspace_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'NULL = platform-wide (Administrator).',
  `created_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Organizer or Administrator who created the rule.',
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(1000) NULL COMMENT 'Shown to Customers when the rule is a public campaign.',
  `banner_url` VARCHAR(500) NULL COMMENT 'Campaign banner for the Landing Page.',
  `is_public` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '1 = advertised as a promotional campaign (M17-UC21..UC26).',
  `code` VARCHAR(50) COLLATE utf8mb4_0900_bin NULL COMMENT 'Voucher code entered by the Customer; NULL for automatic discounts.',
  `discount_type` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL,
  `discount_value` DECIMAL(18,2) NOT NULL COMMENT 'Percent (0-100) or VND amount depending on discount_type.',
  `max_discount_amount` DECIMAL(18,2) NULL COMMENT 'Cap for Percent discounts (VND).',
  `min_booking_amount` DECIMAL(18,2) NULL COMMENT 'Minimum booking amount to be eligible (VND).',
  `usage_limit_total` INT NULL COMMENT 'NULL = unlimited.',
  `usage_limit_per_customer` INT NULL COMMENT 'NULL = unlimited.',
  `start_at` DATETIME(6) NOT NULL,
  `end_at` DATETIME(6) NOT NULL COMMENT 'CHECK end_at > start_at.',
  `status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Draft' COMMENT 'Draft = prepared but not usable or visible yet.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `resource_type_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `resource_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `min_duration_minutes` INT NULL COMMENT 'Nonnegative threshold for O13 volume discount; e.g. 300 = five hours.',
  `priority` INT NOT NULL DEFAULT 0,
  `version` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  -- Source filter code IS NOT NULL: MySQL UNIQUE already permits multiple NULL values.
  UNIQUE KEY `ux_cfg_discount_rule_code` (`code`),
  KEY `ix_cfg_discount_rule_workspace` (`workspace_id`, `status`, `start_at`, `end_at`),
  KEY `ix_cfg_discount_rule_created_by` (`created_by`),
  KEY `ix_cfg_discount_rule_resource_type_id` (`resource_type_id`),
  KEY `ix_cfg_discount_rule_resource_id` (`resource_id`),
  CONSTRAINT `ck_cfg_discount_rule_is_public` CHECK (`is_public` IN (0, 1)),
  CONSTRAINT `ck_cfg_discount_rule_discount_type` CHECK (`discount_type` IN ('Percent', 'Fixed_Amount')),
  CONSTRAINT `ck_cfg_discount_rule_status` CHECK (`status` IN ('Draft', 'Active', 'Inactive')),
  CONSTRAINT `ck_cfg_discount_rule_version` CHECK (`version` >= 1),
  CONSTRAINT `ck_cfg_discount_rule_scope` CHECK (NOT (resource_id IS NOT NULL AND resource_type_id IS NOT NULL)),
  CONSTRAINT `ck_cfg_discount_rule_value` CHECK (discount_value > 0 AND (discount_type <> 'Percent' OR discount_value <= 100)),
  CONSTRAINT `ck_cfg_discount_rule_limits` CHECK ((max_discount_amount IS NULL OR max_discount_amount >= 0) AND (min_booking_amount IS NULL OR min_booking_amount >= 0) AND (usage_limit_total IS NULL OR usage_limit_total > 0) AND (usage_limit_per_customer IS NULL OR usage_limit_per_customer > 0) AND (min_duration_minutes IS NULL OR min_duration_minutes > 0)),
  CONSTRAINT `ck_cfg_discount_rule_time` CHECK (end_at > start_at)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores discount rules, voucher codes and promotional campaigns created by Organizers (for their workspace) or by the Administrator (platform-wide).';

-- m_membership_plan (source Membership_Plan): Stores membership plans an Organizer sells, including the quota (hours/days) each purchase grants.
-- workspace_id NULL = valid in all workspaces of the Organizer (workspace scope, M15-UC09). A plan with subscriptions is deactivated, not deleted (M15-UC13/UC15). Changing a plan never changes existing subscriptions because they keep a snapshot (BR-21).
CREATE TABLE `m_membership_plan` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `organizer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `workspace_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'NULL = all workspaces of the Organizer.',
  `name` VARCHAR(100) NOT NULL,
  `price` DECIMAL(18,2) NOT NULL COMMENT 'VND.',
  `validity_days` INT NOT NULL COMMENT 'Days a subscription stays valid after activation.',
  `quota_unit` VARCHAR(10) COLLATE utf8mb4_0900_as_cs NOT NULL,
  `quota_amount` DECIMAL(10,2) NOT NULL COMMENT 'Quota granted per purchase.',
  `applicable_category` VARCHAR(10) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'All' COMMENT 'Which resource category the quota can be used for.',
  `benefits_desc` LONGTEXT NULL COMMENT 'Marketing text only; the real numbers are in quota_*.',
  `is_active` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Stop selling without deleting history.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  PRIMARY KEY (`id`),
  KEY `ix_m_membership_plan_organizer` (`organizer_id`, `is_active`),
  KEY `ix_m_membership_plan_workspace` (`workspace_id`, `is_active`),
  CONSTRAINT `ck_m_membership_plan_quota_unit` CHECK (`quota_unit` IN ('Hour', 'Day')),
  CONSTRAINT `ck_m_membership_plan_applicable_category` CHECK (`applicable_category` IN ('Desk', 'Room', 'All')),
  CONSTRAINT `ck_m_membership_plan_is_active` CHECK (`is_active` IN (0, 1)),
  CONSTRAINT `ck_m_membership_plan_terms` CHECK (price >= 0 AND validity_days > 0 AND quota_amount > 0)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores membership plans an Organizer sells, including the quota (hours/days) each purchase grants.';

-- t_membership_subscription (source Membership_Subscription): Stores a Customer subscription to a Membership Plan: validity period, price paid and quota balance.
-- Activate only from verified paid membership. All terms come from plan_snapshot; later plan edits do not change eligibility. quota_used includes completed consumption plus live reservations, not just live bookings. Check and update under version lock; restoration is idempotent. Fixed resource is optional and cannot override overlaps.
CREATE TABLE `t_membership_subscription` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `customer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `plan_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `renewed_from_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Previous subscription when this one is a renewal.',
  `start_date` DATETIME(6) NULL COMMENT 'Set when the subscription becomes Active.',
  `end_date` DATETIME(6) NULL COMMENT 'start_date + plan.validity_days.',
  `status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Pending_Payment',
  `price_paid` DECIMAL(18,2) NOT NULL COMMENT 'Price snapshot at purchase time.',
  `quota_total` DECIMAL(10,2) NOT NULL COMMENT 'Snapshot of plan.quota_amount.',
  `quota_used` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Reserved/consumed total; equals sum of unreversed Booking.quota_used_amount, INCLUDING Completed bookings. Cancel/expiry restoration is recorded once in Booking.quota_restored_at.',
  `version` INT NOT NULL DEFAULT 1 COMMENT 'Optimistic locking against concurrent quota deduction.',
  `cancelled_at` DATETIME(6) NULL COMMENT 'Stops future continuation; history is kept.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `plan_snapshot` JSON NOT NULL COMMENT 'Required immutable price, validity, quota_unit, category, workspace/organizer eligibility snapshot. CHECK (plan_snapshot IS NULL OR ISJSON(plan_snapshot) = 1).',
  `quota_consumed` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Cumulative consumed quota, includes Completed bookings. Updated atomically with Booking; no mutable plan lookup.',
  `dedicated_resource_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Optional fixed-seat benefit; enforce eligible workspace/type and availability.',
  PRIMARY KEY (`id`),
  KEY `ix_t_membership_subscription_customer` (`customer_id`, `status`),
  KEY `ix_t_membership_subscription_plan` (`plan_id`),
  KEY `ix_t_membership_subscription_renewed_from_id` (`renewed_from_id`),
  KEY `ix_t_membership_subscription_dedicated_resource_id` (`dedicated_resource_id`),
  CONSTRAINT `ck_t_membership_subscription_status` CHECK (`status` IN ('Pending_Payment', 'Active', 'Expired', 'Cancelled')),
  CONSTRAINT `ck_t_membership_subscription_version` CHECK (`version` >= 1),
  CONSTRAINT `ck_t_membership_subscription_terms` CHECK (price_paid >= 0 AND quota_total > 0 AND quota_used >= 0 AND quota_used <= quota_total AND quota_consumed >= 0 AND quota_consumed <= quota_used),
  CONSTRAINT `ck_t_membership_subscription_dates` CHECK (end_date IS NULL OR start_date IS NULL OR end_date > start_date),
  CONSTRAINT `ck_t_membership_subscription_active` CHECK (status <> 'Active' OR (start_date IS NOT NULL AND end_date IS NOT NULL))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores a Customer subscription to a Membership Plan: validity period, price paid and quota balance.';

-- cfg_platform_fee_rule (source Platform_Fee_Rule): Stores the platform commission rate NexSpace takes, with scope and effective period.
-- A13/A14 support percentage, fixed+percentage and tiers. Choose one effective matching rule per fee_type by specificity/priority; reject ambiguous ties. New version affects only future checkout. Booking/Payout snapshot actual rates/amounts; changing a rule never recalculates historic money. Gateway fees are configured project assumptions, not asserted PayOS rates.
CREATE TABLE `cfg_platform_fee_rule` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `name` VARCHAR(100) NOT NULL,
  `fee_percentage` DECIMAL(5,2) NOT NULL COMMENT 'CHECK 0-100.',
  `applies_to` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'All' COMMENT 'Scope of the rule.',
  `effective_from` DATETIME(6) NOT NULL COMMENT 'Start of validity (renamed from effective_date).',
  `effective_to` DATETIME(6) NULL COMMENT 'NULL = open-ended.',
  `status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Active',
  `created_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Administrator who created the rule.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `rule_code` VARCHAR(50) NULL,
  `fee_type` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Commission',
  `calculation_type` VARCHAR(30) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Percentage',
  `fixed_amount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `scope_criteria` JSON NULL COMMENT 'Versioned criteria with explicit workspace/organizer/resource categories; validate referenced IDs. Empty = all eligible. CHECK (scope_criteria IS NULL OR ISJSON(scope_criteria) = 1).',
  `tier_definition` JSON NULL COMMENT 'Only Tiered; ordered non-overlapping lower/upper thresholds and rates. CHECK (tier_definition IS NULL OR ISJSON(tier_definition) = 1).',
  `minimum_fee` DECIMAL(18,2) NULL,
  `maximum_fee` DECIMAL(18,2) NULL,
  `priority` INT NOT NULL DEFAULT 0,
  `version` INT NOT NULL DEFAULT 1,
  `updated_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`id`),
  -- Source INCLUDE (effective_to, fee_percentage, fixed_amount, priority) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_cfg_platform_fee_rule_effective` (`status`, `fee_type`, `applies_to`, `effective_from`),
  KEY `ix_cfg_platform_fee_rule_created_by` (`created_by`),
  -- Source filter rule_code IS NOT NULL: MySQL UNIQUE already permits multiple NULL values.
  UNIQUE KEY `ux_cfg_platform_fee_rule_rule_code` (`rule_code`),
  KEY `ix_cfg_platform_fee_rule_updated_by` (`updated_by`),
  CONSTRAINT `ck_cfg_platform_fee_rule_applies_to` CHECK (`applies_to` IN ('All', 'Booking', 'Membership')),
  CONSTRAINT `ck_cfg_platform_fee_rule_status` CHECK (`status` IN ('Active', 'Inactive')),
  CONSTRAINT `ck_cfg_platform_fee_rule_fee_type` CHECK (`fee_type` IN ('Commission', 'Service_Fee', 'Gateway_Fee', 'Cancellation_Share')),
  CONSTRAINT `ck_cfg_platform_fee_rule_calculation_type` CHECK (`calculation_type` IN ('Percentage', 'Fixed', 'Percentage_Plus_Fixed', 'Tiered')),
  CONSTRAINT `ck_cfg_platform_fee_rule_version` CHECK (`version` >= 1),
  CONSTRAINT `ck_cfg_platform_fee_rule_percentage` CHECK (fee_percentage BETWEEN 0 AND 100),
  CONSTRAINT `ck_cfg_platform_fee_rule_amounts` CHECK ((fixed_amount IS NULL OR fixed_amount >= 0) AND (minimum_fee IS NULL OR minimum_fee >= 0) AND (maximum_fee IS NULL OR maximum_fee >= 0) AND (minimum_fee IS NULL OR maximum_fee IS NULL OR maximum_fee >= minimum_fee)),
  CONSTRAINT `ck_cfg_platform_fee_rule_effective` CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT `ck_cfg_platform_fee_rule_tiers` CHECK (calculation_type <> 'Tiered' OR tier_definition IS NOT NULL)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores the platform commission rate NexSpace takes, with scope and effective period.';

-- t_booking (source Booking): Stores reservation identity, resource/time, price totals, approval/payment deadline, QR/check-in/out and cancellation. Immutable JSON terms are in Booking_Snapshot.
-- C06 holds for one snapshotted expiry. Pending_Approval reserves an eligible slot until approval_deadline_at; accept -> Pending_Payment with a new bounded deadline; reject/timeout -> release. Confirm only on verified full online payment or fully paid membership entitlement consumed under the approved business policy. Resource-overlap checks and quota/discount reservation occur in one transaction with resource lock. QR is software check-in; no smart-lock PIN/NFC provisioning. Reschedules lock old/new resources in stable order and audit immutable financial consequences. The four immutable JSON snapshots are in Booking_Snapshot, inserted in the same checkout transaction. List/calendar/overlap queries read Booking only; detail/refund queries join the snapshot by booking_id. Lifecycle, money totals, QR and one check-in/out stay in Booking.
CREATE TABLE `t_booking` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `booking_code` VARCHAR(30) COLLATE utf8mb4_0900_bin NOT NULL COMMENT 'Human-readable reference shown to users (MSG27).',
  `customer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `resource_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `workspace_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Intentional denormalization for fast per-workspace queries; must match the resource workspace.',
  `discount_rule_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Discount rule applied, if any (usage limits are counted from this column).',
  `subscription_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Membership subscription whose quota paid (part of) the booking.',
  `source` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Search' COMMENT 'Entry point of the booking; Recommendation gives the AI conversion rate (M19-UC06).',
  `start_time` DATETIME(6) NOT NULL COMMENT 'UTC. Active bookings of the same resource must not overlap.',
  `end_time` DATETIME(6) NOT NULL COMMENT 'UTC. CHECK end_time > start_time.',
  `price_type` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL COMMENT 'Billing unit applied.',
  `base_price` DECIMAL(18,2) NOT NULL COMMENT 'Unit price x number of units, before multiplier and discount.',
  `price_multiplier` DECIMAL(5,2) NOT NULL DEFAULT 1.00 COMMENT 'Multiplier from Pricing_Rule that was applied.',
  `discount_amount` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT 'Total discount = voucher/automatic discount plus monetary membership benefit. Keep >=0 and <= eligible subtotal; detailed sources in pricing_snapshot.',
  `quota_used_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Hours/days taken from the subscription quota; given back when the booking is cancelled or expires.',
  `tax_amount` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT 'Tax included in the final price (BR-34).',
  `service_fee_amount` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT 'Service fee charged to the Customer, included in the final price (BR-34).',
  `final_price` DECIMAL(18,2) NOT NULL COMMENT 'ROUND(base_price * price_multiplier + adjustment_amount + addon_amount - discount_amount + tax_amount + service_fee_amount,2). membership_discount_amount is already included in discount_amount; never subtract twice.',
  `platform_fee_amount` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT 'Commission snapshot from Platform_Fee_Rule, deducted from the Organizer payout.',
  `status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Pending_Payment' COMMENT 'Expired = hold/payment time ran out (BR-14).',
  `expires_at` DATETIME(6) NULL COMMENT 'Hold and payment deadline while Pending_Payment (BR-11, BR-14); kept afterwards for history.',
  `qr_token_hash` VARCHAR(255) COLLATE utf8mb4_0900_bin NULL COMMENT 'Hash of the signed random QR token (BR-38); created at Confirmed.',
  `qr_valid_from` DATETIME(6) NULL COMMENT 'Start of the check-in window (BR-16).',
  `qr_valid_until` DATETIME(6) NULL COMMENT 'End of the check-in window (BR-16).',
  `checked_in_at` DATETIME(6) NULL COMMENT 'Set once (BR-17); a second scan is rejected because it is already filled.',
  `checked_in_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Organizer staff who scanned the QR.',
  `checked_out_at` DATETIME(6) NULL,
  `checked_out_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Customer or Organizer who checked out.',
  `cancelled_at` DATETIME(6) NULL,
  `cancelled_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'User who cancelled; NULL when cancelled by the system.',
  `cancel_source` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NULL COMMENT 'Who/what caused the cancellation.',
  `cancel_reason` VARCHAR(500) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `created_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `guest_name` VARCHAR(100) NULL,
  `guest_email` VARCHAR(255) NULL,
  `guest_phone` VARCHAR(20) NULL,
  `company_name` VARCHAR(255) NULL,
  `billing_tax_code` VARCHAR(50) NULL,
  `visit_purpose` VARCHAR(500) NULL,
  `party_size` INT NOT NULL DEFAULT 1,
  `currency` CHAR(3) NOT NULL DEFAULT 'VND',
  `addon_amount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `adjustment_amount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `membership_discount_amount` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT 'Subset of discount_amount covered by prepaid entitlement; avoid subtracting twice.',
  `quota_restored_at` DATETIME(6) NULL,
  `platform_fee_rule_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `approved_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `approved_at` DATETIME(6) NULL,
  `approval_deadline_at` DATETIME(6) NULL,
  `rescheduled_from_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Optional reference if a reschedule creates a replacement; mutable reschedules use version+Audit_Log.',
  `version` INT NOT NULL DEFAULT 1,
  `qr_token_encrypted` VARCHAR(2000) COLLATE utf8mb4_0900_bin NULL COMMENT 'Encrypted signed QR token for authorized redisplay in C08/My Bookings; qr_token_hash validates scans. Never public/logged; erase/revoke after retention window.',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_t_booking_code` (`booking_code`),
  -- Source filtered index status IN ('Pending_Approval','Pending_Payment','Confirmed','Checked_In') -> ordinary MySQL composite index; queries must keep the predicate.
  -- Source INCLUDE (end_time, status, expires_at, approval_deadline_at) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_t_booking_resource_time` (`resource_id`, `status`, `start_time`, `end_time`),
  -- Source INCLUDE (booking_code, workspace_id, resource_id, status, final_price) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_t_booking_customer_start` (`customer_id`, `start_time` DESC, `id` DESC),
  -- Source INCLUDE (resource_id, end_time, booking_code, final_price, platform_fee_amount) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_t_booking_workspace_status_start` (`workspace_id`, `status`, `start_time`, `id`),
  -- Source filtered index status = 'Pending_Payment' -> ordinary MySQL composite index; queries must keep the predicate.
  KEY `ix_t_booking_expiry` (`status`, `expires_at`, `id`),
  -- Source filtered index subscription_id IS NOT NULL -> ordinary MySQL composite index; queries must keep the predicate.
  -- Source INCLUDE (quota_used_amount) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_t_booking_subscription` (`subscription_id`),
  -- Source INCLUDE (expires_at, approval_deadline_at) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_t_booking_discount_rule_id` (`discount_rule_id`, `customer_id`, `status`),
  KEY `ix_t_booking_checked_in_by` (`checked_in_by`),
  KEY `ix_t_booking_checked_out_by` (`checked_out_by`),
  KEY `ix_t_booking_cancelled_by` (`cancelled_by`),
  KEY `ix_t_booking_created_by` (`created_by`),
  KEY `ix_t_booking_platform_fee_rule_id` (`platform_fee_rule_id`),
  KEY `ix_t_booking_approved_by` (`approved_by`),
  KEY `ix_t_booking_rescheduled_from_id` (`rescheduled_from_id`),
  -- Source filtered index status = 'Pending_Approval' -> ordinary MySQL composite index; queries must keep the predicate.
  KEY `ix_t_booking_approval_expiry` (`status`, `approval_deadline_at`, `id`),
  -- Source filter qr_token_hash IS NOT NULL: MySQL UNIQUE already permits multiple NULL values.
  UNIQUE KEY `ux_t_booking_qr_token` (`qr_token_hash`),
  CONSTRAINT `ck_t_booking_source` CHECK (`source` IN ('Search', 'Recommendation', 'Favorite', 'Direct', 'Organizer_Manual', 'Administrator_Manual')),
  CONSTRAINT `ck_t_booking_price_type` CHECK (`price_type` IN ('Hourly', 'Daily', 'Monthly')),
  CONSTRAINT `ck_t_booking_status` CHECK (`status` IN ('Pending_Approval', 'Pending_Payment', 'Confirmed', 'Checked_In', 'Completed', 'Cancelled', 'Expired', 'No_Show')),
  CONSTRAINT `ck_t_booking_cancel_source` CHECK (`cancel_source` IN ('Customer', 'Organizer', 'Administrator', 'System')),
  CONSTRAINT `ck_t_booking_version` CHECK (`version` >= 1),
  CONSTRAINT `ck_t_booking_time` CHECK (end_time > start_time),
  CONSTRAINT `ck_t_booking_amounts` CHECK (base_price >= 0 AND price_multiplier > 0 AND discount_amount >= 0 AND quota_used_amount >= 0 AND tax_amount >= 0 AND service_fee_amount >= 0 AND final_price >= 0 AND platform_fee_amount >= 0 AND addon_amount >= 0 AND membership_discount_amount >= 0 AND membership_discount_amount <= discount_amount),
  CONSTRAINT `ck_t_booking_total` CHECK (final_price = ROUND(base_price * price_multiplier + adjustment_amount + addon_amount - discount_amount + tax_amount + service_fee_amount, 2)),
  CONSTRAINT `ck_t_booking_discount` CHECK (discount_amount <= base_price * price_multiplier + adjustment_amount + addon_amount),
  CONSTRAINT `ck_t_booking_quota` CHECK (quota_used_amount = 0 OR subscription_id IS NOT NULL),
  CONSTRAINT `ck_t_booking_party` CHECK (party_size > 0),
  CONSTRAINT `ck_t_booking_checkout` CHECK (checked_out_at IS NULL OR (checked_in_at IS NOT NULL AND checked_out_at >= checked_in_at)),
  CONSTRAINT `ck_t_booking_qr_window` CHECK (qr_valid_until IS NULL OR qr_valid_from IS NULL OR qr_valid_until > qr_valid_from),
  CONSTRAINT `ck_t_booking_qr_required` CHECK (status NOT IN ('Confirmed','Checked_In') OR (qr_token_hash IS NOT NULL AND qr_token_encrypted IS NOT NULL AND qr_valid_from IS NOT NULL AND qr_valid_until IS NOT NULL)),
  CONSTRAINT `ck_t_booking_hold` CHECK ((status <> 'Pending_Payment' OR expires_at IS NOT NULL) AND (status <> 'Pending_Approval' OR approval_deadline_at IS NOT NULL))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores reservation identity, resource/time, price totals, approval/payment deadline, QR/check-in/out and cancellation. Immutable JSON terms are in Booking_Snapshot.';

-- t_payment_transaction (source Payment_Transaction): Stores each payment attempt processed through PayOS, for a booking or for a membership purchase.
-- One row per PayOS payment attempt; retry creates a new attempt. Exactly one booking/subscription owner. Verified inbound event with received_amount=expected_amount can confirm only if target is still eligible; late payment or duplicate successful charge becomes a reconciliation case/refund, never reclaims someone else's slot. Reconcile using verified bank/gateway data. Receipt download is not evidence of government e-invoice certification.
CREATE TABLE `t_payment_transaction` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `booking_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'NULL for membership purchases.',
  `subscription_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'NULL for booking payments. CHECK exactly one of booking_id / subscription_id is set.',
  `expected_amount` DECIMAL(18,2) NOT NULL COMMENT 'Amount the system asked PayOS to collect.',
  `received_amount` DECIMAL(18,2) NULL COMMENT 'Amount reported by the gateway webhook.',
  `payment_gateway` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'PayOS' COMMENT 'Only PayOS is in the SRS; add values by migration if more gateways are introduced.',
  `gateway_order_code` BIGINT NULL COMMENT 'Order code sent to PayOS when the payment is created.',
  `gateway_transaction_id` VARCHAR(100) COLLATE utf8mb4_0900_bin NULL COMMENT 'Transaction reference from PayOS; unique when not NULL to block duplicate webhooks.',
  `status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Pending' COMMENT 'Cancelled/Expired added for Retry Payment (M10-UC02).',
  `webhook_signature` VARCHAR(255) NULL,
  `paid_at` DATETIME(6) NULL COMMENT 'Time PayOS confirmed the payment.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `payment_code` VARCHAR(30) NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'VND',
  `payment_method` VARCHAR(30) NULL COMMENT 'Method reported by configured PayOS adapter; do not assume direct Card/MoMo support.',
  `payment_link_id` VARCHAR(100) COLLATE utf8mb4_0900_bin NULL,
  `checkout_url` VARCHAR(1000) NULL,
  `qr_content` LONGTEXT NULL COMMENT 'Gateway-provided payment QR payload, unrelated to booking check-in QR.',
  `expires_at` DATETIME(6) NULL,
  `bank_reference` VARCHAR(100) NULL,
  `gateway_fee_amount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `reconciliation_status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Unreconciled',
  `reconciliation_note` VARCHAR(1000) NULL,
  `reconciled_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `reconciled_at` DATETIME(6) NULL,
  `receipt_number` VARCHAR(50) NULL,
  `receipt_snapshot` JSON NULL COMMENT 'Immutable receipt data; tax-invoice integration is separate from a receipt PDF. CHECK (receipt_snapshot IS NULL OR ISJSON(receipt_snapshot) = 1).',
  `receipt_url` VARCHAR(500) NULL,
  `failure_code` VARCHAR(50) NULL,
  `failure_message` VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  -- Source filter gateway_transaction_id IS NOT NULL: MySQL UNIQUE already permits multiple NULL values.
  UNIQUE KEY `ux_t_payment_transaction_gateway_tx` (`gateway_transaction_id`),
  -- Source filter gateway_order_code IS NOT NULL: MySQL UNIQUE already permits multiple NULL values.
  UNIQUE KEY `ux_t_payment_transaction_order_code` (`gateway_order_code`),
  -- Source INCLUDE (status, expected_amount, received_amount, paid_at) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_t_payment_transaction_booking` (`booking_id`, `created_at` DESC, `id` DESC),
  -- Source INCLUDE (status, expected_amount, received_amount, paid_at) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_t_payment_transaction_subscription` (`subscription_id`, `created_at` DESC, `id` DESC),
  -- Source filter payment_code IS NOT NULL: MySQL UNIQUE already permits multiple NULL values.
  UNIQUE KEY `ux_t_payment_transaction_payment_code` (`payment_code`),
  KEY `ix_t_payment_transaction_reconciled_by` (`reconciled_by`),
  KEY `ix_t_payment_transaction_reconciliation` (`reconciliation_status`, `created_at`),
  CONSTRAINT `ck_t_payment_transaction_payment_gateway` CHECK (`payment_gateway` IN ('PayOS')),
  CONSTRAINT `ck_t_payment_transaction_status` CHECK (`status` IN ('Pending', 'Success', 'Failed', 'Cancelled', 'Expired', 'Discrepancy')),
  CONSTRAINT `ck_t_payment_transaction_reconciliation_status` CHECK (`reconciliation_status` IN ('Unreconciled', 'Matched', 'Mismatch', 'Under_Review', 'Resolved')),
  CONSTRAINT `ck_t_payment_transaction_target` CHECK ((booking_id IS NOT NULL) + (subscription_id IS NOT NULL) = 1),
  CONSTRAINT `ck_t_payment_transaction_amounts` CHECK (expected_amount >= 0 AND (received_amount IS NULL OR received_amount >= 0) AND (gateway_fee_amount IS NULL OR gateway_fee_amount >= 0))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores each payment attempt processed through PayOS, for a booking or for a membership purchase.';

-- t_refund_request (source Refund_Request): Stores a refund request for a paid booking, with the calculated amount, decision and processing result.
-- Validate payment belongs to booking; reserve cumulative approved/processing/processed refunds under payment lock so total never exceeds verified received_amount. Mandatory decision note for approve/reject. Same idempotency key reused across retries; only verified processing result means Processed. Link facility-dispute evidence via Support_Case.
CREATE TABLE `t_refund_request` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `booking_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `payment_transaction_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Which successful payment is being refunded.',
  `source` VARCHAR(30) COLLATE utf8mb4_0900_as_cs NOT NULL COMMENT 'Origin of the refund.',
  `requested_amount` DECIMAL(18,2) NOT NULL,
  `approved_amount` DECIMAL(18,2) NULL COMMENT 'CHECK 0 <= approved_amount <= remaining refundable balance.',
  `penalty_amount` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT 'Amount withheld by cancellation policy.',
  `non_refundable_fee_amount` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT 'Fees that are not returned (e.g. service fee).',
  `reason` VARCHAR(500) NULL,
  `evidence_url` VARCHAR(500) NULL COMMENT 'Optional primary link for backwards compatibility. Multiple claim attachments are Support_Case_Evidence via support_case_id; do not duplicate their files.',
  `decision_reason` VARCHAR(500) NULL COMMENT 'Reason recorded when rejecting (M16-UC14).',
  `status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Pending' COMMENT 'Withdrawn = Customer withdrew; Failed = gateway refund failed.',
  `reviewed_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Organizer or Administrator who approved/rejected.',
  `reviewed_at` DATETIME(6) NULL,
  `gateway_refund_id` VARCHAR(100) NULL COMMENT 'Refund reference returned by PayOS.',
  `processed_at` DATETIME(6) NULL COMMENT 'Time the gateway refund completed.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `refund_code` VARCHAR(30) NULL,
  `requested_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `support_case_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `policy_snapshot` JSON NULL COMMENT 'Calculation basis, original paid total, previous refunds, penalty/fees, refundable amount and rule snapshot. CHECK (policy_snapshot IS NULL OR ISJSON(policy_snapshot) = 1).',
  `attempt_count` INT NOT NULL DEFAULT 0,
  `idempotency_key` VARCHAR(100) COLLATE utf8mb4_0900_bin NULL,
  `last_error` VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  KEY `ix_t_refund_request_booking` (`booking_id`),
  KEY `ix_t_refund_request_queue` (`status`, `created_at`),
  -- Source INCLUDE (approved_amount) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_t_refund_request_payment_transaction_id` (`payment_transaction_id`, `status`),
  KEY `ix_t_refund_request_reviewed_by` (`reviewed_by`),
  -- Source filter refund_code IS NOT NULL: MySQL UNIQUE already permits multiple NULL values.
  UNIQUE KEY `ux_t_refund_request_refund_code` (`refund_code`),
  -- Source filter idempotency_key IS NOT NULL: MySQL UNIQUE already permits multiple NULL values.
  UNIQUE KEY `ux_t_refund_request_idempotency_key` (`idempotency_key`),
  KEY `ix_t_refund_request_requested_by` (`requested_by`),
  KEY `ix_t_refund_request_support_case_id` (`support_case_id`),
  CONSTRAINT `ck_t_refund_request_source` CHECK (`source` IN ('Customer_Request', 'Organizer_Cancel', 'Payment_Discrepancy', 'Admin_Dispute')),
  CONSTRAINT `ck_t_refund_request_status` CHECK (`status` IN ('Pending', 'Approved', 'Rejected', 'Processing', 'Processed', 'Failed', 'Withdrawn')),
  CONSTRAINT `ck_t_refund_request_amounts` CHECK (requested_amount >= 0 AND (approved_amount IS NULL OR (approved_amount >= 0 AND approved_amount <= requested_amount)) AND penalty_amount >= 0 AND non_refundable_fee_amount >= 0),
  CONSTRAINT `ck_t_refund_request_attempts` CHECK (attempt_count >= 0)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores a refund request for a paid booking, with the calculated amount, decision and processing result.';

-- t_organizer_payout (source Organizer_Payout): Stores the settlement of a completed booking from the platform escrow to the Organizer: gross amount, commission, payout amount and status.
-- One settlement obligation per booking; retries/events are separate from the obligation. Eligible only after Completed and settlement window, no open blocking case or refund. Destination snapshot encrypted, not just masked. Payout/escrow is a platform accounting workflow; actual provider disbursement requires a verified adapter and capability, otherwise record audited manual bank transfer. Already-paid corrections become explicit signed adjustments and support cases.
CREATE TABLE `t_organizer_payout` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `organizer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `booking_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'One payout per booking.',
  `gross_amount` DECIMAL(18,2) NOT NULL COMMENT 'Amount earned by the Organizer before commission.',
  `platform_fee_amount` DECIMAL(18,2) NOT NULL COMMENT 'Commission kept by the platform (BR-32).',
  `payout_amount` DECIMAL(18,2) NOT NULL COMMENT 'gross_amount - platform_fee_amount - gateway_fee_amount - refund_deduction_amount + adjustment_amount; nonnegative before disbursement. Gross and refund bases must be reconciled consistently.',
  `status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Held' COMMENT 'Held = waiting period; Frozen = blocked by dispute/refund (BR-33).',
  `destination_account_masked` VARCHAR(60) NULL COMMENT 'Bank and last 4 digits used for the transfer (snapshot from Organizer_Profile).',
  `eligible_at` DATETIME(6) NOT NULL COMMENT 'End of the settlement waiting period.',
  `frozen_reason` VARCHAR(500) NULL,
  `support_case_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Dispute that froze the funds, if any.',
  `paid_at` DATETIME(6) NULL,
  `payout_reference` VARCHAR(100) NULL COMMENT 'Bank transfer reference.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `currency` CHAR(3) NOT NULL DEFAULT 'VND',
  `gateway_fee_amount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `refund_deduction_amount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `adjustment_amount` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT 'Signed authorized correction with linked Audit_Log.',
  `destination_account_snapshot` JSON NULL COMMENT 'Versioned JSON of routing metadata and encrypted sensitive account fields; UI only masked. Preserve destination across profile edits. CHECK (destination_account_snapshot IS NULL OR ISJSON(destination_account_snapshot) = 1).',
  `fee_snapshot` JSON NULL COMMENT 'CHECK (fee_snapshot IS NULL OR ISJSON(fee_snapshot) = 1).',
  `batch_reference` VARCHAR(100) NULL,
  `idempotency_key` VARCHAR(100) COLLATE utf8mb4_0900_bin NULL,
  `attempt_count` INT NOT NULL DEFAULT 0,
  `last_error` VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_t_organizer_payout_booking` (`booking_id`),
  KEY `ix_t_organizer_payout_organizer` (`organizer_id`, `status`),
  KEY `ix_t_organizer_payout_eligible` (`status`, `eligible_at`),
  KEY `ix_t_organizer_payout_support_case_id` (`support_case_id`),
  -- Source filter idempotency_key IS NOT NULL: MySQL UNIQUE already permits multiple NULL values.
  UNIQUE KEY `ux_t_organizer_payout_idempotency_key` (`idempotency_key`),
  CONSTRAINT `ck_t_organizer_payout_status` CHECK (`status` IN ('Held', 'Frozen', 'Released', 'Processing', 'Paid', 'Failed', 'Cancelled')),
  CONSTRAINT `ck_t_organizer_payout_amounts` CHECK (gross_amount >= 0 AND platform_fee_amount >= 0 AND gateway_fee_amount >= 0 AND refund_deduction_amount >= 0 AND payout_amount >= 0),
  CONSTRAINT `ck_t_organizer_payout_total` CHECK (payout_amount = gross_amount - platform_fee_amount - gateway_fee_amount - refund_deduction_amount + adjustment_amount),
  CONSTRAINT `ck_t_organizer_payout_attempts` CHECK (attempt_count >= 0)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores the settlement of a completed booking from the platform escrow to the Organizer: gross amount, commission, payout amount and status.';

-- t_customer_review (source Customer_Review): Stores the rating and review a Customer writes about a workspace after a completed booking, plus the Organizer reply.
-- One review per Completed booking; resource and reviewer derive through Booking. C02 aggregates workspace reviews; C04-B filters by Booking.resource_id and derives resource average. Only owning Organizer replies; deletion preserves replied_at so BR-25 one reply cannot be bypassed. Dimension ratings are validated JSON; photos are optional review attachments. Customer reply CTA needs UI alignment.
CREATE TABLE `t_customer_review` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `booking_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'UNIQUE: one review per booking. The reviewer is Booking.customer_id.',
  `workspace_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Kept to calculate the average rating of a workspace quickly.',
  `rating` INT NOT NULL,
  `content` LONGTEXT NULL,
  `organizer_reply` LONGTEXT NULL COMMENT 'One reply per review (BR-25); NULL after the reply is deleted.',
  `replied_at` DATETIME(6) NULL,
  `status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Published' COMMENT 'Moderation state (M12-UC10).',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `dimension_ratings` JSON NULL COMMENT 'Optional scores keyed by WiFi, Quietness, Ergonomics, Hospitality, Lighting; each 1..5. CHECK (dimension_ratings IS NULL OR ISJSON(dimension_ratings) = 1).',
  `photo_urls` JSON NULL COMMENT 'Optional small array of validated review-photo metadata; retained with review and never treated as resource gallery. CHECK (photo_urls IS NULL OR ISJSON(photo_urls) = 1).',
  `replied_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `reply_deleted_at` DATETIME(6) NULL,
  `moderated_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `moderated_at` DATETIME(6) NULL,
  `moderation_reason` VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_t_customer_review_booking` (`booking_id`),
  KEY `ix_t_customer_review_replied_by` (`replied_by`),
  KEY `ix_t_customer_review_moderated_by` (`moderated_by`),
  -- Source INCLUDE (rating, booking_id) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_t_customer_review_public_ratings` (`workspace_id`, `status`, `created_at` DESC, `id` DESC),
  CONSTRAINT `ck_t_customer_review_rating` CHECK (`rating` IN (1, 2, 3, 4, 5)),
  CONSTRAINT `ck_t_customer_review_status` CHECK (`status` IN ('Published', 'Reported', 'Hidden', 'Removed'))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores the rating and review a Customer writes about a workspace after a completed booking, plus the Organizer reply.';

-- cfg_notification_template (source Notification_Template): Stores the message templates (subject and body with placeholders) used to build notifications for each event, channel and language.
-- Only one Active template per (event_type, channel, language). Placeholders such as {booking_code} are filled at send time; required placeholders must not be removed (M14-UC16). A template used by past notifications is deactivated, not deleted (M14-UC17). Example event_type values: BOOKING_CONFIRMED, PAYMENT_RESULT, BOOKING_REMINDER, BOOKING_CANCELLED, NEW_BOOKING, REFUND_REQUESTED, REFUND_RESULT, ORGANIZER_DECISION, WORKSPACE_DECISION.
CREATE TABLE `cfg_notification_template` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `event_type` VARCHAR(50) NOT NULL COMMENT 'Business event that triggers the notification.',
  `channel` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL,
  `language` VARCHAR(5) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'en',
  `subject_template` VARCHAR(255) NOT NULL COMMENT 'Title / email subject with placeholders.',
  `body_template` LONGTEXT NOT NULL COMMENT 'Message body with placeholders.',
  `status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Active',
  `created_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Administrator who created the template.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  PRIMARY KEY (`id`),
  `_mysql_unique_4` TINYINT GENERATED ALWAYS AS (CASE WHEN status = 'Active' THEN 1 ELSE NULL END) VIRTUAL,
  -- Source filtered UNIQUE: status = 'Active'; nullable discriminator preserves uniqueness only for matching rows.
  UNIQUE KEY `ux_cfg_notification_template_active` (`event_type`, `channel`, `language`, `_mysql_unique_4`),
  KEY `ix_cfg_notification_template_created_by` (`created_by`),
  CONSTRAINT `ck_cfg_notification_template_channel` CHECK (`channel` IN ('In_App', 'Email', 'Push')),
  CONSTRAINT `ck_cfg_notification_template_language` CHECK (`language` IN ('en', 'vi')),
  CONSTRAINT `ck_cfg_notification_template_status` CHECK (`status` IN ('Active', 'Inactive'))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores the message templates (subject and body with placeholders) used to build notifications for each event, channel and language.';

-- t_user_notification (source User_Notification): Stores one in-app notification per recipient, message snapshot, source reference and read state. External channel delivery is in Notification_Delivery.
-- One immutable message snapshot per recipient; event_key with user_id prevents duplicate business notifications. Read/delete state belongs to the inbox row. Email and Push each have one Notification_Delivery row when required, with independent retry counters, error and next retry time. Create notification and required delivery rows in the same transaction as the event (durable outbox). Delivery failure never changes booking/payment state. Retention must not remove live delivery jobs.
CREATE TABLE `t_user_notification` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Recipient.',
  `template_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Template that produced the text; NULL for ad-hoc system messages.',
  `type` VARCHAR(30) COLLATE utf8mb4_0900_as_cs NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `related_entity_type` VARCHAR(50) NULL COMMENT 'Polymorphic reference, e.g. Booking. Lets the UI open the related object.',
  `related_entity_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Id of the related object; no hard FK.',
  `event_key` VARCHAR(150) COLLATE utf8mb4_0900_bin NULL COMMENT 'De-duplication key such as BOOKING_CONFIRMED:bkg-001.',
  `is_read` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `read_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  PRIMARY KEY (`id`),
  -- Source INCLUDE (is_read, title, type) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_t_user_notification_inbox` (`user_id`, `created_at` DESC, `id` DESC),
  -- Source filter event_key IS NOT NULL: MySQL UNIQUE already permits multiple NULL values.
  UNIQUE KEY `ux_t_user_notification_event` (`user_id`, `event_key`),
  KEY `ix_t_user_notification_template_id` (`template_id`),
  -- Source filtered index is_read = 0 -> ordinary MySQL composite index; queries must keep the predicate.
  KEY `ix_t_user_notification_unread` (`user_id`, `is_read`, `created_at` DESC, `id` DESC),
  CONSTRAINT `ck_t_user_notification_type` CHECK (`type` IN ('Booking', 'Payment', 'Refund', 'Organizer_Application', 'Workspace_Review', 'Membership', 'Promotion', 'System')),
  CONSTRAINT `ck_t_user_notification_is_read` CHECK (`is_read` IN (0, 1))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores one in-app notification per recipient, message snapshot, source reference and read state. External channel delivery is in Notification_Delivery.';

-- t_support_case (source Support_Case): Stores user reports, complaints/disputes and system-generated security alerts, and how the Administrator resolved them.
-- Complaints and system alerts share one workflow; alert-specific fields nullable on user cases. Target references are application-validated; related booking must match dispute/payment target. Critical priority supports A18. Financial resolution creates Refund_Request, not a blind balance update. Resolutions audit decision and release frozen payout only when all blocking cases are closed. No physical/legal arbitration or network/IoT maintenance service.
CREATE TABLE `t_support_case` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `case_code` VARCHAR(30) COLLATE utf8mb4_0900_bin NOT NULL COMMENT 'Human-readable case number (MSG48 shows #{case_id}).',
  `case_type` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL COMMENT 'System_Alert = raised automatically by backend rules.',
  `reporter_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'NULL only for System_Alert. CHECK reporter_id IS NOT NULL OR case_type = System_Alert.',
  `target_entity` VARCHAR(30) COLLATE utf8mb4_0900_as_cs NOT NULL,
  `target_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'No hard FK because it points to several tables; the application validates existence.',
  `booking_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Related booking for disputes; used to freeze the payout (BR-33).',
  `category` VARCHAR(30) COLLATE utf8mb4_0900_as_cs NOT NULL,
  `reason` LONGTEXT NOT NULL,
  `priority` VARCHAR(10) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Normal',
  `status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Open',
  `resolution_action` VARCHAR(30) COLLATE utf8mb4_0900_as_cs NULL COMMENT 'Outcome applied by the Administrator (M17-UC08, UC14).',
  `resolution_note` LONGTEXT NULL,
  `resolved_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Administrator who resolved the case.',
  `resolved_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `assigned_to` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `assigned_at` DATETIME(6) NULL,
  `sla_due_at` DATETIME(6) NULL,
  `first_response_at` DATETIME(6) NULL,
  `anomaly_type` VARCHAR(50) NULL,
  `detector_rule_code` VARCHAR(100) NULL,
  `risk_score` DECIMAL(5,2) NULL COMMENT '0..100; optional rule-based value, not a promised AI service.',
  `detection_context` JSON NULL COMMENT 'Snapshot of counts/time window, IP/device/session/location evidence; no live IoT data assumed. CHECK (detection_context IS NULL OR ISJSON(detection_context) = 1).',
  `resolution_amount` DECIMAL(18,2) NULL,
  `version` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_t_support_case_code` (`case_code`),
  KEY `ix_t_support_case_target` (`target_entity`, `target_id`),
  KEY `ix_t_support_case_queue` (`status`, `priority`, `created_at`),
  KEY `ix_t_support_case_reporter_id` (`reporter_id`),
  KEY `ix_t_support_case_booking_id` (`booking_id`),
  KEY `ix_t_support_case_resolved_by` (`resolved_by`),
  KEY `ix_t_support_case_assigned_to` (`assigned_to`),
  KEY `ix_t_support_case_triage` (`case_type`, `status`, `priority`, `sla_due_at`),
  CONSTRAINT `ck_t_support_case_case_type` CHECK (`case_type` IN ('Platform_Report', 'Complaint_Dispute', 'System_Alert')),
  CONSTRAINT `ck_t_support_case_target_entity` CHECK (`target_entity` IN ('Workspace', 'Customer_Review', 'App_User', 'Booking', 'Payment_Transaction', 'Refund_Request')),
  CONSTRAINT `ck_t_support_case_category` CHECK (`category` IN ('Policy_Violation', 'Fraud', 'Inappropriate_Content', 'Service_Quality', 'Payment_Issue', 'Suspicious_Login', 'Abnormal_Booking', 'Payment_Anomaly', 'Other')),
  CONSTRAINT `ck_t_support_case_priority` CHECK (`priority` IN ('Low', 'Normal', 'High', 'Critical')),
  CONSTRAINT `ck_t_support_case_status` CHECK (`status` IN ('Open', 'Under_Review', 'Resolved', 'Dismissed')),
  CONSTRAINT `ck_t_support_case_resolution_action` CHECK (`resolution_action` IN ('Dismiss', 'Warn', 'Restrict', 'Hide_Content', 'Refund', 'Release_Funds', 'Route_To_Moderation', 'Lock_User', 'Whitelist', 'Adjust_Sensitivity')),
  CONSTRAINT `ck_t_support_case_version` CHECK (`version` >= 1),
  CONSTRAINT `ck_t_support_case_reporter` CHECK (reporter_id IS NOT NULL OR case_type = 'System_Alert'),
  CONSTRAINT `ck_t_support_case_resolution` CHECK (resolution_amount >= 0)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores user reports, complaints/disputes and system-generated security alerts, and how the Administrator resolved them.';

-- t_support_case_evidence (source Support_Case_Evidence): Stores the evidence files and notes attached to a support case by the people involved.
-- Evidence can be added only while the case state allows it (M17-UC11). BR-37 applies to uploads (<= 5 MB, JPG/PNG/PDF). Kept as a child table (not a JSON list) because one case has many files from both parties and each file needs its uploader and time (1NF).
CREATE TABLE `t_support_case_evidence` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `support_case_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `uploaded_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'NULL only for System_Log evidence produced by backend; otherwise required authenticated participant.',
  `file_url` VARCHAR(500) NULL COMMENT 'Required for File; NULL for Text/System_Log. CHECK type-dependent file/content requirements.',
  `description` VARCHAR(500) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Row creation time (UTC).',
  `evidence_type` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'File',
  `file_name` VARCHAR(255) NULL,
  `file_size_kb` INT NULL,
  `mime_type` VARCHAR(50) NULL,
  `metadata_json` JSON NULL COMMENT 'Optional capture time/hash/EXIF, treated as submitted evidence, not trusted proof by itself. CHECK (metadata_json IS NULL OR ISJSON(metadata_json) = 1).',
  PRIMARY KEY (`id`),
  KEY `ix_t_support_case_evidence_case` (`support_case_id`, `created_at`),
  KEY `ix_t_support_case_evidence_uploaded_by` (`uploaded_by`),
  CONSTRAINT `ck_t_support_case_evidence_evidence_type` CHECK (`evidence_type` IN ('File', 'Text', 'System_Log')),
  CONSTRAINT `ck_t_support_case_evidence_file_size_kb` CHECK (`file_size_kb` > 0 AND `file_size_kb` <= 5120),
  CONSTRAINT `ck_t_support_case_evidence_content` CHECK ((evidence_type = 'File' AND NULLIF(TRIM(file_url),'') IS NOT NULL AND uploaded_by IS NOT NULL) OR (evidence_type IN ('Text','System_Log') AND file_url IS NULL AND NULLIF(TRIM(description),'') IS NOT NULL AND (evidence_type = 'System_Log' OR uploaded_by IS NOT NULL)))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores the evidence files and notes attached to a support case by the people involved.';

-- log_audit_log (source Audit_Log): Records sensitive actions and booking status changes (who, what, when, old/new value) so they are traceable.
-- Append-only through a restricted writer role. Sensitive actions contain actor, UTC timestamp, action, target and reason. Failed authentication can have no entity_id. Redact OTP/token/secret/identity/bank values. No administrator UI edit/delete. Hash proof is optional; do not claim certified SOC2/HSM/Merkle infrastructure from a mockup.
CREATE TABLE `log_audit_log` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'NULL when the action was performed by the system or a webhook.',
  `actor_type` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'User' COMMENT 'Who acted when user_id is NULL.',
  `module` VARCHAR(50) NOT NULL COMMENT 'Business module, e.g. Workspace, Booking, Payment, Authentication.',
  `action` VARCHAR(100) NOT NULL COMMENT 'Example: APPROVE_WORKSPACE.',
  `entity_type` VARCHAR(50) NOT NULL COMMENT 'Polymorphic reference: type of the affected object.',
  `entity_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Nullable for authentication failures before a user/entity exists; retain target key in redacted new_value. Entity-scoped business mutations must provide it.',
  `old_value` JSON NULL COMMENT 'CHECK (old_value IS NULL OR ISJSON(old_value) = 1).',
  `new_value` JSON NULL COMMENT 'CHECK (new_value IS NULL OR ISJSON(new_value) = 1).',
  `reason` VARCHAR(500) NULL COMMENT 'Business reason, e.g. cancellation or rejection reason.',
  `severity` VARCHAR(10) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Info',
  `result` VARCHAR(10) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Success',
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Time of the action (renamed from timestamp).',
  `user_agent` VARCHAR(1000) NULL,
  `session_reference` VARCHAR(100) NULL,
  `request_id` VARCHAR(100) NULL,
  `integrity_hash` VARCHAR(64) COLLATE utf8mb4_0900_bin NULL COMMENT 'Optional tamper-evidence of canonical payload; not a claim of HSM/SOC2 certification.',
  PRIMARY KEY (`id`),
  KEY `ix_log_audit_log_entity` (`entity_type`, `entity_id`, `created_at`),
  KEY `ix_log_audit_log_user_created` (`user_id`, `created_at`),
  KEY `ix_log_audit_log_module_created` (`module`, `severity`, `created_at`),
  CONSTRAINT `ck_log_audit_log_actor_type` CHECK (`actor_type` IN ('User', 'System', 'Payment_Webhook')),
  CONSTRAINT `ck_log_audit_log_severity` CHECK (`severity` IN ('Info', 'Warning', 'Critical')),
  CONSTRAINT `ck_log_audit_log_result` CHECK (`result` IN ('Success', 'Failure'))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Records sensitive actions and booking status changes (who, what, when, old/new value) so they are traceable.';

-- cfg_platform_setting (source Platform_Setting): Stores global business and operational parameters that the Administrator can change without a code release.
-- Backend parses and validates value_type, bounds/pattern, role and required reason; audit previous/new value. Version changes affect new intents, not existing Booking.expires_at or fee snapshots. Use booking_hold_duration_minutes consistently; baseline 10, no independent reset on C06->C07. Store public holiday date lists as versioned JSON settings until a calendar table is needed.
CREATE TABLE `cfg_platform_setting` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Surrogate primary key (UUID).',
  `setting_key` VARCHAR(100) COLLATE utf8mb4_0900_bin NOT NULL COMMENT 'Stable key used by the code.',
  `setting_value` VARCHAR(500) NOT NULL COMMENT 'Stored as text and parsed according to value_type.',
  `value_type` VARCHAR(10) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'String',
  `description` VARCHAR(255) NULL,
  `updated_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Administrator who last changed it; NULL for seed data.',
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'Last modification time (UTC); refreshed on every update.',
  `category` VARCHAR(30) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Booking',
  `scope` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Global',
  `min_value` DECIMAL(18,6) NULL,
  `max_value` DECIMAL(18,6) NULL,
  `validation_pattern` VARCHAR(255) NULL,
  `is_sensitive` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'UI/export mask sensitive values; secrets normally live in secret manager, not this table.',
  `requires_reason` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `version` INT NOT NULL DEFAULT 1,
  `updated_reason` VARCHAR(1000) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_cfg_platform_setting_key` (`setting_key`),
  KEY `ix_cfg_platform_setting_updated_by` (`updated_by`),
  CONSTRAINT `ck_cfg_platform_setting_value_type` CHECK (`value_type` IN ('Integer', 'Decimal', 'String', 'Boolean')),
  CONSTRAINT `ck_cfg_platform_setting_category` CHECK (`category` IN ('Booking', 'Payment', 'Notification', 'Maintenance', 'Security', 'Upload', 'Tax')),
  CONSTRAINT `ck_cfg_platform_setting_scope` CHECK (`scope` IN ('Global')),
  CONSTRAINT `ck_cfg_platform_setting_is_sensitive` CHECK (`is_sensitive` IN (0, 1)),
  CONSTRAINT `ck_cfg_platform_setting_requires_reason` CHECK (`requires_reason` IN (0, 1)),
  CONSTRAINT `ck_cfg_platform_setting_version` CHECK (`version` >= 1),
  CONSTRAINT `ck_cfg_platform_setting_bounds` CHECK (min_value IS NULL OR max_value IS NULL OR min_value <= max_value)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores global business and operational parameters that the Administrator can change without a code release.';

-- t_user_verification_challenge (source User_Verification_Challenge): Stores each expiring, single-use email/phone verification or password-reset challenge.
-- Atomic consume WHERE consumed_at IS NULL AND invalidated_at IS NULL AND expires_at > now AND attempt_count < max_attempts. Resend invalidates older active proof in the same transaction. Enforce rate limits outside this table; anonymize expired challenges under retention policy.
CREATE TABLE `t_user_verification_challenge` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'SQL Server UNIQUEIDENTIFIER; sequential UUID recommended.',
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `purpose` VARCHAR(30) COLLATE utf8mb4_0900_as_cs NOT NULL,
  `destination` VARCHAR(255) NOT NULL COMMENT 'Normalized email or phone. Never reveal account existence in recovery response.',
  `proof_hash` VARCHAR(255) COLLATE utf8mb4_0900_bin NOT NULL COMMENT 'HMAC of OTP with a server-side secret, or hash of a high-entropy token; never raw OTP.',
  `expires_at` DATETIME(6) NOT NULL,
  `attempt_count` INT NOT NULL DEFAULT 0,
  `max_attempts` INT NOT NULL DEFAULT 5,
  `resend_available_at` DATETIME(6) NULL,
  `consumed_at` DATETIME(6) NULL,
  `invalidated_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)),
  PRIMARY KEY (`id`),
  -- Source filtered index consumed_at IS NULL AND invalidated_at IS NULL -> ordinary MySQL composite index; queries must keep the predicate.
  -- Source INCLUDE (attempt_count, max_attempts, consumed_at, invalidated_at) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_t_user_verification_challenge_active_lookup` (`destination`, `purpose`, `expires_at`),
  KEY `ix_t_user_verification_challenge_user_id` (`user_id`),
  CONSTRAINT `ck_t_user_verification_challenge_purpose` CHECK (`purpose` IN ('Email_Verification', 'Password_Reset', 'Phone_Verification', 'MFA_Login')),
  CONSTRAINT `ck_t_user_verification_challenge_attempts` CHECK (attempt_count >= 0 AND max_attempts > 0 AND attempt_count <= max_attempts),
  CONSTRAINT `ck_t_user_verification_challenge_expiry` CHECK (expires_at > created_at)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores each expiring, single-use email/phone verification or password-reset challenge.';

-- cfg_role_permission (source Role_Permission): Stores editable permission mappings for the three fixed business roles.
-- UNIQUE(role, permission_key). Fixed roles do not require a Role table. Save a batch of mappings atomically with Audit_Log. Deny by default; business invariants and tenant scope remain mandatory regardless of toggles. Protect administrator recovery permissions.
CREATE TABLE `cfg_role_permission` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'SQL Server UNIQUEIDENTIFIER; sequential UUID recommended.',
  `role` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL,
  `permission_key` VARCHAR(100) COLLATE utf8mb4_0900_bin NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `description` VARCHAR(500) NULL,
  `is_allowed` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `scope` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Own',
  `guard_policy` VARCHAR(50) NULL COMMENT 'Backend-enforced prerequisite such as Organizer_Approved; cannot weaken BR-05/06/29.',
  `updated_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)),
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_cfg_role_permission_role_permission` (`role`, `permission_key`),
  KEY `ix_cfg_role_permission_updated_by` (`updated_by`),
  CONSTRAINT `ck_cfg_role_permission_role` CHECK (`role` IN ('Customer', 'Organizer', 'Administrator')),
  CONSTRAINT `ck_cfg_role_permission_is_allowed` CHECK (`is_allowed` IN (0, 1)),
  CONSTRAINT `ck_cfg_role_permission_scope` CHECK (`scope` IN ('Own', 'Public', 'Platform'))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores editable permission mappings for the three fixed business roles.';

-- rel_resource_amenity (source Resource_Amenity): Links a physical bookable resource to its specific amenities and hardware specifications.
-- Composite PK(resource_id, amenity_id). Workspace amenities and resource amenities represent different scopes; a shared coffee bar is not a monitor on every desk. Resource scope must be respected. Add-on price nonnegative.
CREATE TABLE `rel_resource_amenity` (
  `resource_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `amenity_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `details` VARCHAR(500) NULL,
  `is_included` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `hourly_addon_price` DECIMAL(18,2) NULL COMMENT 'NULL/0 = included. Selected paid add-ons are captured in Booking_Snapshot.selected_addons_snapshot.',
  PRIMARY KEY (`resource_id`, `amenity_id`),
  KEY `ix_rel_resource_amenity_amenity_id` (`amenity_id`),
  CONSTRAINT `ck_rel_resource_amenity_is_included` CHECK (`is_included` IN (0, 1)),
  CONSTRAINT `ck_rel_resource_amenity_price` CHECK (hourly_addon_price >= 0)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Links a physical bookable resource to its specific amenities and hardware specifications.';

-- m_resource_media (source Resource_Media): Stores photos and supported 360-degree media belonging to one specific seat or room.
-- One ready Image cover per resource via filtered unique index. Do not reuse workspace cover as a resource photo unless explicitly assigned. Size/type follow Platform_Setting baseline BR-37; no AR hardware implementation is assumed.
CREATE TABLE `m_resource_media` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'SQL Server UNIQUEIDENTIFIER; sequential UUID recommended.',
  `resource_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `media_url` VARCHAR(500) NOT NULL,
  `media_type` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Image',
  `caption` VARCHAR(255) NULL,
  `is_cover` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `display_order` INT NOT NULL DEFAULT 0,
  `file_size_kb` INT NOT NULL,
  `mime_type` VARCHAR(50) COLLATE utf8mb4_0900_as_cs NOT NULL,
  `pixel_width` INT NULL,
  `pixel_height` INT NULL,
  `processing_status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Ready',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)),
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)),
  PRIMARY KEY (`id`),
  `_mysql_unique_5` TINYINT GENERATED ALWAYS AS (CASE WHEN is_cover = 1 AND media_type = 'Image' AND processing_status = 'Ready' THEN 1 ELSE NULL END) VIRTUAL,
  -- Source filtered UNIQUE: is_cover = 1 AND media_type = 'Image' AND processing_status = 'Ready'; nullable discriminator preserves uniqueness only for matching rows.
  UNIQUE KEY `ux_m_resource_media_one_cover` (`resource_id`, `_mysql_unique_5`),
  -- Source INCLUDE (media_url, media_type, processing_status, is_cover) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_m_resource_media_resource_order` (`resource_id`, `display_order`, `id`),
  CONSTRAINT `ck_m_resource_media_media_type` CHECK (`media_type` IN ('Image', '360_Degree')),
  CONSTRAINT `ck_m_resource_media_is_cover` CHECK (`is_cover` IN (0, 1)),
  CONSTRAINT `ck_m_resource_media_file_size_kb` CHECK (`file_size_kb` > 0 AND `file_size_kb` <= 5120),
  CONSTRAINT `ck_m_resource_media_mime_type` CHECK (`mime_type` IN ('image/jpeg', 'image/png')),
  CONSTRAINT `ck_m_resource_media_pixel_width` CHECK (`pixel_width` > 0),
  CONSTRAINT `ck_m_resource_media_pixel_height` CHECK (`pixel_height` > 0),
  CONSTRAINT `ck_m_resource_media_processing_status` CHECK (`processing_status` IN ('Processing', 'Ready', 'Failed'))
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores photos and supported 360-degree media belonging to one specific seat or room.';

-- log_payment_gateway_event (source Payment_Gateway_Event): Stores immutable inbound callbacks and outbound processing results for payment, refund or payout.
-- CHECK exactly one payment/refund/payout owner. UNIQUE(provider,event_key) is the deduplication boundary; do not rewrite applied events. Validate signature/amount/owner/state before applying in the same transaction. Failed verification retained but cannot confirm booking. Event retries use processing state, never duplicate money. Manual_Bank only for documented payout/reconciliation result, not customer cash payment.
CREATE TABLE `log_payment_gateway_event` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'SQL Server UNIQUEIDENTIFIER; sequential UUID recommended.',
  `payment_transaction_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `refund_request_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `organizer_payout_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `provider` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'PayOS',
  `event_key` VARCHAR(150) COLLATE utf8mb4_0900_bin NOT NULL,
  `event_type` VARCHAR(30) COLLATE utf8mb4_0900_as_cs NOT NULL,
  `direction` VARCHAR(10) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Inbound',
  `signature_valid` TINYINT UNSIGNED NULL,
  `payload_json` JSON NULL COMMENT 'Redacted payload; exclude credentials, card data and bank secrets. CHECK (payload_json IS NULL OR ISJSON(payload_json) = 1).',
  `payload_hash` VARCHAR(64) COLLATE utf8mb4_0900_bin NOT NULL,
  `processing_status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Received',
  `processing_note` VARCHAR(1000) NULL,
  `provider_occurred_at` DATETIME(6) NULL,
  `received_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)),
  `processed_at` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_log_payment_gateway_event_provider_event` (`provider`, `event_key`),
  KEY `ix_log_payment_gateway_event_payment_transaction_id` (`payment_transaction_id`),
  KEY `ix_log_payment_gateway_event_refund_request_id` (`refund_request_id`),
  KEY `ix_log_payment_gateway_event_organizer_payout_id` (`organizer_payout_id`),
  KEY `ix_log_payment_gateway_event_processing` (`processing_status`, `received_at`),
  CONSTRAINT `ck_log_payment_gateway_event_provider` CHECK (`provider` IN ('PayOS', 'Manual_Bank')),
  CONSTRAINT `ck_log_payment_gateway_event_event_type` CHECK (`event_type` IN ('Payment_Update', 'Refund_Result', 'Payout_Result', 'Reconciliation')),
  CONSTRAINT `ck_log_payment_gateway_event_direction` CHECK (`direction` IN ('Inbound', 'Outbound')),
  CONSTRAINT `ck_log_payment_gateway_event_signature_valid` CHECK (`signature_valid` IN (0, 1)),
  CONSTRAINT `ck_log_payment_gateway_event_processing_status` CHECK (`processing_status` IN ('Received', 'Applied', 'Ignored', 'Rejected', 'Failed')),
  CONSTRAINT `ck_log_payment_gateway_event_target` CHECK ((payment_transaction_id IS NOT NULL) + (refund_request_id IS NOT NULL) + (organizer_payout_id IS NOT NULL) = 1)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores immutable inbound callbacks and outbound processing results for payment, refund or payout.';

-- rel_review_reaction (source Review_Reaction): Stores one helpful vote from one Customer on one published review.
-- Composite PK(review_id, customer_id) prevents duplicate helpful votes. Remove row on undo. Customer cannot vote on own review. Helpful count is COUNT, not a separately maintained counter.
CREATE TABLE `rel_review_reaction` (
  `review_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `customer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)),
  PRIMARY KEY (`review_id`, `customer_id`),
  KEY `ix_rel_review_reaction_customer_id` (`customer_id`)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores one helpful vote from one Customer on one published review.';

-- t_support_case_message (source Support_Case_Message): Stores the timeline of customer, organizer, administrator and system messages on a support case.
-- Messages are append-only; corrections are new messages. sender_id NULL only for System. Participant access limited to reporter, owning Organizer and authorized Admin; Admin_Only notes never shown to customers.
CREATE TABLE `t_support_case_message` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'SQL Server UNIQUEIDENTIFIER; sequential UUID recommended.',
  `support_case_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `sender_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `sender_type` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'User',
  `visibility` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Participants',
  `body` LONGTEXT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)),
  PRIMARY KEY (`id`),
  KEY `ix_t_support_case_message_sender_id` (`sender_id`),
  -- Source INCLUDE (sender_id, sender_type, visibility) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_t_support_case_message_timeline` (`support_case_id`, `created_at`, `id`),
  CONSTRAINT `ck_t_support_case_message_sender_type` CHECK (`sender_type` IN ('User', 'System')),
  CONSTRAINT `ck_t_support_case_message_visibility` CHECK (`visibility` IN ('Participants', 'Admin_Only')),
  CONSTRAINT `ck_t_support_case_message_sender` CHECK (sender_type = 'System' OR sender_id IS NOT NULL),
  CONSTRAINT `ck_t_support_case_message_body` CHECK (CHAR_LENGTH(TRIM(body)) > 0)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores the timeline of customer, organizer, administrator and system messages on a support case.';

-- log_recommendation_event (source Recommendation_Event): Stores recommendation impressions, clicks and attributed bookings for the SRS performance metrics.
-- Append-only; UNIQUE(event_key), workspace/customer attribution validated. Impression recorded when actually shown, Click when opened, Booking only for a linked reservation; report paid conversions distinctly. Rate calculations use distinct request/workspace attribution, not Booking.source alone. Retention and privacy settings apply.
CREATE TABLE `log_recommendation_event` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'SQL Server UNIQUEIDENTIFIER; sequential UUID recommended.',
  `customer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `workspace_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `booking_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `request_key` VARCHAR(100) COLLATE utf8mb4_0900_bin NOT NULL,
  `event_key` VARCHAR(150) COLLATE utf8mb4_0900_bin NOT NULL,
  `event_type` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL,
  `rank_position` INT NULL,
  `model_version` VARCHAR(50) NULL,
  `occurred_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_log_recommendation_event_event_key` (`event_key`),
  KEY `ix_log_recommendation_event_customer_id` (`customer_id`),
  KEY `ix_log_recommendation_event_workspace_id` (`workspace_id`),
  KEY `ix_log_recommendation_event_booking_id` (`booking_id`),
  KEY `ix_log_recommendation_event_metrics` (`event_type`, `occurred_at`, `workspace_id`),
  CONSTRAINT `ck_log_recommendation_event_event_type` CHECK (`event_type` IN ('Impression', 'Click', 'Booking')),
  CONSTRAINT `ck_log_recommendation_event_rank` CHECK (rank_position > 0),
  CONSTRAINT `ck_log_recommendation_event_booking` CHECK (event_type <> 'Booking' OR booking_id IS NOT NULL)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores recommendation impressions, clicks and attributed bookings for the SRS performance metrics.';

-- rel_customer_preference_amenity (source Customer_Preference_Amenity): Stores one selected Amenity for one Customer workspace preference set.
-- Composite PK(preference_id, amenity_id) prevents duplicate choices. Empty set means no amenity requirement. Update the set and parent updated_at in one transaction. Delete preference may CASCADE here; Amenity delete is NO ACTION, deactivate referenced catalog items. Apply all-required-amenities logic with NOT EXISTS rather than joining every many-side table into a result list.
CREATE TABLE `rel_customer_preference_amenity` (
  `preference_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Owner preference, not a second customer_id.',
  `amenity_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Validated catalog amenity; no JSON string UUIDs.',
  PRIMARY KEY (`preference_id`, `amenity_id`),
  KEY `ix_rel_customer_preference_amenity_amenity` (`amenity_id`)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores one selected Amenity for one Customer workspace preference set.';

-- t_booking_snapshot (source Booking_Snapshot): Stores the four immutable JSON snapshots of one booking, fetched only for detail, pricing explanation or refund calculation.
-- Shared PK/FK booking_id enforces at most one snapshot row per booking. A validated checkout creates exactly one row in the same transaction as Booking; SQL FK alone cannot enforce parent-to-child existence. Keep nullability of migrated JSON fields so old drafts remain valid; require pricing/resource/cancellation shapes at checkout in the service. selected_addons_snapshot may be NULL when no add-ons. Immutable after reservation terms are frozen; reschedule uses a new booking. NO ACTION on delete and identical retention as Booking. Read by PK, no JSON or extra secondary indexes.
CREATE TABLE `t_booking_snapshot` (
  `booking_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'Shared primary key. No separate id or duplicate customer/resource IDs.',
  `pricing_snapshot` JSON NULL COMMENT 'Immutable unit rate, billing units, base override, adjustments, discounts, tax/fees and rule versions. CHECK (pricing_snapshot IS NULL OR ISJSON(pricing_snapshot) = 1).',
  `resource_snapshot` JSON NULL COMMENT 'Workspace/resource names, address, floor/zone and booked specifications at checkout. CHECK (resource_snapshot IS NULL OR ISJSON(resource_snapshot) = 1).',
  `cancellation_policy_snapshot` JSON NULL COMMENT 'Immutable cancellation tiers, eligibility and refundable fee treatment at checkout. CHECK (cancellation_policy_snapshot IS NULL OR ISJSON(cancellation_policy_snapshot) = 1).',
  `selected_addons_snapshot` JSON NULL COMMENT 'Chosen Resource_Amenity IDs, descriptions, units and prices; not automatic for every amenity. CHECK (selected_addons_snapshot IS NULL OR ISJSON(selected_addons_snapshot) = 1).',
  PRIMARY KEY (`booking_id`)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores the four immutable JSON snapshots of one booking, fetched only for detail, pricing explanation or refund calculation.';

-- t_notification_delivery (source Notification_Delivery): Stores one independently scheduled Email or Push delivery job for one notification.
-- UNIQUE(notification_id, channel). No row for a channel that is not required. status transitions Pending/Failed -> Processing -> Sent or Failed; retry uses next_retry_at and attempt_count<max_attempts. Claim atomically with a short UPDATE...OUTPUT transaction and a lease; recover stale Processing jobs after locked_until. Send outside the database transaction and acknowledge using the lease token. Reuse delivery_key with providers that support deduplication; external sends are at-least-once and a crash after send may duplicate unless the provider deduplicates. One Push job aggregates active session endpoints; endpoint-level receipts need a future child table only if required.
CREATE TABLE `t_notification_delivery` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()),
  `notification_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `channel` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL,
  `status` VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'Pending',
  `attempt_count` INT NOT NULL DEFAULT 0 COMMENT 'CHECK >= 0 and <= max_attempts. Increment atomically when claimed.',
  `max_attempts` INT NOT NULL DEFAULT 5 COMMENT 'CHECK > 0. Configurable baseline, frozen per job.',
  `next_retry_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)) COMMENT 'UTC due time; status controls schedulability.',
  `last_error` VARCHAR(500) NULL,
  `locked_until` DATETIME(6) NULL COMMENT 'Worker lease expiry; present while Processing.',
  `lease_token` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'Worker-generated token for claim/acknowledgement fencing.',
  `sent_at` DATETIME(6) NULL,
  `delivery_key` VARCHAR(150) COLLATE utf8mb4_0900_bin NOT NULL COMMENT 'Stable idempotency key, e.g. notification ID plus channel.',
  `created_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)),
  `updated_at` DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_t_notification_delivery_channel` (`notification_id`, `channel`),
  UNIQUE KEY `ux_t_notification_delivery_key` (`delivery_key`),
  -- Source filtered index status IN ('Pending','Failed') -> ordinary MySQL composite index; queries must keep the predicate.
  -- Source INCLUDE (attempt_count, max_attempts) is intentionally not copied; InnoDB secondary indexes contain the PK. Fetch payload from the row; benchmark before widening this index.
  KEY `ix_t_notification_delivery_due` (`channel`, `status`, `next_retry_at`, `id`),
  -- Source filtered index status = 'Processing' -> ordinary MySQL composite index; queries must keep the predicate.
  KEY `ix_t_notification_delivery_lease` (`status`, `locked_until`, `id`),
  CONSTRAINT `ck_t_notification_delivery_channel` CHECK (`channel` IN ('Email', 'Push')),
  CONSTRAINT `ck_t_notification_delivery_status` CHECK (`status` IN ('Pending', 'Processing', 'Sent', 'Failed', 'Cancelled')),
  CONSTRAINT `ck_t_notification_delivery_attempts` CHECK (attempt_count >= 0 AND max_attempts > 0 AND attempt_count <= max_attempts),
  CONSTRAINT `ck_t_notification_delivery_lease` CHECK (status <> 'Processing' OR (locked_until IS NOT NULL AND lease_token IS NOT NULL)),
  CONSTRAINT `ck_t_notification_delivery_sent` CHECK (status <> 'Sent' OR sent_at IS NOT NULL)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores one independently scheduled Email or Push delivery job for one notification.';

-- Add foreign keys after every referenced table and unique key exists.
-- Source NO ACTION becomes RESTRICT; source CASCADE is retained.

ALTER TABLE `m_app_user` ADD CONSTRAINT `fk_m_app_user_locked_by` FOREIGN KEY (`locked_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_user_session` ADD CONSTRAINT `fk_t_user_session_user_id` FOREIGN KEY (`user_id`) REFERENCES `m_app_user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `rel_user_social_account` ADD CONSTRAINT `fk_rel_user_social_account_user_id` FOREIGN KEY (`user_id`) REFERENCES `m_app_user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cfg_customer_workspace_preference` ADD CONSTRAINT `fk_cfg_customer_workspace_preference_customer_id` FOREIGN KEY (`customer_id`) REFERENCES `m_app_user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cfg_saved_search_filter` ADD CONSTRAINT `fk_cfg_saved_search_filter_customer_id` FOREIGN KEY (`customer_id`) REFERENCES `m_app_user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `m_favorite_group` ADD CONSTRAINT `fk_m_favorite_group_customer_id` FOREIGN KEY (`customer_id`) REFERENCES `m_app_user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `rel_customer_favorite_workspace` ADD CONSTRAINT `fk_rel_customer_favorite_workspace_customer_id` FOREIGN KEY (`customer_id`) REFERENCES `m_app_user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `rel_customer_favorite_workspace` ADD CONSTRAINT `fk_rel_customer_favorite_workspace_workspace_id` FOREIGN KEY (`workspace_id`) REFERENCES `m_workspace` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `rel_customer_favorite_workspace` ADD CONSTRAINT `fk_rel_customer_favorite_workspace_favorite_group_id` FOREIGN KEY (`favorite_group_id`) REFERENCES `m_favorite_group` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `m_organizer_profile` ADD CONSTRAINT `fk_m_organizer_profile_organizer_id` FOREIGN KEY (`organizer_id`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `m_organizer_profile` ADD CONSTRAINT `fk_m_organizer_profile_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `m_organizer_profile` ADD CONSTRAINT `fk_m_organizer_profile_assigned_reviewer_id` FOREIGN KEY (`assigned_reviewer_id`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `m_organizer_verification_document` ADD CONSTRAINT `fk_m_organizer_verification_document_organizer_profile_id` FOREIGN KEY (`organizer_profile_id`) REFERENCES `m_organizer_profile` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `m_organizer_verification_document` ADD CONSTRAINT `fk_m_organizer_verification_document_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `m_organizer_verification_document` ADD CONSTRAINT `fk_m_organizer_verification_document_supersedes_document_id` FOREIGN KEY (`supersedes_document_id`) REFERENCES `m_organizer_verification_document` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `m_workspace` ADD CONSTRAINT `fk_m_workspace_organizer_id` FOREIGN KEY (`organizer_id`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `m_workspace` ADD CONSTRAINT `fk_m_workspace_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `m_workspace` ADD CONSTRAINT `fk_m_workspace_suspended_by` FOREIGN KEY (`suspended_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cfg_workspace_operating_hour` ADD CONSTRAINT `fk_cfg_workspace_operating_hour_workspace_id` FOREIGN KEY (`workspace_id`) REFERENCES `m_workspace` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cfg_workspace_cancellation_rule` ADD CONSTRAINT `fk_cfg_workspace_cancellation_rule_workspace_id` FOREIGN KEY (`workspace_id`) REFERENCES `m_workspace` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `rel_workspace_amenity` ADD CONSTRAINT `fk_rel_workspace_amenity_workspace_id` FOREIGN KEY (`workspace_id`) REFERENCES `m_workspace` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `rel_workspace_amenity` ADD CONSTRAINT `fk_rel_workspace_amenity_amenity_id` FOREIGN KEY (`amenity_id`) REFERENCES `m_amenity` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `m_workspace_media` ADD CONSTRAINT `fk_m_workspace_media_workspace_id` FOREIGN KEY (`workspace_id`) REFERENCES `m_workspace` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `m_floor_plan` ADD CONSTRAINT `fk_m_floor_plan_workspace_id` FOREIGN KEY (`workspace_id`) REFERENCES `m_workspace` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `m_floor_section` ADD CONSTRAINT `fk_m_floor_section_floor_plan_id` FOREIGN KEY (`floor_plan_id`) REFERENCES `m_floor_plan` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `m_resource_type` ADD CONSTRAINT `fk_m_resource_type_workspace_id` FOREIGN KEY (`workspace_id`) REFERENCES `m_workspace` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `m_bookable_resource` ADD CONSTRAINT `fk_m_bookable_resource_floor_plan_id` FOREIGN KEY (`floor_plan_id`) REFERENCES `m_floor_plan` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `m_bookable_resource` ADD CONSTRAINT `fk_m_bookable_resource_section_id` FOREIGN KEY (`section_id`) REFERENCES `m_floor_section` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `m_bookable_resource` ADD CONSTRAINT `fk_m_bookable_resource_resource_type_id` FOREIGN KEY (`resource_type_id`) REFERENCES `m_resource_type` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_resource_blocked_time_slot` ADD CONSTRAINT `fk_t_resource_blocked_time_slot_resource_id` FOREIGN KEY (`resource_id`) REFERENCES `m_bookable_resource` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_resource_blocked_time_slot` ADD CONSTRAINT `fk_t_resource_blocked_time_slot_created_by` FOREIGN KEY (`created_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cfg_pricing_rule` ADD CONSTRAINT `fk_cfg_pricing_rule_workspace_id` FOREIGN KEY (`workspace_id`) REFERENCES `m_workspace` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cfg_pricing_rule` ADD CONSTRAINT `fk_cfg_pricing_rule_resource_type_id` FOREIGN KEY (`resource_type_id`) REFERENCES `m_resource_type` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cfg_pricing_rule` ADD CONSTRAINT `fk_cfg_pricing_rule_resource_id` FOREIGN KEY (`resource_id`) REFERENCES `m_bookable_resource` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cfg_discount_rule` ADD CONSTRAINT `fk_cfg_discount_rule_workspace_id` FOREIGN KEY (`workspace_id`) REFERENCES `m_workspace` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cfg_discount_rule` ADD CONSTRAINT `fk_cfg_discount_rule_created_by` FOREIGN KEY (`created_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cfg_discount_rule` ADD CONSTRAINT `fk_cfg_discount_rule_resource_type_id` FOREIGN KEY (`resource_type_id`) REFERENCES `m_resource_type` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cfg_discount_rule` ADD CONSTRAINT `fk_cfg_discount_rule_resource_id` FOREIGN KEY (`resource_id`) REFERENCES `m_bookable_resource` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `m_membership_plan` ADD CONSTRAINT `fk_m_membership_plan_organizer_id` FOREIGN KEY (`organizer_id`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `m_membership_plan` ADD CONSTRAINT `fk_m_membership_plan_workspace_id` FOREIGN KEY (`workspace_id`) REFERENCES `m_workspace` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_membership_subscription` ADD CONSTRAINT `fk_t_membership_subscription_customer_id` FOREIGN KEY (`customer_id`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_membership_subscription` ADD CONSTRAINT `fk_t_membership_subscription_plan_id` FOREIGN KEY (`plan_id`) REFERENCES `m_membership_plan` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_membership_subscription` ADD CONSTRAINT `fk_t_membership_subscription_renewed_from_id` FOREIGN KEY (`renewed_from_id`) REFERENCES `t_membership_subscription` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_membership_subscription` ADD CONSTRAINT `fk_t_membership_subscription_dedicated_resource_id` FOREIGN KEY (`dedicated_resource_id`) REFERENCES `m_bookable_resource` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cfg_platform_fee_rule` ADD CONSTRAINT `fk_cfg_platform_fee_rule_created_by` FOREIGN KEY (`created_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cfg_platform_fee_rule` ADD CONSTRAINT `fk_cfg_platform_fee_rule_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_booking` ADD CONSTRAINT `fk_t_booking_customer_id` FOREIGN KEY (`customer_id`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_booking` ADD CONSTRAINT `fk_t_booking_resource_id` FOREIGN KEY (`resource_id`) REFERENCES `m_bookable_resource` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_booking` ADD CONSTRAINT `fk_t_booking_workspace_id` FOREIGN KEY (`workspace_id`) REFERENCES `m_workspace` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_booking` ADD CONSTRAINT `fk_t_booking_discount_rule_id` FOREIGN KEY (`discount_rule_id`) REFERENCES `cfg_discount_rule` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_booking` ADD CONSTRAINT `fk_t_booking_subscription_id` FOREIGN KEY (`subscription_id`) REFERENCES `t_membership_subscription` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_booking` ADD CONSTRAINT `fk_t_booking_checked_in_by` FOREIGN KEY (`checked_in_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_booking` ADD CONSTRAINT `fk_t_booking_checked_out_by` FOREIGN KEY (`checked_out_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_booking` ADD CONSTRAINT `fk_t_booking_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_booking` ADD CONSTRAINT `fk_t_booking_created_by` FOREIGN KEY (`created_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_booking` ADD CONSTRAINT `fk_t_booking_platform_fee_rule_id` FOREIGN KEY (`platform_fee_rule_id`) REFERENCES `cfg_platform_fee_rule` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_booking` ADD CONSTRAINT `fk_t_booking_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_booking` ADD CONSTRAINT `fk_t_booking_rescheduled_from_id` FOREIGN KEY (`rescheduled_from_id`) REFERENCES `t_booking` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_payment_transaction` ADD CONSTRAINT `fk_t_payment_transaction_booking_id` FOREIGN KEY (`booking_id`) REFERENCES `t_booking` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_payment_transaction` ADD CONSTRAINT `fk_t_payment_transaction_subscription_id` FOREIGN KEY (`subscription_id`) REFERENCES `t_membership_subscription` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_payment_transaction` ADD CONSTRAINT `fk_t_payment_transaction_reconciled_by` FOREIGN KEY (`reconciled_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_refund_request` ADD CONSTRAINT `fk_t_refund_request_booking_id` FOREIGN KEY (`booking_id`) REFERENCES `t_booking` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_refund_request` ADD CONSTRAINT `fk_t_refund_request_payment_transaction_id` FOREIGN KEY (`payment_transaction_id`) REFERENCES `t_payment_transaction` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_refund_request` ADD CONSTRAINT `fk_t_refund_request_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_refund_request` ADD CONSTRAINT `fk_t_refund_request_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_refund_request` ADD CONSTRAINT `fk_t_refund_request_support_case_id` FOREIGN KEY (`support_case_id`) REFERENCES `t_support_case` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_organizer_payout` ADD CONSTRAINT `fk_t_organizer_payout_organizer_id` FOREIGN KEY (`organizer_id`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_organizer_payout` ADD CONSTRAINT `fk_t_organizer_payout_booking_id` FOREIGN KEY (`booking_id`) REFERENCES `t_booking` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_organizer_payout` ADD CONSTRAINT `fk_t_organizer_payout_support_case_id` FOREIGN KEY (`support_case_id`) REFERENCES `t_support_case` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_customer_review` ADD CONSTRAINT `fk_t_customer_review_booking_id` FOREIGN KEY (`booking_id`) REFERENCES `t_booking` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_customer_review` ADD CONSTRAINT `fk_t_customer_review_workspace_id` FOREIGN KEY (`workspace_id`) REFERENCES `m_workspace` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_customer_review` ADD CONSTRAINT `fk_t_customer_review_replied_by` FOREIGN KEY (`replied_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_customer_review` ADD CONSTRAINT `fk_t_customer_review_moderated_by` FOREIGN KEY (`moderated_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cfg_notification_template` ADD CONSTRAINT `fk_cfg_notification_template_created_by` FOREIGN KEY (`created_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_user_notification` ADD CONSTRAINT `fk_t_user_notification_user_id` FOREIGN KEY (`user_id`) REFERENCES `m_app_user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `t_user_notification` ADD CONSTRAINT `fk_t_user_notification_template_id` FOREIGN KEY (`template_id`) REFERENCES `cfg_notification_template` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_support_case` ADD CONSTRAINT `fk_t_support_case_reporter_id` FOREIGN KEY (`reporter_id`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_support_case` ADD CONSTRAINT `fk_t_support_case_booking_id` FOREIGN KEY (`booking_id`) REFERENCES `t_booking` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_support_case` ADD CONSTRAINT `fk_t_support_case_resolved_by` FOREIGN KEY (`resolved_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_support_case` ADD CONSTRAINT `fk_t_support_case_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_support_case_evidence` ADD CONSTRAINT `fk_t_support_case_evidence_support_case_id` FOREIGN KEY (`support_case_id`) REFERENCES `t_support_case` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_support_case_evidence` ADD CONSTRAINT `fk_t_support_case_evidence_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `log_audit_log` ADD CONSTRAINT `fk_log_audit_log_user_id` FOREIGN KEY (`user_id`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cfg_platform_setting` ADD CONSTRAINT `fk_cfg_platform_setting_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_user_verification_challenge` ADD CONSTRAINT `fk_t_user_verification_challenge_user_id` FOREIGN KEY (`user_id`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cfg_role_permission` ADD CONSTRAINT `fk_cfg_role_permission_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rel_resource_amenity` ADD CONSTRAINT `fk_rel_resource_amenity_resource_id` FOREIGN KEY (`resource_id`) REFERENCES `m_bookable_resource` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rel_resource_amenity` ADD CONSTRAINT `fk_rel_resource_amenity_amenity_id` FOREIGN KEY (`amenity_id`) REFERENCES `m_amenity` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `m_resource_media` ADD CONSTRAINT `fk_m_resource_media_resource_id` FOREIGN KEY (`resource_id`) REFERENCES `m_bookable_resource` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `log_payment_gateway_event` ADD CONSTRAINT `fk_log_payment_gateway_event_payment_transaction_id` FOREIGN KEY (`payment_transaction_id`) REFERENCES `t_payment_transaction` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `log_payment_gateway_event` ADD CONSTRAINT `fk_log_payment_gateway_event_refund_request_id` FOREIGN KEY (`refund_request_id`) REFERENCES `t_refund_request` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `log_payment_gateway_event` ADD CONSTRAINT `fk_log_payment_gateway_event_organizer_payout_id` FOREIGN KEY (`organizer_payout_id`) REFERENCES `t_organizer_payout` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rel_review_reaction` ADD CONSTRAINT `fk_rel_review_reaction_review_id` FOREIGN KEY (`review_id`) REFERENCES `t_customer_review` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rel_review_reaction` ADD CONSTRAINT `fk_rel_review_reaction_customer_id` FOREIGN KEY (`customer_id`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_support_case_message` ADD CONSTRAINT `fk_t_support_case_message_support_case_id` FOREIGN KEY (`support_case_id`) REFERENCES `t_support_case` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_support_case_message` ADD CONSTRAINT `fk_t_support_case_message_sender_id` FOREIGN KEY (`sender_id`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `log_recommendation_event` ADD CONSTRAINT `fk_log_recommendation_event_customer_id` FOREIGN KEY (`customer_id`) REFERENCES `m_app_user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `log_recommendation_event` ADD CONSTRAINT `fk_log_recommendation_event_workspace_id` FOREIGN KEY (`workspace_id`) REFERENCES `m_workspace` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `log_recommendation_event` ADD CONSTRAINT `fk_log_recommendation_event_booking_id` FOREIGN KEY (`booking_id`) REFERENCES `t_booking` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rel_customer_preference_amenity` ADD CONSTRAINT `fk_rel_customer_preference_amenity_preference` FOREIGN KEY (`preference_id`) REFERENCES `cfg_customer_workspace_preference` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `rel_customer_preference_amenity` ADD CONSTRAINT `fk_rel_customer_preference_amenity_amenity` FOREIGN KEY (`amenity_id`) REFERENCES `m_amenity` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_booking_snapshot` ADD CONSTRAINT `fk_t_booking_snapshot_booking` FOREIGN KEY (`booking_id`) REFERENCES `t_booking` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `t_notification_delivery` ADD CONSTRAINT `fk_t_notification_delivery_notification` FOREIGN KEY (`notification_id`) REFERENCES `t_user_notification` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Maintain source updated_at semantics in UTC, including non-UTC sessions.
-- Each trigger is a single SQL statement; no DELIMITER command is needed.

CREATE TRIGGER `bu_m_app_user_updated_at` BEFORE UPDATE ON `m_app_user` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_cfg_customer_workspace_preference_updated_at` BEFORE UPDATE ON `cfg_customer_workspace_preference` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_cfg_saved_search_filter_updated_at` BEFORE UPDATE ON `cfg_saved_search_filter` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_m_favorite_group_updated_at` BEFORE UPDATE ON `m_favorite_group` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_m_organizer_profile_updated_at` BEFORE UPDATE ON `m_organizer_profile` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_m_workspace_updated_at` BEFORE UPDATE ON `m_workspace` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_cfg_workspace_cancellation_rule_updated_at` BEFORE UPDATE ON `cfg_workspace_cancellation_rule` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_m_amenity_updated_at` BEFORE UPDATE ON `m_amenity` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_m_workspace_media_updated_at` BEFORE UPDATE ON `m_workspace_media` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_m_floor_plan_updated_at` BEFORE UPDATE ON `m_floor_plan` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_m_floor_section_updated_at` BEFORE UPDATE ON `m_floor_section` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_m_resource_type_updated_at` BEFORE UPDATE ON `m_resource_type` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_m_bookable_resource_updated_at` BEFORE UPDATE ON `m_bookable_resource` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_t_resource_blocked_time_slot_updated_at` BEFORE UPDATE ON `t_resource_blocked_time_slot` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_cfg_pricing_rule_updated_at` BEFORE UPDATE ON `cfg_pricing_rule` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_cfg_discount_rule_updated_at` BEFORE UPDATE ON `cfg_discount_rule` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_m_membership_plan_updated_at` BEFORE UPDATE ON `m_membership_plan` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_t_membership_subscription_updated_at` BEFORE UPDATE ON `t_membership_subscription` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_cfg_platform_fee_rule_updated_at` BEFORE UPDATE ON `cfg_platform_fee_rule` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_t_booking_updated_at` BEFORE UPDATE ON `t_booking` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_t_payment_transaction_updated_at` BEFORE UPDATE ON `t_payment_transaction` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_t_refund_request_updated_at` BEFORE UPDATE ON `t_refund_request` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_t_organizer_payout_updated_at` BEFORE UPDATE ON `t_organizer_payout` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_t_customer_review_updated_at` BEFORE UPDATE ON `t_customer_review` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_cfg_notification_template_updated_at` BEFORE UPDATE ON `cfg_notification_template` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_t_support_case_updated_at` BEFORE UPDATE ON `t_support_case` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_cfg_platform_setting_updated_at` BEFORE UPDATE ON `cfg_platform_setting` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_cfg_role_permission_updated_at` BEFORE UPDATE ON `cfg_role_permission` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_m_resource_media_updated_at` BEFORE UPDATE ON `m_resource_media` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);
CREATE TRIGGER `bu_t_notification_delivery_updated_at` BEFORE UPDATE ON `t_notification_delivery` FOR EACH ROW SET NEW.updated_at = UTC_TIMESTAMP(6);

-- Post-install inspection. This file does not insert example transactions.
SELECT DATABASE() AS active_database, VERSION() AS server_version;
SELECT COUNT(*) AS expected_47_source_tables
FROM information_schema.tables WHERE table_schema = DATABASE()
  AND table_type = 'BASE TABLE' AND table_name IN ('m_app_user', 't_user_session', 'rel_user_social_account', 'cfg_customer_workspace_preference', 'cfg_saved_search_filter', 'm_favorite_group', 'rel_customer_favorite_workspace', 'm_organizer_profile', 'm_organizer_verification_document', 'm_workspace', 'cfg_workspace_operating_hour', 'cfg_workspace_cancellation_rule', 'm_amenity', 'rel_workspace_amenity', 'm_workspace_media', 'm_floor_plan', 'm_floor_section', 'm_resource_type', 'm_bookable_resource', 't_resource_blocked_time_slot', 'cfg_pricing_rule', 'cfg_discount_rule', 'm_membership_plan', 't_membership_subscription', 'cfg_platform_fee_rule', 't_booking', 't_payment_transaction', 't_refund_request', 't_organizer_payout', 't_customer_review', 'cfg_notification_template', 't_user_notification', 't_support_case', 't_support_case_evidence', 'log_audit_log', 'cfg_platform_setting', 't_user_verification_challenge', 'cfg_role_permission', 'rel_resource_amenity', 'm_resource_media', 'log_payment_gateway_event', 'rel_review_reaction', 't_support_case_message', 'log_recommendation_event', 'rel_customer_preference_amenity', 't_booking_snapshot', 't_notification_delivery');
SELECT COUNT(*) AS expected_103_foreign_keys
FROM information_schema.referential_constraints WHERE constraint_schema = DATABASE()
  AND table_name IN ('m_app_user', 't_user_session', 'rel_user_social_account', 'cfg_customer_workspace_preference', 'cfg_saved_search_filter', 'm_favorite_group', 'rel_customer_favorite_workspace', 'm_organizer_profile', 'm_organizer_verification_document', 'm_workspace', 'cfg_workspace_operating_hour', 'cfg_workspace_cancellation_rule', 'm_amenity', 'rel_workspace_amenity', 'm_workspace_media', 'm_floor_plan', 'm_floor_section', 'm_resource_type', 'm_bookable_resource', 't_resource_blocked_time_slot', 'cfg_pricing_rule', 'cfg_discount_rule', 'm_membership_plan', 't_membership_subscription', 'cfg_platform_fee_rule', 't_booking', 't_payment_transaction', 't_refund_request', 't_organizer_payout', 't_customer_review', 'cfg_notification_template', 't_user_notification', 't_support_case', 't_support_case_evidence', 'log_audit_log', 'cfg_platform_setting', 't_user_verification_challenge', 'cfg_role_permission', 'rel_resource_amenity', 'm_resource_media', 'log_payment_gateway_event', 'rel_review_reaction', 't_support_case_message', 'log_recommendation_event', 'rel_customer_preference_amenity', 't_booking_snapshot', 't_notification_delivery');

-- Physical name mapping (source -> deployed table)
-- App_User -> m_app_user
-- Favorite_Group -> m_favorite_group
-- Organizer_Profile -> m_organizer_profile
-- Organizer_Verification_Document -> m_organizer_verification_document
-- Workspace -> m_workspace
-- Amenity -> m_amenity
-- Workspace_Media -> m_workspace_media
-- Floor_Plan -> m_floor_plan
-- Floor_Section -> m_floor_section
-- Resource_Type -> m_resource_type
-- Bookable_Resource -> m_bookable_resource
-- Membership_Plan -> m_membership_plan
-- Resource_Media -> m_resource_media
-- User_Session -> t_user_session
-- Resource_Blocked_Time_Slot -> t_resource_blocked_time_slot
-- Membership_Subscription -> t_membership_subscription
-- Booking -> t_booking
-- Payment_Transaction -> t_payment_transaction
-- Refund_Request -> t_refund_request
-- Organizer_Payout -> t_organizer_payout
-- Customer_Review -> t_customer_review
-- User_Notification -> t_user_notification
-- Support_Case -> t_support_case
-- Support_Case_Evidence -> t_support_case_evidence
-- User_Verification_Challenge -> t_user_verification_challenge
-- Support_Case_Message -> t_support_case_message
-- Booking_Snapshot -> t_booking_snapshot
-- Notification_Delivery -> t_notification_delivery
-- Customer_Workspace_Preference -> cfg_customer_workspace_preference
-- Saved_Search_Filter -> cfg_saved_search_filter
-- Workspace_Operating_Hour -> cfg_workspace_operating_hour
-- Workspace_Cancellation_Rule -> cfg_workspace_cancellation_rule
-- Pricing_Rule -> cfg_pricing_rule
-- Discount_Rule -> cfg_discount_rule
-- Platform_Fee_Rule -> cfg_platform_fee_rule
-- Notification_Template -> cfg_notification_template
-- Platform_Setting -> cfg_platform_setting
-- Role_Permission -> cfg_role_permission
-- User_Social_Account -> rel_user_social_account
-- Customer_Favorite_Workspace -> rel_customer_favorite_workspace
-- Workspace_Amenity -> rel_workspace_amenity
-- Resource_Amenity -> rel_resource_amenity
-- Review_Reaction -> rel_review_reaction
-- Customer_Preference_Amenity -> rel_customer_preference_amenity
-- Audit_Log -> log_audit_log
-- Payment_Gateway_Event -> log_payment_gateway_event
-- Recommendation_Event -> log_recommendation_event
