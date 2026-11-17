-- Additive only: retained pixel layouts are converted explicitly after measurement review.
ALTER TABLE building_floor ADD COLUMN geometry_version INT NOT NULL DEFAULT 1;
ALTER TABLE building_floor DROP CHECK ck_building_floor_dimensions;
ALTER TABLE building_floor ADD CONSTRAINT ck_building_floor_dimensions
    CHECK (canvas_width BETWEEN 0.01 AND 600000 AND canvas_height BETWEEN 0.01 AND 600000);
ALTER TABLE floor_plan
    ADD COLUMN usage_x_m DECIMAL(16,6) NULL,
    ADD COLUMN usage_y_m DECIMAL(16,6) NULL,
    ADD COLUMN usage_width_m DECIMAL(16,6) NULL,
    ADD COLUMN usage_length_m DECIMAL(16,6) NULL,
    ADD COLUMN published_geometry_json LONGTEXT NULL,
    ADD COLUMN published_location_json LONGTEXT NULL,
    ADD COLUMN legacy_geometry_json LONGTEXT NULL,
    ADD COLUMN ai_draft_json LONGTEXT NULL;
ALTER TABLE bookable_resource
    ADD COLUMN pos_x_m DECIMAL(16,6) NULL,
    ADD COLUMN pos_y_m DECIMAL(16,6) NULL,
    ADD COLUMN width_m DECIMAL(16,6) NULL,
    ADD COLUMN length_m DECIMAL(16,6) NULL;
