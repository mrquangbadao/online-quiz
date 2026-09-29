# KẾ HOẠCH KIỂM THỬ TOÀN DIỆN & VẬN HÀNH NGÀY THI CHÍNH THỨC
## HỘI THI BÍ THƯ ĐOÀN CƠ SỞ GIỎI TỈNH NGHỆ AN NĂM 2026

---

## I. MỤC TIÊU & CHỈ TIÊU KỸ THUẬT (SLA & BENCHMARK)

| Chỉ số | Mục tiêu chuẩn | Giải pháp đảm bảo |
| :--- | :--- | :--- |
| **Quy mô thí sinh** | 70 thí sinh chính thức | Danh sách Whitelist 70 người đã nạp sẵn với đầy đủ SBD, Đơn vị và điểm sơ loại |
| **Thời gian làm bài** | 20 phút (Đồng hồ đếm ngược) | Đồng bộ server time (`endTime`), tự động nộp bài khi hết 1.200 giây |
| **Số câu hỏi** | 30 câu trắc nghiệm / đề | Ngân hàng câu hỏi chuẩn hóa 54 câu đã import, bốc ngẫu nhiên không trùng lặp |
| **Tải đồng thời (Peak)** | 70 - 100 kết nối song song | Connection pool HikariCP mở rộng 30 kết nối, Redis cache, Nginx reverse proxy |
| **Độ trễ phản hồi (P95)** | `< 300ms` | Tối ưu index Postgres, gzip compression, SPA Vite tĩnh trên Nginx |
| **Tỷ lệ bài nộp thành công**| **100% (70/70 bài thi)** | Lưu nháp từng câu (`/draft-answer`) + Cơ chế tự động nộp 3 lớp dự phòng |

---

## II. MA TRẬN KIỂM THỬ 8 TẦNG (8-LAYER AUDIT MATRIX)

```
[ Tầng 1: Hạ tầng & SSL HTTPS ] ──> Let's Encrypt TLS 1.3, Redirect 301, Nginx Port 443
[ Tầng 2: Cấu hình Đợt thi    ] ──> Phase ACTIVE, 30 câu, 20 phút, Whitelist = TRUE
[ Tầng 3: Whitelist 70 Thí sinh] ──> Khớp 100% SBD, Họ tên, Đơn vị từ Thông báo Tỉnh đoàn
[ Tầng 4: Ngân hàng Đề thi    ] ──> 54 câu hỏi chuẩn, đủ 4 phương án, đáp án A-B-C-D chính xác
[ Tầng 5: Bảo mật & Chống lộ đề] ──> Không lộ correctAnswer ở client, token dùng 1 lần
[ Tầng 6: Cứu hộ OTP khẩn cấp ] ──> Admin Helpdesk sinh OTP tức thì không phụ thuộc Brevo
[ Tầng 7: Lưu nháp & Chấm điểm ] ──> Lưu vết từng câu đã chọn, tự động khôi phục khi F5
[ Tầng 8: Xếp hạng & Tie-breaker] ──> Điểm cao xếp trên; bằng điểm thì thời gian ít hơn xếp trên
```

---

## III. BỘ CÔNG CỤ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SCRIPTS)

Mã nguồn đã tích hợp sẵn 2 công cụ kiểm thử mạnh mẽ chạy trực tiếp bằng Node.js (không cần cài thêm phần mềm):

### 1. Script 1: Kiểm định Toàn diện 8 Tầng Hệ thống (`scripts/full_audit_test.js`)
Kiểm tra tự động toàn bộ 8 tầng chất lượng của hệ thống, phát hiện ngay các cảnh báo cấu hình, kiểm tra an ninh chống gian lận:
```bash
node scripts/full_audit_test.js https://btdcsgioinghean.com admin <mat_khau_admin>
```
*Đầu ra sẽ báo chi tiết từng mục: `[PASS]`, `[WARN]`, `[FAIL]` và bảng tổng kết.*

