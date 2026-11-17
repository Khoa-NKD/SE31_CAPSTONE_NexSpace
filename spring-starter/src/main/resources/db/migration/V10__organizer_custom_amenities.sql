-- =============================================================================
-- Migration V10: Organizer Custom Amenities
-- 1. Add organizer_id column referencing users(id) (NULL = system standard amenity)
-- 2. Drop global UNIQUE constraint on amenity.name to allow multiple organizers
--    to define common amenity names without collision
-- 3. Add index ix_amenity_organizer (organizer_id, is_active)
-- =============================================================================

-- 1. Drop existing unique constraint on name if present
SET @uk_name = (
    SELECT CONSTRAINT_NAME
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'amenity'
      AND CONSTRAINT_TYPE = 'UNIQUE'
    LIMIT 1
);
SET @drop_uk = IF(@uk_name IS NOT NULL, CONCAT('ALTER TABLE `amenity` DROP INDEX `', @uk_name, '`'), 'SELECT 1');
PREPARE stmt_drop_uk FROM @drop_uk;
EXECUTE stmt_drop_uk;
DEALLOCATE PREPARE stmt_drop_uk;

-- 2. Add organizer_id column if not exists
SET @col_count = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'amenity'
      AND COLUMN_NAME = 'organizer_id'
);
SET @add_col = IF(@col_count = 0, 'ALTER TABLE `amenity` ADD COLUMN `organizer_id` BIGINT NULL AFTER `description`', 'SELECT 1');
PREPARE stmt_add_col FROM @add_col;
EXECUTE stmt_add_col;
DEALLOCATE PREPARE stmt_add_col;

-- 3. Add index on (organizer_id, is_active) if not exists
SET @idx_count = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'amenity'
      AND INDEX_NAME = 'ix_amenity_organizer'
);
SET @add_idx = IF(@idx_count = 0, 'CREATE INDEX `ix_amenity_organizer` ON `amenity` (`organizer_id`, `is_active`)', 'SELECT 1');
PREPARE stmt_add_idx FROM @add_idx;
EXECUTE stmt_add_idx;
DEALLOCATE PREPARE stmt_add_idx;

-- 4. Add foreign key fk_amenity_organizer if not exists
SET @fk_count = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'amenity'
      AND CONSTRAINT_NAME = 'fk_amenity_organizer'
);
SET @add_fk = IF(@fk_count = 0, 'ALTER TABLE `amenity` ADD CONSTRAINT `fk_amenity_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt_add_fk FROM @add_fk;
EXECUTE stmt_add_fk;
DEALLOCATE PREPARE stmt_add_fk;
