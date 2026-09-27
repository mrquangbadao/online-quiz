ALTER TABLE contestants
    ADD COLUMN start_exam_token_hash VARCHAR(255),
    ADD COLUMN start_exam_token_expires_at TIMESTAMP,
    ADD COLUMN start_exam_token_consumed_at TIMESTAMP;
