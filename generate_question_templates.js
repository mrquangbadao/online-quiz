import fs from 'fs';
import * as XLSX from 'xlsx';

const rawText = `TỔNG HỢP 03 BỘ ĐỀ THI TRẮC NGHIỆM CHUẨN HÓA (30 CÂU/ĐỀ)HỘI THI BÍ THƯ ĐOÀN CƠ SỞ GIỎI TỈNH NGHỆ AN NĂM 2026
=========================================BỘ ĐỀ THI TRẮC NGHIỆM SỐ 01=========================================
PHẦN I: BẢNG PHÂN TÍCH SỐ LƯỢNG CÂU HỎI THEO NỘI DUNG (30 CÂU)
| Danh mục   | Nội dung tài liệu ôn tập   | Số lượng câu   |
| STT 1   | NQ ĐH XIV của Đảng & CTHĐ số 27-CTr/TWĐTN-CTĐ   | 3 câu   |
| STT 2   | Văn kiện ĐH XI MTTQ Việt Nam & KH 12/KH-MTTW-UB   | 3 câu   |
| STT 3   | NQ ĐH Đảng bộ tỉnh Nghệ An lần thứ XX (Ưu tiên)   | 4 câu   |
| STT 4   | ĐH Đoàn toàn quốc lần thứ XIII & Kết quả NK XII (Ưu tiên)   | 6 câu   |
| STT 5   | NQ ĐH Tỉnh đoàn Nghệ An khóa XIX (Ưu tiên)   | 3 câu   |
| STT 6   | Điều lệ Đoàn khóa XIII, Điều lệ Đội & Quy chế Hội đồng Đội   | 4 câu   |
| STT 7   | Tài liệu Hướng dẫn phần mềm Quản lý đoàn viên YUM (Ưu tiên)   | 4 câu   |
| STT 8   | Luật Thanh niên 2020, Quy chế Cán bộ Đoàn & Chiến lược PTTN   | 3 câu   |
| TỔNG CỘNG   | Toàn bộ 8 danh mục tài liệu ôn thi   | 30 câu   |
PHẦN II: NỘI DUNG ĐỀ THI TRẮC NGHIỆM (30 CÂU)
Câu 1. Đại hội đại biểu toàn quốc lần thứ XIV của Đảng Cộng sản Việt Nam diễn ra vào thời gian nào tại Thủ đô Hà Nội?
A. Từ ngày 15/01/2026 đến ngày 20/01/2026
B. Từ ngày 19/01/2026 đến ngày 23/01/2026
C. Từ ngày 20/01/2026 đến ngày 25/01/2026
D. Từ ngày 10/01/2026 đến ngày 15/01/2026
Câu 2. Đại hội đại biểu toàn quốc lần thứ XIV của Đảng đã bầu ra Ban Chấp hành Trung ương Đảng khóa XIV gồm bao nhiêu đồng chí?
A. 180 đồng chí
B. 190 đồng chí
C. 200 đồng chí
D. 210 đồng chí
Câu 3. Đại hội đại biểu toàn quốc Mặt trận Tổ quốc Việt Nam lần thứ XI (nhiệm kỳ 2026 - 2031) diễn ra với tinh thần/phương châm nào?
A. 'Đoàn kết - Dân chủ - Đổi mới - Sáng tạo - Phát triển'
B. 'Đoàn kết - Kỷ cương - Đổi mới - Khát vọng'
C. 'Trách nhiệm - Sáng tạo - Hội nhập - Phát triển'
D. 'Tiên phong - Tương trợ - Bản lĩnh - Thành công'
Câu 4. Đại hội đại biểu toàn quốc Mặt trận Tổ quốc Việt Nam lần thứ XI được tổ chức trọng thể vào thời gian nào tại Thủ đô Hà Nội?
A. Từ ngày 01 đến ngày 03 tháng 4 năm 2026
B. Từ ngày 11 đến ngày 13 tháng 5 năm 2026
C. Từ ngày 15 đến ngày 17 tháng 6 năm 2026
D. Từ ngày 20 đến ngày 22 tháng 7 năm 2026
Câu 5. Đại hội đại biểu Đảng bộ tỉnh Nghệ An lần thứ XX (nhiệm kỳ 2025 - 2030) diễn ra vào thời gian nào?
A. Từ ngày 15/09/2025 đến ngày 17/09/2025
B. Từ ngày 01/10/2025 đến ngày 03/10/2025
C. Từ ngày 10/10/2025 đến ngày 12/10/2025
D. Từ ngày 01/11/2025 đến ngày 03/11/2025
Câu 6. Khẩu hiệu hành động của Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XIII (nhiệm kỳ 2026 - 2031) là gì?
A. 'Bản lĩnh tự cường - Tiên phong sáng tạo - Khát vọng cống hiến - Làm chủ tương lai'
B. 'Khát vọng - Tiên phong - Bản lĩnh - Sáng tạo - Phát triển'
C. 'Tuổi trẻ Việt Nam: Bản lĩnh - Tình nguyện - Sáng tạo - Khát vọng'
D. 'Bản lĩnh - Tiên phong - Đoàn kết - Phát triển'
Câu 7. Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XIII quy tụ bao nhiêu đại biểu đại diện cho hơn 21,6 triệu đoàn viên thanh niên?
A. 650 đại biểu
B. 788 đại biểu
C. 850 đại biểu
D. 990 đại biểu
Câu 8. Đồng chí nào tái đắc cử giữ chức Bí thư thứ nhất Ban Chấp hành Trung ương Đoàn khóa XIII (nhiệm kỳ 2026 - 2031)?
A. Đồng chí Bùi Quang Huy
B. Đồng chí Nguyễn Minh Triết
C. Đồng chí Nguyễn Tường Lâm
D. Đồng chí Nguyễn Kim Quy
Câu 9. Chủ đề Đại hội cũng là tiêu đề Báo cáo chính trị trình Đại hội Đoàn toàn quốc lần thứ XIII là gì?
A. 'Tự hào, vững tin theo Đảng, tuổi trẻ Việt Nam xây hoài bão lớn, chung sức, đồng lòng, tiên phong, tiến mạnh trong kỷ nguyên vươn mình của dân tộc'
B. 'Xây dựng Đoàn vững mạnh, khơi dậy khát vọng cống hiến của tuổi trẻ Việt Nam'
C. 'Tăng cường giáo dục lý tưởng cách mạng, phát huy vai trò xung kích của thanh niên'
D. 'Tuổi trẻ Việt Nam tiên phong chuyển đổi số và phát triển kinh tế đất nước'
Câu 10. Đại hội đại biểu Đoàn TNCS Hồ Chí Minh tỉnh Nghệ An lần thứ XIX (nhiệm kỳ 2025 - 2030) đề ra bao nhiêu chỉ tiêu trọng tâm?
A. 10 chỉ tiêu
B. 12 chỉ tiêu
C. 15 chỉ tiêu
D. 18 chỉ tiêu
Câu 11. Đại hội đại biểu Đoàn TNCS Hồ Chí Minh tỉnh Nghệ An lần thứ XIX đã bầu ra Ban Chấp hành Tỉnh đoàn khóa XIX gồm bao nhiêu đồng chí?
A. 45 đồng chí
B. 52 đồng chí
C. 55 đồng chí
D. 60 đồng chí
Câu 12. Độ tuổi quy định kết nạp đoàn viên vào Đoàn TNCS Hồ Chí Minh theo Điều lệ Đoàn khóa XIII là bao nhiêu?
A. Từ đủ 15 tuổi đến 28 tuổi
B. Từ đủ 16 tuổi đến 30 tuổi
C. Từ 18 tuổi đến 35 tuổi
D. Từ đủ 14 tuổi đến 30 tuổi
Câu 13. Cơ quan lãnh đạo cao nhất của Đoàn Thanh niên Cộng sản Hồ Chí Minh là cơ quan nào?
A. Ban Chấp hành Trung ương Đoàn
B. Đại hội đại biểu toàn quốc
C. Ban Thường vụ Trung ương Đoàn
D. Ban Bí thư Trung ương Đoàn
Câu 14. Đường dẫn chính thức đăng nhập vào Phần mềm Quản lý nghiệp vụ công tác đoàn viên (YUM) là gì?
A. https://doanthanhnien.vn/
B. https://quanlydoanvien.doanthanhnien.vn/
C. https://thanhnienvietnam.vn/
D. https://nghiepvudoan.vn/
Câu 15. Độ tuổi của Thanh niên được quy định tại Điều 1 Luật Thanh niên 2020 là gì?
A. Là công dân Việt Nam từ đủ 15 tuổi đến 30 tuổi
B. Là công dân Việt Nam từ đủ 16 tuổi đến 30 tuổi
C. Là công dân Việt Nam từ 18 tuổi đến 35 tuổi
D. Là công dân Việt Nam từ 16 tuổi đến 35 tuổi
Câu 16. Trong hệ thống quan điểm chỉ đạo của Nghị quyết Đại hội XIV của Đảng, phát triển lĩnh vực nào được xác định là 'nền tảng'?
A. Phát triển kinh tế, xã hội và bảo vệ môi trường
B. Tăng cường quốc phòng, an ninh
C. Phát triển văn hóa, con người
D. Đẩy mạnh đối ngoại và hội nhập quốc tế
Câu 17. Trong bài phát biểu chỉ đạo tại Đại hội XI MTTQ Việt Nam, Tổng Bí thư Tô Lâm đã nhấn mạnh nội dung trọng tâm nào sau đây?
A. Bãi bỏ việc lấy ý kiến nhân dân đối với các chính sách lớn
B. Tham mưu xây dựng và triển khai Chiến lược Đại đoàn kết toàn dân tộc đến năm 2035, tầm nhìn đến năm 2045
C. Giảm tỷ lệ Mặt trận tham gia giám sát và phản biện xã hội
D. Chuyển toàn bộ hoạt động Mặt trận sang hình thức trực tiếp
Câu 18. Theo Phụ lục chỉ tiêu chủ yếu nhiệm kỳ 2025 - 2030, tỷ lệ tổ chức cơ sở đảng hoàn thành tốt nhiệm vụ trở lên hằng năm phấn đấu đạt bao nhiêu?
A. 80 - 85%
B. 85 - 90%
C. 90 - 95%
D. 95 - 100%
Câu 19. Điều lệ Đoàn khóa XIII bổ sung quy định về nhiệm kỳ Đại hội Đoàn cơ sở trên địa bàn dân cư là bao lâu?
A. 5 năm 1 lần
B. 5 năm 2 lần
C. 3 năm 1 lần
D. 2,5 năm 1 lần
Câu 20. Đồng chí nào được bầu giữ chức Chủ nhiệm Ủy ban Kiểm tra Trung ương Đoàn khóa XIII?
A. Đồng chí Nguyễn Tường Lâm
B. Đồng chí Nguyễn Minh Triết
C. Đồng chí Nguyễn Kim Quy
D. Đồng chí Hồ Hồng Nguyên
Câu 21. Trong nhóm chỉ tiêu về phát huy thanh niên nhiệm kỳ 2025 - 2030, Tỉnh đoàn Nghệ An đề ra chỉ tiêu thực hiện bao nhiêu công trình thanh niên các cấp?
A. 1.000 công trình
B. 1.500 công trình
C. 2.000 công trình
D. 3.000 công trình
Câu 22. Đại hội đại biểu Đoàn các trường đại học, cao đẳng có nhiệm kỳ quy định như thế nào?
A. 5 năm 1 lần
B. 5 năm 2 lần
C. 3 năm 1 lần
D. 1 năm 1 lần
Câu 23. Trên phần mềm YUM, ở nghiệp vụ đánh giá xếp loại đoàn viên cấp Chi đoàn, hệ thống thiết kế có tổng cộng bao nhiêu mức đánh giá?
A. 3 mức
B. 4 mức
C. 6 mức đánh giá
D. 8 mức
Câu 24. Theo quy định tại Điều 38 Luật Thanh niên 2020, cơ quan nào chịu trách nhiệm trước Chính phủ thực hiện quản lý nhà nước về thanh niên?
A. Bộ Giáo dục và Đào tạo
B. Bộ Lao động - Thương binh và Xã hội
C. Bộ Nội vụ
D. Trung ương Đoàn TNCS Hồ Chí Minh
Câu 25. Người có trách nhiệm đối thoại với thanh niên phải công bố công khai kế hoạch đối thoại chậm nhất bao nhiêu ngày trước ngày tổ chức đối thoại?
A. Chậm nhất 10 ngày
B. Chậm nhất 15 ngày
C. Chậm nhất 30 ngày
D. Chậm nhất 45 ngày
Câu 26. Mục tiêu chỉ tiêu chủ yếu nhiệm kỳ 2025 - 2030 xác định Quy mô GRDP của tỉnh Nghệ An so với GDP cả nước đến năm 2030 đạt tỷ lệ bao nhiêu?
A. 1,50%
B. 1,75%
C. 1,96%
D. 2,10%
Câu 27. Mục tiêu chỉ tiêu kinh tế đến năm 2030 xác định Tổng sản phẩm trên địa bàn (GRDP) theo giá hiện hành của tỉnh Nghệ An đạt bao nhiêu tỷ đồng?
A. 350.000 tỷ đồng
B. 420.500 tỷ đồng
C. 517.170 tỷ đồng
D. 600.000 tỷ đồng
Câu 28. Theo Điều lệ Đoàn TNCS Hồ Chí Minh khóa XIII, quy trình xóa tên đoàn viên trong danh sách đoàn viên được áp dụng khi đoàn viên vi phạm điều kiện nào sau đây?
A. Không sinh hoạt Đoàn hoặc không nộp đoàn phí liên tục 03 tháng trong một năm mà không có lý do chính đáng
B. Tự ý bỏ sinh hoạt Đoàn 02 kỳ liên tiếp hoặc chậm đóng đoàn phí 02 tháng
C. Tự ý nghỉ sinh hoạt Đoàn 06 tháng liên tục mà không xin phép Ban Chấp hành Chi đoàn
D. Vi phạm kỷ luật ở mức khiển trách và bỏ nộp đoàn phí trong 01 quý
Câu 29. Để đồng bộ tài khoản từ App 'Thanh niên Việt Nam' vào YUM mà Bí thư Chi đoàn không cần phải duyệt thủ công, trường thông tin nào bắt buộc phải bổ sung trước trên YUM?
A. Số Căn cước công dân
B. Số điện thoại của đoàn viên
C. Mức nộp đoàn phí
D. Ngày vào Đoàn
Câu 30. Quy trình thực hiện chuyển sinh hoạt đoàn viên ra ngoại tỉnh được thực hiện theo trình tự nào sau đây?
A. Chi đoàn -> Đoàn trực thuộc đoàn cơ sở (nếu là đoàn khối trường học) -> Đoàn cấp cơ sở (nơi đi) -> Đoàn cấp cơ sở (nơi đến) -> Đoàn trực thuộc đoàn cơ sở (nơi đến, nếu là đoàn khối trường học) -> Chi đoàn
B. Chi đoàn -> Đoàn trực thuộc đoàn cơ sở -> Tỉnh đoàn (nơi đi) -> Tỉnh đoàn (nơi đến) -> Đoàn trực thuộc đoàn cơ sở -> Chi đoàn
C. Đoàn trực thuộc đoàn cơ sở -> Đoàn cấp cơ sở (nơi đi) -> Tỉnh đoàn (nơi đi) -> Đoàn cấp cơ sở (nơi đến) -> Đoàn trực thuộc đoàn cơ sở
D. Chi đoàn -> Đoàn cấp cơ sở (nơi đi) -> Tỉnh đoàn (nơi đến) -> Chi đoàn đến
PHẦN III: BẢNG ĐÁP ÁN TỪNG CÂU (30 CÂU)
| C1   | C2   | C3   | C4   | C5   | C6   | C7   | C8   | C9   | C10   |
| B   | C   | A   | B   | B   | A   | B   | A   | A   | C   |
| C11   | C12   | C13   | C14   | C15   | C16   | C17   | C18   | C19   | C20   |
| B   | B   | B   | B   | B   | C   | B   | C   | A   | A   |
| C21   | C22   | C23   | C24   | C25   | C26   | C27   | C28   | C29   | C30   |
| C   | B   | C   | C   | C   | C   | C   | A   | B   | A   |
=========================================BỘ ĐỀ THI TRẮC NGHIỆM SỐ 02=========================================
PHẦN I: BẢNG PHÂN TÍCH SỐ LƯỢNG CÂU HỎI THEO NỘI DUNG (30 CÂU)
| Danh mục   | Nội dung tài liệu ôn tập   | Số lượng câu   |
| STT 1   | NQ ĐH XIV của Đảng & CTHĐ số 27-CTr/TWĐTN-CTĐ   | 3 câu   |
| STT 2   | Văn kiện ĐH XI MTTQ Việt Nam & KH 12/KH-MTTW-UB   | 3 câu   |
| STT 3   | NQ ĐH Đảng bộ tỉnh Nghệ An lần thứ XX (Ưu tiên)   | 4 câu   |
| STT 4   | ĐH Đoàn toàn quốc lần thứ XIII & Kết quả NK XII (Ưu tiên)   | 6 câu   |
| STT 5   | NQ ĐH Tỉnh đoàn Nghệ An khóa XIX (Ưu tiên)   | 3 câu   |
| STT 6   | Điều lệ Đoàn khóa XIII, Điều lệ Đội & Quy chế Hội đồng Đội   | 5 câu   |
| STT 7   | Tài liệu Hướng dẫn phần mềm Quản lý đoàn viên YUM (Ưu tiên)   | 3 câu   |
| STT 8   | Luật Thanh niên 2020, Quy chế Cán bộ Đoàn & Chiến lược PTTN   | 3 câu   |
| TỔNG CỘNG   | Toàn bộ 8 danh mục tài liệu ôn thi   | 30 câu   |
PHẦN II: NỘI DUNG ĐỀ THI TRẮC NGHIỆM (30 CÂU)
Câu 1. Đại hội đại biểu toàn quốc lần thứ XIV của Đảng đã bầu ra Ban Chấp hành Trung ương Đảng khóa XIV gồm bao nhiêu đồng chí?
A. 180 đồng chí
B. 190 đồng chí
C. 200 đồng chí
D. 210 đồng chí
Câu 2. Chương trình hành động của Đoàn TNCS Hồ Chí Minh thực hiện Nghị quyết Đại hội XIV của Đảng mang số hiệu nào?
A. Số 01-CTr/TWĐTN-CTĐ
B. Số 27-CTr/TWĐTN-CTĐ
C. Số 12-CTr/TWĐTN-CTĐ
D. Số 18-CTr/TWĐTN-CTĐ
Câu 3. Đại hội đại biểu toàn quốc Mặt trận Tổ quốc Việt Nam lần thứ XI được tổ chức trọng thể vào thời gian nào tại Thủ đô Hà Nội?
A. Từ ngày 01 đến ngày 03 tháng 4 năm 2026
B. Từ ngày 11 đến ngày 13 tháng 5 năm 2026
C. Từ ngày 15 đến ngày 17 tháng 6 năm 2026
D. Từ ngày 20 đến ngày 22 tháng 7 năm 2026
Câu 4. Đồng chí nào tiếp tục được tín nhiệm cử giữ chức Chủ tịch Ủy ban Trung ương Mặt trận Tổ quốc Việt Nam khóa XI (nhiệm kỳ 2026 - 2031)?
A. Đồng chí Bùi Thị Minh Hoài
B. Đồng chí Đỗ Văn Chiến
C. Đồng chí Trương Thị Mai
D. Đồng chí Võ Thị Ánh Xuân
Câu 5. Đại hội đại biểu Đảng bộ tỉnh Nghệ An lần thứ XX (nhiệm kỳ 2025 - 2030) diễn ra vào thời gian nào?
A. Từ ngày 15/09/2025 đến ngày 17/09/2025
B. Từ ngày 01/10/2025 đến ngày 03/10/2025
C. Từ ngày 10/10/2025 đến ngày 12/10/2025
D. Từ ngày 01/11/2025 đến ngày 03/11/2025
Câu 6. Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XIII quy tụ bao nhiêu đại biểu đại diện cho hơn 21,6 triệu đoàn viên thanh niên?
A. 650 đại biểu
B. 788 đại biểu
C. 850 đại biểu
D. 990 đại biểu
Câu 7. Đồng chí nào tái đắc cử giữ chức Bí thư thứ nhất Ban Chấp hành Trung ương Đoàn khóa XIII (nhiệm kỳ 2026 - 2031)?
A. Đồng chí Bùi Quang Huy
B. Đồng chí Nguyễn Minh Triết
C. Đồng chí Nguyễn Tường Lâm
D. Đồng chí Nguyễn Kim Quy
Câu 8. Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XIII đã bầu ra Ban Chấp hành Trung ương Đoàn khóa XIII gồm bao nhiêu đồng chí?
A. 110 đồng chí
B. 119 đồng chí
C. 125 đồng chí
D. 130 đồng chí
Câu 9. Chỉ tiêu trọng tâm nhiệm kỳ 2026 - 2031 đặt ra bao nhiêu lượt đoàn viên, thanh niên tham gia hoạt động tình nguyện do Đoàn, Hội tổ chức?
A. 50 triệu lượt
B. 80 triệu lượt
C. 100 triệu lượt
D. 120 triệu lượt
Câu 10. Đại hội đại biểu Đoàn TNCS Hồ Chí Minh tỉnh Nghệ An lần thứ XIX đã bầu ra Ban Chấp hành Tỉnh đoàn khóa XIX gồm bao nhiêu đồng chí?
A. 45 đồng chí
B. 52 đồng chí
C. 55 đồng chí
D. 60 đồng chí
Câu 11. Tên gọi phong trào hành động cách mạng nổi bật của tuổi trẻ Nghệ An được xác định trong Nghị quyết Đại hội Tỉnh đoàn khóa XIX là gì?
A. 'Tuổi trẻ Nghệ An tiên phong, sáng tạo, phát triển kinh tế - xã hội'
B. 'Thanh niên Nghệ An khởi nghiệp và hội nhập quốc tế'
C. 'Tuổi trẻ Nam Đàn học tập và làm theo lời Bác'
D. 'Thanh niên xung kích bảo vệ an ninh biên giới'
Câu 12. Cơ quan lãnh đạo cao nhất của Đoàn Thanh niên Cộng sản Hồ Chí Minh là cơ quan nào?
A. Ban Chấp hành Trung ương Đoàn
B. Đại hội đại biểu toàn quốc
C. Ban Thường vụ Trung ương Đoàn
D. Ban Bí thư Trung ương Đoàn
Câu 13. Theo Điều lệ Đội TNTP Hồ Chí Minh, độ tuổi của đội viên Đội Thiếu niên Tiền phong Hồ Chí Minh là từ bao nhiêu tuổi?
A. Từ 6 tuổi đến 14 tuổi
B. Từ 9 tuổi đến 15 tuổi
C. Từ 8 tuổi đến 16 tuổi
D. Từ 10 tuổi đến 18 tuổi
Câu 14. Ứng dụng di động dành cho đoàn viên tương tác và đồng bộ dữ liệu với phần mềm YUM là ứng dụng nào?
A. Ứng dụng Thanh niên Việt Nam
B. Ứng dụng VNeID
C. Ứng dụng Sổ tay Đảng viên
D. Ứng dụng Dịch vụ công
Câu 15. Theo Luật Thanh niên 2020, Tháng Thanh niên được quy định tổ chức vào thời gian nào hằng năm?
A. Tháng 1 hằng năm
B. Tháng 3 hằng năm
C. Tháng 5 hằng năm
D. Tháng 10 hằng năm
Câu 16. Khẩu hiệu/Phương châm hành động trong thực hiện nhiệm vụ bảo vệ nền tảng tư tưởng của Đảng được xác định trong Chương trình hành động số 27-CTr/TWĐTN-CTĐ của Trung ương Đoàn là gì?
A. 'Chủ động, sáng tạo, kỷ cương, nêu gương, hiệu quả'
B. 'Nhận thức đúng, thông tin đủ, hành động nhanh, kết nối mạnh, lan tỏa rộng'
C. 'Tiên phong, tương trợ, đoàn kết, bản lĩnh, phát triển'
D. 'Hiểu đúng, làm chuẩn, lan tỏa sâu, kết nối rộng'
Câu 17. Theo Kế hoạch số 12/KH-MTTW-UB ngày 08/6/2026, thời gian ban hành Hướng dẫn xây dựng khu dân cư 'Đoàn kết, ấm no, hạnh phúc' được xác định vào năm nào?
A. Năm 2026
B. Năm 2027
C. Năm 2028
D. Năm 2030
Câu 18. Theo Phụ lục chỉ tiêu chủ yếu nhiệm kỳ 2025 - 2030, tỷ lệ tổ chức cơ sở đảng hoàn thành tốt nhiệm vụ trở lên hằng năm phấn đấu đạt bao nhiêu?
A. 80 - 85%
B. 85 - 90%
C. 90 - 95%
D. 95 - 100%
Câu 19. Đồng chí nào được bầu giữ chức Chủ nhiệm Ủy ban Kiểm tra Trung ương Đoàn khóa XIII?
A. Đồng chí Nguyễn Tường Lâm
B. Đồng chí Nguyễn Minh Triết
C. Đồng chí Nguyễn Kim Quy
D. Đồng chí Hồ Hồng Nguyên
Câu 20. Nội dung bổ sung quy định về trường hợp đặc biệt trong thi hành kỷ luật tại Điều lệ Đoàn khóa XIII do cơ quan nào hướng dẫn?
A. Ban Bí thư Trung ương Đoàn
B. Ban Thường vụ Trung ương Đoàn
C. Ủy ban Kiểm tra Trung ương Đoàn
D. Ban Chấp hành Trung ương Đoàn
Câu 21. Chỉ tiêu hằng năm đối với Tỉnh đoàn và 100% Đoàn cấp trên cơ sở thuộc Nghị quyết Đại hội Tỉnh đoàn Nghệ An khóa XIX là gì?
A. Xử lý ít nhất 01 điểm đen về ô nhiễm vệ sinh môi trường
B. Trồng mới 10.000 cây xanh
C. Nhận chăm sóc 100 em thiếu nhi
D. Tổ chức 05 đợt khám bệnh miễn phí
Câu 22. Chi đoàn có từ bao nhiêu đoàn viên trở lên thì bầu Ban Chấp hành chi đoàn?
A. Từ 5 đoàn viên trở lên
B. Từ 9 đoàn viên trở lên
C. Từ 15 đoàn viên trở lên
D. Từ 20 đoàn viên trở lên
Câu 23. Mật khẩu mặc định khi thực hiện chức năng khôi phục mật khẩu tài khoản quản lý cấp dưới trên phần mềm YUM là gì?
A. 123456
B. Abc@123
C. Doan@2026
D. Admin@123
Câu 24. Người có trách nhiệm đối thoại với thanh niên phải công bố công khai kế hoạch đối thoại chậm nhất bao nhiêu ngày trước ngày tổ chức đối thoại?
A. Chậm nhất 10 ngày
B. Chậm nhất 15 ngày
C. Chậm nhất 30 ngày
D. Chậm nhất 45 ngày
Câu 25. Đối tượng áp dụng của Quy chế cán bộ Đoàn (Quyết định 1289) áp dụng đối với những người giữ chức danh từ cấp nào trở lên?
A. Từ Bí thư Chi đoàn trở lên
B. Từ Phó Bí thư Đoàn cơ sở trở lên
C. Từ Ủy viên BTV Tỉnh đoàn
D. Chỉ áp dụng cho cán bộ Đoàn chuyên trách
Câu 26. Mục tiêu chỉ tiêu kinh tế đến năm 2030 xác định Tổng sản phẩm trên địa bàn (GRDP) theo giá hiện hành của tỉnh Nghệ An đạt bao nhiêu tỷ đồng?
A. 350.000 tỷ đồng
B. 420.500 tỷ đồng
C. 517.170 tỷ đồng
D. 600.000 tỷ đồng
Câu 27. Chỉ tiêu xây dựng Đảng nhiệm kỳ 2025 - 2030 của Tỉnh ủy Nghệ An đề ra tỷ lệ kết nạp đảng viên hằng năm so với tổng số đảng viên của Đảng bộ tỉnh năm trước đó là bao nhiêu?
A. Từ 02 - 03%
B. Từ 03 - 04%
C. Từ 04 - 05%
D. Từ 05 - 06%
Câu 28. Thẩm quyền quyết định việc sửa đổi, bổ sung Điều lệ Đội Thiếu niên Tiền phong Hồ Chí Minh thuộc về cơ quan nào?
A. Hội đồng Đội Trung ương
B. Ban Chấp hành Trung ương Đoàn TNCS Hồ Chí Minh
C. Ban Bí thư Trung ương Đoàn
D. Đại hội Cháu ngoan Bác Hồ toàn quốc
Câu 29. Đối với tổ chức Đoàn mới thành lập, thời gian lâm thời kéo dài tối đa không quá bao lâu nếu được cấp ủy cùng cấp và Đoàn cấp trên đồng ý?
A. Không quá 6 tháng
B. Không quá nửa nhiệm kỳ Đại hội của cấp đó kể từ khi có quyết định thành lập
C. Không quá 1 năm
D. Không quá 2 năm
Câu 30. Thẩm quyền thực hiện thao tác cấp mã thẻ đoàn viên và duyệt kết nạp đoàn viên mới trên phần mềm Quản lý đoàn viên thuộc về cấp bộ Đoàn nào?
A. Ban Chấp hành Chi đoàn trực thuộc
B. Ban Chấp hành Đoàn trực thuộc đoàn cơ sở
C. Ban Chấp hành Đoàn cấp cơ sở
D. Ban Thường vụ Tỉnh đoàn
PHẦN III: BẢNG ĐÁP ÁN TỪNG CÂU (30 CÂU)
| C1   | C2   | C3   | C4   | C5   | C6   | C7   | C8   | C9   | C10   |
| C   | B   | B   | A   | B   | B   | A   | B   | C   | B   |
| C11   | C12   | C13   | C14   | C15   | C16   | C17   | C18   | C19   | C20   |
| A   | B   | B   | A   | B   | B   | B   | C   | A   | B   |
| C21   | C22   | C23   | C24   | C25   | C26   | C27   | C28   | C29   | C30   |
| A   | B   | B   | C   | A   | C   | B   | B   | B   | C   |
=========================================BỘ ĐỀ THI TRẮC NGHIỆM SỐ 03=========================================
PHẦN I: BẢNG PHÂN TÍCH SỐ LƯỢNG CÂU HỎI THEO NỘI DUNG (30 CÂU)
| Danh mục   | Nội dung tài liệu ôn tập   | Số lượng câu   |
| STT 1   | NQ ĐH XIV của Đảng & CTHĐ số 27-CTr/TWĐTN-CTĐ   | 4 câu   |
| STT 2   | Văn kiện ĐH XI MTTQ Việt Nam & KH 12/KH-MTTW-UB   | 4 câu   |
| STT 3   | NQ ĐH Đảng bộ tỉnh Nghệ An lần thứ XX (Ưu tiên)   | 4 câu   |
| STT 4   | ĐH Đoàn toàn quốc lần thứ XIII & Kết quả NK XII (Ưu tiên)   | 6 câu   |
| STT 5   | NQ ĐH Tỉnh đoàn Nghệ An khóa XIX (Ưu tiên)   | 3 câu   |
| STT 6   | Điều lệ Đoàn khóa XIII, Điều lệ Đội & Quy chế Hội đồng Đội   | 3 câu   |
| STT 7   | Tài liệu Hướng dẫn phần mềm Quản lý đoàn viên YUM (Ưu tiên)   | 3 câu   |
| STT 8   | Luật Thanh niên 2020, Quy chế Cán bộ Đoàn & Chiến lược PTTN   | 3 câu   |
| TỔNG CỘNG   | Toàn bộ 8 danh mục tài liệu ôn thi   | 30 câu   |
PHẦN II: NỘI DUNG ĐỀ THI TRẮC NGHIỆM (30 CÂU)
Câu 1. Đại hội đại biểu toàn quốc lần thứ XIV của Đảng Cộng sản Việt Nam diễn ra vào thời gian nào tại Thủ đô Hà Nội?
A. Từ ngày 15/01/2026 đến ngày 20/01/2026
B. Từ ngày 19/01/2026 đến ngày 23/01/2026
C. Từ ngày 20/01/2026 đến ngày 25/01/2026
D. Từ ngày 10/01/2026 đến ngày 15/01/2026
Câu 2. Chương trình hành động của Đoàn TNCS Hồ Chí Minh thực hiện Nghị quyết Đại hội XIV của Đảng mang số hiệu nào?
A. Số 01-CTr/TWĐTN-CTĐ
B. Số 27-CTr/TWĐTN-CTĐ
C. Số 12-CTr/TWĐTN-CTĐ
D. Số 18-CTr/TWĐTN-CTĐ
Câu 3. Đại hội đại biểu toàn quốc Mặt trận Tổ quốc Việt Nam lần thứ XI (nhiệm kỳ 2026 - 2031) diễn ra với tinh thần/phương châm nào?
A. 'Đoàn kết - Dân chủ - Đổi mới - Sáng tạo - Phát triển'
B. 'Đoàn kết - Kỷ cương - Đổi mới - Khát vọng'
C. 'Trách nhiệm - Sáng tạo - Hội nhập - Phát triển'
D. 'Tiên phong - Tương trợ - Bản lĩnh - Thành công'
Câu 4. Đồng chí nào tiếp tục được tín nhiệm cử giữ chức Chủ tịch Ủy ban Trung ương Mặt trận Tổ quốc Việt Nam khóa XI (nhiệm kỳ 2026 - 2031)?
A. Đồng chí Bùi Thị Minh Hoài
B. Đồng chí Đỗ Văn Chiến
C. Đồng chí Trương Thị Mai
D. Đồng chí Võ Thị Ánh Xuân
Câu 5. Đại hội đại biểu Đảng bộ tỉnh Nghệ An lần thứ XX (nhiệm kỳ 2025 - 2030) diễn ra vào thời gian nào?
A. Từ ngày 15/09/2025 đến ngày 17/09/2025
B. Từ ngày 01/10/2025 đến ngày 03/10/2025
C. Từ ngày 10/10/2025 đến ngày 12/10/2025
D. Từ ngày 01/11/2025 đến ngày 03/11/2025
Câu 6. Khẩu hiệu hành động của Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XIII (nhiệm kỳ 2026 - 2031) là gì?
A. 'Bản lĩnh tự cường - Tiên phong sáng tạo - Khát vọng cống hiến - Làm chủ tương lai'
B. 'Khát vọng - Tiên phong - Bản lĩnh - Sáng tạo - Phát triển'
C. 'Tuổi trẻ Việt Nam: Bản lĩnh - Tình nguyện - Sáng tạo - Khát vọng'
D. 'Bản lĩnh - Tiên phong - Đoàn kết - Phát triển'
Câu 7. Chủ đề Đại hội cũng là tiêu đề Báo cáo chính trị trình Đại hội Đoàn toàn quốc lần thứ XIII là gì?
A. 'Tự hào, vững tin theo Đảng, tuổi trẻ Việt Nam xây hoài bão lớn, chung sức, đồng lòng, tiên phong, tiến mạnh trong kỷ nguyên vươn mình của dân tộc'
B. 'Xây dựng Đoàn vững mạnh, khơi dậy khát vọng cống hiến của tuổi trẻ Việt Nam'
C. 'Tăng cường giáo dục lý tưởng cách mạng, phát huy vai trò xung kích của thanh niên'
D. 'Tuổi trẻ Việt Nam tiên phong chuyển đổi số và phát triển kinh tế đất nước'
Câu 8. Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XIII đã bầu ra Ban Chấp hành Trung ương Đoàn khóa XIII gồm bao nhiêu đồng chí?
A. 110 đồng chí
B. 119 đồng chí
C. 125 đồng chí
D. 130 đồng chí
Câu 9. Chỉ tiêu trọng tâm nhiệm kỳ 2026 - 2031 đặt ra bao nhiêu lượt đoàn viên, thanh niên tham gia hoạt động tình nguyện do Đoàn, Hội tổ chức?
A. 50 triệu lượt
B. 80 triệu lượt
C. 100 triệu lượt
D. 120 triệu lượt
Câu 10. Đại hội đại biểu Đoàn TNCS Hồ Chí Minh tỉnh Nghệ An lần thứ XIX (nhiệm kỳ 2025 - 2030) đề ra bao nhiêu chỉ tiêu trọng tâm?
A. 10 chỉ tiêu
B. 12 chỉ tiêu
C. 15 chỉ tiêu
D. 18 chỉ tiêu
Câu 11. Tên gọi phong trào hành động cách mạng nổi bật của tuổi trẻ Nghệ An được xác định trong Nghị quyết Đại hội Tỉnh đoàn khóa XIX là gì?
A. 'Tuổi trẻ Nghệ An tiên phong, sáng tạo, phát triển kinh tế - xã hội'
B. 'Thanh niên Nghệ An khởi nghiệp và hội nhập quốc tế'
C. 'Tuổi trẻ Nam Đàn học tập và làm theo lời Bác'
D. 'Thanh niên xung kích bảo vệ an ninh biên giới'
Câu 12. Theo Điều lệ Đội TNTP Hồ Chí Minh, độ tuổi của đội viên Đội Thiếu niên Tiền phong Hồ Chí Minh là từ bao nhiêu tuổi?
A. Từ 6 tuổi đến 14 tuổi
B. Từ 9 tuổi đến 15 tuổi
C. Từ 8 tuổi đến 16 tuổi
D. Từ 10 tuổi đến 18 tuổi
Câu 13. Nhi đồng sinh hoạt theo Sao, mỗi Sao Nhi đồng có số lượng tối thiểu bao nhiêu em?
A. Tối thiểu 3 em
B. Tối thiểu 5 em
C. Tối thiểu 7 em
D. Tối thiểu 10 em
Câu 14. Đường dẫn chính thức đăng nhập vào Phần mềm Quản lý nghiệp vụ công tác đoàn viên (YUM) là gì?
A. https://doanthanhnien.vn/
B. https://quanlydoanvien.doanthanhnien.vn/
C. https://thanhnienvietnam.vn/
D. https://nghiepvudoan.vn/
Câu 15. Quy chế cán bộ Đoàn TNCS Hồ Chí Minh ban hành kèm theo Quyết định 1289-QĐ/TWĐTN-CTĐ ngày 15/5/2026 thay thế cho văn bản nào trước đây?
A. Quyết định số 289-QĐ/TW ngày 08/02/2010 của Ban Bí thư Trung ương Đảng
B. Quyết định số 50-QĐ/TW năm 2015
C. Chỉ thị 42-CT/TW
D. Quyết định 12-QĐ/TWĐTN
Câu 16. Trong hệ thống quan điểm chỉ đạo của Nghị quyết Đại hội XIV của Đảng, phát triển lĩnh vực nào được xác định là 'nền tảng'?
A. Phát triển kinh tế, xã hội và bảo vệ môi trường
B. Tăng cường quốc phòng, an ninh
C. Phát triển văn hóa, con người
D. Đẩy mạnh đối ngoại và hội nhập quốc tế
Câu 17. Khẩu hiệu/Phương châm hành động trong thực hiện nhiệm vụ bảo vệ nền tảng tư tưởng của Đảng được xác định trong Chương trình hành động số 27-CTr/TWĐTN-CTĐ của Trung ương Đoàn là gì?
A. 'Chủ động, sáng tạo, kỷ cương, nêu gương, hiệu quả'
B. 'Nhận thức đúng, thông tin đủ, hành động nhanh, kết nối mạnh, lan tỏa rộng'
C. 'Tiên phong, tương trợ, đoàn kết, bản lĩnh, phát triển'
D. 'Hiểu đúng, làm chuẩn, lan tỏa sâu, kết nối rộng'
Câu 18. Trong bài phát biểu chỉ đạo tại Đại hội XI MTTQ Việt Nam, Tổng Bí thư Tô Lâm đã nhấn mạnh nội dung trọng tâm nào sau đây?
A. Bãi bỏ việc lấy ý kiến nhân dân đối với các chính sách lớn
B. Tham mưu xây dựng và triển khai Chiến lược Đại đoàn kết toàn dân tộc đến năm 2035, tầm nhìn đến năm 2045
C. Giảm tỷ lệ Mặt trận tham gia giám sát và phản biện xã hội
D. Chuyển toàn bộ hoạt động Mặt trận sang hình thức trực tiếp
Câu 19. Theo Kế hoạch số 12/KH-MTTW-UB ngày 08/6/2026, thời gian ban hành Hướng dẫn xây dựng khu dân cư 'Đoàn kết, ấm no, hạnh phúc' được xác định vào năm nào?
A. Năm 2026
B. Năm 2027
C. Năm 2028
D. Năm 2030
Câu 20. Theo Phụ lục chỉ tiêu chủ yếu nhiệm kỳ 2025 - 2030, tỷ lệ tổ chức cơ sở đảng hoàn thành tốt nhiệm vụ trở lên hằng năm phấn đấu đạt bao nhiêu?
A. 80 - 85%
B. 85 - 90%
C. 90 - 95%
D. 95 - 100%
Câu 21. Điều lệ Đoàn khóa XIII bổ sung quy định về nhiệm kỳ Đại hội Đoàn cơ sở trên địa bàn dân cư là bao lâu?
A. 5 năm 1 lần
B. 5 năm 2 lần
C. 3 năm 1 lần
D. 2,5 năm 1 lần
Câu 22. Theo Điều lệ Đoàn sửa đổi khóa XIII, việc bổ sung quy định đối với Chi đoàn, chi đoàn cơ sở trực thuộc áp dụng cho tổ chức Đoàn cấp nào?
A. Đoàn cấp xã, phường, đặc khu và tương đương hoặc đoàn cấp tỉnh
B. Chỉ trực thuộc duy nhất Đoàn cấp xã
C. Chỉ trực thuộc Trung ương Đoàn
D. Chỉ trực thuộc Đoàn cấp huyện
Câu 23. Trong nhóm chỉ tiêu về phát huy thanh niên nhiệm kỳ 2025 - 2030, Tỉnh đoàn Nghệ An đề ra chỉ tiêu thực hiện bao nhiêu công trình thanh niên các cấp?
A. 1.000 công trình
B. 1.500 công trình
C. 2.000 công trình
D. 3.000 công trình
Câu 24. Trên phần mềm YUM, ở nghiệp vụ đánh giá xếp loại đoàn viên cấp Chi đoàn, hệ thống thiết kế có tổng cộng bao nhiêu mức đánh giá?
A. 3 mức
B. 4 mức
C. 6 mức đánh giá
D. 8 mức
Câu 25. Theo quy định tại Điều 38 Luật Thanh niên 2020, cơ quan nào chịu trách nhiệm trước Chính phủ thực hiện quản lý nhà nước về thanh niên?
A. Bộ Giáo dục và Đào tạo
B. Bộ Lao động - Thương binh và Xã hội
C. Bộ Nội vụ
D. Trung ương Đoàn TNCS Hồ Chí Minh
Câu 26. Mục tiêu chỉ tiêu chủ yếu nhiệm kỳ 2025 - 2030 xác định Quy mô GRDP của tỉnh Nghệ An so với GDP cả nước đến năm 2030 đạt tỷ lệ bao nhiêu?
A. 1,50%
B. 1,75%
C. 1,96%
D. 2,10%
Câu 27. Chỉ tiêu xây dựng Đảng nhiệm kỳ 2025 - 2030 của Tỉnh ủy Nghệ An đề ra tỷ lệ kết nạp đảng viên hằng năm so với tổng số đảng viên của Đảng bộ tỉnh năm trước đó là bao nhiêu?
A. Từ 02 - 03%
B. Từ 03 - 04%
C. Từ 04 - 05%
D. Từ 05 - 06%
Câu 28. Theo Quy chế hoạt động của Hội đồng Đội, Hội đồng Đội từ cấp huyện trở lên được sử dụng con dấu và tài khoản riêng như thế nào?
A. Không được dùng con dấu riêng
B. Được sử dụng con dấu riêng, mở tài khoản cấp 2 của Đoàn sau khi có chủ trương của Ban Thường vụ Đoàn cùng cấp
C. Được mở tài khoản độc lập tại Ngân hàng thương mại không cần báo cáo
D. Dùng chung con dấu với Ủy ban Mặt trận Tổ quốc
Câu 29. Quy trình thực hiện chuyển sinh hoạt đoàn viên ra ngoại tỉnh được thực hiện theo trình tự nào sau đây?
A. Chi đoàn -> Đoàn trực thuộc đoàn cơ sở (nếu là đoàn khối trường học) -> Đoàn cấp cơ sở (nơi đi) -> Đoàn cấp cơ sở (nơi đến) -> Đoàn trực thuộc đoàn cơ sở (nơi đến, nếu là đoàn khối trường học) -> Chi đoàn
B. Chi đoàn -> Đoàn trực thuộc đoàn cơ sở -> Tỉnh đoàn (nơi đi) -> Tỉnh đoàn (nơi đến) -> Đoàn trực thuộc đoàn cơ sở -> Chi đoàn
C. Đoàn trực thuộc đoàn cơ sở -> Đoàn cấp cơ sở (nơi đi) -> Tỉnh đoàn (nơi đi) -> Đoàn cấp cơ sở (nơi đến) -> Đoàn trực thuộc đoàn cơ sở
D. Chi đoàn -> Đoàn cấp cơ sở (nơi đi) -> Tỉnh đoàn (nơi đến) -> Chi đoàn đến
Câu 30. Theo Điều 12 Quy chế cán bộ Đoàn (QĐ 1289), độ tuổi giữ chức vụ lần đầu của Bí thư Đoàn tương đương cấp xã, phường, đặc khu quy định như thế nào?
A. Không quá 35 tuổi
B. Không quá 38 tuổi
C. Không quá 40 tuổi và phải đảm bảo giữ chức vụ trọn 01 nhiệm kỳ
D. Không quá 45 tuổi
PHẦN III: BẢNG ĐÁP ÁN TỪNG CÂU (30 CÂU)
| C1   | C2   | C3   | C4   | C5   | C6   | C7   | C8   | C9   | C10   |
| B   | B   | A   | A   | B   | A   | A   | B   | C   | C   |
| C11   | C12   | C13   | C14   | C15   | C16   | C17   | C18   | C19   | C20   |
| A   | B   | B   | B   | A   | C   | B   | B   | B   | C   |
| C21   | C22   | C23   | C24   | C25   | C26   | C27   | C28   | C29   | C30   |
| A   | A   | C   | C   | C   | C   | B   | B   | A   | C   |
`;

