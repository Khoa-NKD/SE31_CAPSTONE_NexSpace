-- Schema proposal only; requires separate authorization for execution on the target database.
-- Check information_schema.columns first. Existing applications retain NULL; do not fabricate reasons.
ALTER TABLE organizer_profile ADD COLUMN registration_reason VARCHAR(2000) NULL;
