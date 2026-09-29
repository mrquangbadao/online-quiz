-- ============================================================
-- V1: QUIZ COMPETITION SYSTEM - CONSOLIDATED PRODUCTION SCHEMA
-- Tỉnh đoàn Nghệ An - Hội thi Bí thư Đoàn cơ sở giỏi năm 2026
-- ============================================================

-- 1. Admin users
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    username    VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    full_name   VARCHAR(200),
    role        VARCHAR(20)  NOT NULL DEFAULT 'ADMIN',
    is_active   BOOLEAN      DEFAULT true,
    created_at  TIMESTAMP    DEFAULT NOW()
);

-- 2. Contest phases (Giai đoạn / Đợt thi)
CREATE TABLE contest_phases (
    id                 BIGSERIAL PRIMARY KEY,
    name               VARCHAR(200) NOT NULL,
    status             VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE',
    start_time         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time           TIMESTAMP,
    phase_type         VARCHAR(50)  NOT NULL DEFAULT 'STANDARD',
    mc_question_count  INT          NOT NULL DEFAULT 10,
    time_limit_minutes INT          NOT NULL DEFAULT 15,
    has_scenarios      BOOLEAN      NOT NULL DEFAULT true,
    has_prediction     BOOLEAN      NOT NULL DEFAULT true,
    require_whitelist  BOOLEAN      NOT NULL DEFAULT false,
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contest_phases_status_check CHECK (status IN ('ACTIVE', 'ENDED'))
);

CREATE INDEX idx_contest_phases_status ON contest_phases(status);