// Function to determine category from question content
function determineCategory(content) {
  const c = content.toLowerCase();
  if (c.includes('đại hội xiv của đảng') || c.includes('chương trình hành động số 27') || c.includes('27-ctr/twđtn') || c.includes('ban chấp hành trung ương đảng khóa xiv') || c.includes('đại hội đại biểu toàn quốc lần thứ xiv của đảng')) {
    return 'NQ ĐH XIV của Đảng & CTHĐ số 27-CTr/TWĐTN-CTĐ';
  }
  if (c.includes('mặt trận tổ quốc') || c.includes('mttq') || c.includes('đại đoàn kết toàn dân tộc') || c.includes('kế hoạch số 12/kh-mttw')) {
    return 'Văn kiện ĐH XI MTTQ Việt Nam & KH 12/KH-MTTW-UB';
  }
  if (c.includes('đảng bộ tỉnh nghệ an') || c.includes('grdp') || c.includes('tỉnh ủy nghệ an')) {
    return 'NQ ĐH Đảng bộ tỉnh Nghệ An lần thứ XX';
  }
  if (c.includes('đoàn toàn quốc lần thứ xiii') || c.includes('trung ương đoàn khóa xiii') || c.includes('bùi quang huy') || c.includes('21,6 triệu')) {
    return 'ĐH Đoàn toàn quốc lần thứ XIII & Kết quả NK XII';
  }
  if (c.includes('tỉnh đoàn nghệ an') || c.includes('tỉnh đoàn khóa xix') || c.includes('tuổi trẻ nghệ an') || c.includes('công trình thanh niên')) {
    return 'NQ ĐH Tỉnh đoàn Nghệ An khóa XIX';
  }
  if (c.includes('điều lệ đoàn') || c.includes('điều lệ đội') || c.includes('hội đồng đội') || c.includes('xóa tên đoàn viên') || c.includes('độ tuổi quy định kết nạp đoàn viên') || c.includes('sao nhi đồng') || c.includes('chi đoàn') || c.includes('cơ quan lãnh đạo cao nhất của đoàn')) {
    return 'Điều lệ Đoàn khóa XIII, Điều lệ Đội & Quy chế Hội đồng Đội';
  }
  if (c.includes('phần mềm') || c.includes('yum') || c.includes('thanh niên việt nam') || c.includes('chuyển sinh hoạt')) {
    return 'Tài liệu Hướng dẫn phần mềm Quản lý đoàn viên YUM';
  }
  if (c.includes('luật thanh niên') || c.includes('quy chế cán bộ đoàn') || c.includes('đối thoại với thanh niên') || c.includes('tháng thanh niên') || c.includes('quyết định 1289')) {
    return 'Luật Thanh niên 2020, Quy chế Cán bộ Đoàn & Chiến lược PTTN';
  }
  return 'Kiến thức chung Công tác Đoàn - Hội - Đội';
}

