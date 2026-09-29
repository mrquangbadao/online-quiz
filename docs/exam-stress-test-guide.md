# KỊCH BẢN KIỂM THỬ THỰC CHIẾN & CHỊU TẢI (STRESS TEST SCENARIOS)
## HỘI THI BÍ THƯ ĐOÀN CƠ SỞ GIỎI TỈNH NGHỆ AN NĂM 2026

---

## I. MỤC TIÊU & CHỈ SỐ CHỊU TẢI (BENCHMARK)

- **Quy mô thí sinh dự thi:** 70 thí sinh chính thức (được tuyển chọn từ vòng cơ sở).
- **Thời gian làm bài:** 20 phút.
- **Số lượng câu hỏi:** 30 câu hỏi trắc nghiệm (bốc ngẫu nhiên từ ngân hàng câu hỏi).
- **Mức độ đồng thời (Peak Concurrency):**
  - **Cao điểm 1 (08h00 - 08h05):** 70 thí sinh cùng truy cập, chọn tên, gửi mã OTP và xác thực OTP trong vòng 2 phút.
  - **Cao điểm 2 (08h05 - 08h06):** 70 thí sinh cùng bấm "Bắt đầu làm bài" -> 70 query bốc ngẫu nhiên 30 câu hỏi từ database.
  - **Giai đoạn làm bài (08h06 - 08h26):** 70 thí sinh thao tác chọn và đổi đáp án -> ~2.100 requests lưu nháp (`/draft-answer`) rải đều (~2 - 5 req/s).
  - **Cao điểm 3 (08h25 - 08h26):** 70 bài thi được nộp đồng loạt (thí sinh tự nộp hoặc hệ thống tự động nộp bài khi hết giờ).
- **Mục tiêu hiệu năng:**
  - Thời gian phản hồi trung bình (Average Latency): `< 200ms`.
  - Thời gian phản hồi 95% thí sinh (P95 Latency): `< 500ms`.
  - Tỷ lệ lỗi cho phép (Error Rate): `0%`.

---

## II. 05 KỊCH BẢN KIỂM THỬ TRỌNG YẾU (CORE TEST SCENARIOS)

### 📌 Kịch bản 1: 70 Thí sinh đồng thời Đăng ký & Nhận OTP
- **Mục đích:** Đảm bảo hệ thống không bị nghẽn OTP, không bị chặn nhầm bởi IP Rate Limit do dùng chung Wi-Fi hội trường.
- **Các tình huống kiểm tra:**
  1. **Tình huống 1.1 (Dùng chung Wi-Fi hội trường):** 70 thiết bị cùng đi ra từ 1 địa chỉ IP mạng của Tỉnh Đoàn.
     - *Kết quả mong đợi:* Hệ thống chấp nhận toàn bộ 70 request OTP (đã nâng ngưỡng IP Rate Limit lên 300 request/10 phút).
  2. **Tình huống 1.2 (Email gửi trễ hoặc thí sinh gõ sai email):** Thí sinh chờ quá 60 giây không thấy email OTP.
     - *Kênh cứu hộ:* Giám thị / Thư ký mở trang Admin `/admin/thi-sinh-du-dieu-kien`, bấm nút **"Cấp OTP khẩn cấp"** cho thí sinh đó và đọc trực tiếp mã 6 số hiển thị trên màn hình.
  3. **Tình huống 1.3 (Master OTP dự phòng):** Cấu hình `EMERGENCY_MASTER_OTP=654321` trên VPS. Nếu hệ thống Brevo gặp sự cố toàn cầu, BTC có thể công bố mã Master OTP tại phòng thi để toàn bộ thí sinh vượt qua bước xác thực ngay lập tức.

---

### 📌 Kịch bản 2: Bắt đầu làm bài thi đồng thời (Concurrency Burst)
- **Mục đích:** Kiểm tra khả năng xử lý bốc ngẫu nhiên đề thi của database PostgreSQL và Spring Boot.
- **Các tình huống kiểm tra:**
  1. 70 thí sinh bấm nút "Vào phòng thi" trong cùng 5 giây.
  2. Mỗi thí sinh nhận được 30 câu hỏi trắc nghiệm xáo trộn.
  3. Đồng hồ đếm ngược 20:00 bắt đầu chạy chuẩn xác theo server time (`endTime`).
  4. Trạng thái thí sinh trong danh sách 70 người chuyển sang `Đã đăng ký` để ngăn chặn người khác đăng ký trùng.

---

