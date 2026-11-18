SET @fk_name = (
    SELECT CONSTRAINT_NAME 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'building' 
      AND COLUMN_NAME = 'organizer_id' 
      AND REFERENCED_TABLE_NAME IS NOT NULL 
    LIMIT 1
);
SET @drop_fk_sql = IF(@fk_name IS NOT NULL, CONCAT('ALTER TABLE building DROP FOREIGN KEY `', @fk_name, '`'), 'SELECT 1');
PREPARE stmt FROM @drop_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE building
    MODIFY COLUMN organizer_id BIGINT NULL,
    ADD CONSTRAINT fk_building_organizer FOREIGN KEY (organizer_id) REFERENCES users (id) ON DELETE RESTRICT,
    ADD COLUMN workspace_id BIGINT NULL,
    ADD CONSTRAINT ux_building_workspace UNIQUE (workspace_id),
    ADD CONSTRAINT fk_building_workspace FOREIGN KEY (workspace_id) REFERENCES workspace (id) ON DELETE RESTRICT,
    ADD CONSTRAINT ck_building_site_owner CHECK ((workspace_id IS NULL) <> (organizer_id IS NULL));

ALTER TABLE building_floor
    ADD COLUMN outline VARCHAR(16) NOT NULL DEFAULT 'RECTANGULAR',
    ADD CONSTRAINT ck_building_floor_outline CHECK (outline IN ('RECTANGULAR', 'ROUNDED'));