### 2. Script 2: Giả lập Tải Thực tế 70 Thí sinh Đồng thời (`scripts/stress_test.js`)
Mô phỏng chính xác hành vi của 70 thí sinh thật trong ngày thi:
```bash
# Kiểm tra kết nối nhanh (Health check):
node scripts/stress_test.js https://btdcsgioinghean.com 10 health

# Giả lập 70 thí sinh cùng vào thi, bốc đề, lưu nháp và nộp bài đồng loạt:
node scripts/stress_test.js https://btdcsgioinghean.com 70 full
```
*Script xuất bảng phân tích độ trễ phản hồi (Min, Avg, P95, Max) cho từng giai đoạn.*

---

## IV. KỊCH BẢN ĐIỀU HÀNH NGÀY THI THEO TỪNG PHÚT (RUN OF SHOW)

### ⏰ Giai đoạn 1: Chuẩn bị trước giờ thi (T0 - 60 phút đến T0 - 15 phút)
- **T0 - 60m:** Ban Quản trị đăng nhập vào trang Admin `https://btdcsgioinghean.com/admin/login`.
- **T0 - 45m:** Chạy lệnh audit kiểm tra trạng thái xanh toàn bộ:
  ```bash
  node scripts/full_audit_test.js https://btdcsgioinghean.com admin <mat_khau_admin>
  ```
- **T0 - 30m:** Kiểm tra đợt thi:
  - Tên đợt thi: `Vòng loại cấp tỉnh - Hội thi Bí thư Đoàn cơ sở giỏi 2026`.
  - Trạng thái: `ACTIVE`.
  - Cấu hình: `30 câu trắc nghiệm`, `20 phút`, `Bắt buộc chọn thí sinh trong danh sách (Whitelist)`.
- **T0 - 15m:** Hướng dẫn thí sinh tại phòng thi truy cập địa chỉ duy nhất:
  👉 **`https://btdcsgioinghean.com`**

---

### ⏰ Giai đoạn 2: Điểm danh, Đăng ký & Xác thực OTP (T0 - 15 phút đến T0)
- Thí sinh bấm **"Vào thi"** trên trang chủ.
- **Thao tác thí sinh:**
  1. Gõ họ tên hoặc đơn vị để chọn đúng tên mình từ danh sách 70 thí sinh.
  2. Họ tên và đơn vị tự động điền và khóa cố định.
  3. Nhập Số điện thoại cá nhân và Email nhận mã OTP.
  4. Bấm "Vào thi" -> Nhận email mã OTP 6 chữ số từ `noreply@btdcsgioinghean.com`.
  5. Nhập mã OTP để sẵn sàng trong trạng thái chờ hiệu lệnh làm bài.
- **Quy trình cứu hộ OTP của Thư ký/Giám thị:**
  - Nếu thí sinh sau 30-45 giây chưa nhận được email do hộp thư đến bị chậm:
  - Giám thị mở tab **Quản lý thí sinh đủ điều kiện** (`/admin/thi-sinh-du-dieu-kien`).
  - Tìm tên thí sinh -> Bấm nút **"Cấp OTP khẩn cấp"**.
  - Đọc trực tiếp mã 6 số hiển thị trên màn hình cho thí sinh nhập -> Thí sinh vào thi ngay!

---

### ⏰ Giai đoạn 3: Bắt đầu tính giờ thi (T0 đến T0 + 20 phút)
- **Phát lệnh thi:** Giám thị thông báo toàn thể thí sinh bấm **"Bắt đầu làm bài"**.
- Đồng hồ đếm ngược `20:00` bắt đầu chạy.
- Thí sinh làm bài, mỗi lần chọn đáp án hệ thống tự động lưu nháp ngầm lên server.
- **Xử lý sự cố máy móc / Mất mạng / F5:**
  - Nếu máy tính của thí sinh bị sập nguồn hoặc lỡ tay bấm F5 (Reload trang):
  - Thí sinh mở lại trình duyệt vào `https://btdcsgioinghean.com` -> Bấm "Vào thi".
  - Hệ thống tự động nhận diện bài thi đang làm dở (`IN_PROGRESS`), phục hồi lại toàn bộ câu hỏi và đáp án đã chọn, đồng hồ tiếp tục đếm ngược thời gian còn lại.
  - Nếu máy bị hỏng phần cứng: Thí sinh chuyển sang máy tính dự phòng, nhập SĐT/Email cũ và tiếp tục làm bài thi.
- **Giám sát trực tiếp:** Ban Giám khảo theo dõi màn hình lớn `/admin/dashboard` để xem số lượng bài thi đang thực hiện và bảng xếp hạng realtime.

