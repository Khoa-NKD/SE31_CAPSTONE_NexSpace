CREATE TABLE maintenance_group (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) DEFAULT NULL,
    updated_at DATETIME(6) DEFAULT NULL,
    workspace_id BIGINT NOT NULL,
    whole_workspace BIT NOT NULL DEFAULT 0,
    start_time DATETIME(6) NOT NULL,
    end_time DATETIME(6) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    cancelled BIT NOT NULL DEFAULT 0,
    member_keys LONGTEXT NOT NULL,
    CONSTRAINT fk_maintenance_group_workspace FOREIGN KEY (workspace_id) REFERENCES workspace(id),
    CONSTRAINT ck_maintenance_group_range CHECK (end_time > start_time),
    INDEX ix_maintenance_group_window (workspace_id, cancelled, start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
