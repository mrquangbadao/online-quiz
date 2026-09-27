CREATE TABLE abuse_logs (
    id            BIGSERIAL PRIMARY KEY,
    ip            VARCHAR(100) NOT NULL,
    user_agent    VARCHAR(1000),
    device_id     VARCHAR(255),
    endpoint      VARCHAR(255) NOT NULL,
    action        VARCHAR(100) NOT NULL,
    result        VARCHAR(50) NOT NULL,
    reason        VARCHAR(500),
    email         VARCHAR(200),
    contestant_id BIGINT,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_abuse_logs_action_created_at
    ON abuse_logs(action, created_at);

CREATE INDEX idx_abuse_logs_ip_created_at
    ON abuse_logs(ip, created_at);
