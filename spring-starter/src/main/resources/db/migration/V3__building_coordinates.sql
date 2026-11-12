ALTER TABLE building
    ADD COLUMN latitude DECIMAL(10,8) NULL,
    ADD COLUMN longitude DECIMAL(11,8) NULL,
    ADD CONSTRAINT chk_building_coordinates CHECK (
        (latitude IS NULL AND longitude IS NULL)
        OR (latitude IS NOT NULL AND longitude IS NOT NULL
            AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    );
