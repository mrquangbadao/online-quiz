-- ============================================================
-- V16: CẬP NHẬT BỘ ĐỀ THI VÒNG 2 TỪ REQUIREMENTS (ĐỀ VÒNG 2 CÂU HỎI_v2.docx)
-- Áp dụng và ghi đè toàn bộ bộ đề Vòng 2 cho tất cả các đợt thi hiện có
-- ============================================================

-- 1. Xóa toàn bộ bộ đề Vòng 2 cũ
DELETE FROM live_round2_topics;

-- 2. Chèn 10 bộ đề thi thực hành Vòng 2 mới từ file ĐỀ VÒNG 2 CÂU HỎI_v2.docx
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
        'Tại xã Một có tài khoản phần mềm Quản lý đoàn viên là: doanxamotna.nan (mật khẩu mặc định).

Câu 1: Đồng chí hãy thực hiện thao tác chuyển sinh hoạt Đoàn đi cho đoàn viên Nguyễn Văn B từ chi đoàn xóm 1 sang chi đoàn xóm 2 ở xã Một trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Đồng chí hãy thực hiện quy trình kết nạp cho 01 đoàn viên mới của chi đoàn xóm 1 của xã Một trên Phần mềm Quản lý đoàn viên (YUM).
Thông tin đoàn viên mới gồm:
- Họ và tên: Lê Thị Một
- Ngày sinh: 26/3/2015
- Số CCCD: 040333344444
- Số điện thoại: 0133333444
- Email: Lethimotnan@gmail.com
- Các trường thông tin khác đồng chí tự biên tập.',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 02',
        'Tại xã Hai có tài khoản phần mềm Quản lý đoàn viên là: doanxahaina.nan (mật khẩu mặc định).

Câu 1: Đồng chí hãy thực hiện ban hành 01 văn bản/thông báo chỉ đạo điều hành gửi cho các chi đoàn trực thuộc ở xã Năm trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Đồng chí hãy chia tách chi đoàn xóm 1 thành 02 chi đoàn mới ở xã Hai trên Phần mềm Quản lý đoàn viên (YUM).
Mỗi chi đoàn 01 đoàn viên.
Tên các chi đoàn mới lần lượt là:
- Chi đoàn BTĐCS NA 21 có tài khoản chidoanbtdcsna21.nan
- Chi đoàn BTĐCS NA 22 có tài khoản chidoanbtdcsna22.nan',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 03',
        'Tại xã Ba có tài khoản phần mềm Quản lý đoàn viên là: doanxabana.nan (mật khẩu mặc định).

Câu 1: Đồng chí hãy thực hiện thao tác cấp thẻ đoàn viên cho đoàn viên Nguyễn Văn A2 thuộc xã Ba trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Đồng chí hãy sáp nhập 2 chi đoàn của xã Ba thành 01 chi đoàn mới trên Phần mềm Quản lý đoàn viên.
Tên chi đoàn mới: Chi đoàn BTĐCS NA 3
Tài khoản: chidoanbtdcsna3.nan.',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 04',
        'Tại xã Bốn có tài khoản phần mềm Quản lý đoàn viên là: doanxabonna.nan (mật khẩu mặc định).

Câu 1: Đồng chí hãy thực hiện thao tác tạo 01 chi đoàn mới và cấp tài khoản đăng nhập, phân quyền cho chi đoàn đó ở xã Bốn trên Phần mềm Quản lý đoàn viên (YUM).
Tên chi đoàn mới: Chi đoàn BTĐCS NA 4.
Tài khoản: chidoanbtdcsna4.nan',
        'Câu 2: Đồng chí hãy chuyển toàn bộ đoàn viên của Chi đoàn xóm 1 và Chi đoàn xóm 2 sang Chi đoàn BTĐCS NA 4; sau đó xóa 2 chi đoàn xóm 1, chi đoàn xóm 2 của xã Bốn trên Phần mềm Quản lý đoàn viên (YUM).',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 05',
        'Tại xã Năm có tài khoản phần mềm Quản lý đoàn viên là: doanxanamna.nan (mật khẩu mặc định).

Câu 1: Đồng chí hãy thực hiện ban hành 01 văn bản/thông báo chỉ đạo điều hành gửi cho các chi đoàn trực thuộc ở xã Năm trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Đồng chí hãy chia tách chi đoàn xóm 51 thành 02 chi đoàn mới ở xã Năm trên Phần mềm Quản lý đoàn viên (YUM).
Mỗi chi đoàn 01 đoàn viên.
Tên các chi đoàn mới lần lượt là:
- Chi đoàn BTĐCS NA 51 có tài khoản chidoanbtdcsna51.nan
- Chi đoàn BTĐCS NA 52 có tài khoản chidoanbtdcsna52.nan',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 06',
        'Tại xã Sáu có tài khoản phần mềm Quản lý đoàn viên là: doanxasauna.nan (mật khẩu mặc định).