### 📌 Kịch bản 3: Lưu nháp liên tục & Kiểm tra sự cố mạng / F5
- **Mục đích:** Đảm bảo thí sinh không bị mất câu trả lời nếu gặp sự cố mạng hoặc vô tình tải lại trang.
- **Các tình huống kiểm tra:**
  1. **Lưu nháp thời gian thực:** Mỗi khi thí sinh click chọn đáp án A/B/C/D, API `/exams/{id}/draft-answer` được gọi ngầm.
  2. **Tình huống rớt mạng / F5 trình duyệt:**
     - Giả lập thí sinh bấm F5 (Reload trang) ở phút thứ 10.
     - *Kết quả mong đợi:* Hệ thống tự động nhận diện thí sinh đang có bài thi `IN_PROGRESS`, khôi phục nguyên vẹn 30 câu hỏi và các đáp án đã chọn trước đó, đồng hồ tiếp tục đếm ngược từ phút thứ 10 (không bị reset lại 20 phút).
  3. **Đổi thiết bị khi máy tính bị hỏng:** Thí sinh sang máy khác, nhập lại SĐT/Email cũ và vào thi tiếp phiên đang dở.

---

### 📌 Kịch bản 4: Nộp bài thi đồng thời & Cơ chế nộp tự động
- **Mục đích:** Không làm thất lạc bài thi của bất kỳ thí sinh nào khi hết giờ.
- **Các tình huống kiểm tra:**
  1. **Thí sinh chủ động nộp bài:** Bấm nút "Nộp bài", hệ thống hỏi xác nhận, sau đó hiển thị bảng tổng kết điểm số ngay lập tức.
  2. **Hết 20 phút:** Frontend tự động kích hoạt nộp bài.
  3. **Thí sinh tắt máy / mất kết nối trước khi nộp:** 
     - Backend có tiến trình `ExamExpiryScheduler` quét mỗi 30 giây để tự động chấm điểm và chuyển trạng thái các bài quá hạn sang `SUBMITTED`.
  4. **Admin bấm "Kết thúc đợt thi":** Toàn bộ bài thi chưa nộp được tự động nộp ngay lập tức.

---

### 📌 Kịch bản 5: Giám sát Trực tiếp & Vinh danh Top 6
- **Mục đích:** Ban Tổ chức và Ban Giám khảo theo dõi kết quả minh bạch, tức thì.
- **Các tình huống kiểm tra:**
  1. Màn hình Dashboard Admin `/admin/dashboard` tự động cập nhật bảng xếp hạng mỗi 3 giây.
  2. Hệ thống xếp hạng theo tiêu chí:
     - **Ưu tiên 1:** Điểm số cao nhất (tối đa 30 điểm).
     - **Ưu tiên 2:** Thời gian làm bài ngắn nhất (tính đến từng giây).
  3. Xác định chính xác 06 thí sinh đứng đầu để trao quyền vào Vòng Chung Kết đối kháng sân khấu.

---

## III. HƯỚNG DẪN CHẠY TEST SCRIPT TỰ ĐỘNG

Trong thư mục mã nguồn đã tích hợp sẵn công cụ kiểm thử tự động tại `scripts/stress_test.js`.

### 1. Kiểm tra trạng thái hệ thống (Health Check)
```bash
node scripts/stress_test.js https://btdcsgioinghean.com 10 health
```

### 2. Chạy thử nghiệm mô phỏng 10 thí sinh:
```bash
node scripts/stress_test.js https://btdcsgioinghean.com 10 full
```

### 3. Chạy kiểm thử áp lực toàn phần 70 thí sinh đồng thời:
```bash
node scripts/stress_test.js https://btdcsgioinghean.com 70 full
```

Script sẽ in ra bảng thống kê chi tiết:
- Số lượng thí sinh hoàn thành trọn vẹn (Success Rate).
- Thời gian phản hồi trung bình (Avg), cao nhất (Max), phân vị P95 của từng bước: `request_otp`, `verify_otp`, `start_exam`, `draft_answer`, `submit_exam`.
- Danh sách lỗi cụ thể (nếu có).

---

## IV. CHEAT SHEET CỨU HỘ KHẨN CẤP DÀNH CHO BAN TỔ CHỨC

| Sự cố thực tế | Giải pháp cứu hộ ngay lập tức |
| :--- | :--- |
| **Thí sinh không nhận được email OTP** | Giám thị vào Admin -> **Quản lý thí sinh đủ điều kiện** -> Tìm tên thí sinh -> Bấm nút **"Cấp OTP khẩn cấp"** -> Đọc mã 6 số cho thí sinh nhập. |
| **Thí sinh bấm nhầm nộp bài khi chưa làm xong** | Admin vào mục **Quản lý bài thi** (hoặc Dashboard) -> Tìm bài thi của thí sinh -> Bấm nút **"Reset bài thi"** (Cho phép thi lại). |
| **Mất điện / mất Wi-Fi toàn hội trường** | Toàn bộ đáp án đã được lưu ngầm qua API Draft. Khi có mạng lại, thí sinh chỉ cần tải lại trang là tiếp tục làm bài thi được ngay. |
| **Sự cố nghẽn mạng SMTP Brevo toàn cục** | Sử dụng mã **Master OTP** (`EMERGENCY_MASTER_OTP`) cấu hình sẵn trên VPS để vượt qua bước OTP cho toàn bộ thí sinh. |
