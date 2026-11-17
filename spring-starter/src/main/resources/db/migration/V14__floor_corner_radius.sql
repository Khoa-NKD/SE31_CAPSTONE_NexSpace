ALTER TABLE building_floor
    ADD COLUMN corner_radius_m DECIMAL(10, 2) NOT NULL DEFAULT 0;

UPDATE building_floor
SET corner_radius_m = ROUND(LEAST(real_width_m, real_length_m) * 0.12, 2)
WHERE outline = 'ROUNDED' AND real_width_m IS NOT NULL AND real_length_m IS NOT NULL;

ALTER TABLE building_floor
    ADD CONSTRAINT ck_floor_corner_radius CHECK (
        corner_radius_m >= 0
        AND (outline = 'ROUNDED' OR corner_radius_m = 0)
        AND (real_width_m IS NULL OR real_length_m IS NULL
             OR corner_radius_m * 2 <= LEAST(real_width_m, real_length_m))
    );
