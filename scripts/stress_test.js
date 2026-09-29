/**
 * STRESS TEST & CONCURRENCY SIMULATION SCRIPT
 * Cuộc thi: Bí thư Đoàn cơ sở giỏi tỉnh Nghệ An năm 2026
 * 
 * Cách chạy:
 *   node scripts/stress_test.js [target_url] [num_contestants] [mode]
 * 
 * Ví dụ:
 *   node scripts/stress_test.js https://btdcsgioinghean.com 70 full
 *   node scripts/stress_test.js https://btdcsgioinghean.com 70 start_only
 *   node scripts/stress_test.js https://btdcsgioinghean.com 10 health
 */

const TARGET_URL = (process.argv[2] || 'https://btdcsgioinghean.com').replace(/\/$/, '');
const NUM_USERS = parseInt(process.argv[3] || '70', 10);
const MODE = process.argv[4] || 'full'; // 'health', 'start_only', 'full', 'draft_flood'
const MASTER_OTP = process.env.EMERGENCY_MASTER_OTP || process.env.MASTER_OTP || (process.argv.find(a => /^\d{6}$/.test(a))) || '888666';
const BYPASS_KEY = process.env.STRESS_TEST_BYPASS_KEY || 'doan_nghean_stress_test_2026';
const WITH_EMAIL = process.argv.includes('--with-email');
const RUN_ID = Date.now().toString().slice(-4);

console.log('='.repeat(70));
console.log('  KỊCH BẢN KIỂM THỬ TẢI & ÁP LỰC (STRESS TEST SIMULATION)');
console.log('  Hội thi Bí thư Đoàn cơ sở giỏi tỉnh Nghệ An 2026');
console.log('='.repeat(70));
console.log(`- Mục tiêu kiểm thử (Target URL): ${TARGET_URL}`);
console.log(`- Số lượng thí sinh giả lập:   ${NUM_USERS} thí sinh đồng thời`);
console.log(`- Chế độ kiểm thử (Mode):        ${MODE.toUpperCase()}`);
console.log(`- Mã Master OTP bypass:          ${MASTER_OTP}`);
console.log(`- Cơ chế Bypass Anti-Bot/Rate:  BẬT (Khóa bảo mật: ${BYPASS_KEY.substring(0, 10)}...)`);
console.log(`- Gửi Email OTP thật qua Brevo:  ${WITH_EMAIL ? 'BẬT' : 'TẮT (Dùng Master OTP để tiết kiệm quota)'}`);
console.log('='.repeat(70));

const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  latencies: [],
  stages: {}
};

function recordReq(stage, latency, success, error = null) {
  stats.totalRequests++;
  if (success) {
    stats.successfulRequests++;
  } else {
    stats.failedRequests++;
  }
  stats.latencies.push(latency);
  if (!stats.stages[stage]) {
    stats.stages[stage] = { total: 0, success: 0, failed: 0, latencies: [] };
  }
  stats.stages[stage].total++;
  if (success) stats.stages[stage].success++;
  else stats.stages[stage].failed++;
  stats.stages[stage].latencies.push(latency);

  if (error) {
    if (!stats.stages[stage].errors) stats.stages[stage].errors = {};
    const errMsg = String(error).substring(0, 100);
    stats.stages[stage].errors[errMsg] = (stats.stages[stage].errors[errMsg] || 0) + 1;
  }
}

async function apiCall(method, path, body = null, headers = {}) {
  const url = `${TARGET_URL}/api${path}`;
  const start = performance.now();
  try {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'StressTestRunner/1.0',
        'X-Bypass-Rate-Limit': BYPASS_KEY,
        ...headers
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const latency = Math.round(performance.now() - start);
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, latency, data };
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    return { ok: false, status: 0, latency, error: err.message };
  }
}

