-- ============================================================
-- V14: LÀM SẠCH DỮ LIỆU CŨ VÀ IMPORT BỘ ĐỀ THI VÒNG 1 & VÒNG 2 CHÍNH THỨC
-- Hội thi Bí thư Đoàn cơ sở giỏi tỉnh Nghệ An năm 2026
-- Nguồn dữ liệu: requirements/ĐỀ VÒNG 1 TRẮC NGHIỆM.docx
--                requirements/ĐỀ VÒNG 2 CÂU HỎI.docx
-- ============================================================

-- 1. XÓA TOÀN BỘ DỮ LIỆU BÀI THI TEST / MOCK VÀ BỘ ĐỀ SAMPLE CŨ
DELETE FROM live_player_answers;
DELETE FROM live_round3_pairs;
DELETE FROM live_questions;
DELETE FROM live_round2_topics;

-- Reset điểm số và kết quả thi của thí sinh về trạng thái ban đầu
UPDATE live_players
SET hope_star_used = FALSE,
    hope_star_question_index = NULL,
    round1_score = 0,
    round1_total_time_ms = 0,
    round2_draw_code = NULL,
    round2_scenario1_score = 0,
    round2_scenario2_score = 0,
    round2_score = 0,
    round3_pair_group = NULL,
    round3_score = 0,
    total_score = 0,
    final_rank = NULL,
    is_checked_in = FALSE,
    checked_in_at = NULL,
    device_id = NULL,
    is_rescue_requested = FALSE;

-- Đưa tất cả các phiên thi về sảnh chờ Lobby ban đầu
UPDATE live_sessions
SET status = 'LOBBY',
    current_round = 1,
    current_question_index = 0,
    round1_state = 'IDLE';

-- Đảm bảo có sẵn phiên thi chính thức ID = 1
INSERT INTO live_sessions (id, name, status, current_round, current_question_index, round1_state)
VALUES (1, 'VÒNG CHUNG KẾT CẤP TỈNH NĂM 2026', 'LOBBY', 1, 0, 'IDLE')
ON CONFLICT (id) DO NOTHING;

-- 2. IMPORT BỘ ĐỀ THI CHÍNH THỨC VÒNG 1 (10 CÂU TRẮC NGHIỆM 40S)
INSERT INTO live_questions (
    session_id, question_order, title, video_url, video_type,
    option_a, option_b, option_c, option_d, correct_option, explanation, time_limit_seconds
)
SELECT
    s.id, q.question_order, q.title, q.video_url, q.video_type,
    q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.explanation, q.time_limit_seconds
