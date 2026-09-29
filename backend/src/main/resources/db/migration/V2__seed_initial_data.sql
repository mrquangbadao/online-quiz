-- ============================================================
-- V2: SEED INITIAL MASTER DATA
-- Tỉnh đoàn Nghệ An - Hội thi Bí thư Đoàn cơ sở giỏi năm 2026
-- ============================================================

-- 1. Khởi tạo tài khoản Quản trị viên (Admin)
-- Mật khẩu mặc định sẽ được cập nhật tự động khi khởi động nếu cấu hình QUIZ_ADMIN_PROVISION_PASSWORD
INSERT INTO users (username, password, full_name, role, is_active, created_at)
VALUES (
    'admin',
    '$2a$12$HBEwvQeRPV4yxV8CcHbgje1liFCnl3Io4IX46mrQ1qZEF39OKqaKe',
    'Ban Tổ chức Tỉnh đoàn',
    'ADMIN',
    true,
    NOW()
)
ON CONFLICT (username) DO NOTHING;

-- 2. Cài đặt hệ thống (App Settings)
INSERT INTO app_settings (key, value, updated_at) VALUES
('slogan', 'TỈNH ĐOÀN NGHỆ AN | HỘI THI BÍ THƯ ĐOÀN CƠ SỞ GIỎI NĂM 2026 | KHÁT VỌNG CỐNG HIẾN – RÈN ĐỨC LUYỆN TÀI – VỮNG BƯỚC TƯƠNG LAI', CURRENT_TIMESTAMP),
('exam_time_limit_minutes', '20', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;

-- 3. Khởi tạo Đợt thi chính thức: Vòng loại cấp tỉnh
INSERT INTO contest_phases (name, status, start_time, phase_type, mc_question_count, time_limit_minutes, has_scenarios, has_prediction, require_whitelist)
VALUES (
    'Vòng loại cấp tỉnh - Hội thi Bí thư Đoàn cơ sở giỏi 2026',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    'PROVINCIAL_QUALIFIER',
    30,
    20,
    false,
    false,
    true
);

-- 4. Seed duy nhất 1 câu hỏi trắc nghiệm mẫu (Example Question) theo yêu cầu
INSERT INTO questions (content, option_a, option_b, option_c, option_d, correct_answer, category, is_active, created_at, updated_at)
VALUES (
    'Nghị quyết Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XII (nhiệm kỳ 2022 - 2027) xác định triển khai bao nhiêu phong trào hành động cách mạng của thanh niên?',
    '3 phong trào',
    '4 phong trào',
    '5 phong trào',
    '6 phong trào',
    'A',
    'Công tác Đoàn',
    true,
    NOW(),
    NOW()
);

-- 5. Danh sách 70 thí sinh đủ điều kiện tham dự Vòng loại cấp tỉnh (theo Thông báo chính thức của Ban Thường vụ Tỉnh đoàn)
INSERT INTO eligible_contestants (order_number, full_name, unit, score_week1, score_week2, score_week3, score_week4, total_score_preliminary) VALUES
(1, 'ĐẶNG THỊ QUÝ', 'Bí thư Đoàn xã Tân Kỳ', '200/200', '190/200', '200/200', '200/200', 790),
(2, 'DƯƠNG THỊ GIANG', 'Bí thư Đoàn xã Con Cuông', '200/200', '200/200', '200/200', '180/200', 780),
(3, 'NGUYỄN PHẤN NGỌ', 'Bí thư Đoàn xã Phúc Lộc', '190/200', '190/200', '190/200', '200/200', 770),
(4, 'NGUYỄN ĐỨC ANH', 'Phó Bí thư Đoàn xã Tân An', '180/200', '200/200', '200/200', '180/200', 760),
(5, 'NGUYỄN THỊ TRANG', 'Bí thư Đoàn xã Giai Xuân', '190/200', '180/200', '180/200', '200/200', 750),
(6, 'NGUYỄN THỊ HUỆ', 'Bí thư Đoàn xã Trung Lộc', '190/200', '190/200', '190/200', '180/200', 750),
(7, 'NGUYỄN THỊ THU TRANG', 'Bí thư Đoàn xã Nghĩa Đồng', '180/200', '180/200', '190/200', '200/200', 750),
(8, 'NGUYỄN TRUNG TÂN', 'Bí thư Đoàn xã Đô Lương', '190/200', '190/200', '180/200', '180/200', 740),
(9, 'NGUYỄN HOÀNG CHUNG', 'Bí thư Đoàn xã Giai Lạc', '190/200', '150/200', '180/200', '200/200', 720),
(10, 'NGUYỄN NGỌC HUY HOÀNG', 'Bí thư Đoàn phường Vinh Phú', '140/200', '200/200', '190/200', '170/200', 700),
(11, 'TRẦN THỊ VÂN', 'Bí thư Đoàn xã Tân Châu', '190/200', '140/200', '170/200', '200/200', 700),
(12, 'NGUYỄN NHỮ TIẾN', 'Bí thư Đoàn xã Xuân Lâm', '100/200', '200/200', '190/200', '200/200', 690),
(13, 'DƯƠNG THỊ THU', 'Bí thư Đoàn xã Cát Ngạn', '150/200', '170/200', '170/200', '200/200', 690),
(14, 'ĐẶNG XUÂN DŨNG', 'Bí thư Đoàn xã Anh Sơn', '160/200', '190/200', '170/200', '170/200', 690),
(15, 'PHAN THỊ THỦY', 'Bí thư Đoàn xã Quỳnh Tam', '130/200', '180/200', '180/200', '180/200', 670),
(16, 'NGUYỄN HỒNG QUÂN', 'Bí thư Đoàn phường Tân Mai', '150/200', '140/200', '180/200', '180/200', 650),
(17, 'NGUYỄN QUỐC VIỆT ANH', 'Bí thư Đoàn xã Nghĩa Hành', '150/200', '160/200', '160/200', '180/200', 650),
(18, 'VŨ THỊ TRANG', 'Bí thư Đoàn xã Yên Thành', '140/200', '190/200', '140/200', '170/200', 640),
(19, 'LÃNH VĂN MÙI', 'Bí thư Đoàn xã Châu Tiến', '150/200', '160/200', '150/200', '170/200', 630),
(20, 'HOÀNG VĂN TRƯỜNG', 'Bí thư Đoàn xã Bích Hào', '150/200', '160/200', '180/200', '140/200', 630),
(21, 'HOÀNG THỊ ÁNH', 'Bí thư Đoàn xã Quan Thành', '140/200', '180/200', '190/200', '120/200', 630),
(22, 'HOÀNG THẾ ANH', 'Bí thư Đoàn xã Tam Đồng', '160/200', '120/200', '200/200', '150/200', 630),
(23, 'NGUYỄN CAO LỢI', 'Bí thư Đoàn xã Đại Đồng', '110/200', '110/200', '200/200', '200/200', 620),
(24, 'NGUYỄN VĂN QUÝ', 'Bí thư Đoàn xã Tam Hợp', '160/200', '110/200', '190/200', '160/200', 620),
(25, 'NGUYỄN THỊ LƯƠNG', 'Bí thư Đoàn xã Văn Hiến', '160/200', '160/200', '160/200', '140/200', 620),
(26, 'LƯƠNG VĂN NÔNG', 'Bí thư Đoàn xã Cam Phục', '130/200', '120/200', '190/200', '180/200', 620),
(27, 'LIM MINH SÁNG', 'Bí thư Đoàn xã Châu Bình', '170/200', '130/200', '170/200', '150/200', 620),
(28, 'PHAN THỊ HƯƠNG', 'Bí thư Đoàn xã Lương Sơn', '160/200', '130/200', '190/200', '140/200', 620),
(29, 'HỒ TIẾN DŨNG', 'Bí thư Đoàn xã Quỳ Hợp', '110/200', '150/200', '160/200', '190/200', 610),
(30, 'LÔ HỒNG TƯỢNG', 'Bí thư Đoàn xã Tiên Đồng', '140/200', '110/200', '160/200', '200/200', 610),
(31, 'NGUYỄN THỊ THANH HƯƠNG', 'Bí thư Đoàn xã Anh Sơn Đông', '140/200', '160/200', '130/200', '180/200', 610),
(32, 'DƯƠNG NGỌC ĐỨC', 'Bí thư Đoàn phường Thái Hòa', '150/200', '130/200', '150/200', '180/200', 610),
(33, 'DƯƠNG ĐĂNG PHƯỚC', 'Bí thư Đoàn xã Hùng Châu', '140/200', '140/200', '160/200', '170/200', 610),
(34, 'NGUYỄN SỸ TÍNH', 'Bí thư Đoàn xã Thuần Trung', '150/200', '140/200', '170/200', '150/200', 610),
(35, 'PHẠM THỊ PHƯƠNG', 'Bí thư Đoàn xã Hoa Quân', '160/200', '180/200', '140/200', '130/200', 610),
(36, 'HỒ SỸ HOÀNG', 'Bí thư Đoàn xã Vĩnh Tường', '150/200', '160/200', '160/200', '120/200', 590),
(37, 'PHÙNG THỊ LÊ NA', 'Bí thư Đoàn phường Cửa Lò', '100/200', '140/200', '160/200', '190/200', 590),
(38, 'NGUYỄN THỊ TÂM', 'Bí thư Đoàn xã Đông Thành', '120/200', '170/200', '200/200', '100/200', 590),
(39, 'NGUYỄN SỸ CHUNG', 'Bí thư Đoàn xã Nhân Hòa', '160/200', '140/200', '140/200', '150/200', 590),
(40, 'MAI THỊ GIANG', 'Bí thư Đoàn xã Hạnh Lâm', '140/200', '140/200', '140/200', '160/200', 580),
(41, 'NGUYỄN VĂN SỸ ĐỨC', 'Bí thư Đoàn xã Bạch Ngọc', '130/200', '110/200', '200/200', '140/200', 580),
(42, 'VÕ LÂM PHƯƠNG', 'Bí thư Đoàn xã Quỳ Châu', '150/200', '140/200', '140/200', '150/200', 580),
(43, 'LA MẠNH HÙNG', 'Bí thư Đoàn xã Mường Xén', '140/200', '130/200', '150/200', '160/200', 580),
(44, 'NGUYỄN THỊ THÙY DUNG', 'Bí thư Đoàn xã Đại Huệ', '120/200', '160/200', '180/200', '120/200', 580),
(45, 'ĐẶNG THỊ THANH XUÂN', 'Bí thư Đoàn xã Quang Đồng', '110/200', '160/200', '140/200', '160/200', 570),
(46, 'HÀ THỊ HƯỚNG', 'Bí thư Đoàn xã Môn Sơn', '100/200', '140/200', '140/200', '190/200', 570),
(47, 'VI THỊ THANH LAN', 'Bí thư Đoàn xã Mường Chọng', '150/200', '120/200', '150/200', '150/200', 570),
(48, 'LÔ THỊ DUNG', 'Bí thư Đoàn xã Tri Lễ', '110/200', '110/200', '180/200', '160/200', 560),
(49, 'VI VĂN THỜI', 'Bí thư Đoàn xã Mường Típ', '100/200', '160/200', '140/200', '160/200', 560),
(50, 'TRẦN THỊ YẾN', 'Bí thư Đoàn xã Quỳnh Phú', '130/200', '140/200', '190/200', '100/200', 560),
(51, 'LÊ VĂN VINH', 'Bí thư Đoàn xã Minh Hợp', '140/200', '120/200', '150/200', '150/200', 560),
(52, 'LƯƠNG THỊ DOAN', 'Bí thư Đoàn xã Thông Thụ', '120/200', '150/200', '120/200', '150/200', 540),
(53, 'KIỀU NGỌC THÀNH', 'Bí thư Đoàn xã Quỳnh Lưu', '120/200', '180/200', '120/200', '110/200', 530),
(54, 'VƯƠNG VĂN CHÂU', 'Bí thư Đoàn xã Thần Lĩnh', '140/200', '120/200', '150/200', '120/200', 530),
(55, 'NGUYỄN ĐÌNH QUANG', 'Bí thư Đoàn xã Tiền Phong', '140/200', '120/200', '120/200', '150/200', 530),
(56, 'LƯƠNG VĂN TUẤN', 'Bí thư Đoàn xã Châu Hồng', '140/200', '140/200', '130/200', '120/200', 530),
(57, 'HOÀNG VĂN TRUNG', 'Phó Bí thư Đoàn xã Bạch Hà', '120/200', '130/200', '130/200', '150/200', 530),
(58, 'VI THỊ XOAN', 'Bí thư Đoàn xã Yên Hòa', '120/200', '120/200', '140/200', '140/200', 520),
(59, 'NGUYỄN NGỌC NHÂM', 'Bí thư Đoàn xã Hưng Nguyên', '130/200', '130/200', '130/200', '130/200', 520),
(60, 'LỮ THÀNH ĐỨC', 'Bí thư Đoàn xã Hùng Chân', '120/200', '130/200', '120/200', '140/200', 510),
(61, 'NGUYỄN PHƯƠNG CƯỜNG', 'Bí thư Đoàn phường Thành Vinh', '110/200', '120/200', '150/200', '130/200', 510),
(62, 'HỒ ĐỨC HẢI', 'Bí thư Đoàn xã Quỳnh Anh', '110/200', '110/200', '150/200', '140/200', 510),
(63, 'NGÔ THỊ XUYẾN', 'Bí thư Đoàn xã Văn Kiều', '100/200', '130/200', '170/200', '110/200', 510),
(64, 'LÊ XUÂN TRƯỜNG', 'Bí thư Đoàn xã Nghi Lộc', '100/200', '150/200', '120/200', '140/200', 510),
(65, 'VI VĂN PHONG', 'Bí thư Đoàn xã Mường Quàng', '140/200', '120/200', '100/200', '140/200', 500),
(66, 'VI VĂN VỮNG', 'Bí thư Đoàn xã Sơn Lâm', '120/200', '120/200', '140/200', '120/200', 500),
(67, 'NGUYỄN ĐÌNH THẾ', 'Bí thư Đoàn xã Kim Bảng', '130/200', '130/200', '120/200', '120/200', 500),
(68, 'LƯƠNG VĂN LY', 'Bí thư Đoàn xã Yên Na', '130/200', '120/200', '150/200', '100/200', 500),
(69, 'LƯƠNG ĐỨC MẠNH', 'Bí thư Đoàn xã Na Ngoi', '120/200', '120/200', '110/200', '110/200', 460),
(70, 'SẦM THẾ MẠNH', 'Bí thư Đoàn xã Châu Lộc', '130/200', '120/200', '100/200', '110/200', 460);