---

### ⏰ Giai đoạn 4: Thu bài & Chốt kết quả (T0 + 20 phút đến T0 + 30 phút)
- **Cơ chế thu bài 3 lớp (Đảm bảo không thất lạc bất kỳ bài thi nào):**
  - **Lớp 1:** Thí sinh chủ động bấm "Nộp bài" khi làm xong.
  - **Lớp 2:** Khi hết 20:00, trình duyệt thí sinh tự động gọi API submit bài thi.
  - **Lớp 3 (Server-side safety):** 
    - Tiến trình ngầm `ExamExpiryScheduler` tự động quét các bài thi quá hạn để chấm điểm.
    - Khi hết giờ, Trưởng ban tổ chức bấm nút **"Kết thúc đợt thi"** trên trang Admin -> Hệ thống tự động nộp toàn bộ các bài thi đang dở chưa kịp bấm nộp.
- **Xác định TOP 6 VÀO CHUNG KẾT:**
  - Ngay khi kết thúc đợt thi, hệ thống tự động chuyển sang trang **Vinh danh Top 6** (`/admin/dot-thi/{id}/vinh-danh`).
  - Ban Thư ký kiểm tra danh sách 06 thí sinh đứng đầu (Điểm cao nhất, Thời gian ít nhất).
  - Bấm nút **"Xuất danh sách kết quả"** để lưu file Excel in ra trình Ban Giám khảo ký duyệt.

---

## V. SỔ TAY ỨNG PHÓ TÌNH HUỐNG KHẨN CẤP (INCIDENT MANAGEMENT SOP)

| Tình huống phát sinh | Biện pháp xử lý tức thời |
| :--- | :--- |
| **1. Thí sinh bấm nhầm nút nộp bài khi chưa làm xong** | Admin vào `/admin/dashboard` (hoặc `/admin/exams`) -> Tìm tên thí sinh -> Bấm **"Reset bài thi"** (Cho phép thi lại) -> Thí sinh đăng nhập vào làm lại từ đầu. |
| **2. Brevo hết hạn mức gửi thư (Quota Limit)** | Admin cấp mã **OTP khẩn cấp** trực tiếp trên màn hình Admin; hoặc cấu hình `EMERGENCY_MASTER_OTP=654321` trên VPS để toàn bộ thí sinh nhập chung 1 mã khẩn cấp này vào thi. |
| **3. Mất mạng Wi-Fi hội trường tạm thời** | Nhờ cơ chế lưu nháp liên tục, toàn bộ đáp án đã được ghi nhận đến giây cuối cùng trước khi mất mạng. Khi có mạng trở lại, thí sinh chỉ cần F5 là tiếp tục làm bài. |
| **4. Hai thí sinh có cùng điểm số** | Hệ thống tự động kích hoạt **Tiêu chí phụ (Tie-breaker)**: Thí sinh nào hoàn thành bài thi với số giây (`durationSeconds`) ít hơn sẽ xếp hạng cao hơn. |

---

## VI. DANH MỤC KIỂM TRA SẴN SÀNG (PRE-FLIGHT CHECKLIST)

- [x] Đã trỏ tên miền chính thức: `btdcsgioinghean.com` -> `14.225.212.138`
- [x] Đã cài đặt chứng chỉ SSL Let's Encrypt (Hạn dùng 90 ngày)
- [x] Đã cấu hình Nginx chuyển hướng tự động HTTP sang HTTPS
- [x] Đã mở rộng IP Rate Limit lên 300 requests/10 phút (phục vụ 70 máy dùng chung 1 Wi-Fi)
- [x] Đã tối ưu connection pool HikariCP lên 30 kết nối song song
- [x] Đã nạp danh sách 70 thí sinh đủ điều kiện kèm số báo danh và đơn vị
- [x] Đã tạo ngân hàng đề thi chuẩn hóa (3 bộ đề thi cấp tỉnh)
- [x] Đã tích hợp kênh cứu hộ OTP khẩn cấp (Helpdesk Emergency OTP)
- [x] Đã tích hợp cơ chế tự động nộp bài và chống mất dữ liệu khi F5
- [x] Đã kiểm thử chạy thử nghiệm thành công với `full_audit_test.js`
