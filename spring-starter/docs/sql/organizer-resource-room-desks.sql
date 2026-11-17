-- Apply only after explicit approval for the target database; do not backfill existing resources.
-- Existing desks remain open-area resources. Physical room placement is assigned by the owner.
ALTER TABLE bookable_resource
    ADD COLUMN parent_room_id BIGINT NULL,
    ADD INDEX ix_bookable_resource_parent_room (parent_room_id),
    ADD CONSTRAINT fk_bookable_resource_parent_room
        FOREIGN KEY (parent_room_id) REFERENCES bookable_resource (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT;
