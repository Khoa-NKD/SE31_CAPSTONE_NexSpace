-- One-time approved rollout. Verify the existing business_type column's charset/collation first.
-- This target uses utf8mb4_general_ci; the referenced code must match the child column.
CREATE TABLE business_type (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    code VARCHAR(30) NOT NULL,
    name_vi VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_business_type_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO business_type (code,name_vi,name_en,sort_order,created_at,updated_at) VALUES
('JOINT_STOCK','Công ty cổ phần','Joint stock company',10,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)),
('LIMITED_LIABILITY','Công ty trách nhiệm hữu hạn','Limited liability company',20,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)),
('SOLE_PROPRIETOR','Doanh nghiệp tư nhân','Sole proprietor',30,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)),
('HOUSEHOLD_BUSINESS','Hộ kinh doanh','Household business',40,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)),
('OTHER','Loại hình khác','Other business',50,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6));

ALTER TABLE organizer_profile ADD CONSTRAINT fk_organizer_profile_business_type
    FOREIGN KEY (business_type) REFERENCES business_type(code)
    ON UPDATE RESTRICT ON DELETE RESTRICT;
