-- ============================================================
-- V12: ADD DEVICE_ID TO LIVE_PLAYERS (ĐẢM BẢO 1 MÁY / 1 THÍ SINH)
-- ============================================================

ALTER TABLE live_players ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);
