-- ============================================================
-- V4: UPDATE PHASE REQUIREMENTS TO MATCH OFFICIAL RULES
-- 30 Multiple Choice Questions, 20 Minutes Time Limit, Whitelist Enabled
-- ============================================================

-- 1. Cap nhat dot thi dang hoat dong sang 30 cau, 20 phut, bat whitelist
UPDATE contest_phases
SET mc_question_count = 30,
    time_limit_minutes = 20,
    require_whitelist = true,
    has_scenarios = false
WHERE status = 'ACTIVE';

-- 2. Cap nhat gia tri mac dinh cho cac cot trong contest_phases
ALTER TABLE contest_phases
    ALTER COLUMN mc_question_count SET DEFAULT 30,
    ALTER COLUMN time_limit_minutes SET DEFAULT 20,
    ALTER COLUMN require_whitelist SET DEFAULT true,
    ALTER COLUMN has_scenarios SET DEFAULT false;

-- 3. Dong bo vao app_settings
INSERT INTO app_settings (key, value, updated_at) VALUES
('exam_mc_question_count', '30', CURRENT_TIMESTAMP),
('exam_time_limit_minutes', '20', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
