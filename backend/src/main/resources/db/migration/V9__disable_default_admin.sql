-- Disable the default admin account and invalidate its password for security reasons
UPDATE users
SET is_active = false,
    password = 'disabled_by_security_patch_no_login_allowed'
WHERE username = 'admin';
