-- ============================================================
-- V11: CREATE LIVE ARENA FINALS TABLES (VÒNG CHUNG KẾT CẤP TỈNH)
-- Hội thi Bí thư Đoàn cơ sở giỏi tỉnh Nghệ An năm 2026
-- ============================================================

-- 1. Bảng Phiên thi Chung kết sân khấu (Live Session)
CREATE TABLE IF NOT EXISTS live_sessions (
    id BIGSERIAL PRIMARY KEY,
    phase_id BIGINT REFERENCES contest_phases(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'LOBBY', -- LOBBY, ROUND1, ROUND2, ROUND3, FINISHED
    current_round INT NOT NULL DEFAULT 1,
    current_question_index INT NOT NULL DEFAULT 0,
    round1_state VARCHAR(50) DEFAULT 'IDLE', -- IDLE, HOPE_STAR_5S, VIDEO_PLAYING, QUESTION_READING, QUESTION_40S, ANSWER_REVEALED, LEADERBOARD
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_phase_id ON live_sessions(phase_id);

-- 2. Bảng 10 Thí sinh Vòng Chung kết (Live Players)
CREATE TABLE IF NOT EXISTS live_players (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    contestant_id BIGINT REFERENCES contestants(id),
    order_number INT NOT NULL, -- SBD / Thứ tự (1 - 10)
    full_name VARCHAR(255) NOT NULL,
    unit VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    avatar_url TEXT,
    is_checked_in BOOLEAN NOT NULL DEFAULT FALSE,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    is_rescue_requested BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Trạng thái Vòng 1 (Thông thái)
    hope_star_used BOOLEAN NOT NULL DEFAULT FALSE,
    hope_star_question_index INT,
    round1_score NUMERIC(5, 1) NOT NULL DEFAULT 0,
    round1_total_time_ms BIGINT NOT NULL DEFAULT 0,
    
    -- Trạng thái Vòng 2 (Nhạy bén)
    round2_draw_code VARCHAR(50), -- Mã đề bốc thăm (ví dụ 'ĐỀ 01')
    round2_scenario1_score NUMERIC(5, 1) DEFAULT 0,
    round2_scenario2_score NUMERIC(5, 1) DEFAULT 0,
    round2_score NUMERIC(5, 1) NOT NULL DEFAULT 0,
    
    -- Trạng thái Vòng 3 (Bản lĩnh)
    round3_pair_group INT, -- Cặp đấu (1 - 5)
    round3_score NUMERIC(5, 1) NOT NULL DEFAULT 0,
    
    -- Tổng kết & Vinh danh
    total_score NUMERIC(6, 1) NOT NULL DEFAULT 0,
    final_rank INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_session_player_order UNIQUE (session_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_live_players_session_id ON live_players(session_id);
CREATE INDEX IF NOT EXISTS idx_live_players_contestant_id ON live_players(contestant_id);

-- 3. Bảng 10 Câu hỏi Vòng 1 (Live Questions)
CREATE TABLE IF NOT EXISTS live_questions (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    question_order INT NOT NULL, -- 1 đến 10
    title TEXT NOT NULL,
    video_url VARCHAR(500), -- Link YouTube hoặc URL file upload
    video_type VARCHAR(50) DEFAULT 'NONE', -- YOUTUBE, DIRECT_FILE, NONE
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option TEXT NOT NULL, -- 'A', 'B', 'C', 'D' hoặc nội dung text đáp án đúng
    explanation TEXT,
    time_limit_seconds INT NOT NULL DEFAULT 40,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_session_question_order UNIQUE (session_id, question_order)
);

CREATE INDEX IF NOT EXISTS idx_live_questions_session_id ON live_questions(session_id);

-- 4. Bảng Nhật ký Câu trả lời Thí sinh Vòng 1 (Player Answers)
CREATE TABLE IF NOT EXISTS live_player_answers (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL REFERENCES live_questions(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES live_players(id) ON DELETE CASCADE,
    selected_option TEXT, -- A, B, C, D hoặc nội dung text thí sinh đã chọn
    shuffled_order VARCHAR(20) NOT NULL, -- Ví dụ: "B,D,A,C"
    has_hope_star BOOLEAN NOT NULL DEFAULT FALSE,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    response_time_ms BIGINT NOT NULL DEFAULT 0,
    score_awarded NUMERIC(5, 1) NOT NULL DEFAULT 0,
    server_received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_player_question UNIQUE (session_id, question_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_live_player_answers_session_id ON live_player_answers(session_id);

-- 5. Bảng Đề thi Tình huống Nghiệp vụ Vòng 2 (Round 2 Topics)
CREATE TABLE IF NOT EXISTS live_round2_topics (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL, -- 'ĐỀ 01', 'ĐỀ 02', ...
    scenario_1 TEXT NOT NULL,
    scenario_2 TEXT NOT NULL,
    max_score_1 NUMERIC(5, 1) NOT NULL DEFAULT 20.0,
    max_score_2 NUMERIC(5, 1) NOT NULL DEFAULT 20.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_session_topic_code UNIQUE (session_id, code)
);

CREATE INDEX IF NOT EXISTS idx_live_round2_topics_session_id ON live_round2_topics(session_id);

-- 6. Bảng Cặp đấu Bốc thăm Vòng 3 (Round 3 Pairs)
CREATE TABLE IF NOT EXISTS live_round3_pairs (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    pair_number INT NOT NULL, -- 1 đến 5
    player1_id BIGINT REFERENCES live_players(id) ON DELETE SET NULL,
    player2_id BIGINT REFERENCES live_players(id) ON DELETE SET NULL,
    topic_description TEXT,
    drawn_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_session_pair_number UNIQUE (session_id, pair_number)
);

CREATE INDEX IF NOT EXISTS idx_live_round3_pairs_session_id ON live_round3_pairs(session_id);

-- Khởi tạo phiên thi mẫu nếu chưa có
INSERT INTO live_sessions (id, name, status, current_round, current_question_index, round1_state)
VALUES (1, 'VÒNG CHUNG KẾT CẤP TỈNH NĂM 2026', 'LOBBY', 1, 0, 'IDLE')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('live_sessions', 'id'), coalesce(max(id), 1)) FROM live_sessions;