function parseAnswers(setText) {
  const answerSection = setText.split('PHẦN III:')[1] || '';
  const lines = answerSection.split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith('|'));
  const answers = [];
  for (const line of lines) {
    if (/\bC\d+\b/i.test(line) || line.includes('---')) continue;
    const cells = line.split('|').map(c => c.trim()).filter(c => /^[A-E]$/i.test(c));
    answers.push(...cells);
  }
  return answers;
}

function parseSet(setText, setNum) {
  const answers = parseAnswers(setText);

  // Extract questions from PHẦN II
  const p2 = setText.split('PHẦN II:')[1]?.split('PHẦN III:')[0] || '';
  const lines = p2.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const questions = [];
  let currentQ = null;

  for (let line of lines) {
    const qMatch = line.match(/^Câu\s+(\d+)\.\s*(.*)/i);
    if (qMatch) {
      if (currentQ) questions.push(currentQ);
      currentQ = {
        index: parseInt(qMatch[1]),
        content: qMatch[2].trim(),
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        optionE: '',
        correctAnswer: '',
        category: ''
      };
      continue;
    }

    if (currentQ) {
      if (line.match(/^A\.\s*(.*)/i)) {
        currentQ.optionA = line.replace(/^A\.\s*/i, '').trim();
      } else if (line.match(/^B\.\s*(.*)/i)) {
        currentQ.optionB = line.replace(/^B\.\s*/i, '').trim();
      } else if (line.match(/^C\.\s*(.*)/i)) {
        currentQ.optionC = line.replace(/^C\.\s*/i, '').trim();
      } else if (line.match(/^D\.\s*(.*)/i)) {
        currentQ.optionD = line.replace(/^D\.\s*/i, '').trim();
      } else if (line.match(/^E\.\s*(.*)/i)) {
        currentQ.optionE = line.replace(/^E\.\s*/i, '').trim();
      } else {
        // Line continuation
        if (!currentQ.optionA) {
          currentQ.content += ' ' + line;
        } else if (!currentQ.optionB) {
          currentQ.optionA += ' ' + line;
        } else if (!currentQ.optionC) {
          currentQ.optionB += ' ' + line;
        } else if (!currentQ.optionD) {
          currentQ.optionC += ' ' + line;
        } else {
          currentQ.optionD += ' ' + line;
        }
      }
    }
  }
  if (currentQ) questions.push(currentQ);

  // Match answers
  questions.forEach((q, idx) => {
    q.correctAnswer = answers[idx] || 'A';
    q.category = determineCategory(q.content);
    q.setNum = setNum;
  });

  return questions;
}

