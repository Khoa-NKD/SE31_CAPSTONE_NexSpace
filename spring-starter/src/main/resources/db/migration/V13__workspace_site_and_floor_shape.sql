ALTER TABLE building
    DROP FOREIGN KEY fk_building_organizer;

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
