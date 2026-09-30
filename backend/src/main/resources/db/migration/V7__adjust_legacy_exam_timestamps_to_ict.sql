-- Migration V7: Shift legacy exam timestamps created under UTC container to ICT (UTC+7)
-- All exams created before container/JVM timezone configuration were stored in UTC.
UPDATE exams
SET start_time = start_time + INTERVAL '7 hours',
    end_time   = CASE WHEN end_time IS NOT NULL THEN end_time + INTERVAL '7 hours' ELSE NULL END,
    created_at = CASE WHEN created_at IS NOT NULL THEN created_at + INTERVAL '7 hours' ELSE NULL END
WHERE start_time IS NOT NULL;
