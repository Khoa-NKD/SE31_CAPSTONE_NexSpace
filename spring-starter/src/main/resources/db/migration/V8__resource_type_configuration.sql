ALTER TABLE resource_type
    ADD COLUMN usage_kind VARCHAR(30) NULL,
    ADD COLUMN standard_width_m DECIMAL(8,2) NULL,
    ADD COLUMN standard_length_m DECIMAL(8,2) NULL,
    ADD CONSTRAINT ck_resource_type_configuration CHECK (
        (usage_kind IS NULL AND standard_width_m IS NULL AND standard_length_m IS NULL)
        OR (usage_kind IS NOT NULL AND standard_width_m IS NOT NULL AND standard_length_m IS NOT NULL
            AND standard_width_m > 0 AND standard_length_m > 0
            AND ((category = 'DESK' AND usage_kind IN ('WORK_SEAT','SOFA_SEAT','OTHER_SEAT'))
              OR (category = 'ROOM' AND usage_kind IN ('MEETING_ROOM','PRIVATE_OFFICE','SHARED_ROOM','OTHER_ROOM'))))
    );
