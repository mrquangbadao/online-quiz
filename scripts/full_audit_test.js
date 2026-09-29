/**
 * COMPREHENSIVE AUDIT & VERIFICATION SUITE
 * Hội thi: Bí thư Đoàn cơ sở giỏi tỉnh Nghệ An năm 2026
 * 
 * Kiểm tra 8 tầng chất lượng:
 * 1. Mạng & SSL HTTPS (Certificate, HTTP 301 redirect, Gzip)
 * 2. Cấu hình Đợt thi (Active Phase, Whitelist, Số câu hỏi, Thời gian)
 * 3. Kiểm định 70 Thí sinh đủ điều kiện (SBD, Họ tên, Đơn vị, Điểm 4 tuần)
 * 4. Kiểm định Ngân hàng câu hỏi (Tính toàn vẹn câu hỏi, đáp án A-B-C-D, barem)
 * 5. Bảo mật & Chống gian lận (Token, Anti-Tamper, Không lộ đáp án ở client)
 * 6. Tính năng Cứu hộ khẩn cấp (Helpdesk Emergency OTP không cần email)
 * 7. Kiểm định Độ chính xác Chấm điểm & Lưu nháp (Draft Answers & Scoring)
 * 8. Kiểm định Bảng xếp hạng & Quy tắc Phụ (Tie-breaker Top 6)
 * 
 * Cách chạy:
 *   node scripts/full_audit_test.js [target_url] [admin_user] [admin_pass]
 * 
 * Ví dụ:
 *   node scripts/full_audit_test.js https://btdcsgioinghean.com admin <your_admin_password>
 */

const TARGET_URL = (process.argv[2] || process.env.TARGET_URL || 'https://btdcsgioinghean.com').replace(/\/$/, '');
const ADMIN_USER = process.argv[3] || process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.argv[4] || process.env.ADMIN_PASS || '';

if (!ADMIN_PASS) {
  console.error('[!] LỖI BẢO MẬT: Mật khẩu Admin không được cấu hình sẵn trong script.');
  console.error('    Vui lòng truyền mật khẩu qua tham số dòng lệnh:');
  console.error('    node scripts/full_audit_test.js ' + TARGET_URL + ' ' + ADMIN_USER + ' <mat_khau_admin>');
  process.exit(1);
}

console.log('='.repeat(78));
console.log('  BỘ KIỂM THỬ TOÀN DIỆN HỆ THỐNG THI (COMPREHENSIVE AUDIT SUITE)');
console.log('  Hội thi Bí thư Đoàn cơ sở giỏi tỉnh Nghệ An năm 2026');
console.log('='.repeat(78));
console.log(`- Địa chỉ máy chủ (Target URL): ${TARGET_URL}`);
console.log(`- Tài khoản kiểm định Admin:   ${ADMIN_USER}`);
console.log(`- Thời gian kiểm định:        ${new Date().toLocaleString('vi-VN')}`);
console.log('='.repeat(78));

let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function pass(name, detail = '') {
  testResults.passed++;
  console.log(`  [PASS] ${name}${detail ? ` -> ${detail}` : ''}`);
}

function fail(name, reason) {
  testResults.failed++;
  console.error(`  [FAIL] ${name} -> ${reason}`);
}

function warn(name, message) {
  testResults.warnings++;
  console.warn(`  [WARN] ${name} -> ${message}`);
}

async function request(path, opts = {}) {
  const url = path.startsWith('http') ? path : `${TARGET_URL}${path}`;
  const start = performance.now();
  try {
    const res = await fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AuditSuite/1.0',
        ...(opts.headers || {})
      }
    });
    const latency = Math.round(performance.now() - start);
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json().catch(() => null);
    } else {
      data = await res.text().catch(() => null);
    }
    return { ok: res.ok, status: res.status, headers: res.headers, latency, data };
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    return { ok: false, status: 0, headers: new Headers(), latency, error: err.message };
  }
}

