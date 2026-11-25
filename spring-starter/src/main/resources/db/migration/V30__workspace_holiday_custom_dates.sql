CREATE TABLE workspace_holiday_schedule (
    workspace_id BIGINT NOT NULL,
    holiday_code VARCHAR(30) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    PRIMARY KEY (workspace_id, holiday_code),
    CONSTRAINT fk_holiday_schedule_workspace FOREIGN KEY (workspace_id) REFERENCES workspace(id),
    CONSTRAINT ck_holiday_schedule_dates CHECK (end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
