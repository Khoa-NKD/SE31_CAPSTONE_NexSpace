-- Add optimistic locking version column to workspace for concurrent edit/lifecycle defense.
ALTER TABLE workspace
    ADD COLUMN version INT NOT NULL DEFAULT 0;
