-- Add submit token fields to exams table for secure submission

ALTER TABLE exams
ADD COLUMN submit_token_hash VARCHAR(255),
ADD COLUMN submit_token_expires_at TIMESTAMP,
ADD COLUMN submit_token_consumed_at TIMESTAMP;

CREATE INDEX idx_exams_submit_token ON exams (submit_token_hash) WHERE submit_token_hash IS NOT NULL;
