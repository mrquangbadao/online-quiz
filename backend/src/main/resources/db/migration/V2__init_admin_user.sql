-- Khởi tạo tài khoản Quản trị viên (Admin)
-- Mật khẩu gốc: Admin@123
-- Mật khẩu mã hóa BCrypt: $2a$12$HBEwvQeRPV4yxV8CcHbgje1liFCnl3Io4IX46mrQ1qZEF39OKqaKe

INSERT INTO users (username, password, full_name, role, is_active, created_at)
VALUES (
           'admin',
           '$2a$12$HBEwvQeRPV4yxV8CcHbgje1liFCnl3Io4IX46mrQ1qZEF39OKqaKe',
           'System Administrator',
           'ADMIN',
           true,
           NOW()
       )
    ON CONFLICT (username) DO NOTHING;