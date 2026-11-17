ALTER TABLE building_floor
    ADD COLUMN real_width_m DECIMAL(10,2) NULL,
    ADD COLUMN real_length_m DECIMAL(10,2) NULL,
    ADD COLUMN max_occupancy INT NULL,
    ADD CONSTRAINT ck_building_floor_real_size CHECK (
        (real_width_m IS NULL AND real_length_m IS NULL) OR
        (real_width_m IS NOT NULL AND real_length_m IS NOT NULL AND real_width_m > 0 AND real_length_m > 0)),
    ADD CONSTRAINT ck_building_floor_occupancy CHECK (max_occupancy IS NULL OR max_occupancy > 0);

ALTER TABLE floor_plan
    ADD COLUMN occupancy_limit INT NULL,
    ADD CONSTRAINT ck_floor_plan_occupancy CHECK (occupancy_limit IS NULL OR occupancy_limit > 0);

CREATE TABLE organizer_layout_template (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    organizer_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    kind VARCHAR(20) NOT NULL,
    width_m DECIMAL(8,2) NOT NULL,
    length_m DECIMAL(8,2) NOT NULL,
    color VARCHAR(7) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_layout_template_owner FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT ux_layout_template_owner_name UNIQUE (organizer_id, name),
    CONSTRAINT ck_layout_template_kind CHECK (kind IN ('TABLE','PLANT','PARTITION','OTHER')),
    CONSTRAINT ck_layout_template_size CHECK (width_m > 0 AND length_m > 0)
);
