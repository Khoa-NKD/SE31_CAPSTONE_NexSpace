-- Preserve legacy full-day schedules while making midnight and overnight intervals explicit.
ALTER TABLE workspace_operating_hour DROP CHECK ck_woh_valid;
ALTER TABLE workspace_operating_hour
    ADD COLUMN is_24_hours BIT NOT NULL DEFAULT 0,
    ADD COLUMN closes_next_day BIT NOT NULL DEFAULT 0;
UPDATE workspace_operating_hour
SET is_24_hours = 1
WHERE is_closed = 0 AND open_time = '00:00:00' AND close_time IN ('23:59:00', '23:59:59');
ALTER TABLE workspace_operating_hour ADD CONSTRAINT ck_woh_valid CHECK (
    is_closed = 1 OR is_24_hours = 1 OR
    (open_time IS NOT NULL AND close_time IS NOT NULL AND
        ((closes_next_day = 0 AND close_time > open_time) OR
         (closes_next_day = 1 AND close_time < open_time)))
);
