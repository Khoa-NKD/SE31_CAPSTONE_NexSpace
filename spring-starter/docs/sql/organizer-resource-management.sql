-- Approved schema additions. Review and apply only after checking existing columns.
-- Legacy names use label as a display fallback; legacy amounts are never re-denominated.
ALTER TABLE bookable_resource ADD COLUMN name VARCHAR(150) NULL;
ALTER TABLE resource_type
    ADD COLUMN currency VARCHAR(3) NULL,
    ADD CONSTRAINT ck_resource_type_currency CHECK (currency IS NULL OR currency IN ('VND', 'USD'));
