CREATE TABLE email_otp (
    id               BIGSERIAL PRIMARY KEY,
    email            VARCHAR(200) NOT NULL,
    normalized_email VARCHAR(200) NOT NULL,
    phase_id         BIGINT NOT NULL REFERENCES contest_phases(id) ON DELETE CASCADE,
    otp_hash         VARCHAR(255) NOT NULL,
    expires_at       TIMESTAMP NOT NULL,
    attempts         INT NOT NULL DEFAULT 0,
    max_attempts     INT NOT NULL,
    used_at          TIMESTAMP,
    last_sent_at     TIMESTAMP NOT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_otp_email_phase_created_at
    ON email_otp(normalized_email, phase_id, created_at);

CREATE INDEX idx_email_otp_expires_at
    ON email_otp(expires_at);

CREATE TABLE email_verification_sessions (
    id               BIGSERIAL PRIMARY KEY,
    email            VARCHAR(200) NOT NULL,
    normalized_email VARCHAR(200) NOT NULL,
    phase_id         BIGINT NOT NULL REFERENCES contest_phases(id) ON DELETE CASCADE,
    token_hash       VARCHAR(255) NOT NULL,
    verified_at      TIMESTAMP NOT NULL,
    expires_at       TIMESTAMP NOT NULL,
    consumed_at      TIMESTAMP,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verification_sessions_email_phase_verified_at
    ON email_verification_sessions(normalized_email, phase_id, verified_at);

CREATE INDEX idx_email_verification_sessions_expires_at
    ON email_verification_sessions(expires_at);
