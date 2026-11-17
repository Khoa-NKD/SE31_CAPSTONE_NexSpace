-- Approved schema proposal only. Do not run against a shared database without separate execution approval.
-- Check INFORMATION_SCHEMA.COLUMNS for organizer_profile.is_suspended before executing this one-time statement.
-- Existing profiles remain unsuspended. Application status, account status and roles are unchanged.
ALTER TABLE organizer_profile ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT FALSE;
