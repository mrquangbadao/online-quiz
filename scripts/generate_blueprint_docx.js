const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType
} = require('docx');

function createDoc() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 24, // 12pt
            color: '2D3748'
          },
          paragraph: {
            spacing: {
              line: 320, // 1.33x
              after: 160
            }
          }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          }
        },
        children: [
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: "HỘI THI BÍ THƯ ĐOÀN CƠ SỞ GIỎI TỈNH NGHỆ AN 2026",
                bold: true,
                size: 26,
                color: "1A365D"
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 250 },
            children: [
              new TextRun({
                text: "BẢN BLUEPRINT THIẾT KẾ & ĐIỀU HÀNH VÒNG CHUNG KẾT SÂN KHẤU",
                bold: true,
                size: 32,
                color: "C53030"
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 400 },
            children: [
              new TextRun({
                text: "Thể thức: Live Arena / Sân khấu tương tác thời gian thực – Cập nhật ngày 05/10/2026",
                italics: true,
                size: 22,
                color: "718096"
              })
            ]
          }),

          // Metadata Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "EDF2F7", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: "Cơ quan chỉ đạo", bold: true, color: "2B6CB0" })] })]
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun("Ban Thường vụ Tỉnh đoàn Nghệ An")] })]
                  }),
                  new TableCell({
                    shading: { fill: "EDF2F7", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: "Thời gian tổ chức", bold: true, color: "2B6CB0" })] })]
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun("Ngày 09/10/2026 (Dự kiến)")] })]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "EDF2F7", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: "Địa điểm sân khấu", bold: true, color: "2B6CB0" })] })]
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun("Nhà khách Nghệ An, số 04 Phan Đăng Lưu, phường Trường Vinh, Nghệ An")] })]
                  }),
                  new TableCell({
                    shading: { fill: "EDF2F7", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: "Số lượng thí sinh", bold: true, color: "2B6CB0" })] })]
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun("Top 10 Bí thư Đoàn cơ sở xuất sắc nhất")] })]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "EDF2F7", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: "Mô hình vận hành", bold: true, color: "2B6CB0" })] })]
                  }),
                  new TableCell({
                    columnSpan: 3,
                    children: [new Paragraph({ children: [new TextRun("Three-Screen Harmony (Màn hình LED Trung tâm + Bàn Điều khiển Admin + 10 Điện thoại Thí sinh)")] })]
                  })
                ]
              })
            ]
          }),

          // Section I
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 150 },
            children: [
              new TextRun({
                text: "I. TỔNG QUAN KIẾN TRÚC & NGUYÊN TẮC HỆ THỐNG",
                bold: true,
                size: 26,
                color: "0D5C63"
              })
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "1. Tách biệt Đợt thi nhưng Liên kết Hồ sơ Vòng loại: ", bold: true }),
              new TextRun("Bảo toàn 100% dữ liệu bài thi Vòng loại. Vòng Chung kết được tạo dưới dạng Đợt thi mới với thể thức LIVE_ARENA. Hồ sơ 10 thí sinh được liên kết trực tiếp với dữ liệu Vòng loại (Bảng contestants, eligible_contestants, exams) để hiển thị trọn vẹn thành tích: điểm vòng loại, thời gian thi, chức vụ, đơn vị công tác và ảnh Avatar sắc nét.")
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "2. Xác thực Email OTP chính chủ (Kế thừa luồng hiện tại): ", bold: true }),
              new TextRun("Tái sử dụng hoàn toàn hạ tầng xác thực Email OTP và Brevo hiện có. Thí sinh chọn tên mình trong Dropdown 10 thí sinh Chung kết, hệ thống tự điền Email đã đăng ký (ẩn 3 ký tự đầu), gửi mã OTP 6 số qua Email và xác thực trên cùng giao diện modal quen thuộc của hệ thống. Có sẵn cơ chế Thư ký \"Duyệt nhanh\" trên trang Admin.")
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "3. Đồng bộ Trang chủ (Landing Page) & Nhận diện Đợt thi: ", bold: true }),
              new TextRun("Thí sinh không cần quét mã QR, chỉ cần vào Trang chủ btdcsgioinghean.com và bấm \"Vào phòng thi Chung kết\". Lộ trình 5 chặng cập nhật Chặng 03 Đã hoàn thành và Chặng 04 là Tiêu điểm Đang diễn ra với huy hiệu nổi bật.")
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "4. Màn hình chờ trên Điện thoại (Sinh động, Icon nhẹ nhàng): ", bold: true }),
              new TextRun("Sau khi nhập OTP thành công, điện thoại chuyển về Màn hình chờ (Waiting Room) với phối màu tươi sáng, gradient trang nhã, thẻ bo góc mềm mại kết hợp icon tinh tế (Huy hiệu Đoàn, thẻ tên, sóng kết nối xanh ổn định). Báo rõ trạng thái ĐÃ ĐIỂM DANH THÀNH CÔNG, chưa mở nút bấm để tránh chạm nhầm.")
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "5. Zero-Trust & Thuật toán Bù trễ Mạng (NTP/RTT): ", bold: true }),
              new TextRun("Thời gian trả lời thực tế được chuẩn hóa bằng công thức: T_thực = T_Server - RTT/2 kèm vùng đệm an toàn +500ms để bảo vệ quyền lợi thí sinh trước sóng mạng di động.")
            ]
          }),

          // Section II
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 350, after: 150 },
            children: [
              new TextRun({
                text: "II. VÒNG 1: BÍ THƯ ĐOÀN CƠ SỞ – THÔNG THÁI",
                bold: true,
                size: 26,
                color: "0D5C63"
              })
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "1. Hiển thị Nội dung Đáp án & Xáo trộn Ngẫu nhiên trên Mobile: ", bold: true, color: "2B6CB0" }),
              new TextRun("Màn hình điện thoại hiển thị đầy đủ nội dung Text của từng đáp án trên các thẻ phẳng hiện đại, chữ to rõ ràng, không gắn cố định các icon hình học để tránh việc thí sinh nhìn trộm màu sắc/hình khối của người bên cạnh hoặc nhầm tưởng icon đại diện cho đáp án. Đồng thời, máy chủ tự động xáo trộn thứ tự 4 đáp án độc lập cho từng thí sinh. MC trên sân khấu đọc to câu hỏi và nội dung 4 phương án lựa chọn. Thí sinh tự đọc nội dung chữ trên máy mình và chạm chọn, triệt tiêu 100% việc nhìn bài nhau.")
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "2. Quy trình Chọn Ngôi sao Hy vọng (NSHV) 5 Giây Kịch tính: ", bold: true, color: "2B6CB0" }),
              new TextRun("Trước mỗi câu hỏi, MC giới thiệu câu và tuyên bố: \"5 giây chọn Ngôi sao hy vọng bắt đầu!\" -> Admin bấm nút [Bắt đầu 5s chọn NSHV]. Màn hình điện thoại thí sinh đếm ngược 5 giây kèm nút bấm Ngôi sao vàng 3D lấp lánh (Sparkles) nhấp nháy phát sáng (chỉ hiển thị với thí sinh chưa từng dùng NSHV, tối đa 1 lần/người). Trên màn hình LED sân khấu, ô thí sinh nào chọn NSHV lập tức nhấp nháy phát sáng rực rỡ (Golden Glow Pulse) kèm hiệu ứng âm thanh kịch tính.")
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "3. Thang điểm Giảm dần & Quy tắc Ngôi sao Hy vọng: ", bold: true, color: "2B6CB0" }),
              new TextRun("Thời gian cho mỗi câu là 40 giây: Từ 01-10s = +5 điểm; Từ 11-30s = +3 điểm; Từ 31-40s = +2 điểm; Sai = 0 điểm. Nếu chọn NSHV: Đúng được nhân đôi số điểm (+10đ, +6đ, +4đ); Sai hoặc không trả lời bị trừ 2 điểm (-2đ).")
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "4. Kịch bản Điều hành Sân khấu 4 Nhịp Chuẩn xác: ", bold: true, color: "2B6CB0" }),
              new TextRun("Quy trình mỗi câu hỏi diễn ra đúng 4 nhịp: (1) Kích hoạt 5s chọn NSHV; (2) Admin bật video tình huống nếu có để cả hội trường xem (Đồng hồ 40s CHƯA CHẠY, mobile chỉ hiện thông báo chờ ngắn gọn: \"Mời đồng chí theo dõi màn hình lớn...\"); (3) Chiếu câu hỏi và MC đọc to câu hỏi cùng 4 đáp án cho cả khán phòng nghe (Đồng hồ 40s VẪN CHƯA CHẠY, mobile tiếp tục chờ); (4) MC đọc xong, Admin bấm [Bắt đầu tính giờ 40s] -> Đồng hồ 40s chính thức đếm ngược và mở 4 ô đáp án trên điện thoại.")
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "5. Bảng Xếp hạng Trượt Vị trí Động (Animated Sliding Leaderboard): ", bold: true, color: "2B6CB0" }),
              new TextRun("Sau mỗi câu hỏi, danh sách 10 thí sinh tự động trượt lên / trượt xuống đổi chỗ trực tiếp trên màn hình LED tương ứng với tổng điểm và thời gian mới. Cạnh tên hiển thị chỉ số biến động thứ hạng (▲ +2, ▼ -1, ● 0).")
            ]
          }),

          // Section III
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 350, after: 150 },
            children: [
              new TextRun({
                text: "III. VÒNG 2: BÍ THƯ ĐOÀN CƠ SỞ – NHẠY BÉN",
                bold: true,
                size: 26,
                color: "0D5C63"
              })
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "1. Ngân hàng Đề thi & Mã đề trên Hệ thống: ", bold: true, color: "2B6CB0" }),
              new TextRun("Tuy phần thi thực hành trên phần mềm Quản lý đoàn viên của TW Đoàn, hệ thống Chung kết quản lý tập trung: Admin nhập danh sách Mã đề thi (ĐỀ 01, ĐỀ 02...) kèm nội dung 2 tình huống nghiệp vụ và thang điểm (tối đa 20 điểm/tình huống, tổng tối đa 40 điểm/đề).")
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "2. Quy trình Bốc thăm & Kích hoạt Mã đề cho Thí sinh: ", bold: true, color: "2B6CB0" }),
              new TextRun("Thí sinh bốc thăm phong bì mã đề thực tế trên sân khấu -> Đọc mã đề -> Admin chọn mã đề tương ứng cho thí sinh trên hệ thống. Màn hình LED lập tức hiển thị Avatar thí sinh, Mã đề và nội dung 2 tình huống nghiệp vụ cùng đồng hồ đếm ngược 06 phút làm bài.")
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "3. Nhập điểm Giám khảo & Cập nhật Dashboard Tổng: ", bold: true, color: "2B6CB0" }),
              new TextRun("Sau khi thí sinh hoàn thành bài thi, Ban Giám khảo chấm điểm -> Admin/Thư ký nhập trực tiếp điểm số vào hệ thống -> Điểm số lập tức được cộng dồn vào Dashboard tổng (Tổng = Điểm Vòng 1 + Điểm Vòng 2) và màn hình LED cập nhật bảng xếp hạng tức thì.")
            ]
          }),

          // Section IV
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 350, after: 150 },
            children: [
              new TextRun({
                text: "IV. VÒNG 3: BÍ THƯ ĐOÀN CƠ SỞ – BẢN LĨNH",
                bold: true,
                size: 26,
                color: "0D5C63"
              })
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "1. Bốc thăm Ghép cặp Ngẫu nhiên Sân khấu (Live Random Pairing): ", bold: true, color: "2B6CB0" }),
              new TextRun("Không ghép cặp theo thứ hạng tĩnh, hệ thống triển khai cơ chế bốc thăm ghép cặp ngẫu nhiên trực tiếp trên màn hình LED: Khi Admin bấm [BẮT ĐẦU BỐC THĂM], hệ thống bật âm thanh trống hội hồi hộp và chạy animation vòng quay ngẫu nhiên (Roulette / Card Shuffle) chọn ra từng cặp đấu trước toàn thể hội trường và 10 thí sinh, bảo đảm 100% công khai, minh bạch.")
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "2. Điều hành Tranh biện 3 Giai đoạn cho Từng Cặp đấu: ", bold: true, color: "2B6CB0" }),
              new TextRun("Màn hình LED chiếu giao diện Versus (VS) hiển thị ảnh 2 thí sinh đối đầu cùng đồng hồ đếm ngược chuyên dụng: Giai đoạn 1: Đề xuất phương án (02 phút chuẩn bị, 05 phút trình bày); Giai đoạn 2: Giải quyết vấn đề (03 phút suy nghĩ và trả lời); Giai đoạn 3: Tầm nhìn Thủ lĩnh (01 phút bảo vệ giải pháp).")
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "3. Nhập điểm Giám khảo & Bục Vinh danh Chung cuộc: ", bold: true, color: "2B6CB0" }),
              new TextRun("Ban Giám khảo chấm điểm Vòng 3 (tối đa 100 điểm) -> Thư ký nhập điểm vào hệ thống -> Hệ thống tự động tính Tổng điểm Chung kết = Điểm Vòng 1 + Điểm Vòng 2 + Điểm Vòng 3. Màn hình LED trình chiếu Bục vinh danh Quán quân (01 Giải Nhất), 03 Giải Nhì và 06 Giải Ba kèm Giấy chứng nhận cho toàn bộ thí sinh tham gia.")
            ]
          }),

          // Section V
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 350, after: 150 },
            children: [
              new TextRun({
                text: "V. QUY TRÌNH ĐIỀU HÀNH THỜI GIAN THỰC (ADMIN RUNBOOK)",
                bold: true,
                size: 26,
                color: "0D5C63"
              })
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "1. Trước giờ thi đấu: ", bold: true }),
              new TextRun("Admin bấm nút nạp Top 10 thí sinh Vòng loại, tải ảnh Avatar chất lượng cao của từng thí sinh, kiểm tra ngân hàng 10 câu hỏi Vòng 1 và ngân hàng mã đề Vòng 2. Nối màn hình LED qua cổng HDMI và mở giao diện /live/screen ở chế độ toàn màn hình (F11).")
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "2. Điểm danh Phòng chờ (Lobby): ", bold: true }),
              new TextRun("10 thí sinh dùng điện thoại xác thực OTP vào phòng chờ. Màn hình LED hiện 10 ô thí sinh kèm Avatar, ô nào điểm danh xong đổi màu xanh lá. Khi đủ 10/10 người, Admin bấm nút [BẮT ĐẦU PHẦN THI].")
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "3. Điều hành lần lượt 3 Phần thi: ", bold: true }),
              new TextRun("Phần 1: Lần lượt 10 câu hỏi qua các nhịp: Chọn NSHV 5s -> Phát video clip (nếu có) -> Đếm ngược 40s làm bài -> Công bố đáp án -> Trượt Leaderboard. Phần 2: Gán mã đề bốc thăm -> Bấm giờ 6 phút -> Nhập điểm Giám khảo. Phần 3: Bốc thăm ngẫu nhiên 5 cặp đấu trên LED -> Điều hành tranh luận 3 giai đoạn -> Nhập điểm Giám khảo -> Chiếu Bục vinh danh trao giải.")
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "4. Xuất Biên bản & Đóng phiên: ", bold: true }),
              new TextRun("Tải file Excel gồm Bảng tổng điểm chính thức cả 3 phần để Ban Giám khảo và Tỉnh đoàn ký duyệt, kèm Sheet nhật ký chi tiết từng câu hỏi Vòng 1.")
            ]
          })
        ]
      }
    ]
  });

  return doc;
}

async function main() {
  const doc = createDoc();
  const buffer = await Packer.toBuffer(doc);
  
  const docsPath = path.resolve(__dirname, '../docs/BLUEPRINT_VONG_CHUNG_KET_2026.docx');
  const rootPath = path.resolve(__dirname, '../BLUEPRINT_VONG_CHUNG_KET_2026.docx');

  fs.writeFileSync(docsPath, buffer);
  fs.writeFileSync(rootPath, buffer);

  console.log("Successfully re-generated updated DOCX files at:");
  console.log("1. " + docsPath);
  console.log("2. " + rootPath);
}

main().catch(err => {
  console.error("Error generating DOCX:", err);
  process.exit(1);
});
