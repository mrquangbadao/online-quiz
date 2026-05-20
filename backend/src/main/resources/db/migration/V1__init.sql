-- ============================================
-- QUIZ COMPETITION SYSTEM - FINAL SCHEMA
-- ============================================

-- 1. Admin users
CREATE TABLE users (
	id          BIGSERIAL PRIMARY KEY,
	username    VARCHAR(100)  NOT NULL UNIQUE,
	password    VARCHAR(255)  NOT NULL,
	full_name   VARCHAR(200),
	role        VARCHAR(20)   NOT NULL DEFAULT 'ADMIN',
	is_active   BOOLEAN       DEFAULT true,
	created_at  TIMESTAMP     DEFAULT NOW()
);

-- 2. Contest phases (đợt thi)
CREATE TABLE contest_phases (
	id          BIGSERIAL    PRIMARY KEY,
	name        VARCHAR(200) NOT NULL,
	status      VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE',
	start_time  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
	end_time    TIMESTAMP,
	created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT contest_phases_status_check CHECK (status IN ('ACTIVE', 'ENDED'))
);

CREATE INDEX idx_contest_phases_status ON contest_phases(status);

-- 3. Units (đơn vị công tác)
CREATE TABLE units (
	id          BIGSERIAL PRIMARY KEY,
	name        VARCHAR(200) NOT NULL UNIQUE,
	code        VARCHAR(50),
	is_active   BOOLEAN DEFAULT true,
	created_at  TIMESTAMP DEFAULT NOW(),
	updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_units_active ON units(is_active);
CREATE INDEX idx_units_name ON units(name);

-- 4. App settings
CREATE TABLE app_settings (
	key         VARCHAR(100) PRIMARY KEY,
	value       TEXT        NOT NULL,
	updated_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Multiple choice questions (300 câu)
CREATE TABLE questions (
	id             BIGSERIAL PRIMARY KEY,
	content        TEXT          NOT NULL,
	option_a       VARCHAR(1000) NOT NULL,
	option_b       VARCHAR(1000) NOT NULL,
	option_c       VARCHAR(1000) NOT NULL,
	option_d       VARCHAR(1000),              -- Nullable (3-5 options)
	option_e       VARCHAR(1000),              -- Nullable (5 options)
	correct_answer CHAR(1)       NOT NULL CHECK (correct_answer IN ('A','B','C','D','E')),
	category       VARCHAR(100),
	is_active      BOOLEAN       DEFAULT true,
	created_at     TIMESTAMP     DEFAULT NOW(),
	updated_at     TIMESTAMP     DEFAULT NOW()
);

CREATE INDEX idx_questions_active ON questions(is_active);

-- 6. Scenario questions (10 câu cố định)
CREATE TABLE scenario_questions (
	id             BIGSERIAL PRIMARY KEY,
	title          VARCHAR(500)  NOT NULL,
	description    TEXT,
	video_url      VARCHAR(2000) NOT NULL,
	option_a       VARCHAR(1000) NOT NULL,
	option_b       VARCHAR(1000) NOT NULL,
	option_c       VARCHAR(1000) NOT NULL,
	option_d       VARCHAR(1000),              -- Nullable (3-5 options)
	option_e       VARCHAR(1000),              -- Nullable (5 options)
	correct_answer CHAR(1)       NOT NULL CHECK (correct_answer IN ('A','B','C','D','E')),
	display_order  INT           NOT NULL UNIQUE,
	is_active      BOOLEAN       DEFAULT true,
	created_at     TIMESTAMP     DEFAULT NOW(),
	updated_at     TIMESTAMP     DEFAULT NOW()
);

-- 7. Contestants (thí sinh)
CREATE TABLE contestants (
	id         BIGSERIAL PRIMARY KEY,
	full_name  VARCHAR(200) NOT NULL,
	unit       VARCHAR(200) NOT NULL,
	phone      VARCHAR(20)  NOT NULL,
	email      VARCHAR(200),
	phase_id   BIGINT REFERENCES contest_phases(id) ON DELETE CASCADE,
	created_at TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_contestants_phone ON contestants(phone);
CREATE UNIQUE INDEX idx_contestants_phone_phase ON contestants(phone, phase_id);

-- 8. Exams (bài thi)
CREATE TABLE exams (
	id               BIGSERIAL PRIMARY KEY,
	contestant_id    BIGINT       NOT NULL REFERENCES contestants(id),
	phase_id         BIGINT REFERENCES contest_phases(id),
	start_time       TIMESTAMP,
	end_time         TIMESTAMP,
	duration_seconds BIGINT,
	mc_score         INT          DEFAULT 0,
	scenario_score   INT          DEFAULT 0,
	total_score      INT          DEFAULT 0,
	prediction       INT,
	status           VARCHAR(20)  NOT NULL DEFAULT 'IN_PROGRESS',
	created_at       TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_exams_contestant ON exams(contestant_id);
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_exams_phase ON exams(phase_id);

-- 9. Exam questions (câu hỏi được gán cho mỗi bài thi)
CREATE TABLE exam_questions (
	id            BIGSERIAL PRIMARY KEY,
	exam_id       BIGINT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
	question_id   BIGINT NOT NULL REFERENCES questions(id),
	display_order INT    NOT NULL
);

CREATE INDEX idx_exam_questions_exam ON exam_questions(exam_id);

-- 10. Exam answers (câu trả lời)
CREATE TABLE exam_answers (
	id              BIGSERIAL PRIMARY KEY,
	exam_id         BIGINT      NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
	question_id     BIGINT      NOT NULL,
	question_type   CHAR(2)     NOT NULL,   -- 'MC' or 'SC'
	selected_answer CHAR(1),
	is_correct      BOOLEAN
);

CREATE INDEX idx_exam_answers_exam ON exam_answers(exam_id);