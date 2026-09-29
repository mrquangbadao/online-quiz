-- Enforce require_whitelist = true for all contest phases
UPDATE contest_phases
SET require_whitelist = true
WHERE require_whitelist IS NOT TRUE;

-- Update default value for column require_whitelist to true
ALTER TABLE contest_phases
ALTER COLUMN require_whitelist SET DEFAULT true;
