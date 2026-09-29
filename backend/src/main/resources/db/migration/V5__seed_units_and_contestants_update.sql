-- ============================================================
-- V5: SEED UNITS, UPDATE CONTESTANTS, AND RELAX CONSTRAINTS
-- 1. Relax email uniqueness to allow up to 10 contestants per email
-- 2. Update default contest phase require_whitelist to false
-- 3. Seed units from 70 preliminary contestants
-- 4. Add eligible contestant NGUYỄN THỊ THUÝ & dummy contestants
-- ============================================================

-- 1. Allow non-unique email per phase (up to 10 handled by business logic)
DROP INDEX IF EXISTS idx_contestants_email_phase;
CREATE INDEX IF NOT EXISTS idx_contestants_email_phase
    ON contestants(normalized_email, phase_id)
    WHERE normalized_email IS NOT NULL AND normalized_email <> '';

-- 2. Default require_whitelist to false for open/hybrid registration
UPDATE contest_phases SET require_whitelist = false;
ALTER TABLE contest_phases ALTER COLUMN require_whitelist SET DEFAULT false;

-- 3. Seed units into units table (stripped of titles like 'Bí thư', 'Phó Bí thư')
INSERT INTO units (name, is_active, created_at, updated_at) VALUES
('Đoàn xã Tân Kỳ', true, NOW(), NOW()),
('Đoàn xã Con Cuông', true, NOW(), NOW()),
('Đoàn xã Phúc Lộc', true, NOW(), NOW()),
('Đoàn xã Tân An', true, NOW(), NOW()),
('Đoàn xã Giai Xuân', true, NOW(), NOW()),
('Đoàn xã Trung Lộc', true, NOW(), NOW()),
('Đoàn xã Nghĩa Đồng', true, NOW(), NOW()),
('Đoàn xã Đô Lương', true, NOW(), NOW()),
('Đoàn xã Giai Lạc', true, NOW(), NOW()),
('Đoàn phường Vinh Phú', true, NOW(), NOW()),
('Đoàn xã Tân Châu', true, NOW(), NOW()),
('Đoàn xã Xuân Lâm', true, NOW(), NOW()),
('Đoàn xã Cát Ngạn', true, NOW(), NOW()),
('Đoàn xã Anh Sơn', true, NOW(), NOW()),
('Đoàn xã Quỳnh Tam', true, NOW(), NOW()),
('Đoàn phường Tân Mai', true, NOW(), NOW()),
('Đoàn xã Nghĩa Hành', true, NOW(), NOW()),
('Đoàn xã Yên Thành', true, NOW(), NOW()),
('Đoàn xã Châu Tiến', true, NOW(), NOW()),
('Đoàn xã Bích Hào', true, NOW(), NOW()),
('Đoàn xã Quan Thành', true, NOW(), NOW()),
('Đoàn xã Tam Đồng', true, NOW(), NOW()),
('Đoàn xã Đại Đồng', true, NOW(), NOW()),
('Đoàn xã Tam Hợp', true, NOW(), NOW()),
('Đoàn xã Văn Hiến', true, NOW(), NOW()),
('Đoàn xã Cam Phục', true, NOW(), NOW()),
('Đoàn xã Châu Bình', true, NOW(), NOW()),
('Đoàn xã Lương Sơn', true, NOW(), NOW()),
('Đoàn xã Quỳ Hợp', true, NOW(), NOW()),
('Đoàn xã Tiên Đồng', true, NOW(), NOW()),
('Đoàn xã Anh Sơn Đông', true, NOW(), NOW()),
('Đoàn phường Thái Hòa', true, NOW(), NOW()),
('Đoàn xã Hùng Châu', true, NOW(), NOW()),
('Đoàn xã Thuần Trung', true, NOW(), NOW()),
('Đoàn xã Hoa Quân', true, NOW(), NOW()),
('Đoàn xã Vĩnh Tường', true, NOW(), NOW()),
('Đoàn phường Cửa Lò', true, NOW(), NOW()),
('Đoàn xã Đông Thành', true, NOW(), NOW()),
('Đoàn xã Nhân Hòa', true, NOW(), NOW()),
('Đoàn xã Hạnh Lâm', true, NOW(), NOW()),
('Đoàn xã Bạch Ngọc', true, NOW(), NOW()),
('Đoàn xã Quỳ Châu', true, NOW(), NOW()),
('Đoàn xã Mường Xén', true, NOW(), NOW()),
('Đoàn xã Đại Huệ', true, NOW(), NOW()),
('Đoàn xã Quang Đồng', true, NOW(), NOW()),
('Đoàn xã Môn Sơn', true, NOW(), NOW()),
('Đoàn xã Mường Chọng', true, NOW(), NOW()),
('Đoàn xã Tri Lễ', true, NOW(), NOW()),
('Đoàn xã Mường Típ', true, NOW(), NOW()),
('Đoàn xã Quỳnh Phú', true, NOW(), NOW()),
('Đoàn xã Minh Hợp', true, NOW(), NOW()),
('Đoàn xã Thông Thụ', true, NOW(), NOW()),
('Đoàn xã Quỳnh Lưu', true, NOW(), NOW()),
('Đoàn xã Thần Lĩnh', true, NOW(), NOW()),
('Đoàn xã Tiền Phong', true, NOW(), NOW()),
('Đoàn xã Châu Hồng', true, NOW(), NOW()),
('Đoàn xã Bạch Hà', true, NOW(), NOW()),
('Đoàn xã Yên Hòa', true, NOW(), NOW()),
('Đoàn xã Hưng Nguyên', true, NOW(), NOW()),
('Đoàn xã Hùng Chân', true, NOW(), NOW()),
('Đoàn phường Thành Vinh', true, NOW(), NOW()),
('Đoàn xã Quỳnh Anh', true, NOW(), NOW()),
('Đoàn xã Văn Kiều', true, NOW(), NOW()),
('Đoàn xã Nghi Lộc', true, NOW(), NOW()),
('Đoàn xã Mường Quàng', true, NOW(), NOW()),
('Đoàn xã Sơn Lâm', true, NOW(), NOW()),
('Đoàn xã Kim Bảng', true, NOW(), NOW()),
('Đoàn xã Yên Na', true, NOW(), NOW()),
('Đoàn xã Na Ngoi', true, NOW(), NOW()),
('Đoàn xã Châu Lộc', true, NOW(), NOW()),
('Đoàn xã Nghĩa Đàn', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 4. Bổ sung thí sinh NGUYỄN THỊ THUÝ và 5 thí sinh dummy vào eligible_contestants
INSERT INTO eligible_contestants (order_number, full_name, unit, created_at)
SELECT 71, 'NGUYỄN THỊ THUÝ', 'Bí thư Đoàn xã Nghĩa Đàn', NOW()
WHERE NOT EXISTS (SELECT 1 FROM eligible_contestants WHERE full_name = 'NGUYỄN THỊ THUÝ');

INSERT INTO eligible_contestants (order_number, full_name, unit, created_at)
SELECT 72, 'Thí sinh 1', 'Đoàn xã Tân Kỳ', NOW()
WHERE NOT EXISTS (SELECT 1 FROM eligible_contestants WHERE full_name = 'Thí sinh 1');

INSERT INTO eligible_contestants (order_number, full_name, unit, created_at)
SELECT 73, 'Thí sinh 2', 'Đoàn xã Con Cuông', NOW()
WHERE NOT EXISTS (SELECT 1 FROM eligible_contestants WHERE full_name = 'Thí sinh 2');

INSERT INTO eligible_contestants (order_number, full_name, unit, created_at)
SELECT 74, 'Thí sinh 3', 'Đoàn xã Phúc Lộc', NOW()
WHERE NOT EXISTS (SELECT 1 FROM eligible_contestants WHERE full_name = 'Thí sinh 3');

INSERT INTO eligible_contestants (order_number, full_name, unit, created_at)
SELECT 75, 'Thí sinh 4', 'Đoàn xã Tân An', NOW()
WHERE NOT EXISTS (SELECT 1 FROM eligible_contestants WHERE full_name = 'Thí sinh 4');

INSERT INTO eligible_contestants (order_number, full_name, unit, created_at)
SELECT 76, 'Thí sinh 5', 'Đoàn xã Giai Xuân', NOW()
WHERE NOT EXISTS (SELECT 1 FROM eligible_contestants WHERE full_name = 'Thí sinh 5');