-- 3. Units (Đơn vị công tác)
CREATE TABLE units (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL UNIQUE,
    code        VARCHAR(50),
    is_active   BOOLEAN   DEFAULT true,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_units_active ON units(is_active);
CREATE INDEX idx_units_name ON units(name);

-- 4. App settings (Cấu hình hệ thống, slogan, thời gian làm bài)
CREATE TABLE app_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT      NOT NULL,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Multiple choice questions (Ngân hàng câu hỏi trắc nghiệm)
CREATE TABLE questions (
    id             BIGSERIAL PRIMARY KEY,
    content        TEXT          NOT NULL,
    option_a       VARCHAR(1000) NOT NULL,
    option_b       VARCHAR(1000) NOT NULL,
    option_c       VARCHAR(1000) NOT NULL,
    option_d       VARCHAR(1000),
    option_e       VARCHAR(1000),
    correct_answer TEXT          NOT NULL,
    category       VARCHAR(100),
    is_active      BOOLEAN       DEFAULT true,
    created_at     TIMESTAMP     DEFAULT NOW(),
    updated_at     TIMESTAMP     DEFAULT NOW()
);

CREATE INDEX idx_questions_active ON questions(is_active);

-- 6. Scenario questions (Câu hỏi tình huống video)
CREATE TABLE scenario_questions (
    id             BIGSERIAL PRIMARY KEY,
    title          VARCHAR(500)  NOT NULL,
    description    TEXT,
    video_url      VARCHAR(2000) NOT NULL,
    option_a       VARCHAR(1000) NOT NULL,
    option_b       VARCHAR(1000) NOT NULL,
    option_c       VARCHAR(1000) NOT NULL,
    option_d       VARCHAR(1000),
    option_e       VARCHAR(1000),
    correct_answer TEXT          NOT NULL,
    display_order  INT           NOT NULL UNIQUE,
    is_active      BOOLEAN       DEFAULT true,
    created_at     TIMESTAMP     DEFAULT NOW(),
    updated_at     TIMESTAMP     DEFAULT NOW()
);

-- 7. Contestants (Thí sinh đăng ký dự thi)
CREATE TABLE contestants (
    id                            BIGSERIAL PRIMARY KEY,
    full_name                     VARCHAR(200) NOT NULL,
    unit                          VARCHAR(200) NOT NULL,
    phone                         VARCHAR(20)  NOT NULL,
    email                         VARCHAR(200),
    normalized_email              VARCHAR(200),
    start_exam_token_hash         VARCHAR(255),
    start_exam_token_expires_at   TIMESTAMP,
    start_exam_token_consumed_at  TIMESTAMP,
    phase_id                      BIGINT REFERENCES contest_phases(id) ON DELETE CASCADE,
    created_at                    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contestants_phone ON contestants(phone);
CREATE UNIQUE INDEX idx_contestants_phone_phase ON contestants(phone, phase_id);
CREATE UNIQUE INDEX idx_contestants_email_phase
    ON contestants(normalized_email, phase_id)
    WHERE normalized_email IS NOT NULL AND normalized_email <> '';

-- 8. Exams (Bài thi của thí sinh)
CREATE TABLE exams (
    id                        BIGSERIAL PRIMARY KEY,
    contestant_id             BIGINT       NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
    phase_id                  BIGINT REFERENCES contest_phases(id) ON DELETE CASCADE,
    start_time                TIMESTAMP,
    end_time                  TIMESTAMP,
    duration_seconds          BIGINT,
    mc_score                  INT          DEFAULT 0,
    scenario_score            INT          DEFAULT 0,
    total_score               INT          DEFAULT 0,
    prediction                INT,
    status                    VARCHAR(20)  NOT NULL DEFAULT 'IN_PROGRESS',
    submit_token_hash         VARCHAR(255),
    submit_token_expires_at   TIMESTAMP,
    submit_token_consumed_at  TIMESTAMP,
    created_at                TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_exams_contestant ON exams(contestant_id);
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_exams_phase ON exams(phase_id);
CREATE INDEX idx_exams_submit_token ON exams (submit_token_hash) WHERE submit_token_hash IS NOT NULL;

-- 9. Exam questions (Các câu hỏi được gán cho từng bài thi)
CREATE TABLE exam_questions (
    id            BIGSERIAL PRIMARY KEY,
    exam_id       BIGINT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_id   BIGINT NOT NULL REFERENCES questions(id),
    display_order INT    NOT NULL
);

CREATE INDEX idx_exam_questions_exam ON exam_questions(exam_id);

-- 10. Exam answers (Câu trả lời của thí sinh)
CREATE TABLE exam_answers (
    id              BIGSERIAL PRIMARY KEY,
    exam_id         BIGINT      NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_id     BIGINT      NOT NULL,
    question_type   VARCHAR(2)  NOT NULL,   -- 'MC' or 'SC'
    selected_answer TEXT,
    is_correct      BOOLEAN
);

CREATE INDEX idx_exam_answers_exam ON exam_answers(exam_id);

-- 11. Abuse logs (Nhật ký giám sát truy cập và phòng chống gian lận)
CREATE TABLE abuse_logs (
    id            BIGSERIAL PRIMARY KEY,
    ip            VARCHAR(100) NOT NULL,
    user_agent    VARCHAR(1000),
    device_id     VARCHAR(255),
    endpoint      VARCHAR(255) NOT NULL,
    action        VARCHAR(100) NOT NULL,
    result        VARCHAR(50)  NOT NULL,
    reason        VARCHAR(500),
    email         VARCHAR(200),
    contestant_id BIGINT,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_abuse_logs_action_created_at ON abuse_logs(action, created_at);
CREATE INDEX idx_abuse_logs_ip_created_at ON abuse_logs(ip, created_at);

-- 12. Email OTP (Mã xác thực gửi về email)
CREATE TABLE email_otp (
    id               BIGSERIAL PRIMARY KEY,
    email            VARCHAR(200) NOT NULL,
    normalized_email VARCHAR(200) NOT NULL,
    phase_id         BIGINT       NOT NULL REFERENCES contest_phases(id) ON DELETE CASCADE,
    otp_hash         VARCHAR(255) NOT NULL,
    expires_at       TIMESTAMP    NOT NULL,
    attempts         INT          NOT NULL DEFAULT 0,
    max_attempts     INT          NOT NULL,
    used_at          TIMESTAMP,
    last_sent_at     TIMESTAMP    NOT NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_otp_email_phase_created_at ON email_otp(normalized_email, phase_id, created_at);
CREATE INDEX idx_email_otp_expires_at ON email_otp(expires_at);

-- 13. Email verification sessions (Phiên xác thực email thành công)
CREATE TABLE email_verification_sessions (
    id               BIGSERIAL PRIMARY KEY,
    email            VARCHAR(200) NOT NULL,
    normalized_email VARCHAR(200) NOT NULL,
    phase_id         BIGINT       NOT NULL REFERENCES contest_phases(id) ON DELETE CASCADE,
    token_hash       VARCHAR(255) NOT NULL,
    verified_at      TIMESTAMP    NOT NULL,
    expires_at       TIMESTAMP    NOT NULL,
    consumed_at      TIMESTAMP,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verification_sessions_email_phase_verified_at ON email_verification_sessions(normalized_email, phase_id, verified_at);
CREATE INDEX idx_email_verification_sessions_expires_at ON email_verification_sessions(expires_at);

-- 14. Eligible contestants (Danh sách 70 thí sinh đủ điều kiện Vòng loại cấp tỉnh)
CREATE TABLE eligible_contestants (
    id                       BIGSERIAL PRIMARY KEY,
    order_number             INT NOT NULL,
    full_name                VARCHAR(200) NOT NULL,
    unit                     VARCHAR(200) NOT NULL,
    score_week1              VARCHAR(50),
    score_week2              VARCHAR(50),
    score_week3              VARCHAR(50),
    score_week4              VARCHAR(50),
    total_score_preliminary  INT,
    is_registered            BOOLEAN DEFAULT false,
    phone                    VARCHAR(20),
    email                    VARCHAR(200),
    registered_contestant_id BIGINT REFERENCES contestants(id) ON DELETE SET NULL,
    created_at               TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_eligible_contestants_name ON eligible_contestants(full_name);
CREATE INDEX idx_eligible_contestants_registered ON eligible_contestants(is_registered);