FROM live_sessions s
CROSS JOIN (
    VALUES
    (
        1,
        'Theo Nghị quyết Đại hội đại biểu toàn quốc lần thứ XIV của Đảng, nhiệm vụ nào sau đây được xác định là "đột phá của đột phá" trong hoàn thiện thể chế phát triển quốc gia?',
        '', 'NONE',
        'Tập trung hoàn thiện khung pháp lý về chuyển đổi số và phát triển hạ tầng dữ liệu quốc gia',
        'Đẩy mạnh phân cấp, phân quyền triệt để giữa các cơ quan hành chính nhà nước ở trung ương và địa phương',
        'Tháo gỡ triệt để các điểm nghẽn thể chế, giải phóng toàn bộ năng lực sản xuất và khơi thông mọi nguồn lực xã hội',
        'Cơ cấu lại toàn bộ hệ thống cơ quan tư pháp và tăng cường tính độc lập của hoạt động tố tụng',
        'C',
        'Nghị quyết Đại hội XIV của Đảng xác định tháo gỡ triệt để các điểm nghẽn thể chế, giải phóng toàn bộ năng lực sản xuất và khơi thông mọi nguồn lực xã hội là đột phá của đột phá.',
        40
    ),
    (
        2,
        'Theo Nghị quyết Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XIII (nhiệm kỳ 2026 - 2031), phong trào hành động cách mạng nào sau đây đóng vai trò nòng cốt trong việc định hướng thanh niên tham gia xây dựng chính quyền số, kinh tế số và xã hội số?',
        '', 'NONE',
        'Phong trào "Tuổi trẻ sáng tạo và đổi mới mô hình quản trị xã hội trong kỷ nguyên mới"',
        'Phong trào "Thanh niên tiên phong chuyển đổi số và phát triển khoa học công nghệ"',
        'Phong trào "Tuổi trẻ xung kích phát triển hạ tầng dữ liệu và công nghệ cao quốc gia"',
        'Phong trào "Thanh niên Việt Nam tích cực tham gia hiện đại hóa nền hành chính nhà nước"',
        'B',
        'Phong trào "Thanh niên tiên phong chuyển đổi số và phát triển khoa học công nghệ" đóng vai trò nòng cốt theo Nghị quyết Đại hội Đoàn toàn quốc lần thứ XIII.',
        40
    ),
    (
        3,
        'Theo Nghị quyết Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XIII (nhiệm kỳ 2026 - 2031), trong nhóm chỉ tiêu về đồng hành với thanh niên, giải pháp mang tính đột phá nhằm nâng cao năng lực hội nhập quốc tế cho thanh thiếu nhi Việt Nam tập trung vào chỉ tiêu nào sau đây?',
        '', 'NONE',
        'Phấn đấu đạt 5 triệu lượt thanh niên công chức, viên chức được bồi dưỡng kỹ năng làm việc trong môi trường quốc tế',
        'Phấn đấu 100% cán bộ Đoàn cấp huyện trở lên sử dụng thành thạo ít nhất một ngoại ngữ trong giao tiếp công vụ',
        'Phấn đấu hỗ trợ 15 triệu lượt học sinh, sinh viên tham gia các chương trình trao đổi thanh niên quốc tế',
        'Phấn đấu đạt 10 triệu lượt thanh thiếu nhi được tham gia các hoạt động nâng cao năng lực ngoại ngữ và hội nhập quốc tế',
        'D',
        'Chỉ tiêu phấn đấu đạt 10 triệu lượt thanh thiếu nhi được tham gia các hoạt động nâng cao năng lực ngoại ngữ và hội nhập quốc tế là giải pháp đột phá.',
        40
    ),
    (
        4,
        'Theo Nghị quyết Đại hội đại biểu Đảng bộ tỉnh Nghệ An lần thứ XX (nhiệm kỳ 2025 - 2030), đột phá chiến lược về phát triển nguồn nhân lực gắn với khoa học công nghệ của tỉnh tập trung ưu tiên cho lĩnh vực nào sau đây?',
        '', 'NONE',
        'Đào tạo nhân lực chất lượng cao, ưu tiên các ngành công nghiệp công nghệ cao, kinh tế số, logistics và du lịch chất lượng cao',
        'Nâng cao trình độ tay nghề công nhân kỹ thuật, ưu tiên phục vụ phát triển các khu công nghiệp tập trung và cụm công nghiệp phụ trợ',
        'Đào tạo đội ngũ chuyên gia công nghệ thông tin và quản trị kinh doanh đạt tiêu chuẩn quốc tế phục vụ thu hút đầu tư FDI',
        'Phát triển nguồn nhân lực quản lý nhà nước và quản trị doanh nghiệp đáp ứng yêu cầu chuyển dịch cơ cấu kinh tế toàn diện',
        'A',
        'Đột phá chiến lược về phát triển nguồn nhân lực tỉnh Nghệ An tập trung đào tạo nhân lực chất lượng cao, ưu tiên công nghiệp công nghệ cao, kinh tế số, logistics và du lịch chất lượng cao.',
        40
    ),
    (
        5,
        'Theo Nghị quyết Đại hội đại biểu Đảng bộ tỉnh Nghệ An lần thứ XX (nhiệm kỳ 2025 - 2030), định hướng phát triển không gian kinh tế của tỉnh Nghệ An được cấu trúc theo mô hình trọng tâm nào?',
        '', 'NONE',
        'Tam giác tăng trưởng kinh tế biển (Cửa Lò - Hoàng Mai - Đông Hồi) kết hợp với hai vùng đô thị sinh thái phía Tây',
        'Bốn trung tâm công nghiệp công nghệ cao tập trung dọc theo tuyến đường ven biển và hành lang kinh tế Quốc lộ 1A',
        'Hai khu vực động lực phát triển (TP. Vinh mở rộng & Khu kinh tế Đông Nam) và ba hành lang kinh tế trọng điểm',
        'Mô hình đô thị đa cực lấy thành phố Vinh làm trung tâm kết nối trực tiếp với 05 vệ tinh kinh tế miền núi',
        'C',
        'Cấu trúc không gian phát triển kinh tế tỉnh Nghệ An gồm hai khu vực động lực phát triển (TP. Vinh mở rộng & KKT Đông Nam) và ba hành lang kinh tế trọng điểm.',
        40
    ),
    (
        6,
        'Theo Nghị quyết Đại hội đại biểu Đoàn TNCS Hồ Chí Minh tỉnh Nghệ An lần thứ XIX (nhiệm kỳ 2025 - 2030), trong đột phá về công tác cán bộ Đoàn, Tỉnh đoàn Nghệ An đặt ra yêu cầu trọng tâm nào đối với đội ngũ Bí thư Đoàn cơ sở?',
        '', 'NONE',
        '100% có trình độ thạc sĩ trở lên, sử dụng thành thạo hai ngoại ngữ và có chứng chỉ quản lý nhà nước ngạch chuyên viên',
        'Chuẩn hóa về lý luận chính trị, có năng lực chuyển đổi số, kỹ năng vận động thanh niên và tinh thần dấn thân vì cộng đồng',
        'Phải có thời gian tham gia công tác Đoàn tối thiểu 05 năm và hoàn thành xuất sắc nhiệm vụ 03 năm liên tục',
        'Luân chuyển bắt buộc giữa các khu vực địa lý khác nhau để tích lũy thực tiễn trước khi bổ nhiệm chính thức',
        'B',
        'Yêu cầu trọng tâm: Chuẩn hóa về lý luận chính trị, có năng lực chuyển đổi số, kỹ năng vận động thanh niên và tinh thần dấn thân vì cộng đồng.',
        40
    ),
    (
        7,
        'Theo Nghị quyết Đại hội đại biểu Đoàn TNCS Hồ Chí Minh tỉnh Nghệ An lần thứ XIX (nhiệm kỳ 2025 - 2030), chỉ tiêu đến cuối nhiệm kỳ về tỷ lệ thanh niên trên địa bàn tỉnh được tiếp cận các hoạt động nâng cao năng lực số đạt tối thiểu bao nhiêu %?',
        '', 'NONE',
        '60%',
        '70%',
        '90%',
        '80%',
        'D',
        'Nghị quyết xác định chỉ tiêu đến cuối nhiệm kỳ tối thiểu 80% thanh niên trên địa bàn tỉnh được tiếp cận các hoạt động nâng cao năng lực số.',
        40
    ),
    (
        8,
        'Theo Điều lệ Đoàn TNCS Hồ Chí Minh khóa XIII, trường hợp đoàn viên được hoãn sinh hoạt Đoàn tạm thời do đi làm việc lưu động hoặc đi học tập xa nơi cư trú được quy định như thế nào?',
        '', 'NONE',
        'Do Ban Chấp hành Chi đoàn xem xét, quyết định cho hoãn sinh hoạt nhưng thời hạn mỗi lần hoãn không quá 01 năm và đoàn viên vẫn phải đóng đoàn phí',
        'Do Bí thư Đoàn cơ sở quyết định trực tiếp và đoàn viên được miễn toàn bộ nghĩa vụ đóng đoàn phí trong thời gian hoãn',
        'Tự động được miễn sinh hoạt và không cần báo cáo với Ban Chấp hành Chi đoàn nếu thời gian đi xa dưới 06 tháng',
        'Do Ủy ban Kiểm tra Đoàn cấp trên trực tiếp phê duyệt bằng văn bản chính thức',
        'A',
        'Điều lệ Đoàn quy định: Do Ban Chấp hành Chi đoàn xem xét, quyết định cho hoãn sinh hoạt nhưng thời hạn mỗi lần hoãn không quá 01 năm và đoàn viên vẫn phải đóng đoàn phí.',
        40
    ),
    (
        9,
        'Theo Điều lệ Đoàn TNCS Hồ Chí Minh khóa XIII, đối với các quyết định kỷ luật đoàn viên hoặc tổ chức Đoàn, hiệu lực thi hành của quyết định kỷ luật được tính từ thời điểm nào?',
        '', 'NONE',
        'Có hiệu lực sau 15 ngày kể từ ngày ban hành nếu đoàn viên hoặc tổ chức Đoàn không có đơn khiếu nại',
        'Có hiệu lực ngay sau khi cơ quan Đoàn có thẩm quyền công bố quyết định, mặc dù đoàn viên hoặc tổ chức Đoàn bị kỷ luật có quyền khiếu nại',
        'Có hiệu lực ngay sau khi được cấp ủy Đảng cùng cấp hoặc Ban Thường vụ Đoàn cấp trên trực tiếp phê chuẩn',
        'Có hiệu lực sau 30 ngày kể từ ngày họp xét kỷ luật của Ban Chấp hành Chi đoàn hoặc Đoàn cơ sở',
        'B',
        'Hiệu lực kỷ luật có hiệu lực ngay sau khi cơ quan Đoàn có thẩm quyền công bố quyết định, mặc dù đoàn viên hoặc tổ chức Đoàn bị kỷ luật có quyền khiếu nại.',
        40
    ),
    (
        10,
        'Tại Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XIII (nhiệm kỳ 2026 - 2031), Tổng Bí thư, Chủ tịch nước Tô Lâm đã phát biểu chỉ đạo và đặt ra 5 yêu cầu trọng tâm đối với công tác Đoàn và phong trào thanh thiếu nhi. Yêu cầu thứ ba nhấn mạnh định hướng nào sau đây đối với các phong trào hành động cách mạng của Đoàn?',
        '', 'NONE',
        'Mở rộng quy mô tổ chức các hoạt động để thu hút tối đa số lượng thanh niên tham gia.',
        'Tập trung nguồn lực cho công tác tình nguyện quốc tế và giao lưu văn hóa thanh niên',
        'Đổi mới mạnh mẽ các phong trào hành động cách mạng theo hướng thiết thực, chuyên sâu, có sản phẩm cụ thể và tác động xã hội rõ ràng',
        'Chuyển giao toàn bộ việc tổ chức phong trào hành động cách mạng cho các hội quần chúng trực thuộc tự đảm nhận',
        'C',
        'Yêu cầu thứ ba: Đổi mới mạnh mẽ các phong trào hành động cách mạng theo hướng thiết thực, chuyên sâu, có sản phẩm cụ thể và tác động xã hội rõ ràng.',
        40
    )
) AS q(question_order, title, video_url, video_type, option_a, option_b, option_c, option_d, correct_option, explanation, time_limit_seconds);

