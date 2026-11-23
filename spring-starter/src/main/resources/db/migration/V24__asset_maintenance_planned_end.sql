ALTER TABLE asset_maintenance_log ADD COLUMN planned_end_at DATETIME(6) NULL;
ALTER TABLE asset_maintenance_log ADD CONSTRAINT ck_aml_planned_period
    CHECK (planned_end_at IS NULL OR
        (COALESCE(started_at, scheduled_at) IS NOT NULL
         AND planned_end_at > COALESCE(started_at, scheduled_at)));
