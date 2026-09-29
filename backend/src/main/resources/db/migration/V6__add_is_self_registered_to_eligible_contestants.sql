-- Add is_self_registered column to eligible_contestants
ALTER TABLE eligible_contestants ADD COLUMN IF NOT EXISTS is_self_registered BOOLEAN DEFAULT FALSE;

-- Backfill any existing self-registered contestants who don't have an eligible_contestants row
INSERT INTO eligible_contestants (
    order_number, full_name, unit, phone, email, is_registered, is_self_registered, registered_contestant_id,
    score_week1, score_week2, score_week3, score_week4, total_score_preliminary
)
SELECT 
    COALESCE((SELECT MAX(order_number) FROM eligible_contestants), 0) + ROW_NUMBER() OVER (ORDER BY c.id ASC),
    c.full_name,
    c.unit,
    c.phone,
    c.email,
    TRUE,
    TRUE,
    c.id,
    '-',
    '-',
    '-',
    '-',
    0
FROM contestants c
WHERE c.id NOT IN (
    SELECT registered_contestant_id FROM eligible_contestants WHERE registered_contestant_id IS NOT NULL
);