-- 3. IMPORT BỘ ĐỀ THI CHÍNH THỨC VÒNG 2 (10 ĐỀ THỰC HÀNH YUM)
INSERT INTO live_round2_topics (
    session_id, code, scenario_1, scenario_2, max_score_1, max_score_2
)
SELECT
    s.id, t.code, t.scenario_1, t.scenario_2, t.max_score_1, t.max_score_2
FROM live_sessions s
CROSS JOIN (
    VALUES
    (
        'BỘ ĐỀ 01',
        'Câu 1: Thí sinh hãy thực hiện thao tác chuyển sinh hoạt Đoàn đi cho 01 đoàn viên bất kỳ từ 1 chi đoàn sang chi đoàn khác ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Thí sinh hãy sáp nhập 2 chi đoàn bất kỳ thành chi đoàn mới ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 02',
        'Câu 1: Thí sinh hãy thực hiện nghiệp vụ trưởng thành Đoàn cho 01 đoàn viên bất kỳ ở chi đoàn thuộc xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Thí sinh hãy chia tách 01 chi đoàn bất kỳ thành 02 chi đoàn mới ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 03',
        'Câu 1: Thí sinh hãy thực hiện thao tác cấp lại thẻ đoàn viên cho 01 đoàn viên bất kỳ ở chi đoàn thuộc xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Thí sinh hãy thực hiện quy trình kết nạp cho 01 đoàn viên mới (các trường thông tin của đoàn viên mới do thí sinh biên tập) của 01 chi đoàn tại xã nơi thí sinh công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 04',
        'Câu 1: Thí sinh hãy thực hiện thao tác tạo 01 chi đoàn mới và cấp tài khoản đăng nhập cho chi đoàn đó ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Thí sinh hãy sáp nhập 2 chi đoàn bất kỳ thành chi đoàn mới ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 05',
        'Câu 1: Thí sinh hãy thực hiện ban hành 01 văn bản/thông báo chỉ đạo điều hành gửi cho các chi đoàn trực thuộc ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Thí sinh hãy chia tách 01 chi đoàn bất kỳ thành 02 chi đoàn mới ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 06',
        'Câu 1: Thí sinh hãy thực hiện thao tác chuyển sinh hoạt Đoàn đi cho 01 đoàn viên bất kỳ từ 1 chi đoàn sang chi đoàn khác ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Thí sinh hãy thực hiện quy trình kết nạp cho 01 đoàn viên mới (các trường thông tin của đoàn viên mới do thí sinh biên tập) của 01 chi đoàn tại xã nơi thí sinh công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 07',
        'Câu 1: Thí sinh hãy thực hiện nghiệp vụ trưởng thành Đoàn cho 01 đoàn viên bất kỳ (đến tuổi trưởng thành đoàn) ở chi đoàn thuộc xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Thí sinh hãy sáp nhập 2 chi đoàn bất kỳ thành chi đoàn mới ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 08',
        'Câu 1: Thí sinh hãy thực hiện thao tác cấp lại thẻ đoàn viên cho 01 đoàn viên bất kỳ ở chi đoàn thuộc xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Thí sinh hãy chia tách 01 chi đoàn bất kỳ thành 02 chi đoàn mới ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 09',
        'Câu 1: Thí sinh hãy thực hiện thao tác tạo 01 chi đoàn mới và cấp tài khoản đăng nhập cho chi đoàn đó ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Thí sinh hãy thực hiện quy trình kết nạp cho 01 đoàn viên mới (các trường thông tin của đoàn viên mới do thí sinh biên tập) của 01 chi đoàn tại xã nơi thí sinh công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 10',
        'Câu 1: Thí sinh hãy thực hiện ban hành 01 văn bản/thông báo chỉ đạo điều hành gửi cho các chi đoàn trực thuộc ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Thí sinh hãy sáp nhập 2 chi đoàn bất kỳ thành chi đoàn mới ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).',
        20.0,
        20.0
    )
) AS t(code, scenario_1, scenario_2, max_score_1, max_score_2);