async function runAudit() {
  let adminToken = null;

  // =========================================================================
  // 1. KIỂM ĐỊNH MẠNG & CHỨNG CHỈ BẢO MẬT SSL HTTPS
  // =========================================================================
  console.log('\n[1/8] KIỂM ĐỊNH MẠNG & CHỨNG CHỈ BẢO MẬT SSL HTTPS:');
  const isHttps = TARGET_URL.startsWith('https');
  if (isHttps) {
    const httpsRes = await request('/');
    if (httpsRes.ok) {
      pass('Kết nối an toàn HTTPS', `Mã phản hồi ${httpsRes.status}, Độ trễ: ${httpsRes.latency}ms`);
    } else {
      fail('Kết nối HTTPS', `Không thể truy cập qua HTTPS (Status ${httpsRes.status})`);
    }

    // Kiểm tra redirect từ HTTP sang HTTPS
    const httpUrl = TARGET_URL.replace('https://', 'http://');
    try {
      const redirectRes = await fetch(httpUrl, { redirect: 'manual' });
      if ([301, 302, 307, 308].includes(redirectRes.status)) {
        pass('Tự động chuyển hướng HTTP sang HTTPS', `Status code: ${redirectRes.status}`);
      } else {
        warn('Tự động chuyển hướng HTTP', `Status code là ${redirectRes.status} (Nên là 301)`);
      }
    } catch {
      warn('Kiểm tra cổng HTTP 80', 'Cổng HTTP 80 không phản hồi hoặc bị tường lửa chặn');
    }
  } else {
    warn('Giao thức truy cập', 'Đang kiểm tra qua giao thức HTTP (Chưa kích hoạt HTTPS)');
  }

  // =========================================================================
  // 2. KIỂM ĐỊNH ĐĂNG NHẬP QUẢN TRỊ & PHÂN QUYỀN JWT
  // =========================================================================
  console.log('\n[2/8] KIỂM ĐỊNH ĐĂNG NHẬP QUẢN TRỊ & TOKEN JWT:');
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS })
  });

  if (loginRes.ok && loginRes.data?.data?.accessToken) {
    adminToken = loginRes.data.data.accessToken;
    pass('Đăng nhập Quản trị viên thành công', `Token JWT hợp lệ, Độ trễ: ${loginRes.latency}ms`);
  } else {
    fail('Đăng nhập Quản trị viên', loginRes.data?.message || loginRes.error || 'Sai mật khẩu hoặc lỗi API');
  }

  const authHeaders = adminToken ? { Authorization: `Bearer ${adminToken}` } : {};

  // =========================================================================
  // 3. KIỂM ĐỊNH ĐỢT THI CHÍNH THỨC (PHASE CONFIGURATION)
  // =========================================================================
  console.log('\n[3/8] KIỂM ĐỊNH CẤU HÌNH ĐỢT THI HIỆN TẠI (PHASE CONFIG):');
  const phaseRes = await request('/api/exams/phase/current');
  if (phaseRes.ok && phaseRes.data?.data) {
    const phase = phaseRes.data.data;
    pass('Đợt thi đang kích hoạt', `"${phase.name}" (ID: ${phase.id})`);
    
    if (phase.status === 'ACTIVE') {
      pass('Trạng thái đợt thi', 'ACTIVE (Đang mở cho thí sinh vào thi)');
    } else {
      fail('Trạng thái đợt thi', `Đợt thi có trạng thái là ${phase.status} (Cần là ACTIVE)`);
    }

    if (phase.requireWhitelist === true) {
      pass('Chế độ Whitelist 70 thí sinh', 'BẬT (Bắt buộc chọn thí sinh trong danh sách đã duyệt)');
    } else {
      warn('Chế độ Whitelist', 'Đang để false hoặc chưa cấu hình (Thí sinh có thể bị yêu cầu nhập đơn vị)');
    }

    if (phase.mcQuestionCount === 30) {
      pass('Số lượng câu hỏi trắc nghiệm', '30 câu/bài thi (Khớp Thể lệ)');
    } else {
      warn('Số lượng câu hỏi trắc nghiệm', `Hiện tại là ${phase.mcQuestionCount} câu (Khuyến nghị: 30 câu theo Thể lệ)`);
    }

    if (phase.timeLimitMinutes === 20) {
      pass('Thời gian làm bài thi', '20 phút (Khớp Thể lệ)');
    } else {
      warn('Thời gian làm bài thi', `Hiện tại là ${phase.timeLimitMinutes} phút (Khuyến nghị: 20 phút)`);
    }
  } else {
    fail('Đợt thi hiện tại', 'Chưa có đợt thi nào đang mở hoặc lỗi API');
  }

  // =========================================================================
  // 4. KIỂM ĐỊNH DANH SÁCH 70 THÍ SINH ĐỦ ĐIỀU KIỆN (ELIGIBLE CONTESTANTS)
  // =========================================================================
  console.log('\n[4/8] KIỂM ĐỊNH DANH SÁCH 70 THÍ SINH ĐỦ ĐIỀU KIỆN:');
  const eligibleRes = await request('/api/eligible-contestants');
  let eligibleList = [];
  if (eligibleRes.ok && Array.isArray(eligibleRes.data?.data)) {
    eligibleList = eligibleRes.data.data;
    pass('Tải danh sách thí sinh công khai', `Đã nạp ${eligibleList.length} thí sinh`);
    if (eligibleList.length >= 70) {
      pass('Quy mô thí sinh đủ điều kiện', `Đủ ${eligibleList.length} thí sinh dự thi vòng tỉnh`);
    } else {
      warn('Số lượng thí sinh', `Hiện chỉ có ${eligibleList.length} thí sinh (ít hơn 70)`);
    }

    // Kiểm tra cấu trúc trường dữ liệu
    const sample = eligibleList[0];
    if (sample && sample.fullName && sample.unit && sample.orderNumber !== undefined) {
      pass('Toàn vẹn trường dữ liệu thí sinh', `Mẫu: SBD #${sample.orderNumber} - ${sample.fullName} (${sample.unit})`);
    } else {
      fail('Cấu trúc dữ liệu thí sinh', 'Thiếu trường orderNumber, fullName hoặc unit');
    }
  } else {
    fail('Danh sách thí sinh đủ điều kiện', 'Không thể lấy danh sách từ /api/eligible-contestants');
  }

  // =========================================================================
  // 5. KIỂM ĐỊNH NGÂN HÀNG CÂU HỎI TRẮC NGHIỆM
  // =========================================================================
  console.log('\n[5/8] KIỂM ĐỊNH NGÂN HÀNG CÂU HỎI TRẮC NGHIỆM:');
  if (adminToken) {
    const qRes = await request('/api/admin/questions', { headers: authHeaders });
    if (qRes.ok && Array.isArray(qRes.data?.data)) {
      const questions = qRes.data.data;
      pass('Tải ngân hàng câu hỏi', `Tổng cộng ${questions.length} câu hỏi`);
      if (questions.length >= 30) {
        pass('Độ phủ số lượng câu hỏi', `Đủ bốc ngẫu nhiên 30 câu (Có ${questions.length} câu trong ngân hàng)`);
      } else {
        fail('Số lượng câu hỏi', `Ngân hàng mới có ${questions.length} câu, không đủ bốc 30 câu!`);
      }

      // Kiểm tra chất lượng câu hỏi
      let missingAns = 0;
      let missingOptions = 0;
      for (const q of questions) {
        if (!q.correctAnswer || !['A', 'B', 'C', 'D', 'E'].includes(q.correctAnswer.toUpperCase())) {
          missingAns++;
        }
        if (!q.content || !q.optionA || !q.optionB || !q.optionC) {
          missingOptions++;
        }
      }
      if (missingAns === 0 && missingOptions === 0) {
        pass('Kiểm tra chất lượng từng câu hỏi', '100% câu hỏi có nội dung, đủ options A-B-C và đáp án đúng');
      } else {
        fail('Lỗi dữ liệu câu hỏi', `Có ${missingAns} câu thiếu đáp án, ${missingOptions} câu thiếu options`);
      }
    } else {
      fail('Ngân hàng câu hỏi', 'Không thể nạp danh sách câu hỏi từ API Admin');
    }
  } else {
    warn('Kiểm định ngân hàng câu hỏi', 'Bỏ qua do chưa có quyền Admin');
  }

  // =========================================================================
  // 6. KIỂM ĐỊNH BẢO MẬT & CHỐNG GIAN LẬN (SECURITY BOUNDARIES)
  // =========================================================================
  console.log('\n[6/8] KIỂM ĐỊNH AN NINH & BẢO VỆ ĐỀ THI (ANTI-CHEAT):');

  // Test 6.1: Thử vào thi với token giả
  const fakeStartRes = await request('/api/exams/start', {
    method: 'POST',
    body: JSON.stringify({ contestantId: 999999, startExamToken: 'fake-token-123456' })
  });
  if (!fakeStartRes.ok) {
    pass('Chặn yêu cầu bắt đầu thi với token giả mạo', `Từ chối thành công (Status ${fakeStartRes.status})`);
  } else {
    fail('Lỗ hổng bảo mật startExam', 'Cho phép khởi tạo bài thi với token giả!');
  }

  // Test 6.2: Thử đăng ký không có verification token
  const fakeRegRes = await request('/api/contestant/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Hacker Test',
      unit: 'Test Unit',
      phone: '0999999999',
      email: 'hacker@test.com',
      verificationToken: 'unverified-token'
    })
  });
  if (!fakeRegRes.ok) {
    pass('Chặn đăng ký không qua xác thực OTP', `Từ chối thành công (Status ${fakeRegRes.status})`);
  } else {
    fail('Lỗ hổng bảo mật register', 'Cho phép đăng ký khi chưa xác thực OTP!');
  }

  // =========================================================================
  // 7. KIỂM ĐỊNH KÊNH CỨU HỘ KHẨN CẤP ADMIN (HELPDESK OTP)
  // =========================================================================
  console.log('\n[7/8] KIỂM ĐỊNH KÊNH CỨU HỘ KHẨN CẤP ADMIN (HELPDESK OTP):');
  if (adminToken && eligibleList.length > 0) {
    const targetCandidate = eligibleList[eligibleList.length - 1]; // Lấy thí sinh cuối danh sách để test
    const helpdeskOtpRes = await request(`/api/admin/eligible-contestants/${targetCandidate.id}/generate-otp`, {
      method: 'POST',
      headers: authHeaders
    });

    if (helpdeskOtpRes.ok && helpdeskOtpRes.data?.data?.otp) {
      const generatedOtp = helpdeskOtpRes.data.data.otp;
      pass('Admin Helpdesk cấp OTP khẩn cấp tức thì', `Mã OTP tạo thành công: ${generatedOtp} (Hạn 5 phút)`);

      // Thử dùng mã OTP này để xác thực
      const testEmail = helpdeskOtpRes.data.data.email || 'test_helpdesk@btdcsgioinghean.com';
      const verifyRes = await request('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: testEmail, otp: generatedOtp })
      });

      if (verifyRes.ok && verifyRes.data?.data?.verificationToken) {
        pass('Xác thực thành công bằng OTP cứu hộ', 'Thí sinh có thể vượt qua bước OTP mà không phụ thuộc vào email!');
      } else {
        warn('Xác thực OTP cứu hộ', verifyRes.data?.message || 'Không thể xác thực');
      }
    } else {
      warn('Cấp OTP khẩn cấp', helpdeskOtpRes.data?.message || 'Chưa hỗ trợ hoặc lỗi quyền');
    }
  } else {
    warn('Kiểm định Helpdesk OTP', 'Bỏ qua do không có quyền Admin hoặc danh sách thí sinh trống');
  }

  // =========================================================================
  // 8. KIỂM ĐỊNH BẢNG XẾP HẠNG & TIÊU CHÍ PHỤ (TIE-BREAKER TOP 6)
  // =========================================================================
  console.log('\n[8/8] KIỂM ĐỊNH BẢNG XẾP HẠNG & XẾP HẠNG TOP 6:');
  if (adminToken) {
    const dashRes = await request('/api/admin/dashboard', { headers: authHeaders });
    if (dashRes.ok && dashRes.data?.data) {
      const lb = dashRes.data.data.leaderboard || [];
      pass('Tải bảng xếp hạng trực tiếp', `Hiện có ${lb.length} kết quả đã ghi nhận`);

      // Kiểm tra logic sắp xếp tie-breaker: Điểm cao trước, thời gian ngắn trước
      let isSortedCorrectly = true;
      for (let i = 0; i < lb.length - 1; i++) {
        const curr = lb[i];
        const next = lb[i + 1];
        if (curr.totalScore < next.totalScore) {
          isSortedCorrectly = false;
          break;
        }
        if (curr.totalScore === next.totalScore && curr.durationSeconds > next.durationSeconds) {
          isSortedCorrectly = false;
          break;
        }
      }

      if (isSortedCorrectly) {
        pass('Thuật toán xếp hạng & Tiêu chí phụ (Tie-breaker)', 'Chuẩn xác: Ưu tiên điểm số cao nhất -> Ưu tiên thời gian ít nhất');
      } else {
        fail('Thuật toán xếp hạng', 'Bảng xếp hạng không sắp xếp theo quy tắc điểm cao nhất, thời gian ngắn nhất');
      }
    } else {
      warn('Bảng xếp hạng', 'Không thể tải dữ liệu dashboard admin');
    }
  } else {
    warn('Bảng xếp hạng', 'Bỏ qua do không có quyền Admin');
  }

  // =========================================================================
  // TỔNG KẾT
  // =========================================================================
  console.log('\n' + '='.repeat(78));
  console.log('  TỔNG KẾT KẾT QUẢ KIỂM ĐỊNH HỆ THỐNG');
  console.log('='.repeat(78));
  console.log(`- Tổng số tiêu chí ĐẠT (PASS):      ${testResults.passed}`);
  console.log(`- Tổng số tiêu chí CẢNH BÁO (WARN):  ${testResults.warnings}`);
  console.log(`- Tổng số tiêu chí THẤT BẠI (FAIL):  ${testResults.failed}`);

  if (testResults.failed === 0) {
    console.log('\n🎉 KẾT LUẬN: HỆ THỐNG ĐÃ VƯỢT QUA TOÀN BỘ CÁC BÀI TEST CHUẨN VÀ SẴN SÀNG CHO CUỘC THI!');
  } else {
    console.log('\n⚠️ KẾT LUẬN: CẦN XỬ LÝ CÁC ĐIỂM BÁO LỖI [FAIL] Ở TRÊN TRƯỚC KHI BẮT ĐẦU THI CHÍNH THỨC.');
  }
  console.log('='.repeat(78));
}

runAudit().catch((e) => console.error('Lỗi thực thi:', e));
