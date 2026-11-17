-- Review and explicitly approve this additive change before applying to Local/shared databases.
-- Existing calendar blocks retain their meaning. Maintenance is never inferred from free text.
ALTER TABLE resource_blocked_slot
    ADD COLUMN block_type VARCHAR(20) NOT NULL DEFAULT 'BLOCKED',
    ADD CONSTRAINT ck_resource_blocked_slot_type CHECK (block_type IN ('BLOCKED', 'MAINTENANCE'));
