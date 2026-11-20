-- Corrections are separately issued and signed; the original agreement remains immutable.
CREATE TABLE organizer_contract_addendum (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) DEFAULT NULL,
    updated_at DATETIME(6) DEFAULT NULL,
    contract_id BIGINT NOT NULL,
    addendum_number VARCHAR(80) NOT NULL,
    template_version VARCHAR(60) NOT NULL,
    status VARCHAR(30) NOT NULL,
    issued_at DATETIME(6) NOT NULL,
    issued_by BIGINT NOT NULL,
    content_snapshot LONGTEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    base_signed_pdf_hash VARCHAR(64) NOT NULL,
    original_pdf_key VARCHAR(80) NOT NULL,
    signing_email VARCHAR(255) NOT NULL,
    signed_at DATETIME(6) DEFAULT NULL,
    signed_by BIGINT DEFAULT NULL,
    signed_pdf_key VARCHAR(80) DEFAULT NULL,
    signed_pdf_hash VARCHAR(64) DEFAULT NULL,
    otp_hash VARCHAR(100) DEFAULT NULL,
    otp_expires_at DATETIME(6) DEFAULT NULL,
    otp_sent_at DATETIME(6) DEFAULT NULL,
    otp_attempts INT NOT NULL DEFAULT 0,
    otp_window_start DATETIME(6) DEFAULT NULL,
    otp_window_count INT NOT NULL DEFAULT 0,
    CONSTRAINT ux_addendum_number UNIQUE (addendum_number),
    CONSTRAINT ux_addendum_template UNIQUE (contract_id, template_version),
    CONSTRAINT fk_addendum_contract FOREIGN KEY (contract_id) REFERENCES organizer_contract(id) ON DELETE RESTRICT,
    CONSTRAINT fk_addendum_issuer FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_addendum_signer FOREIGN KEY (signed_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_addendum_status CHECK (status IN ('PENDING_SIGNATURE', 'SIGNED')),
    CONSTRAINT ck_addendum_otp CHECK (otp_attempts >= 0 AND otp_window_count >= 0),
    CONSTRAINT ck_addendum_signature CHECK (
        (status = 'PENDING_SIGNATURE' AND signed_at IS NULL AND signed_by IS NULL AND signed_pdf_key IS NULL AND signed_pdf_hash IS NULL)
        OR (status = 'SIGNED' AND signed_at IS NOT NULL AND signed_by IS NOT NULL AND signed_pdf_key IS NOT NULL AND signed_pdf_hash IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
