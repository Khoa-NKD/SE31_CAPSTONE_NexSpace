CREATE TABLE decoration_maintenance_slot (
 id BIGINT NOT NULL AUTO_INCREMENT,
 floor_plan_id BIGINT NOT NULL,
 decoration_id VARCHAR(64) NOT NULL,
 start_time DATETIME(6) NOT NULL,
 end_time DATETIME(6) NOT NULL,
 reason VARCHAR(255) NOT NULL,
 PRIMARY KEY(id),
 INDEX ix_decoration_maintenance_period(floor_plan_id, start_time, end_time),
 CONSTRAINT fk_decoration_maintenance_floor FOREIGN KEY(floor_plan_id) REFERENCES floor_plan(id) ON DELETE CASCADE,
 CONSTRAINT ck_decoration_maintenance_period CHECK(end_time > start_time)
);
