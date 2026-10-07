-- ============================================================
-- V13: CẬP NHẬT CHUẨN HÓA DANH XƯNG "THÍ SINH" TRONG ĐỀ THI VÒNG 2
-- Thay thế từ "Đồng chí" / "đồng chí" thành "Thí sinh" / "thí sinh"
-- ============================================================

UPDATE live_round2_topics
SET scenario_1 = REPLACE(REPLACE(REPLACE(REPLACE(scenario_1, 'Đồng chí', 'Thí sinh'), 'đồng chí', 'thí sinh'), 'ĐỒNG CHÍ', 'THÍ SINH'), 'đ/c', 'thí sinh'),
    scenario_2 = REPLACE(REPLACE(REPLACE(REPLACE(scenario_2, 'Đồng chí', 'Thí sinh'), 'đồng chí', 'thí sinh'), 'ĐỒNG CHÍ', 'THÍ SINH'), 'đ/c', 'thí sinh')
WHERE scenario_1 LIKE '%ồng chí%' OR scenario_2 LIKE '%ồng chí%'
   OR scenario_1 LIKE '%Đồng chí%' OR scenario_2 LIKE '%Đồng chí%';
