CREATE TABLE workspace_holiday (
    workspace_id BIGINT NOT NULL,
    holiday_code VARCHAR(30) NOT NULL,
    PRIMARY KEY (workspace_id, holiday_code),
    CONSTRAINT fk_workspace_holiday_workspace FOREIGN KEY (workspace_id) REFERENCES workspace(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