// Split into 3 sets
const parts = rawText.split(/={10,}BỘ ĐỀ THI TRẮC NGHIỆM SỐ \d+={10,}/);
const set1 = parseSet(parts[1], 1);
const set2 = parseSet(parts[2], 2);
const set3 = parseSet(parts[3], 3);

console.log('Set 1 questions:', set1.length);
console.log('Set 2 questions:', set2.length);
console.log('Set 3 questions:', set3.length);

function createExcel(questions, filename) {
  const data = [
    ['content', 'optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'correctAnswer', 'category']
  ];
  for (const q of questions) {
    data.push([
      q.content,
      q.optionA,
      q.optionB,
      q.optionC,
      q.optionD,
      q.optionE || '',
      q.correctAnswer,
      q.category
    ]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 60 }, // content
    { wch: 35 }, // optionA
    { wch: 35 }, // optionB
    { wch: 35 }, // optionC
    { wch: 35 }, // optionD
    { wch: 15 }, // optionE
    { wch: 15 }, // correctAnswer
    { wch: 40 }  // category
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Questions');
  XLSX.writeFile(wb, filename);
  console.log('Saved:', filename);
}

// Ensure docs/templates or imports directory
const outDir = './data_imports';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

createExcel(set1, `${outDir}/De_thi_so_01.xlsx`);
createExcel(set2, `${outDir}/De_thi_so_02.xlsx`);
createExcel(set3, `${outDir}/De_thi_so_03.xlsx`);

// Combined all 90 questions
const all90 = [...set1, ...set2, ...set3];
createExcel(all90, `${outDir}/Tong_hop_90_cau_3_bo_de.xlsx`);

// Deduplicated questions (unique by content)
const seen = new Set();
const uniqueQuestions = [];
for (const q of all90) {
  const normalized = q.content.trim().toLowerCase();
  if (!seen.has(normalized)) {
    seen.add(normalized);
    uniqueQuestions.push(q);
  }
}
console.log('Total unique questions:', uniqueQuestions.length);
createExcel(uniqueQuestions, `${outDir}/Ngan_hang_cau_hoi_chuan_hoa_unique.xlsx`);
