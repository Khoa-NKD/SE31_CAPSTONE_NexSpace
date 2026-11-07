-- Approved design, NOT executed automatically. Review engine/schema before Local rollout.
-- Existing layout/resource/booking IDs and all existing rows remain unchanged.
CREATE TABLE building (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6), updated_at DATETIME(6),
    organizer_id BIGINT NOT NULL, name VARCHAR(150) NOT NULL, address VARCHAR(500) NOT NULL,
    CONSTRAINT ux_building_owner_name UNIQUE (organizer_id, name),
    CONSTRAINT fk_building_organizer FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE building_floor (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6), updated_at DATETIME(6),
    building_id BIGINT NOT NULL, name VARCHAR(100) NOT NULL, floor_number INT NOT NULL,
    canvas_width DECIMAL(10,2) NOT NULL, canvas_height DECIMAL(10,2) NOT NULL,
    CONSTRAINT ux_building_floor_number UNIQUE (building_id, floor_number),
    CONSTRAINT fk_building_floor_building FOREIGN KEY (building_id) REFERENCES building(id) ON DELETE RESTRICT,
    CONSTRAINT ck_building_floor_dimensions CHECK (canvas_width BETWEEN 1 AND 100000 AND canvas_height BETWEEN 1 AND 100000),
    CONSTRAINT ck_building_floor_number CHECK (floor_number BETWEEN -20 AND 500)
) ENGINE=InnoDB;

ALTER TABLE floor_plan
    ADD COLUMN building_floor_id BIGINT NULL,
    ADD COLUMN usage_x DECIMAL(10,2) NULL,
    ADD COLUMN usage_y DECIMAL(10,2) NULL,
    ADD COLUMN usage_width DECIMAL(10,2) NULL,
    ADD COLUMN usage_height DECIMAL(10,2) NULL,
    ADD CONSTRAINT fk_floor_plan_physical_floor FOREIGN KEY (building_floor_id) REFERENCES building_floor(id) ON DELETE RESTRICT,
    ADD CONSTRAINT ux_floor_plan_workspace_physical UNIQUE (workspace_id, building_floor_id),
    ADD INDEX ix_floor_plan_physical (building_floor_id),
    ADD CONSTRAINT ck_floor_plan_allocation CHECK (
      (building_floor_id IS NULL AND usage_x IS NULL AND usage_y IS NULL AND usage_width IS NULL AND usage_height IS NULL)
      OR (building_floor_id IS NOT NULL AND usage_x IS NOT NULL AND usage_y IS NOT NULL
          AND usage_width IS NOT NULL AND usage_height IS NOT NULL
          AND usage_x >= 0 AND usage_y >= 0 AND usage_width > 0 AND usage_height > 0));
-- No backfill: an organizer must explicitly map retained layouts to known physical floors.