Câu 1: Đồng chí hãy thực hiện thao tác chuyển sinh hoạt Đoàn đi cho đoàn viên Nguyễn Văn A1 từ chi đoàn xóm 61 sang chi đoàn khác xóm 62 ở xã Sáu trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Đồng chí hãy thực hiện quy trình kết nạp cho 01 đoàn viên mới thuộc chi đoàn xóm 61 của xã Sáu trên Phần mềm Quản lý đoàn viên (YUM).
Thông tin đoàn viên mới gồm:
- Họ và tên: Nguyễn Văn Sáu
- Ngày sinh: 26/3/2016
- Số CCCD: 040666667777
- Số điện thoại: 0166666777
- Email: Nguyenvansaunan@gmail.com
- Các trường thông tin khác đồng chí tự biên tập.',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 07',
        'Tại xã Bảy có tài khoản phần mềm Quản lý đoàn viên là: doanxabayna.nan (mật khẩu mặc định).

Câu 1: Đồng chí hãy thực hiện thao tác cấp thẻ đoàn viên cho đoàn viên Nguyễn Văn A ở chi đoàn 71 thuộc xã Bảy trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Đồng chí hãy sáp nhập 2 chi đoàn hiện tại thành chi đoàn mới ở xã Bảy trên Phần mềm Quản lý đoàn viên (YUM).
Tên chi đoàn mới: Chi đoàn BTĐCS NA 7.
Tài khoản chi đoàn mới: chidoanbtdcsna7.nan',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 08',
        'Tại xã Tám có tài khoản phần mềm Quản lý đoàn viên là: doanxatamna.nan (mật khẩu mặc định).

Câu 1: Đồng chí hãy thực hiện thao tác cấp thẻ đoàn viên cho đoàn viên Nguyễn Văn A1 thuộc xã Tám trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Đồng chí hãy chia tách 01 chi đoàn bất kỳ thành 02 chi đoàn mới ở xã nơi đồng chí đang công tác trên Phần mềm Quản lý đoàn viên (YUM).
Mỗi chi đoàn 01 đoàn viên.
Tên các chi đoàn mới lần lượt là:
- Chi đoàn BTĐCS NA 81 có tài khoản là chidoanbtdcsna81.nan
- Chi đoàn BTĐCS NA 82 có tài khoản là chidoanbtdcsna82.nan',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 09',
        'Tại xã Chín có tài khoản phần mềm Quản lý đoàn viên là: doanxachinna.nan (mật khẩu mặc định).

Câu 1: Đồng chí hãy thực hiện thao tác tạo 01 chi đoàn mới và cấp tài khoản đăng nhập cho chi đoàn đó ở xã nơi đồng chí đang công tác trên Phần mềm Quản lý đoàn viên (YUM).
Tên chi đoàn: Chi đoàn BTĐCS NA 91.
Tên tài khoản: chidoanbtdcsna91.nan',
        'Câu 2: Đồng chí hãy thực hiện quy trình kết nạp cho 01 đoàn viên mới thuộc chi đoàn BTĐCS NA 91 xã Chín trên Phần mềm Quản lý đoàn viên (YUM).
Thông tin đoàn viên mới gồm:
- Họ và tên: Nguyễn Bá Thi Chín
- Ngày sinh: 26/3/2014
- Số CCCD: 040999990000
- Số điện thoại: 01999990000
- Email: Nguyenbathichin@gmail.com
- Các trường thông tin khác đồng chí tự biên tập.',
        20.0,
        20.0
    ),
    (
        'BỘ ĐỀ 10',
        'Tại xã Mười có tài khoản phần mềm Quản lý đoàn viên là: doanxamuoina.nan (mật khẩu mặc định).

Câu 1: Đồng chí hãy thực hiện ban hành 01 văn bản/thông báo chỉ đạo điều hành gửi cho các chi đoàn trực thuộc xã Mười trên Phần mềm Quản lý đoàn viên (YUM).',
        'Câu 2: Đồng chí hãy sáp nhập 2 chi đoàn thành chi đoàn mới ở xã Mười trên Phần mềm Quản lý đoàn viên (YUM).
Tên chi đoàn mới: Chi đoàn BTĐCS NA 10.
Tài khoản chi đoàn mới: chidoanbtdcsna10.nan',
        20.0,
        20.0
    )
) AS t(code, scenario_1, scenario_2, max_score_1, max_score_2);