function calcMetrics(arr) {
  if (arr.length === 0) return { min: 0, max: 0, avg: 0, p95: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = Math.round(sum / sorted.length);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || max;
  return { min, max, avg, p95 };
}

async function checkHealth() {
  console.log('\n[1/4] Kiểm tra trạng thái hệ thống & Đợt thi hiện tại...');
  const phaseRes = await apiCall('GET', '/exams/phase/current');
  recordReq('check_phase', phaseRes.latency, phaseRes.ok);

  if (!phaseRes.ok || !phaseRes.data?.data) {
    console.error('❌ Không thể lấy thông tin đợt thi! Kiểm tra kết nối hoặc đợt thi chưa được kích hoạt.');
    return null;
  }
  const phase = phaseRes.data.data;
  console.log(`✅ Đợt thi active: "${phase.name}" (ID: ${phase.id}, Trạng thái: ${phase.status})`);
  console.log(`   - Whitelist mode: ${phase.requireWhitelist}`);
  console.log(`   - Số câu hỏi:     ${phase.mcQuestionCount || 30} câu`);
  console.log(`   - Thời gian thi:  ${phase.timeLimitMinutes || 20} phút`);

  const listRes = await apiCall('GET', '/eligible-contestants');
  recordReq('get_eligible', listRes.latency, listRes.ok);
  const eligible = listRes.data?.data || [];
  console.log(`✅ Danh sách thí sinh đủ điều kiện: ${eligible.length} thí sinh đã nạp`);

  return { phase, eligible };
}

// Giả lập 1 thí sinh hoàn chỉnh
async function simulateCandidate(candidate, index, masterOtp = MASTER_OTP, requireWhitelist = false) {
  const cEmail = `test_thi_sinh_${index + 1}_${RUN_ID}@btdcsgioinghean.com`;
  const cPhone = `098${String(index + 1).padStart(3, '0')}${RUN_ID}`;
  const cName = candidate.fullName || `Thí sinh Thử Nghiệm ${index + 1}`;
  const cUnit = candidate.unit || `Đoàn cơ sở ${index + 1}`;

  // Bước 1: Yêu cầu mã OTP (chỉ gọi nếu bật cờ --with-email để tránh tiêu hao hạn mức gửi email Brevo)
  if (WITH_EMAIL) {
    const reqOtpRes = await apiCall('POST', '/auth/request-otp', { email: cEmail });
    recordReq('request_otp', reqOtpRes.latency, reqOtpRes.ok, reqOtpRes.error || (reqOtpRes.data?.message));
  }

  // Bước 2: Xác thực mã OTP bằng Master OTP trực tiếp
  const verifyRes = await apiCall('POST', '/auth/verify-otp', {
    email: cEmail,
    otp: masterOtp
  });
  recordReq('verify_otp', verifyRes.latency, verifyRes.ok, verifyRes.error || (verifyRes.data?.message));

  let token = verifyRes.data?.data?.verificationToken;
  if (!token) {
    return { index, candidate: cName, success: false, step: 'verify_otp', error: verifyRes.data?.message || 'Không có token' };
  }

  // Bước 3: Đăng ký thí sinh (chỉ liên kết eligibleContestantId nếu đợt thi yêu cầu Whitelist)
  const regPayload = {
    fullName: cName,
    unit: cUnit,
    phone: cPhone,
    email: cEmail,
    verificationToken: token
  };
  if (requireWhitelist && candidate && candidate.id) {
    regPayload.eligibleContestantId = candidate.id;
  }

  const regRes = await apiCall('POST', '/contestant/register', regPayload);
  recordReq('register', regRes.latency, regRes.ok, regRes.error || (regRes.data?.message));

  const contestantId = regRes.data?.data?.contestantId;
  const startExamToken = regRes.data?.data?.startExamToken;
  if (!contestantId || !startExamToken) {
    return { index, candidate: cName, success: false, step: 'register', error: regRes.data?.message };
  }

  // Bước 4: Khởi tạo bài thi (Bắt đầu làm bài)
  const startRes = await apiCall('POST', '/exams/start', {
    contestantId,
    startExamToken
  });
  recordReq('start_exam', startRes.latency, startRes.ok, startRes.error || (startRes.data?.message));

  const examData = startRes.data?.data;
  if (!examData || !examData.examId) {
    return { index, candidate: cName, success: false, step: 'start_exam', error: startRes.data?.message };
  }

  const examId = examData.examId;
  const submitToken = examData.submitToken;
  const questions = examData.multipleChoiceQuestions || examData.mcQuestions || [];

  if (MODE === 'start_only') {
    return { index, candidate: cName, success: true, examId, questionsCount: questions.length };
  }

  // Bước 5: Giả lập trả lời nháp 30 câu hỏi (Draft answers)
  const options = ['A', 'B', 'C', 'D'];
  for (let qIdx = 0; qIdx < questions.length; qIdx++) {
    const q = questions[qIdx];
    const qId = q.questionId || q.id;
    const pickedAnswer = options[Math.floor(Math.random() * options.length)];
    
    // Gửi draft answer
    const draftRes = await apiCall('POST', `/exams/${examId}/draft-answer`, {
      questionId: qId,
      questionType: 'MC',
      selectedAnswer: pickedAnswer
    });
    recordReq('draft_answer', draftRes.latency, draftRes.ok, draftRes.error);
    
    // Nghỉ nhẹ 10-50ms giả lập thao tác
    await new Promise((r) => setTimeout(r, 20));
  }

  // Bước 6: Nộp bài thi
  const submitRes = await apiCall('POST', `/exams/${examId}/submit`, {
    submitToken: submitToken,
    answers: questions.map((q) => ({
      questionId: q.questionId || q.id,
      questionType: 'MC',
      selectedAnswer: options[Math.floor(Math.random() * options.length)]
    })),
    prediction: 0
  });
  recordReq('submit_exam', submitRes.latency, submitRes.ok, submitRes.error || (submitRes.data?.message));

  return {
    index,
    candidate: cName,
    success: submitRes.ok,
    examId,
    score: submitRes.data?.data?.totalScore
  };
}

async function run() {
  const init = await checkHealth();
  if (!init) return;

  if (MODE === 'health') {
    console.log('\n[XONG] Hệ thống sẵn sàng kiểm thử tải.');
    return;
  }

  const eligible = init.eligible;
  const isWhitelist = Boolean(init.phase?.requireWhitelist);

  let candidatesToTest = [];
  if (isWhitelist) {
    candidatesToTest = eligible.filter((c) => !c.isRegistered);
    if (candidatesToTest.length < NUM_USERS) {
      console.warn(`⚠️ Cảnh báo: Đợt thi yêu cầu Whitelist nhưng chỉ còn ${candidatesToTest.length} thí sinh chưa thi.`);
    }
  } else {
    candidatesToTest = eligible;
  }

  const countToTest = Math.min(NUM_USERS, candidatesToTest.length > 0 ? candidatesToTest.length : NUM_USERS);
  console.log(`\n[2/4] Đang kích hoạt đồng thời ${countToTest} thí sinh kiểm thử áp lực...`);
  console.log(`      (Mô phỏng ${countToTest} thí sinh cùng nộp và tải trong cùng một thời điểm)`);

  const startTime = Date.now();
  const promises = [];

  for (let i = 0; i < countToTest; i++) {
    const cand = candidatesToTest[i] || { id: i + 1, fullName: `Thí sinh Thử Nghiệm ${i + 1}`, unit: `Đoàn cơ sở ${i + 1}` };
    promises.push(simulateCandidate(cand, i, MASTER_OTP, isWhitelist));
  }

  const results = await Promise.all(promises);
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n[3/4] Kết quả kiểm thử tải (${totalDuration}s):`);
  const successCount = results.filter((r) => r.success).length;
  console.log(`- Thí sinh hoàn thành trọn vẹn: ${successCount} / ${countToTest} (${((successCount / countToTest) * 100).toFixed(1)}%)`);

  console.log('\n[4/4] BẢNG PHÂN TÍCH HIỆU NĂNG TỪNG GIAI ĐOẠN (LATENCY METRICS):');
  console.log('='.repeat(80));
  console.log(
    'Giai đoạn (Stage)'.padEnd(20) +
    'Tổng Req'.padStart(10) +
    'Thành công'.padStart(12) +
    'Thất bại'.padStart(10) +
    'Avg(ms)'.padStart(10) +
    'P95(ms)'.padStart(10) +
    'Max(ms)'.padStart(10)
  );
  console.log('-'.repeat(80));

  for (const [stage, data] of Object.entries(stats.stages)) {
    const m = calcMetrics(data.latencies);
    console.log(
      stage.padEnd(20) +
      String(data.total).padStart(10) +
      String(data.success).padStart(12) +
      String(data.failed).padStart(10) +
      String(m.avg).padStart(10) +
      String(m.p95).padStart(10) +
      String(m.max).padStart(10)
    );
    if (data.errors && Object.keys(data.errors).length > 0) {
      for (const [err, cnt] of Object.entries(data.errors)) {
        console.log(`   └─ Lỗi: [x${cnt}] ${err}`);
      }
    }
  }
  console.log('='.repeat(80));

  const totalM = calcMetrics(stats.latencies);
  console.log(`TỔNG HỢP: ${stats.totalRequests} requests, ${stats.successfulRequests} OK, ${stats.failedRequests} FAIL`);
  console.log(`Thời gian phản hồi trung bình (Avg): ${totalM.avg}ms | P95: ${totalM.p95}ms | Cao nhất: ${totalM.max}ms`);
  console.log('='.repeat(80));
}

run().catch((e) => console.error('Lỗi thực thi:', e));
