ALTER TABLE organizer_profile
    ADD INDEX ix_organizer_profile_owner_id (organizer_id, id);

ALTER TABLE organizer_profile
    DROP INDEX UKkabqonxu5vw7d1nwy4s11l969,
    ADD COLUMN open_organizer_id BIGINT GENERATED ALWAYS AS
        (CASE WHEN status = 'REJECTED' THEN NULL ELSE organizer_id END) STORED,
    ADD UNIQUE INDEX ux_organizer_profile_open_owner (open_organizer_id);
