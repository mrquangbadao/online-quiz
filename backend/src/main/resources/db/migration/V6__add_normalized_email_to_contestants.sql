ALTER TABLE contestants
    ADD COLUMN normalized_email VARCHAR(200);

UPDATE contestants
SET normalized_email = LOWER(BTRIM(email))
WHERE email IS NOT NULL AND BTRIM(email) <> '';

CREATE UNIQUE INDEX idx_contestants_email_phase
    ON contestants(normalized_email, phase_id)
    WHERE normalized_email IS NOT NULL AND normalized_email <> '';
