package com.quiz.service.impl;

import com.quiz.dto.live.*;
import com.quiz.entity.*;
import com.quiz.repository.*;
import com.quiz.service.LiveArenaService;
import com.quiz.util.EmailMaskUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LiveArenaServiceImpl implements LiveArenaService {

    private final LiveSessionRepository liveSessionRepository;
    private final LivePlayerRepository livePlayerRepository;
    private final LiveQuestionRepository liveQuestionRepository;
    private final LivePlayerAnswerRepository livePlayerAnswerRepository;
    private final LiveRound2TopicRepository liveRound2TopicRepository;
    private final LiveRound3PairRepository liveRound3PairRepository;
    private final ExamRepository examRepository;
    private final ContestPhaseRepository contestPhaseRepository;
    private final EligibleContestantRepository eligibleContestantRepository;
    private final com.quiz.service.EmailOtpService emailOtpService;
    private final SimpMessagingTemplate messagingTemplate;

    // Track question start timestamps (key: "sessionId:questionOrder")
    private final Map<String, Long> questionStartTimes = new ConcurrentHashMap<>();

    // Track previous ranks to calculate rank delta
    private final Map<Long, Integer> previousRanks = new ConcurrentHashMap<>();

    // Track Round 2 10-minute batch state per session
    private final Map<Long, Long> round2BatchEndTimes = new ConcurrentHashMap<>();
    private final Map<Long, Boolean> round2BatchRunningMap = new ConcurrentHashMap<>();
    private final Map<Long, List<Long>> round2ActiveBatches = new ConcurrentHashMap<>();
    private final Map<Long, java.util.concurrent.ScheduledFuture<?>> round2BatchFutures = new ConcurrentHashMap<>();

    // Track Round 3 active duels in-memory state per session
    private final Map<Long, Map<String, Object>> round3ActiveDuels = new ConcurrentHashMap<>();
    private final Map<Long, String> round3ViewModes = new ConcurrentHashMap<>();

    // Background scheduler for authoritative timeout auto-reveal (40s question & 5s hope star)
    private final java.util.concurrent.ScheduledExecutorService scheduler = java.util.concurrent.Executors.newScheduledThreadPool(4);

    @jakarta.annotation.PreDestroy
    public void shutdownScheduler() {
        scheduler.shutdownNow();
    }

    private void broadcast(Long sessionId, String eventType, Object payload) {
        LiveEventMessage message = LiveEventMessage.builder()
                .sessionId(sessionId)
                .eventType(eventType)
                .payload(payload)
                .build();
        messagingTemplate.convertAndSend("/topic/live/" + sessionId, message);
        messagingTemplate.convertAndSend("/topic/live/global", message);
    }

    @Override
    @Transactional
    public LiveSessionDto getActiveSession() {
        LiveSession session = liveSessionRepository.findFirstByStatusNotOrderByCreatedAtDesc("FINISHED")
                .orElseGet(() -> {
                    List<LiveSession> sessions = liveSessionRepository.findAllByOrderByCreatedAtDesc();
                    if (!sessions.isEmpty()) {
                        return sessions.get(0);
                    }
                    return createDefaultSession();
                });
        return convertToDto(session);
    }

    @Override
    @Transactional(readOnly = true)
    public LiveSessionDto getSessionById(Long sessionId) {
        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phiên thi: " + sessionId));
        return convertToDto(session);
    }

    @Override
    @Transactional
    public LiveSessionDto createOrActivateSession(Long phaseId, String name) {
        // Stop any currently active phases to activate finals phase
        contestPhaseRepository.findFirstByStatus(com.quiz.enums.PhaseStatus.ACTIVE).ifPresent(ap -> {
            ap.setStatus(com.quiz.enums.PhaseStatus.ENDED);
            contestPhaseRepository.save(ap);
        });

        ContestPhase phase = ContestPhase.builder()
                .name(name != null && !name.isBlank() ? name : "Vòng Chung kết: Bí thư Đoàn cơ sở giỏi 2026")
                .status(com.quiz.enums.PhaseStatus.ACTIVE)
                .startTime(LocalDateTime.now())
                .phaseType("FINALS")
                .mcQuestionCount(10)
                .timeLimitMinutes(10)
                .hasScenarios(true)
                .hasPrediction(false)
                .requireWhitelist(false)
                .build();
        phase = contestPhaseRepository.save(phase);

        LiveSession session = LiveSession.builder()
                .phaseId(phase.getId())
                .name(phase.getName())
                .status("LOBBY")
                .currentRound(1)
                .currentQuestionIndex(0)
                .round1State("IDLE")
                .build();
        LiveSession savedSession = liveSessionRepository.save(session);
        initDefaultQuestionsAndTopics(savedSession.getId());

        LiveSessionDto dto = convertToDto(savedSession);
        broadcast(savedSession.getId(), "SESSION_STATUS_CHANGED", dto);
        return dto;
    }

    private LiveSession createDefaultSession() {
        LiveSession session = LiveSession.builder()
                .phaseId(null)
                .name("Vòng Chung kết Cấp tỉnh 2026 - Bí thư Đoàn cơ sở giỏi")
                .status("LOBBY")
                .currentRound(1)
                .currentQuestionIndex(0)
                .round1State("IDLE")
                .build();
        LiveSession saved = liveSessionRepository.save(session);
        initDefaultQuestionsAndTopics(saved.getId());
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public List<LivePlayerDto> initTop10Players(Long sessionId) {
        List<LivePlayer> existing = livePlayerRepository.findBySessionIdOrderByOrderNumberAsc(sessionId);
        return existing.stream().map(this::convertPlayerToDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LivePlayerDto> getPreliminaryTop10(Long sessionId) {
        // Tìm đợt thi standard gần nhất (phaseType không phải LIVE_ARENA hoặc FINALS)
        List<ContestPhase> phases = contestPhaseRepository.findAllByOrderByCreatedAtDesc();
        ContestPhase latestStandardPhase = phases.stream()
                .filter(p -> p.getPhaseType() == null
                        || (!"LIVE_ARENA".equalsIgnoreCase(p.getPhaseType())
                            && !"FINALS".equalsIgnoreCase(p.getPhaseType())))
                .findFirst()
                .orElse(null);

        List<Exam> leaderboard = Collections.emptyList();
        if (latestStandardPhase != null) {
            log.info("Lấy Top 10 thí sinh từ đợt thi standard gần nhất: ID={}, Tên={}",
                    latestStandardPhase.getId(), latestStandardPhase.getName());
            leaderboard = examRepository.findLeaderboardByPhase(latestStandardPhase.getId());
        }

        // Nếu đợt thi standard gần nhất chưa có bài nộp nào, fallback tìm bài thi của các đợt thi khác
        if (leaderboard.isEmpty()) {
            leaderboard = examRepository.findLeaderboard();
        }

        List<LivePlayerDto> previewList = new ArrayList<>();
        Set<String> seenNames = new HashSet<>();
        Set<Long> seenContestantIds = new HashSet<>();
        int order = 1;

        // Ưu tiên 1: Lấy top từ bảng xếp hạng thi vòng sơ loại của đợt thi standard gần nhất
        for (Exam exam : leaderboard) {
            Contestant c = exam.getContestant();
            if (c != null && !seenContestantIds.contains(c.getId()) && !seenNames.contains(c.getFullName().trim().toLowerCase())) {
                seenContestantIds.add(c.getId());
                seenNames.add(c.getFullName().trim().toLowerCase());

                String avatar = "";
                String email = c.getEmail() != null ? c.getEmail() : "";
                String phone = c.getPhone() != null ? c.getPhone() : "";
                String position = "Bí thư Đoàn cơ sở";

                Optional<EligibleContestant> ecOpt = eligibleContestantRepository.findFirstByRegisteredContestantId(c.getId());
                if (ecOpt.isPresent()) {
                    EligibleContestant ec = ecOpt.get();
                    if (email.isBlank() && ec.getEmail() != null) email = ec.getEmail();
                    if (phone.isBlank() && ec.getPhone() != null) phone = ec.getPhone();
                }

                previewList.add(LivePlayerDto.builder()
                        .sessionId(sessionId)
                        .contestantId(c.getId())
                        .orderNumber(order)
                        .fullName(c.getFullName())
                        .unit(c.getUnit())
                        .position(position)
                        .email(email)
                        .phone(phone)
                        .avatarUrl(avatar)
                        .isCheckedIn(false)
                        .round1Score(BigDecimal.ZERO)
                        .round1TotalTimeMs(0L)
                        .round2Score(BigDecimal.ZERO)
                        .round3Score(BigDecimal.ZERO)
                        .totalScore(BigDecimal.ZERO)
                        .build());
                order++;
                if (order > 10) break;
            }
        }

        // Ưu tiên 2: Nếu chưa đủ 10 người, lấy tiếp từ danh sách 70 thí sinh đủ điều kiện đã duyệt trong cơ sở dữ liệu
        if (previewList.size() < 10) {
            List<EligibleContestant> eligibles = eligibleContestantRepository.findAllByOrderByOrderNumberAsc();
            for (EligibleContestant ec : eligibles) {
                if (order > 10) break;
                String normalizedName = ec.getFullName().trim().toLowerCase();
                if (!seenNames.contains(normalizedName)) {
                    seenNames.add(normalizedName);
                    previewList.add(LivePlayerDto.builder()
                            .sessionId(sessionId)
                            .contestantId(ec.getRegisteredContestantId())
                            .orderNumber(order)
                            .fullName(ec.getFullName())
                            .unit(ec.getUnit())
                            .position("Bí thư Đoàn cơ sở")
                            .email(ec.getEmail() != null ? ec.getEmail() : "")
                            .phone(ec.getPhone() != null ? ec.getPhone() : "")
                            .avatarUrl("")
                            .isCheckedIn(false)
                            .round1Score(BigDecimal.ZERO)
                            .round1TotalTimeMs(0L)
                            .round2Score(BigDecimal.ZERO)
                            .round3Score(BigDecimal.ZERO)
                            .totalScore(BigDecimal.ZERO)
                            .build());
                    order++;
                }
            }
        }

        return previewList;
    }

    @Override
    @Transactional
    public List<LivePlayerDto> importTop10FromPreliminary(Long sessionId) {
        List<LivePlayerDto> preview = getPreliminaryTop10(sessionId);
        return saveTop10Players(sessionId, preview);
    }

    @Override
    @Transactional
    public List<LivePlayerDto> saveTop10Players(Long sessionId, List<LivePlayerDto> dtos) {
        livePlayerRepository.deleteBySessionId(sessionId);
        livePlayerRepository.flush();

        if (dtos == null || dtos.isEmpty()) {
            broadcast(sessionId, "PLAYERS_CONFIGURED", List.of());
            return List.of();
        }

        List<LivePlayer> toSave = new ArrayList<>();
        int order = 1;
        for (LivePlayerDto d : dtos) {
            String fullName = d.getFullName() != null ? d.getFullName().trim() : "";
            String email = d.getEmail() != null ? d.getEmail().trim() : "";
            int playerOrder = d.getOrderNumber() != 0 ? d.getOrderNumber() : order;

            if (email.isBlank()) {
                throw new IllegalArgumentException("Thí sinh SBD " + playerOrder + " (" + (fullName.isBlank() ? "Chưa có tên" : fullName) + ") chưa có địa chỉ Email nhận mã OTP! Email là bắt buộc để đăng nhập vào phòng thi.");
            }
            if (!email.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
                throw new IllegalArgumentException("Địa chỉ Email của thí sinh SBD " + playerOrder + " không đúng định dạng!");
            }

            LivePlayer p = LivePlayer.builder()
                    .sessionId(sessionId)
                    .contestantId(d.getContestantId())
                    .orderNumber(playerOrder)
                    .fullName(fullName)
                    .unit(d.getUnit() != null ? d.getUnit().trim() : "")
                    .position(d.getPosition() != null ? d.getPosition().trim() : "Bí thư Đoàn cơ sở")
                    .email(email.toLowerCase())
                    .phone(d.getPhone() != null ? d.getPhone().trim() : "")
                    .avatarUrl(d.getAvatarUrl() != null ? d.getAvatarUrl().trim() : "")
                    .isCheckedIn(false)
                    .round1Score(BigDecimal.ZERO)
                    .round1TotalTimeMs(0L)
                    .round2Score(BigDecimal.ZERO)
                    .round3Score(BigDecimal.ZERO)
                    .totalScore(BigDecimal.ZERO)
                    .build();
            toSave.add(p);
            order++;
        }

        List<LivePlayer> saved = livePlayerRepository.saveAll(toSave);
        List<LivePlayerDto> res = saved.stream().map(this::convertPlayerToDto).collect(Collectors.toList());
        broadcast(sessionId, "PLAYERS_CONFIGURED", res);
        LiveSession session = getSessionEntity(sessionId);
        broadcast(sessionId, "SESSION_STATUS_CHANGED", convertToDto(session));
        return res;
    }

    @Override
    @Transactional
    public void requestPlayerOtp(Long sessionId, String email) {
        requestPlayerOtp(sessionId, null, email);
    }

    @Override
    @Transactional
    public void requestPlayerOtp(Long sessionId, Long playerId, String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập địa chỉ email hợp lệ!");
        }
        String normalizedEmail = email.trim().toLowerCase();
        LivePlayer player = null;

        if (playerId != null) {
            player = livePlayerRepository.findById(playerId).orElse(null);
            if (player != null) {
                // Link/update candidate's email so they can receive OTP directly
                if (player.getEmail() == null || player.getEmail().isBlank() || !player.getEmail().trim().equalsIgnoreCase(normalizedEmail)) {
                    player.setEmail(normalizedEmail);
                    livePlayerRepository.save(player);
                }
            }
        }

        if (player == null) {
            player = livePlayerRepository.findFirstBySessionIdAndEmailIgnoreCase(sessionId, normalizedEmail)
                    .orElseThrow(() -> new IllegalArgumentException("Email " + email + " không thuộc danh sách 10 thí sinh Vòng Chung kết!"));
        }

        com.quiz.dto.request.RequestOtpRequest otpReq = new com.quiz.dto.request.RequestOtpRequest();
        otpReq.setEmail(normalizedEmail);
        emailOtpService.requestOtp(otpReq);
    }

    @Override
    @Transactional
    public LivePlayerDto verifyPlayerOtp(Long sessionId, String email, String otp) {
        return verifyPlayerOtp(sessionId, null, email, otp, null);
    }

    @Override
    @Transactional
    public LivePlayerDto verifyPlayerOtp(Long sessionId, Long playerId, String email, String otp) {
        return verifyPlayerOtp(sessionId, playerId, email, otp, null);
    }

    @Override
    @Transactional
    public LivePlayerDto verifyPlayerOtp(Long sessionId, Long playerId, String email, String otp, String deviceId) {
        String normalizedEmail = email != null ? email.trim().toLowerCase() : "";
        LivePlayer player = null;

        if (playerId != null) {
            player = livePlayerRepository.findById(playerId).orElse(null);
        }
        if (player == null && !normalizedEmail.isBlank()) {
            player = livePlayerRepository.findFirstBySessionIdAndEmailIgnoreCase(sessionId, normalizedEmail)
                    .orElse(null);
        }
        if (player == null) {
            throw new IllegalArgumentException("Không tìm thấy thông tin thí sinh để xác thực!");
        }

        if (Boolean.TRUE.equals(player.getIsCheckedIn())) {
            if (deviceId != null && player.getDeviceId() != null && !player.getDeviceId().equals(deviceId)) {
                throw new IllegalStateException("Thí sinh này đã đăng nhập vào phòng thi trên một thiết bị khác! Để đảm bảo tính công bằng, mỗi thí sinh chỉ được sử dụng duy nhất 1 thiết bị.");
            }
        }

        // Verify OTP via EmailOtpService
        String targetEmail = !normalizedEmail.isBlank() ? normalizedEmail : player.getEmail();
        com.quiz.dto.request.VerifyOtpRequest verifyReq = new com.quiz.dto.request.VerifyOtpRequest();
        verifyReq.setEmail(targetEmail);
        verifyReq.setOtp(otp);

        try {
            emailOtpService.verifyOtp(verifyReq);
        } catch (Exception ex) {
            // Also try candidate's stored email if different (e.g. support OTP issued by Admin)
            if (player.getEmail() != null && !player.getEmail().isBlank() && !player.getEmail().equalsIgnoreCase(targetEmail)) {
                verifyReq.setEmail(player.getEmail().toLowerCase());
                emailOtpService.verifyOtp(verifyReq);
            } else {
                throw ex;
            }
        }

        player.setIsCheckedIn(true);
        if (deviceId != null && !deviceId.isBlank()) {
            player.setDeviceId(deviceId);
        }
        player.setCheckedInAt(LocalDateTime.now());
        player.setIsRescueRequested(false);
        LivePlayer saved = livePlayerRepository.save(player);
        LivePlayerDto dto = convertPlayerToDto(saved);
        broadcast(sessionId, "PLAYER_CHECKED_IN", dto);
        return dto;
    }

    @Override
    @Transactional
    public String generateSupportOtpForPlayer(Long playerId) {
        LivePlayer player = livePlayerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh: " + playerId));

        String email = player.getEmail();
        if (email == null || email.isBlank()) {
            email = "finalist" + player.getOrderNumber() + "@tinhdoan.nghean.gov.vn";
            player.setEmail(email);
            livePlayerRepository.save(player);
        }

        com.quiz.dto.response.AdminGenerateOtpResponse resp = emailOtpService.generateAdminSupportOtp(email);
        return resp.getOtpCode();
    }

    @Override
    @Transactional
    public LivePlayerDto bypassCheckIn(Long playerId) {
        LivePlayer player = livePlayerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh: " + playerId));

        player.setIsCheckedIn(true);
        player.setCheckedInAt(LocalDateTime.now());
        player.setIsRescueRequested(false);
        LivePlayer saved = livePlayerRepository.save(player);
        LivePlayerDto dto = convertPlayerToDto(saved);
        broadcast(saved.getSessionId(), "PLAYER_CHECKED_IN", dto);
        return dto;
    }

    @Override
    @Transactional
    public LivePlayerDto requestRescue(Long playerId) {
        return requestRescue(playerId, null);
    }

    @Override
    @Transactional
    public LivePlayerDto requestRescue(Long playerId, String deviceId) {
        LivePlayer player = livePlayerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh: " + playerId));
        player.setIsRescueRequested(true);
        if (deviceId != null && !deviceId.isBlank()) {
            player.setDeviceId(deviceId);
        }
        LivePlayer saved = livePlayerRepository.save(player);
        LivePlayerDto dto = convertPlayerToDto(saved);
        broadcast(saved.getSessionId(), "RESCUE_REQUESTED", dto);
        return dto;
    }

    @Override
    @Transactional
    public LivePlayerDto updatePlayerAvatar(Long playerId, String avatarUrl) {
        LivePlayer player = livePlayerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh: " + playerId));
        player.setAvatarUrl(avatarUrl);
        LivePlayer saved = livePlayerRepository.save(player);
        LivePlayerDto dto = convertPlayerToDto(saved);
        broadcast(saved.getSessionId(), "PLAYER_UPDATED", dto);
        return dto;
    }

    @Override
    @Transactional
    public LivePlayerDto resetPlayerCheckIn(Long playerId) {
        return resetPlayerCheckIn(playerId, null);
    }

    @Override
    @Transactional
    public LivePlayerDto resetPlayerCheckIn(Long playerId, String deviceId) {
        LivePlayer player = livePlayerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh: " + playerId));
        if (deviceId != null && player.getDeviceId() != null && !player.getDeviceId().equals(deviceId)) {
            log.warn("Thiết bị {} cố gắng giải phóng thí sinh {} thuộc về thiết bị {}", deviceId, playerId, player.getDeviceId());
            throw new IllegalStateException("Bạn không thể giải phóng thí sinh này từ một thiết bị khác!");
        }
        player.setIsCheckedIn(false);
        player.setDeviceId(null);
        player.setCheckedInAt(null);
        player.setIsRescueRequested(false);
        LivePlayer saved = livePlayerRepository.save(player);
        LivePlayerDto dto = convertPlayerToDto(saved);
        broadcast(saved.getSessionId(), "PLAYER_CHECKED_IN", dto);
        return dto;
    }

    @Override
    @Transactional
    public List<LiveQuestion> getQuestions(Long sessionId) {
        initDefaultQuestionsAndTopics(sessionId);
        return liveQuestionRepository.findBySessionIdOrderByQuestionOrderAsc(sessionId);
    }

    @Override
    @Transactional
    public List<LiveQuestion> saveQuestions(Long sessionId, List<LiveQuestion> questions) {
        List<LiveQuestion> existing = liveQuestionRepository.findBySessionIdOrderByQuestionOrderAsc(sessionId);
        if (!existing.isEmpty()) {
            liveQuestionRepository.deleteAll(existing);
            liveQuestionRepository.flush();
        }

        List<LiveQuestion> toSave = new ArrayList<>();
        int order = 1;
        for (LiveQuestion q : questions) {
            LiveQuestion newQ = LiveQuestion.builder()
                    .sessionId(sessionId)
                    .questionOrder(order++)
                    .title(q.getTitle())
                    .videoUrl(q.getVideoUrl() != null ? q.getVideoUrl() : "")
                    .videoType(q.getVideoType() != null ? q.getVideoType() : "NONE")
                    .optionA(q.getOptionA())
                    .optionB(q.getOptionB())
                    .optionC(q.getOptionC())
                    .optionD(q.getOptionD())
                    .correctOption(q.getCorrectOption() != null ? q.getCorrectOption().toUpperCase() : "A")
                    .explanation(q.getExplanation() != null ? q.getExplanation() : "")
                    .timeLimitSeconds(q.getTimeLimitSeconds() != null && q.getTimeLimitSeconds() > 0 ? q.getTimeLimitSeconds() : 40)
                    .build();
            toSave.add(newQ);
        }
        return liveQuestionRepository.saveAll(toSave);
    }

    @Override
    @Transactional
    public List<LiveRound2Topic> saveRound2Topics(Long sessionId, List<LiveRound2Topic> topics) {
        List<LiveRound2Topic> existing = liveRound2TopicRepository.findBySessionIdOrderByCodeAsc(sessionId);
        if (!existing.isEmpty()) {
            liveRound2TopicRepository.deleteAll(existing);
            liveRound2TopicRepository.flush();
        }

        List<LiveRound2Topic> toSave = new ArrayList<>();
        for (LiveRound2Topic t : topics) {
            LiveRound2Topic newT = LiveRound2Topic.builder()
                    .sessionId(sessionId)
                    .code(t.getCode())
                    .scenario1(t.getScenario1())
                    .scenario2(t.getScenario2())
                    .maxScore1(t.getMaxScore1() != null ? t.getMaxScore1() : BigDecimal.valueOf(20.0))
                    .maxScore2(t.getMaxScore2() != null ? t.getMaxScore2() : BigDecimal.valueOf(20.0))
                    .build();
            toSave.add(newT);
        }
        return liveRound2TopicRepository.saveAll(toSave);
    }

    @Override
    @Transactional
    public LivePlayerDto checkInPlayer(Long sessionId, Long playerId) {
        LivePlayer player = livePlayerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh: " + playerId));
        player.setIsCheckedIn(true);
        player.setCheckedInAt(LocalDateTime.now());
        player.setIsRescueRequested(false);
        LivePlayer saved = livePlayerRepository.save(player);
        LivePlayerDto dto = convertPlayerToDto(saved);
        broadcast(sessionId, "PLAYER_CHECKED_IN", dto);
        return dto;
    }

    // ==========================================
    // VÒNG 1: THÔNG THÁI (4 NHỊP ĐIỀU HÀNH)
    // ==========================================

    @Override
    @Transactional
    public void startHopeStarCountdown(Long sessionId, Integer questionOrder) {
        LiveSession session = getSessionEntity(sessionId);
        session.setCurrentRound(1);
        session.setCurrentQuestionIndex(questionOrder);
        session.setRound1State("HOPE_STAR_5S");
        liveSessionRepository.save(session);

        Map<String, Object> payload = Map.of(
                "questionOrder", questionOrder,
                "timeLimitSeconds", 5,
                "state", "HOPE_STAR_5S"
        );
        broadcast(sessionId, "HOPE_STAR_STARTED", payload);

        // Hết 5s NSHV: Dự phòng máy chủ tự động chuyển sang đọc câu hỏi (sau 6s)
        scheduler.schedule(() -> {
            try {
                LiveSession s = liveSessionRepository.findById(sessionId).orElse(null);
                if (s != null && "HOPE_STAR_5S".equalsIgnoreCase(s.getRound1State()) && Integer.valueOf(questionOrder).equals(s.getCurrentQuestionIndex())) {
                    log.info("⭐ Hết 5s NSHV: Tự động chuyển sang đọc câu hỏi cho phiên {} câu {}", sessionId, questionOrder);
                    setQuestionReading(sessionId, questionOrder);
                }
            } catch (Exception ex) {
                log.error("Lỗi khi tự động chuyển đọc câu hỏi sau 5s NSHV cho phiên {} câu {}", sessionId, questionOrder, ex);
            }
        }, 6, java.util.concurrent.TimeUnit.SECONDS);
    }

    @Override
    @Transactional
    public boolean activateHopeStar(Long sessionId, Long playerId, Integer questionOrder, String deviceId) {
        LiveSession session = getSessionEntity(sessionId);
        // Chống gian lận: Chỉ cho phép đặt Ngôi sao hy vọng trong đúng nhịp 5 giây đầu tiên của câu hỏi hiện tại
        if (!"HOPE_STAR_5S".equalsIgnoreCase(session.getRound1State()) || !Integer.valueOf(questionOrder).equals(session.getCurrentQuestionIndex())) {
            log.warn("Từ chối kích hoạt NSHV: Phiên thi {} đang ở trạng thái {} câu {}, không phải HOPE_STAR_5S câu {}",
                    sessionId, session.getRound1State(), session.getCurrentQuestionIndex(), questionOrder);
            return false;
        }

        LivePlayer player = livePlayerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh: " + playerId));

        // Kiểm tra tính hợp lệ của thí sinh trong phiên thi
        if (!sessionId.equals(player.getSessionId())) {
            log.warn("Thí sinh ID {} không thuộc phiên thi ID {}", playerId, sessionId);
            return false;
        }

        // Kiểm tra ràng buộc thiết bị
        if (player.getDeviceId() != null) {
            if (deviceId == null || !player.getDeviceId().equals(deviceId.trim())) {
                log.warn("Thiết bị {} không khớp với thiết bị đã đăng ký {} của thí sinh ID {}",
                        deviceId, player.getDeviceId(), playerId);
                return false;
            }
        }

        if (Boolean.TRUE.equals(player.getHopeStarUsed())) {
            log.warn("Thí sinh {} đã sử dụng Ngôi sao hy vọng trước đó", player.getFullName());
            return false;
        }

        player.setHopeStarUsed(true);
        player.setHopeStarQuestionIndex(questionOrder);
        livePlayerRepository.save(player);

        Map<String, Object> payload = Map.of(
                "playerId", playerId,
                "orderNumber", player.getOrderNumber(),
                "fullName", player.getFullName(),
                "questionOrder", questionOrder
        );
        broadcast(sessionId, "HOPE_STAR_ACTIVATED", payload);
        return true;
    }

    @Override
    @Transactional
    public void setVideoPlaying(Long sessionId, Integer questionOrder) {
        LiveSession session = getSessionEntity(sessionId);
        session.setCurrentRound(1);
        session.setCurrentQuestionIndex(questionOrder);
        session.setRound1State("VIDEO_PLAYING");
        liveSessionRepository.save(session);

        LiveQuestion question = liveQuestionRepository.findBySessionIdAndQuestionOrder(sessionId, questionOrder)
                .orElse(null);

        Map<String, Object> payload = new HashMap<>();
        payload.put("questionOrder", questionOrder);
        payload.put("state", "VIDEO_PLAYING");
        if (question != null) {
            payload.put("videoUrl", question.getVideoUrl());
            payload.put("videoType", question.getVideoType());
            payload.put("title", question.getTitle());
        }
        broadcast(sessionId, "VIDEO_PLAYING", payload);
    }

    @Override
    @Transactional
    public void setQuestionReading(Long sessionId, Integer questionOrder) {
        LiveSession session = getSessionEntity(sessionId);
        session.setCurrentRound(1);
        session.setCurrentQuestionIndex(questionOrder);
        session.setRound1State("QUESTION_READING");
        liveSessionRepository.save(session);

        LiveQuestion question = liveQuestionRepository.findBySessionIdAndQuestionOrder(sessionId, questionOrder)
                .orElse(null);
        if (question == null) {
            initDefaultQuestionsAndTopics(sessionId);
            question = liveQuestionRepository.findBySessionIdAndQuestionOrder(sessionId, questionOrder)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy câu hỏi số " + questionOrder));
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("questionOrder", questionOrder);
        payload.put("state", "QUESTION_READING");
        // Không gửi nội dung câu hỏi trong broadcast QUESTION_READING: Thí sinh chỉ nhận câu hỏi & 4 đáp án khi Admin bắt đầu tính giờ 40s
        broadcast(sessionId, "QUESTION_READING", payload);
    }

    @Override
    @Transactional
    public void startQuestionTimer(Long sessionId, Integer questionOrder) {
        LiveSession session = getSessionEntity(sessionId);
        session.setCurrentRound(1);
        session.setCurrentQuestionIndex(questionOrder);
        session.setRound1State("QUESTION_40S");
        liveSessionRepository.save(session);

        long now = System.currentTimeMillis();
        questionStartTimes.put(sessionId + ":" + questionOrder, now);

        LiveQuestion question = liveQuestionRepository.findBySessionIdAndQuestionOrder(sessionId, questionOrder)
                .orElse(null);
        if (question == null) {
            initDefaultQuestionsAndTopics(sessionId);
            question = liveQuestionRepository.findBySessionIdAndQuestionOrder(sessionId, questionOrder)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy câu hỏi số " + questionOrder));
        }

        // Chụp lại thứ hạng hiện tại trước khi bắt đầu câu hỏi mới để làm mốc tính delta (+ / - / 0)
        List<LivePlayer> currentRanked = livePlayerRepository.findBySessionIdOrderByOrderNumberAsc(sessionId).stream()
                .sorted(Comparator
                        .comparing((LivePlayer p) -> p.getTotalScore() != null ? p.getTotalScore() : BigDecimal.ZERO, Comparator.reverseOrder())
                        .thenComparing((LivePlayer p) -> Boolean.TRUE.equals(p.getIsCheckedIn()) ? 1 : 0, Comparator.reverseOrder())
                        .thenComparingLong(p -> p.getRound1TotalTimeMs() != null ? p.getRound1TotalTimeMs() : Long.MAX_VALUE)
                        .thenComparingInt(p -> p.getOrderNumber() != null ? p.getOrderNumber() : 999))
                .collect(Collectors.toList());
        int rankIdx = 1;
        for (LivePlayer p : currentRanked) {
            previousRanks.put(p.getId(), rankIdx++);
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("questionOrder", questionOrder);
        payload.put("questionId", question.getId());
        payload.put("state", "QUESTION_40S");
        payload.put("timeLimitSeconds", question.getTimeLimitSeconds());
        payload.put("startedAt", now);
        payload.put("question", convertQuestionToDto(question, false));
        broadcast(sessionId, "QUESTION_STARTED", payload);

        // Tự động chốt kết quả và công bố đáp án trên máy chủ khi hết giờ (thời gian làm bài + 1s)
        final int limit = question.getTimeLimitSeconds() != null && question.getTimeLimitSeconds() > 0 ? question.getTimeLimitSeconds() : 40;
        scheduler.schedule(() -> {
            try {
                LiveSession s = liveSessionRepository.findById(sessionId).orElse(null);
                if (s != null && "QUESTION_40S".equalsIgnoreCase(s.getRound1State()) && Integer.valueOf(questionOrder).equals(s.getCurrentQuestionIndex())) {
                    log.info("⏰ Hết {}s: Tự động công bố đáp án cho phiên thi {} câu hỏi {}", limit, sessionId, questionOrder);
                    revealAnswer(sessionId, questionOrder);
                }
            } catch (Exception ex) {
                log.error("Lỗi khi tự động công bố đáp án phiên thi {} câu hỏi {}", sessionId, questionOrder, ex);
            }
        }, limit + 1, java.util.concurrent.TimeUnit.SECONDS);
    }

    @Override
    @Transactional
    public void submitAnswer(LiveAnswerSubmissionDto submission) {
        Long sessionId = submission.getSessionId();
        Long questionId = submission.getQuestionId();
        Long playerId = submission.getPlayerId();

        LiveSession session = getSessionEntity(sessionId);
        LiveQuestion question = liveQuestionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy câu hỏi: " + questionId));
        LivePlayer player = livePlayerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh: " + playerId));

        // Bảo mật: Đảm bảo câu hỏi và thí sinh đều thuộc đúng phiên thi
        if (!question.getSessionId().equals(sessionId) || !player.getSessionId().equals(sessionId)) {
            log.warn("Dữ liệu nộp bài không hợp lệ: Session {} không khớp câu hỏi {} hoặc thí sinh {}",
                    sessionId, question.getSessionId(), player.getSessionId());
            throw new IllegalArgumentException("Dữ liệu nộp bài không thuộc phiên thi hiện tại!");
        }

        // Chống gian lận: Chỉ chấp nhận nộp bài khi phiên thi đang ở đúng nhịp QUESTION_40S và đúng câu hỏi hiện tại
        if (!"QUESTION_40S".equalsIgnoreCase(session.getRound1State())
                || !Integer.valueOf(question.getQuestionOrder()).equals(session.getCurrentQuestionIndex())) {
            log.warn("Từ chối nộp bài: Phiên thi {} đang ở trạng thái {} câu {}, không thể nộp cho câu {}",
                    sessionId, session.getRound1State(), session.getCurrentQuestionIndex(), question.getQuestionOrder());
            return;
        }

        // Kiểm tra xem thí sinh đã nộp câu trả lời cho câu hỏi này chưa. Nếu đã nộp rồi thì từ chối nộp lại (chống F5 đổi đáp án)
        Optional<LivePlayerAnswer> existingOpt = livePlayerAnswerRepository
                .findBySessionIdAndQuestionIdAndPlayerId(sessionId, questionId, playerId);
        if (existingOpt.isPresent()) {
            log.warn("Thí sinh ID {} đã nộp đáp án cho câu hỏi ID {} trước đó, từ chối nộp lại!", playerId, questionId);
            return;
        }

        // Kiểm tra thiết bị nộp bài: Bắt buộc thiết bị phải trùng khớp với thiết bị đã đăng nhập của thí sinh
        if (player.getDeviceId() != null) {
            if (submission.getDeviceId() == null || !player.getDeviceId().equals(submission.getDeviceId().trim())) {
                log.warn("Thiết bị nộp {} không khớp với thiết bị đã đăng ký {} của thí sinh ID {}",
                        submission.getDeviceId(), player.getDeviceId(), playerId);
                throw new IllegalStateException("Thiết bị không được phép thao tác nộp bài cho thí sinh này!");
            }
        }

        // Tính thời gian trả lời thực tế (ms) từ mốc server bắt đầu phát lệnh đếm ngược 40s
        Long startTime = questionStartTimes.get(sessionId + ":" + question.getQuestionOrder());
        if (startTime == null) {
            log.warn("Không tìm thấy mốc thời gian bắt đầu câu hỏi {} phiên {}", question.getQuestionOrder(), sessionId);
            startTime = System.currentTimeMillis() - 5000L;
        }
        long elapsedMs = Math.max(100L, System.currentTimeMillis() - startTime);

        // Giới hạn thời gian: Cho phép độ trễ mạng tối đa 1500ms (40s + 1.5s = 41.5s)
        final int limitSeconds = question.getTimeLimitSeconds() != null && question.getTimeLimitSeconds() > 0 ? question.getTimeLimitSeconds() : 40;
        final long maxAllowedMs = (limitSeconds * 1000L) + 1500L;
        if (elapsedMs > maxAllowedMs) {
            log.warn("Thí sinh ID {} nộp bài muộn ({}ms > {}ms cho phép), câu trả lời không được tính điểm!", playerId, elapsedMs, maxAllowedMs);
            return;
        }

        // Kiểm tra xem thí sinh có dùng Ngôi sao hi vọng cho câu này không
        boolean hasHopeStar = Boolean.TRUE.equals(player.getHopeStarUsed())
                && Integer.valueOf(question.getQuestionOrder()).equals(player.getHopeStarQuestionIndex());

        // Kiểm tra đúng sai: hỗ trợ cả so khớp mã A/B/C/D và so khớp nội dung đáp án (tránh lệch khi xáo trộn)
        String correct = question.getCorrectOption() != null ? question.getCorrectOption().trim() : "";
        String selected = submission.getSelectedOption() != null ? submission.getSelectedOption().trim() : "";

        String correctText = getOptionTextByKeyOrContent(question, correct);
        String selectedText = getOptionTextByKeyOrContent(question, selected);

        boolean isCorrect = correct.equalsIgnoreCase(selected)
                || (!correctText.isEmpty() && correctText.equalsIgnoreCase(selectedText));

        // Tính điểm suy giảm theo thời gian:
        // 1-10s: 5đ; 11-30s: 3đ; 31-40s: 2đ.
        // NSHV: Đúng x2 điểm, Sai -2 điểm.
        BigDecimal scoreAwarded = BigDecimal.ZERO;
        if (isCorrect) {
            BigDecimal base;
            if (elapsedMs <= 10000L) {
                base = BigDecimal.valueOf(5.0);
            } else if (elapsedMs <= 30000L) {
                base = BigDecimal.valueOf(3.0);
            } else if (elapsedMs <= 40000L) {
                base = BigDecimal.valueOf(2.0);
            } else {
                base = BigDecimal.ZERO;
            }
            scoreAwarded = hasHopeStar ? base.multiply(BigDecimal.valueOf(2)) : base;
        } else {
            scoreAwarded = hasHopeStar ? BigDecimal.valueOf(-2.0) : BigDecimal.ZERO;
        }

        // Lưu câu trả lời
        LivePlayerAnswer answer = livePlayerAnswerRepository
                .findBySessionIdAndQuestionIdAndPlayerId(sessionId, questionId, playerId)
                .orElse(LivePlayerAnswer.builder()
                        .sessionId(sessionId)
                        .questionId(questionId)
                        .playerId(playerId)
                        .build());

        answer.setSelectedOption(submission.getSelectedOption());
        answer.setShuffledOrder(submission.getShuffledOrder() != null ? submission.getShuffledOrder() : "A,B,C,D");
        answer.setHasHopeStar(hasHopeStar);
        answer.setIsCorrect(isCorrect);
        answer.setResponseTimeMs(elapsedMs);
        answer.setScoreAwarded(scoreAwarded);
        answer.setServerReceivedAt(LocalDateTime.now());
        livePlayerAnswerRepository.save(answer);

        // Cập nhật lại tổng điểm Vòng 1 của thí sinh
        List<LivePlayerAnswer> allAnswers = livePlayerAnswerRepository.findBySessionIdAndPlayerIdOrderByQuestionIdAsc(sessionId, playerId);
        BigDecimal totalR1 = allAnswers.stream()
                .map(LivePlayerAnswer::getScoreAwarded)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalTimeR1 = allAnswers.stream()
                .mapToLong(LivePlayerAnswer::getResponseTimeMs)
                .sum();

        player.setRound1Score(totalR1);
        player.setRound1TotalTimeMs(totalTimeR1);
        player.setTotalScore(totalR1.add(player.getRound2Score()).add(player.getRound3Score()));
        livePlayerRepository.save(player);

        // Phát tín hiệu xác nhận đã nộp bài (không lộ đáp án đúng/sai ngay lập tức)
        Map<String, Object> payload = Map.of(
                "playerId", playerId,
                "orderNumber", player.getOrderNumber(),
                "fullName", player.getFullName(),
                "responseTimeMs", elapsedMs,
                "hasAnswered", true
        );
        broadcast(sessionId, "PLAYER_ANSWERED", payload);
    }

    @Override
    @Transactional
    public LiveSessionDto revealAnswer(Long sessionId, Integer questionOrder) {
        LiveSession session = getSessionEntity(sessionId);
        session.setRound1State("ANSWER_REVEALED");
        liveSessionRepository.save(session);

        LiveQuestion question = liveQuestionRepository.findBySessionIdAndQuestionOrder(sessionId, questionOrder)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy câu hỏi: " + questionOrder));

        // Thể lệ thi đấu: Xử lý trừ 2 điểm đối với thí sinh đã đặt Ngôi sao hy vọng nhưng không kịp trả lời (hết giờ)
        List<LivePlayer> sessionPlayers = livePlayerRepository.findBySessionIdOrderByOrderNumberAsc(sessionId);
        for (LivePlayer p : sessionPlayers) {
            if (Boolean.TRUE.equals(p.getHopeStarUsed()) && Integer.valueOf(questionOrder).equals(p.getHopeStarQuestionIndex())) {
                Optional<LivePlayerAnswer> existingAns = livePlayerAnswerRepository
                        .findBySessionIdAndQuestionIdAndPlayerId(sessionId, question.getId(), p.getId());
                if (existingAns.isEmpty()) {
                    // Thí sinh đặt Ngôi sao hy vọng nhưng không trả lời -> tính sai, bị trừ 2.0 điểm
                    LivePlayerAnswer timeoutAnswer = LivePlayerAnswer.builder()
                            .sessionId(sessionId)
                            .questionId(question.getId())
                            .playerId(p.getId())
                            .selectedOption("")
                            .shuffledOrder("A,B,C,D")
                            .hasHopeStar(true)
                            .isCorrect(false)
                            .responseTimeMs(40000L)
                            .scoreAwarded(BigDecimal.valueOf(-2.0))
                            .serverReceivedAt(LocalDateTime.now())
                            .build();
                    livePlayerAnswerRepository.save(timeoutAnswer);

                    // Cập nhật lại điểm Vòng 1 cho thí sinh này
                    List<LivePlayerAnswer> pAnsList = livePlayerAnswerRepository.findBySessionIdAndPlayerIdOrderByQuestionIdAsc(sessionId, p.getId());
                    BigDecimal totalR1 = pAnsList.stream().map(LivePlayerAnswer::getScoreAwarded).reduce(BigDecimal.ZERO, BigDecimal::add);
                    long totalTimeR1 = pAnsList.stream().mapToLong(LivePlayerAnswer::getResponseTimeMs).sum();
                    p.setRound1Score(totalR1);
                    p.setRound1TotalTimeMs(totalTimeR1);
                    p.setTotalScore(totalR1.add(p.getRound2Score() != null ? p.getRound2Score() : BigDecimal.ZERO).add(p.getRound3Score() != null ? p.getRound3Score() : BigDecimal.ZERO));
                    livePlayerRepository.save(p);
                }
            }
        }

        List<LivePlayerAnswer> answers = livePlayerAnswerRepository.findBySessionIdAndQuestionId(sessionId, question.getId());

        long countA = answers.stream().filter(a -> {
            String sel = a.getSelectedOption() != null ? a.getSelectedOption().trim() : "";
            return "A".equalsIgnoreCase(sel) || (question.getOptionA() != null && question.getOptionA().trim().equalsIgnoreCase(sel));
        }).count();
        long countB = answers.stream().filter(a -> {
            String sel = a.getSelectedOption() != null ? a.getSelectedOption().trim() : "";
            return "B".equalsIgnoreCase(sel) || (question.getOptionB() != null && question.getOptionB().trim().equalsIgnoreCase(sel));
        }).count();
        long countC = answers.stream().filter(a -> {
            String sel = a.getSelectedOption() != null ? a.getSelectedOption().trim() : "";
            return "C".equalsIgnoreCase(sel) || (question.getOptionC() != null && question.getOptionC().trim().equalsIgnoreCase(sel));
        }).count();
        long countD = answers.stream().filter(a -> {
            String sel = a.getSelectedOption() != null ? a.getSelectedOption().trim() : "";
            return "D".equalsIgnoreCase(sel) || (question.getOptionD() != null && question.getOptionD().trim().equalsIgnoreCase(sel));
        }).count();
        long countCorrect = answers.stream().filter(a -> Boolean.TRUE.equals(a.getIsCorrect())).count();

        Map<String, Object> stats = Map.of(
                "totalAnswered", answers.size(),
                "countA", countA,
                "countB", countB,
                "countC", countC,
                "countD", countD,
                "countCorrect", countCorrect
        );

        // Lấy bảng xếp hạng Vòng 1 tích lũy mới nhất:
        // 1. Tổng điểm giảm dần
        // 2. Đã điểm danh (có thi) xếp trước
        // 3. Thời gian trả lời V1 tăng dần
        // 4. Số báo danh (SBD) tăng dần
        List<LivePlayer> allPlayers = livePlayerRepository.findBySessionIdOrderByOrderNumberAsc(sessionId);
        List<LivePlayer> ranked = allPlayers.stream()
                .sorted(Comparator
                        .comparing((LivePlayer p) -> p.getTotalScore() != null ? p.getTotalScore() : BigDecimal.ZERO, Comparator.reverseOrder())
                        .thenComparing((LivePlayer p) -> Boolean.TRUE.equals(p.getIsCheckedIn()) ? 1 : 0, Comparator.reverseOrder())
                        .thenComparingLong(p -> p.getRound1TotalTimeMs() != null ? p.getRound1TotalTimeMs() : Long.MAX_VALUE)
                        .thenComparingInt(p -> p.getOrderNumber() != null ? p.getOrderNumber() : 999))
                .collect(Collectors.toList());
        List<LiveQuestion> allSessionQuestions = liveQuestionRepository.findBySessionIdOrderByQuestionOrderAsc(sessionId);
        Map<Long, Integer> questionOrderMap = allSessionQuestions.stream()
                .collect(Collectors.toMap(LiveQuestion::getId, LiveQuestion::getQuestionOrder, (k1, k2) -> k1));
        List<LivePlayerAnswer> allSessionAnswers = livePlayerAnswerRepository.findBySessionId(sessionId);
        Map<Long, List<LivePlayerAnswer>> playerAnswersMap = allSessionAnswers.stream()
                .collect(Collectors.groupingBy(LivePlayerAnswer::getPlayerId));

        List<LivePlayerDto> leaderboard = new ArrayList<>();
        int currentRank = 1;
        for (LivePlayer p : ranked) {
            int oldRank = previousRanks.getOrDefault(p.getId(), currentRank);
            int delta = oldRank - currentRank;
            // Không ghi đè previousRanks ngay tại revealAnswer để khi chuyển sang showLeaderboard vẫn giữ nguyên delta
            p.setFinalRank(currentRank);
            livePlayerRepository.save(p);

            LivePlayerDto pdto = convertPlayerToDto(p, playerAnswersMap.get(p.getId()), questionOrderMap, session);
            pdto.setRankDelta(delta);
            leaderboard.add(pdto);
            currentRank++;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("questionOrder", questionOrder);
        payload.put("questionId", question.getId());
        payload.put("correctOption", question.getCorrectOption());
        payload.put("explanation", question.getExplanation() != null ? question.getExplanation() : "");
        payload.put("stats", stats);
        payload.put("answers", answers.stream().map(a -> Map.of(
                "playerId", a.getPlayerId(),
                "selectedOption", a.getSelectedOption() != null ? a.getSelectedOption() : "",
                "isCorrect", Boolean.TRUE.equals(a.getIsCorrect()),
                "hasHopeStar", Boolean.TRUE.equals(a.getHasHopeStar()),
                "responseTimeMs", a.getResponseTimeMs(),
                "scoreAwarded", a.getScoreAwarded()
        )).collect(Collectors.toList()));
        payload.put("leaderboard", leaderboard);

        broadcast(sessionId, "ANSWER_REVEALED", payload);
        return convertToDto(session);
    }

    @Override
    @Transactional
    public LiveSessionDto showLeaderboard(Long sessionId) {
        LiveSession session = getSessionEntity(sessionId);
        session.setRound1State("LEADERBOARD");
        liveSessionRepository.save(session);

        // Lấy danh sách sắp xếp:
        // 1. Điểm tổng giảm dần
        // 2. Đã điểm danh (có thi) xếp trước
        // 3. Thời gian V1 tăng dần
        // 4. Số báo danh (SBD) tăng dần
        List<LivePlayer> allPlayers = livePlayerRepository.findBySessionIdOrderByOrderNumberAsc(sessionId);
        List<LivePlayer> ranked = allPlayers.stream()
                .sorted(Comparator
                        .comparing((LivePlayer p) -> p.getTotalScore() != null ? p.getTotalScore() : BigDecimal.ZERO, Comparator.reverseOrder())
                        .thenComparing((LivePlayer p) -> Boolean.TRUE.equals(p.getIsCheckedIn()) ? 1 : 0, Comparator.reverseOrder())
                        .thenComparingLong(p -> p.getRound1TotalTimeMs() != null ? p.getRound1TotalTimeMs() : Long.MAX_VALUE)
                        .thenComparingInt(p -> p.getOrderNumber() != null ? p.getOrderNumber() : 999))
                .collect(Collectors.toList());

        List<LiveQuestion> allSessionQuestions = liveQuestionRepository.findBySessionIdOrderByQuestionOrderAsc(sessionId);
        Map<Long, Integer> questionOrderMap = allSessionQuestions.stream()
                .collect(Collectors.toMap(LiveQuestion::getId, LiveQuestion::getQuestionOrder, (k1, k2) -> k1));
        List<LivePlayerAnswer> allSessionAnswers = livePlayerAnswerRepository.findBySessionId(sessionId);
        Map<Long, List<LivePlayerAnswer>> playerAnswersMap = allSessionAnswers.stream()
                .collect(Collectors.groupingBy(LivePlayerAnswer::getPlayerId));

        List<LivePlayerDto> dtoList = new ArrayList<>();
        int currentRank = 1;
        for (LivePlayer p : ranked) {
            int oldRank = previousRanks.getOrDefault(p.getId(), currentRank);
            int delta = oldRank - currentRank; // > 0: thăng hạng, < 0: tụt hạng, 0: giữ nguyên
            // Giữ lại previousRanks để trên màn hình Leaderboard vẫn thấy hiệu ứng delta chuyển đổi từ câu vừa rồi
            p.setFinalRank(currentRank);
            LivePlayer saved = livePlayerRepository.save(p);

            LivePlayerDto pdto = convertPlayerToDto(saved, playerAnswersMap.get(saved.getId()), questionOrderMap, session);
            pdto.setRankDelta(delta);
            dtoList.add(pdto);
            currentRank++;
        }

        Map<String, Object> payload = Map.of(
                "sessionId", sessionId,
                "leaderboard", dtoList
        );
        broadcast(sessionId, "LEADERBOARD_UPDATED", payload);
        return convertToDto(session);
    }

    @Override
    @Transactional(readOnly = true)
    public LiveQuestionDto getShuffledQuestionForPlayer(Long questionId, Long playerId) {
        LiveQuestion question = liveQuestionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy câu hỏi: " + questionId));

        LiveSession session = liveSessionRepository.findById(question.getSessionId()).orElse(null);
        if (session != null && session.getCurrentRound() != null && session.getCurrentRound() == 1) {
            String r1State = session.getRound1State();
            if (!"QUESTION_40S".equalsIgnoreCase(r1State)
                    && !"ANSWER_REVEALED".equalsIgnoreCase(r1State)
                    && !"LEADERBOARD".equalsIgnoreCase(r1State)) {
                throw new IllegalStateException("Câu hỏi chưa bắt đầu tính giờ!");
            }
        }

        // Tạo 4 phương án gốc
        List<LiveQuestionDto.ShuffledOption> options = new ArrayList<>();
        options.add(new LiveQuestionDto.ShuffledOption("A", question.getOptionA()));
        options.add(new LiveQuestionDto.ShuffledOption("B", question.getOptionB()));
        options.add(new LiveQuestionDto.ShuffledOption("C", question.getOptionC()));
        options.add(new LiveQuestionDto.ShuffledOption("D", question.getOptionD()));

        // Xáo trộn giả ngẫu nhiên có tính tất định theo cặp (questionId, playerId)
        long seed = questionId * 3137L + playerId * 101L;
        Collections.shuffle(options, new Random(seed));

        LiveQuestionDto dto = convertQuestionToDto(question, false);
        dto.setShuffledOptions(options);

        // Kiểm tra xem thí sinh này đã trả lời câu này chưa (phục vụ khôi phục khi F5/mất mạng tải lại trang)
        Optional<LivePlayerAnswer> answerOpt = livePlayerAnswerRepository
                .findBySessionIdAndQuestionIdAndPlayerId(question.getSessionId(), questionId, playerId);
        if (answerOpt.isPresent()) {
            LivePlayerAnswer ans = answerOpt.get();
            dto.setHasAnswered(true);
            dto.setPlayerSelectedOption(ans.getSelectedOption());
            dto.setPlayerResponseTimeMs(ans.getResponseTimeMs());
        } else {
            dto.setHasAnswered(false);
        }

        return dto;
    }

    // ==========================================
    // VÒNG 2: NHẠY BÉN (MÃ ĐỀ & ĐIỂM 10 PHÚT)
    // ==========================================

    @Override
    @Transactional
    public void selectRound2Candidate(Long sessionId, Long playerId) {
        LivePlayer player = livePlayerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh: " + playerId));
        Map<String, Object> payload = Map.of(
                "sessionId", sessionId,
                "playerId", playerId,
                "player", convertPlayerToDto(player)
        );
        broadcast(sessionId, "ROUND2_CANDIDATE_SELECTED", payload);
    }

    @Override
    @Transactional
    public void assignRound2Topic(Long sessionId, Long playerId, String topicCode) {
        LivePlayer player = livePlayerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh: " + playerId));
        if (!sessionId.equals(player.getSessionId())) {
            throw new IllegalArgumentException("Thí sinh không thuộc phiên thi này!");
        }
        if (player.getRound2Score() != null && player.getRound2Score().compareTo(BigDecimal.ZERO) > 0) {
            throw new IllegalStateException("Thí sinh đã có điểm thi Vòng 2, không thể gán lại mã đề! Hãy bấm \"Cho thi lại\" nếu cần chọn lại.");
        }

        // Kiểm tra xem mã đề này đã có thí sinh khác trong phiên thi bốc thăm chưa
        List<LivePlayer> sessionPlayers = livePlayerRepository.findBySessionIdOrderByOrderNumberAsc(sessionId);
        boolean isAlreadyTaken = sessionPlayers.stream()
                .anyMatch(p -> !p.getId().equals(playerId) && topicCode.equalsIgnoreCase(p.getRound2DrawCode()));
        if (isAlreadyTaken) {
            throw new IllegalStateException("Mã đề \"" + topicCode + "\" đã được thí sinh khác bốc thăm! Mỗi mã đề chỉ được chọn 1 lần.");
        }

        player.setRound2DrawCode(topicCode);
        livePlayerRepository.save(player);

        LiveRound2Topic topic = liveRound2TopicRepository.findBySessionIdAndCode(sessionId, topicCode).orElse(null);

        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("sessionId", sessionId);
        payload.put("playerId", playerId);
        payload.put("player", convertPlayerToDto(player));
        payload.put("playerFullName", player.getFullName());
        payload.put("orderNumber", player.getOrderNumber());
        payload.put("topicCode", topicCode);
        payload.put("topic", topic != null ? topic : Map.of());
        broadcast(sessionId, "ROUND2_TOPIC_ASSIGNED", payload);
    }

    @Override
    @Transactional
    public void unassignRound2Topic(Long sessionId, Long playerId) {
        LivePlayer player = livePlayerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh: " + playerId));
        if (!sessionId.equals(player.getSessionId())) {
            throw new IllegalArgumentException("Thí sinh không thuộc phiên thi này!");
        }
        if (player.getRound2Score() != null && player.getRound2Score().compareTo(BigDecimal.ZERO) > 0) {
            throw new IllegalStateException("Thí sinh đã có điểm thi Vòng 2, không thể hủy chọn đề! Hãy dùng nút Cho thi lại nếu cần.");
        }
        Boolean isBatchRunning = round2BatchRunningMap.getOrDefault(sessionId, false);
        List<Long> activeBatch = round2ActiveBatches.getOrDefault(sessionId, List.of());
        if (Boolean.TRUE.equals(isBatchRunning) && activeBatch.contains(playerId)) {
            throw new IllegalStateException("Thí sinh đang trong thời gian làm bài đợt thi, không thể hủy mã đề!");
        }

        String oldTopic = player.getRound2DrawCode();
        player.setRound2DrawCode(null);
        LivePlayer saved = livePlayerRepository.save(player);

        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("sessionId", sessionId);
        payload.put("playerId", playerId);
        payload.put("oldTopicCode", oldTopic);
        payload.put("player", convertPlayerToDto(saved));
        broadcast(sessionId, "ROUND2_TOPIC_UNASSIGNED", payload);
    }

    @Override
    @Transactional
    public void resetPlayerRound2(Long sessionId, Long playerId) {
        LivePlayer player = livePlayerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh: " + playerId));
        if (!sessionId.equals(player.getSessionId())) {
            throw new IllegalArgumentException("Thí sinh không thuộc phiên thi này!");
        }

        // Xóa thí sinh khỏi active batch nếu có
        List<Long> activeBatch = round2ActiveBatches.get(sessionId);
        if (activeBatch != null && activeBatch.contains(playerId)) {
            List<Long> updatedBatch = new ArrayList<>(activeBatch);
            updatedBatch.remove(playerId);
            round2ActiveBatches.put(sessionId, updatedBatch);
        }

        player.setRound2DrawCode(null);
        player.setRound2Scenario1Score(BigDecimal.ZERO);
        player.setRound2Scenario2Score(BigDecimal.ZERO);
        player.setRound2Score(BigDecimal.ZERO);
        BigDecimal r1 = player.getRound1Score() != null ? player.getRound1Score() : BigDecimal.ZERO;
        BigDecimal r3 = player.getRound3Score() != null ? player.getRound3Score() : BigDecimal.ZERO;
        player.setTotalScore(r1.add(r3));
        LivePlayer saved = livePlayerRepository.save(player);

        Map<String, Object> payload = Map.of(
                "sessionId", sessionId,
                "playerId", playerId,
                "player", convertPlayerToDto(saved)
        );
        broadcast(sessionId, "ROUND2_PLAYER_RESET", payload);
    }

    @Override
    @Transactional
    public void showRound2TopicQuestion(Long sessionId, String topicCode) {
        LiveRound2Topic topic = liveRound2TopicRepository.findBySessionIdAndCode(sessionId, topicCode).orElse(null);
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("sessionId", sessionId);
        payload.put("topicCode", topicCode);
        if (topic != null) {
            payload.put("scenario1", topic.getScenario1());
            payload.put("scenario2", topic.getScenario2());
            payload.put("maxScore1", topic.getMaxScore1());
            payload.put("maxScore2", topic.getMaxScore2());
        }
        broadcast(sessionId, "ROUND2_TOPIC_REVEALED", payload);
    }

    @Override
    @Transactional
    public void startRound2Batch(Long sessionId, List<Long> playerIds, Integer durationSeconds) {
        int duration = (durationSeconds != null && durationSeconds > 0) ? durationSeconds : 600;
        long now = System.currentTimeMillis();
        long endAt = now + (duration * 1000L);

        List<LivePlayer> candidatePlayers = (playerIds != null && !playerIds.isEmpty())
                ? livePlayerRepository.findAllById(playerIds)
                : List.of();
        // Lọc chỉ những thí sinh CHƯA CÓ ĐIỂM Vòng 2
        List<LivePlayer> players = candidatePlayers.stream()
                .filter(p -> p.getRound2Score() == null || p.getRound2Score().compareTo(BigDecimal.ZERO) == 0)
                .toList();
        List<Long> filteredPlayerIds = players.stream().map(LivePlayer::getId).toList();

        round2BatchEndTimes.put(sessionId, endAt);
        round2BatchRunningMap.put(sessionId, true);
        round2ActiveBatches.put(sessionId, filteredPlayerIds);

        // Hủy scheduler cũ nếu có
        java.util.concurrent.ScheduledFuture<?> oldFuture = round2BatchFutures.remove(sessionId);
        if (oldFuture != null && !oldFuture.isDone()) {
            oldFuture.cancel(false);
        }

        // Tự động kết thúc đợt thi trên server sau đúng thời lượng duration
        java.util.concurrent.ScheduledFuture<?> future = scheduler.schedule(() -> {
            try {
                log.info("Hết 10 phút đợt thi Vòng 2 cho phiên thi: {}. Hệ thống tự động phát lệnh kết thúc đợt thi.", sessionId);
                endRound2Batch(sessionId);
            } catch (Exception e) {
                log.error("Lỗi khi tự động kết thúc đợt thi Vòng 2: {}", e.getMessage(), e);
            }
        }, duration, java.util.concurrent.TimeUnit.SECONDS);
        round2BatchFutures.put(sessionId, future);

        List<LivePlayerDto> playerDtos = players.stream().map(this::convertPlayerToDto).toList();

        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("sessionId", sessionId);
        payload.put("playerIds", filteredPlayerIds);
        payload.put("players", playerDtos);
        payload.put("durationSeconds", duration);
        payload.put("startedAt", now);
        payload.put("endAt", endAt);
        broadcast(sessionId, "ROUND2_BATCH_STARTED", payload);
    }

    @Override
    @Transactional
    public void endRound2Batch(Long sessionId) {
        java.util.concurrent.ScheduledFuture<?> future = round2BatchFutures.remove(sessionId);
        if (future != null && !future.isDone()) {
            future.cancel(false);
        }
        round2BatchRunningMap.put(sessionId, false);
        round2BatchEndTimes.remove(sessionId);
        Map<String, Object> payload = Map.of("sessionId", sessionId);
        broadcast(sessionId, "ROUND2_BATCH_ENDED", payload);
    }

    @Override
    @Transactional(readOnly = true)
    public void showRound2Leaderboard(Long sessionId) {
        showRound2Leaderboard(sessionId, "ROUND2_ONLY");
    }

    @Override
    @Transactional(readOnly = true)
    public void showRound2Leaderboard(Long sessionId, String viewType) {
        String effectiveViewType = (viewType != null && !viewType.isBlank()) ? viewType : "ROUND2_ONLY";
        List<LivePlayer> allPlayers = livePlayerRepository.findBySessionIdOrderByOrderNumberAsc(sessionId);
        List<LivePlayer> players = allPlayers.stream()
                .sorted(Comparator
                        .comparing((LivePlayer p) -> p.getRound2Score() != null ? p.getRound2Score() : BigDecimal.ZERO, Comparator.reverseOrder())
                        .thenComparing((LivePlayer p) -> Boolean.TRUE.equals(p.getIsCheckedIn()) ? 1 : 0, Comparator.reverseOrder())
                        .thenComparingLong(p -> p.getRound1TotalTimeMs() != null ? p.getRound1TotalTimeMs() : Long.MAX_VALUE)
                        .thenComparingInt(p -> p.getOrderNumber() != null ? p.getOrderNumber() : 999))
                .collect(Collectors.toList());
        List<LivePlayerDto> dtoList = players.stream().map(this::convertPlayerToDto).toList();
        Map<String, Object> payload = Map.of(
                "sessionId", sessionId,
                "viewType", effectiveViewType,
                "leaderboard", dtoList
        );
        broadcast(sessionId, "ROUND2_LEADERBOARD_REVEALED", payload);
    }

    @Override
    @Transactional(readOnly = true)
    public void showRound2Selecting(Long sessionId) {
        Map<String, Object> payload = Map.of("sessionId", sessionId);
        broadcast(sessionId, "ROUND2_SELECTING_REVEALED", payload);
    }

    @Override
    @Transactional
    public void resetRound2Batch(Long sessionId) {
        java.util.concurrent.ScheduledFuture<?> future = round2BatchFutures.remove(sessionId);
        if (future != null && !future.isDone()) {
            future.cancel(false);
        }
        round2BatchRunningMap.put(sessionId, false);
        round2BatchEndTimes.remove(sessionId);
        round2ActiveBatches.remove(sessionId);
        Map<String, Object> payload = Map.of("sessionId", sessionId);
        broadcast(sessionId, "ROUND2_BATCH_RESET", payload);
    }

    @Override
    @Transactional
    public List<LiveRound2Topic> resetDefaultRound2Topics(Long sessionId) {
        List<LiveRound2Topic> existing = liveRound2TopicRepository.findBySessionIdOrderByCodeAsc(sessionId);
        if (!existing.isEmpty()) {
            liveRound2TopicRepository.deleteAll(existing);
            liveRound2TopicRepository.flush();
        }
        List<LiveRound2Topic> topics = createDefault10Round2Topics(sessionId);
        return liveRound2TopicRepository.saveAll(topics);
    }

    @Override
    @Transactional
    public void updateRound2Score(Long playerId, BigDecimal score1, BigDecimal score2) {
        LivePlayer player = livePlayerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh: " + playerId));

        BigDecimal s1 = score1 != null ? score1 : BigDecimal.ZERO;
        BigDecimal s2 = score2 != null ? score2 : BigDecimal.ZERO;

        if (s1.compareTo(BigDecimal.ZERO) < 0 || s1.compareTo(BigDecimal.valueOf(20.0)) > 0) {
            throw new IllegalArgumentException("Điểm Tình huống 1 phải nằm trong khoảng từ 0.0 đến 20.0 điểm!");
        }
        if (s2.compareTo(BigDecimal.ZERO) < 0 || s2.compareTo(BigDecimal.valueOf(20.0)) > 0) {
            throw new IllegalArgumentException("Điểm Tình huống 2 phải nằm trong khoảng từ 0.0 đến 20.0 điểm!");
        }

        player.setRound2Scenario1Score(s1);
        player.setRound2Scenario2Score(s2);
        BigDecimal totalR2 = s1.add(s2);
        player.setRound2Score(totalR2);
        BigDecimal r1 = player.getRound1Score() != null ? player.getRound1Score() : BigDecimal.ZERO;
        BigDecimal r3 = player.getRound3Score() != null ? player.getRound3Score() : BigDecimal.ZERO;
        player.setTotalScore(r1.add(totalR2).add(r3));
        livePlayerRepository.save(player);

        // Loại bỏ thí sinh đã có điểm khỏi danh sách active batch của Vòng 2
        Long sessionId = player.getSessionId();
        List<Long> activeBatch = round2ActiveBatches.get(sessionId);
        if (activeBatch != null && activeBatch.contains(playerId)) {
            List<Long> updatedBatch = new ArrayList<>(activeBatch);
            updatedBatch.remove(playerId);
            round2ActiveBatches.put(sessionId, updatedBatch);
        }

        Map<String, Object> payload = Map.of(
                "playerId", playerId,
                "orderNumber", player.getOrderNumber(),
                "fullName", player.getFullName(),
                "scenario1Score", player.getRound2Scenario1Score(),
                "scenario2Score", player.getRound2Scenario2Score(),
                "round2Score", totalR2,
                "totalScore", player.getTotalScore()
        );
        broadcast(player.getSessionId(), "ROUND2_SCORE_UPDATED", payload);
    }

    @Override
    @Transactional
    public List<LiveRound2Topic> getRound2Topics(Long sessionId) {
        List<LiveRound2Topic> topics = liveRound2TopicRepository.findBySessionIdOrderByCodeAsc(sessionId);
        if (topics.isEmpty()) {
            return resetDefaultRound2Topics(sessionId);
        }
        return topics;
    }

    @Override
    @Transactional(readOnly = true)
    public List<LiveRound2Topic> getRound2TopicsForPublic(Long sessionId, Long playerId) {
        List<LiveRound2Topic> topics = getRound2Topics(sessionId);
        LivePlayer player = playerId != null ? livePlayerRepository.findById(playerId).orElse(null) : null;
        String assignedCode = (player != null && sessionId.equals(player.getSessionId())) ? player.getRound2DrawCode() : null;
        return topics.stream().map(t -> {
            if (assignedCode != null && assignedCode.equalsIgnoreCase(t.getCode())) {
                return t;
            }
            return LiveRound2Topic.builder()
                    .id(t.getId())
                    .sessionId(t.getSessionId())
                    .code(t.getCode())
                    .scenario1("")
                    .scenario2("")
                    .maxScore1(t.getMaxScore1())
                    .maxScore2(t.getMaxScore2())
                    .build();
        }).toList();
    }

    // ==========================================
    // VÒNG 3: BẢN LĨNH (LIVE RANDOM PAIRING & ĐỐI KHÁNG)
    // ==========================================

    @Override
    @Transactional
    public List<LiveRound3Pair> generateRandomPairs(Long sessionId) {
        liveRound3PairRepository.deleteBySessionId(sessionId);

        List<LivePlayer> players = new ArrayList<>(livePlayerRepository.findBySessionIdOrderByOrderNumberAsc(sessionId));
        if (players.size() < 10) {
            throw new IllegalStateException("Cần đủ 10 thí sinh để thực hiện ghép cặp bốc thăm.");
        }

        // Xáo ngẫu nhiên 10 thí sinh trực tiếp
        Collections.shuffle(players, new Random());

        List<LiveRound3Pair> pairs = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            LivePlayer p1 = players.get(i * 2);
            LivePlayer p2 = players.get(i * 2 + 1);

            int pairNum = i + 1;
            p1.setRound3PairGroup(pairNum);
            p2.setRound3PairGroup(pairNum);
            livePlayerRepository.save(p1);
            livePlayerRepository.save(p2);

            LiveRound3Pair pair = LiveRound3Pair.builder()
                    .sessionId(sessionId)
                    .pairNumber(pairNum)
                    .player1Id(p1.getId())
                    .player2Id(p2.getId())
                    .build();
            pairs.add(pair);
        }

        List<LiveRound3Pair> savedPairs = liveRound3PairRepository.saveAll(pairs);
        List<Map<String, Object>> displayPairs = getRound3DisplayPairs(sessionId);
        broadcast(sessionId, "ROUND3_PAIRS_UPDATED", Map.of("sessionId", sessionId, "pairs", displayPairs));
        return savedPairs;
    }

    @Override
    @Transactional
    public LiveRound3Pair assignRound3Pair(Long sessionId, Integer pairNumber, Long player1Id, Long player2Id) {
        if (pairNumber == null || pairNumber < 1 || pairNumber > 5) {
            throw new IllegalArgumentException("Số thứ tự cặp đấu phải từ 1 đến 5!");
        }
        if (player1Id == null || player2Id == null) {
            throw new IllegalArgumentException("Vui lòng chọn đủ 2 thí sinh cho cặp đấu!");
        }
        if (player1Id.equals(player2Id)) {
            throw new IllegalArgumentException("Không thể ghép cùng một thí sinh đấu với chính mình!");
        }

        LivePlayer p1 = livePlayerRepository.findById(player1Id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh 1: " + player1Id));
        LivePlayer p2 = livePlayerRepository.findById(player2Id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh 2: " + player2Id));

        if (!sessionId.equals(p1.getSessionId()) || !sessionId.equals(p2.getSessionId())) {
            throw new IllegalArgumentException("Thí sinh không thuộc phiên thi này!");
        }

        // Cập nhật cặp cũ nếu có
        LiveRound3Pair pair = liveRound3PairRepository.findBySessionIdAndPairNumber(sessionId, pairNumber)
                .orElse(LiveRound3Pair.builder()
                        .sessionId(sessionId)
                        .pairNumber(pairNumber)
                        .player1Id(player1Id)
                        .player2Id(player2Id)
                        .build());

        // Nếu pair đã tồn tại nhưng đổi thí sinh, xóa round3PairGroup của thí sinh cũ
        if (pair.getId() != null) {
            if (!pair.getPlayer1Id().equals(player1Id)) {
                livePlayerRepository.findById(pair.getPlayer1Id()).ifPresent(oldP1 -> {
                    oldP1.setRound3PairGroup(null);
                    livePlayerRepository.save(oldP1);
                });
            }
            if (!pair.getPlayer2Id().equals(player2Id)) {
                livePlayerRepository.findById(pair.getPlayer2Id()).ifPresent(oldP2 -> {
                    oldP2.setRound3PairGroup(null);
                    livePlayerRepository.save(oldP2);
                });
            }
        }

        pair.setPlayer1Id(player1Id);
        pair.setPlayer2Id(player2Id);
        LiveRound3Pair saved = liveRound3PairRepository.save(pair);

        p1.setRound3PairGroup(pairNumber);
        p2.setRound3PairGroup(pairNumber);
        livePlayerRepository.save(p1);
        livePlayerRepository.save(p2);

        // Phát WebSocket cập nhật danh sách 5 cặp đấu ngay lập tức
        List<Map<String, Object>> displayPairs = getRound3DisplayPairs(sessionId);
        broadcast(sessionId, "ROUND3_PAIRS_UPDATED", Map.of("sessionId", sessionId, "pairs", displayPairs));
        return saved;
    }

    @Override
    @Transactional
    public void deleteRound3Pair(Long sessionId, Integer pairNumber) {
        liveRound3PairRepository.findBySessionIdAndPairNumber(sessionId, pairNumber).ifPresent(pair -> {
            livePlayerRepository.findById(pair.getPlayer1Id()).ifPresent(p -> {
                p.setRound3PairGroup(null);
                livePlayerRepository.save(p);
            });
            livePlayerRepository.findById(pair.getPlayer2Id()).ifPresent(p -> {
                p.setRound3PairGroup(null);
                livePlayerRepository.save(p);
            });
            liveRound3PairRepository.delete(pair);
        });
        // Khi xóa cặp thi, luôn reset màn hình LED về tổng quan 5 cặp
        round3ActiveDuels.remove(sessionId);
        List<Map<String, Object>> displayPairs = getRound3DisplayPairs(sessionId);
        broadcast(sessionId, "ROUND3_PAIRS_UPDATED", Map.of("sessionId", sessionId, "pairs", displayPairs));
        broadcast(sessionId, "ROUND3_SHOW_ALL_PAIRS", Map.of("sessionId", sessionId, "pairs", displayPairs));
    }

    @Override
    @Transactional
    public void resetAllRound3Pairs(Long sessionId) {
        List<LivePlayer> players = livePlayerRepository.findBySessionIdOrderByOrderNumberAsc(sessionId);
        for (LivePlayer p : players) {
            if (p.getRound3PairGroup() != null) {
                p.setRound3PairGroup(null);
                livePlayerRepository.save(p);
            }
        }
        liveRound3PairRepository.deleteBySessionId(sessionId);
        round3ActiveDuels.remove(sessionId);
        List<Map<String, Object>> displayPairs = getRound3DisplayPairs(sessionId);
        broadcast(sessionId, "ROUND3_PAIRS_UPDATED", Map.of("sessionId", sessionId, "pairs", displayPairs));
        broadcast(sessionId, "ROUND3_SHOW_ALL_PAIRS", Map.of("sessionId", sessionId, "pairs", displayPairs));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRound3DisplayPairs(Long sessionId) {
        List<LiveRound3Pair> pairs = liveRound3PairRepository.findBySessionIdOrderByPairNumberAsc(sessionId);
        Map<Integer, LiveRound3Pair> pairMap = pairs.stream()
                .collect(Collectors.toMap(LiveRound3Pair::getPairNumber, p -> p, (a, b) -> a));

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            Map<String, Object> map = new HashMap<>();
            map.put("pairNumber", i);
            LiveRound3Pair pair = pairMap.get(i);
            if (pair != null) {
                LivePlayer p1 = livePlayerRepository.findById(pair.getPlayer1Id()).orElse(null);
                LivePlayer p2 = livePlayerRepository.findById(pair.getPlayer2Id()).orElse(null);
                map.put("id", pair.getId());
                map.put("player1Id", pair.getPlayer1Id());
                map.put("player2Id", pair.getPlayer2Id());
                map.put("player1", p1 != null ? convertPlayerToDto(p1) : null);
                map.put("player2", p2 != null ? convertPlayerToDto(p2) : null);
            } else {
                map.put("id", null);
                map.put("player1Id", null);
                map.put("player2Id", null);
                map.put("player1", null);
                map.put("player2", null);
            }
            result.add(map);
        }
        return result;
    }

    @Override
    public void displayRound3Duel(Long sessionId, Integer pairNumber) {
        Map<String, Object> duelState = new ConcurrentHashMap<>();
        duelState.put("sessionId", sessionId);
        duelState.put("pairNumber", pairNumber);
        duelState.put("stage", "PREPARE");
        duelState.put("stageTitle", "BAN GIÁM KHẢO CÔNG BỐ ĐỀ");
        duelState.put("durationSeconds", 0);
        duelState.put("startedAt", 0L);
        duelState.put("endAt", 0L);
        duelState.put("isTimerRunning", false);
        duelState.put("isTimeUp", false);
        duelState.put("isOvertimeRunning", false);
        duelState.put("overtimeSeconds", 0);
        duelState.put("activePlayerId", 0L);

        LiveRound3Pair pair = liveRound3PairRepository.findBySessionIdAndPairNumber(sessionId, pairNumber).orElse(null);
        if (pair != null) {
            LivePlayer p1 = livePlayerRepository.findById(pair.getPlayer1Id()).orElse(null);
            LivePlayer p2 = livePlayerRepository.findById(pair.getPlayer2Id()).orElse(null);
            duelState.put("player1", p1 != null ? convertPlayerToDto(p1) : null);
            duelState.put("player2", p2 != null ? convertPlayerToDto(p2) : null);
        }

        round3ActiveDuels.put(sessionId, duelState);
        broadcast(sessionId, "ROUND3_DUEL_DISPLAYED", duelState);
    }

    @Override
    public void startRound3Duel(Long sessionId, Integer pairNumber, String stage, String stageTitle, Integer durationSeconds, Long activePlayerId) {
        int duration = (durationSeconds != null && durationSeconds > 0) ? durationSeconds : 120;
        long now = System.currentTimeMillis();
        long endAt = now + (long) duration * 1000L;

        Map<String, Object> duelState = new ConcurrentHashMap<>();
        duelState.put("sessionId", sessionId);
        duelState.put("pairNumber", pairNumber);
        duelState.put("stage", stage != null ? stage : "STAGE_1_PREP");
        duelState.put("stageTitle", stageTitle != null ? stageTitle : "XỬ LÝ TÌNH HUỐNG");
        duelState.put("durationSeconds", duration);
        duelState.put("activePlayerId", activePlayerId != null ? activePlayerId : 0L);
        duelState.put("startedAt", now);
        duelState.put("endAt", endAt);
        duelState.put("isTimerRunning", true);
        duelState.put("isTimeUp", false);
        duelState.put("isOvertimeRunning", false);
        duelState.put("overtimeSeconds", 0);

        LiveRound3Pair pair = liveRound3PairRepository.findBySessionIdAndPairNumber(sessionId, pairNumber).orElse(null);
        if (pair != null) {
            LivePlayer p1 = livePlayerRepository.findById(pair.getPlayer1Id()).orElse(null);
            LivePlayer p2 = livePlayerRepository.findById(pair.getPlayer2Id()).orElse(null);
            duelState.put("player1", p1 != null ? convertPlayerToDto(p1) : null);
            duelState.put("player2", p2 != null ? convertPlayerToDto(p2) : null);
        }

        round3ActiveDuels.put(sessionId, duelState);
        broadcast(sessionId, "ROUND3_DUEL_STARTED", duelState);
    }

    @Override
    public void stopRound3DuelTimer(Long sessionId) {
        Map<String, Object> duelState = round3ActiveDuels.get(sessionId);
        if (duelState != null) {
            duelState.put("isTimerRunning", false);
            duelState.put("isTimeUp", true);
            duelState.put("endAt", System.currentTimeMillis());
            broadcast(sessionId, "ROUND3_DUEL_TIME_UP", duelState);
        }
    }

    @Override
    public void startRound3Overtime(Long sessionId, Long playerId) {
        Map<String, Object> duelState = round3ActiveDuels.get(sessionId);
        if (duelState != null) {
            duelState.put("isOvertimeRunning", true);
            duelState.put("overtimeStartedAt", System.currentTimeMillis());
            duelState.put("activeOvertimePlayerId", playerId != null ? playerId : 0L);
            broadcast(sessionId, "ROUND3_OVERTIME_STARTED", duelState);
        }
    }

    @Override
    public void stopRound3Overtime(Long sessionId, Integer overtimeSeconds) {
        Map<String, Object> duelState = round3ActiveDuels.get(sessionId);
        if (duelState != null) {
            duelState.put("isOvertimeRunning", false);
            duelState.put("overtimeSeconds", overtimeSeconds != null ? overtimeSeconds : 0);
            broadcast(sessionId, "ROUND3_OVERTIME_STOPPED", duelState);
        }
    }

    @Override
    public void showAllRound3Pairs(Long sessionId) {
        round3ViewModes.put(sessionId, "PAIRS");
        round3ActiveDuels.remove(sessionId);
        List<Map<String, Object>> displayPairs = getRound3DisplayPairs(sessionId);
        broadcast(sessionId, "ROUND3_SHOW_ALL_PAIRS", Map.of("sessionId", sessionId, "pairs", displayPairs));
    }

    @Override
    public void showRound3Rules(Long sessionId) {
        round3ViewModes.put(sessionId, "RULES");
        round3ActiveDuels.remove(sessionId);
        broadcast(sessionId, "ROUND3_RULES_DISPLAYED", Map.of("sessionId", sessionId));
    }

    @Override
    @Transactional
    public void updateRound3Score(Long playerId, BigDecimal score) {
        LivePlayer player = livePlayerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh: " + playerId));

        player.setRound3Score(score != null ? score : BigDecimal.ZERO);
        player.setTotalScore(player.getRound1Score().add(player.getRound2Score()).add(player.getRound3Score()));
        livePlayerRepository.save(player);

        Map<String, Object> payload = Map.of(
                "playerId", playerId,
                "orderNumber", player.getOrderNumber(),
                "fullName", player.getFullName(),
                "round3Score", player.getRound3Score(),
                "totalScore", player.getTotalScore()
        );
        broadcast(player.getSessionId(), "ROUND3_SCORE_UPDATED", payload);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LiveRound3Pair> getRound3Pairs(Long sessionId) {
        return liveRound3PairRepository.findBySessionIdOrderByPairNumberAsc(sessionId);
    }

    @Override
    @Transactional
    public void setSessionRound(Long sessionId, Integer round, String status) {
        LiveSession session = getSessionEntity(sessionId);
        session.setCurrentRound(round);
        if (status != null && !status.isBlank()) {
            session.setStatus(status);
        }
        if (round == 1) {
            session.setRound1State("IDLE");
        }
        liveSessionRepository.save(session);
        broadcast(sessionId, "SESSION_STATUS_CHANGED", convertToDto(session));
    }

    @Override
    @Transactional(readOnly = true)
    public List<LivePlayerAnswer> getAnswersForQuestion(Long sessionId, Long questionId) {
        return livePlayerAnswerRepository.findBySessionIdAndQuestionId(sessionId, questionId);
    }

    // ==========================================
    // KẾT THÚC & VINH DANH
    // ==========================================

    @Override
    @Transactional
    public LiveSessionDto finishSession(Long sessionId) {
        LiveSession session = getSessionEntity(sessionId);
        session.setStatus("FINISHED");
        liveSessionRepository.save(session);

        List<LivePlayer> allPlayers = livePlayerRepository.findBySessionIdOrderByOrderNumberAsc(sessionId);
        List<LivePlayer> ranked = allPlayers.stream()
                .sorted(Comparator
                        .comparing((LivePlayer p) -> p.getTotalScore() != null ? p.getTotalScore() : BigDecimal.ZERO, Comparator.reverseOrder())
                        .thenComparing((LivePlayer p) -> Boolean.TRUE.equals(p.getIsCheckedIn()) ? 1 : 0, Comparator.reverseOrder())
                        .thenComparingLong(p -> p.getRound1TotalTimeMs() != null ? p.getRound1TotalTimeMs() : Long.MAX_VALUE)
                        .thenComparingInt(p -> p.getOrderNumber() != null ? p.getOrderNumber() : 999))
                .collect(Collectors.toList());
        int rank = 1;
        List<Map<String, Object>> prizeList = new ArrayList<>();

        for (LivePlayer p : ranked) {
            p.setFinalRank(rank);
            String prizeTitle;
            if (rank == 1) {
                prizeTitle = "GIẢI NHẤT";
            } else if (rank <= 4) {
                prizeTitle = "GIẢI NHÌ";
            } else {
                prizeTitle = "GIẢI BA";
            }

            livePlayerRepository.save(p);
            prizeList.add(Map.of(
                    "rank", rank,
                    "prizeTitle", prizeTitle,
                    "player", convertPlayerToDto(p)
            ));
            rank++;
        }

        Map<String, Object> payload = Map.of(
                "sessionId", sessionId,
                "winners", prizeList
        );
        broadcast(sessionId, "WINNERS_ANNOUNCED", payload);
        return convertToDto(session);
    }

    @Override
    public void switchFinishViewMode(Long sessionId, String viewMode) {
        String mode = (viewMode != null && "BOARD".equalsIgnoreCase(viewMode.trim())) ? "BOARD" : "PODIUM";
        Map<String, Object> payload = Map.of(
                "sessionId", sessionId,
                "viewMode", mode
        );
        broadcast(sessionId, "FINISH_VIEW_MODE_CHANGED", payload);
    }

    // ==========================================
    // SEED DỮ LIỆU MẪU CHUẨN KỊCH BẢN
    // ==========================================

    @Override
    @Transactional
    public void initDefaultQuestionsAndTopics(Long sessionId) {
        // 10 câu hỏi Vòng 1 chính thức từ Ban Tổ chức (ĐỀ VÒNG 1 TRẮC NGHIỆM)
        if (liveQuestionRepository.findBySessionIdOrderByQuestionOrderAsc(sessionId).isEmpty()) {
            List<LiveQuestion> questions = List.of(
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(1)
                            .title("Theo Nghị quyết Đại hội đại biểu toàn quốc lần thứ XIV của Đảng, nhiệm vụ nào sau đây được xác định là \"đột phá của đột phá\" trong hoàn thiện thể chế phát triển quốc gia?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("Tập trung hoàn thiện khung pháp lý về chuyển đổi số và phát triển hạ tầng dữ liệu quốc gia")
                            .optionB("Đẩy mạnh phân cấp, phân quyền triệt để giữa các cơ quan hành chính nhà nước ở trung ương và địa phương")
                            .optionC("Tháo gỡ triệt để các điểm nghẽn thể chế, giải phóng toàn bộ năng lực sản xuất và khơi thông mọi nguồn lực xã hội")
                            .optionD("Cơ cấu lại toàn bộ hệ thống cơ quan tư pháp và tăng cường tính độc lập của hoạt động tố tụng")
                            .correctOption("C")
                            .explanation("Nghị quyết Đại hội XIV của Đảng xác định tháo gỡ triệt để các điểm nghẽn thể chế, giải phóng toàn bộ năng lực sản xuất và khơi thông mọi nguồn lực xã hội là đột phá của đột phá.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(2)
                            .title("Theo Nghị quyết Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XIII (nhiệm kỳ 2026 - 2031), phong trào hành động cách mạng nào sau đây đóng vai trò nòng cốt trong việc định hướng thanh niên tham gia xây dựng chính quyền số, kinh tế số và xã hội số?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("Phong trào \"Tuổi trẻ sáng tạo và đổi mới mô hình quản trị xã hội trong kỷ nguyên mới\"")
                            .optionB("Phong trào \"Thanh niên tiên phong chuyển đổi số và phát triển khoa học công nghệ\"")
                            .optionC("Phong trào \"Tuổi trẻ xung kích phát triển hạ tầng dữ liệu và công nghệ cao quốc gia\"")
                            .optionD("Phong trào \"Thanh niên Việt Nam tích cực tham gia hiện đại hóa nền hành chính nhà nước\"")
                            .correctOption("B")
                            .explanation("Phong trào \"Thanh niên tiên phong chuyển đổi số và phát triển khoa học công nghệ\" đóng vai trò nòng cốt theo Nghị quyết Đại hội Đoàn toàn quốc lần thứ XIII.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(3)
                            .title("Theo Nghị quyết Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XIII (nhiệm kỳ 2026 - 2031), trong nhóm chỉ tiêu về đồng hành với thanh niên, giải pháp mang tính đột phá nhằm nâng cao năng lực hội nhập quốc tế cho thanh thiếu nhi Việt Nam tập trung vào chỉ tiêu nào sau đây?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("Phấn đấu đạt 5 triệu lượt thanh niên công chức, viên chức được bồi dưỡng kỹ năng làm việc trong môi trường quốc tế")
                            .optionB("Phấn đấu 100% cán bộ Đoàn cấp huyện trở lên sử dụng thành thạo ít nhất một ngoại ngữ trong giao tiếp công vụ")
                            .optionC("Phấn đấu hỗ trợ 15 triệu lượt học sinh, sinh viên tham gia các chương trình trao đổi thanh niên quốc tế")
                            .optionD("Phấn đấu đạt 10 triệu lượt thanh thiếu nhi được tham gia các hoạt động nâng cao năng lực ngoại ngữ và hội nhập quốc tế")
                            .correctOption("D")
                            .explanation("Chỉ tiêu phấn đấu đạt 10 triệu lượt thanh thiếu nhi được tham gia các hoạt động nâng cao năng lực ngoại ngữ và hội nhập quốc tế là giải pháp đột phá.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(4)
                            .title("Theo Nghị quyết Đại hội đại biểu Đảng bộ tỉnh Nghệ An lần thứ XX (nhiệm kỳ 2025 - 2030), đột phá chiến lược về phát triển nguồn nhân lực gắn với khoa học công nghệ của tỉnh tập trung ưu tiên cho lĩnh vực nào sau đây?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("Đào tạo nhân lực chất lượng cao, ưu tiên các ngành công nghiệp công nghệ cao, kinh tế số, logistics và du lịch chất lượng cao")
                            .optionB("Nâng cao trình độ tay nghề công nhân kỹ thuật, ưu tiên phục vụ phát triển các khu công nghiệp tập trung và cụm công nghiệp phụ trợ")
                            .optionC("Đào tạo đội ngũ chuyên gia công nghệ thông tin và quản trị kinh doanh đạt tiêu chuẩn quốc tế phục vụ thu hút đầu tư FDI")
                            .optionD("Phát triển nguồn nhân lực quản lý nhà nước và quản trị doanh nghiệp đáp ứng yêu cầu chuyển dịch cơ cấu kinh tế toàn diện")
                            .correctOption("A")
                            .explanation("Đột phá chiến lược về phát triển nguồn nhân lực tỉnh Nghệ An tập trung đào tạo nhân lực chất lượng cao, ưu tiên công nghiệp công nghệ cao, kinh tế số, logistics và du lịch chất lượng cao.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(5)
                            .title("Theo Nghị quyết Đại hội đại biểu Đảng bộ tỉnh Nghệ An lần thứ XX (nhiệm kỳ 2025 - 2030), định hướng phát triển không gian kinh tế của tỉnh Nghệ An được cấu trúc theo mô hình trọng tâm nào?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("Tam giác tăng trưởng kinh tế biển (Cửa Lò - Hoàng Mai - Đông Hồi) kết hợp với hai vùng đô thị sinh thái phía Tây")
                            .optionB("Bốn trung tâm công nghiệp công nghệ cao tập trung dọc theo tuyến đường ven biển và hành lang kinh tế Quốc lộ 1A")
                            .optionC("Hai khu vực động lực phát triển (TP. Vinh mở rộng & Khu kinh tế Đông Nam) và ba hành lang kinh tế trọng điểm")
                            .optionD("Mô hình đô thị đa cực lấy thành phố Vinh làm trung tâm kết nối trực tiếp với 05 vệ tinh kinh tế miền núi")
                            .correctOption("C")
                            .explanation("Cấu trúc không gian phát triển kinh tế tỉnh Nghệ An gồm hai khu vực động lực phát triển (TP. Vinh mở rộng & KKT Đông Nam) và ba hành lang kinh tế trọng điểm.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(6)
                            .title("Theo Nghị quyết Đại hội đại biểu Đoàn TNCS Hồ Chí Minh tỉnh Nghệ An lần thứ XIX (nhiệm kỳ 2025 - 2030), trong đột phá về công tác cán bộ Đoàn, Tỉnh đoàn Nghệ An đặt ra yêu cầu trọng tâm nào đối với đội ngũ Bí thư Đoàn cơ sở?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("100% có trình độ thạc sĩ trở lên, sử dụng thành thạo hai ngoại ngữ và có chứng chỉ quản lý nhà nước ngạch chuyên viên")
                            .optionB("Chuẩn hóa về lý luận chính trị, có năng lực chuyển đổi số, kỹ năng vận động thanh niên và tinh thần dấn thân vì cộng đồng")
                            .optionC("Phải có thời gian tham gia công tác Đoàn tối thiểu 05 năm và hoàn thành xuất sắc nhiệm vụ 03 năm liên tục")
                            .optionD("Luân chuyển bắt buộc giữa các khu vực địa lý khác nhau để tích lũy thực tiễn trước khi bổ nhiệm chính thức")
                            .correctOption("B")
                            .explanation("Yêu cầu trọng tâm: Chuẩn hóa về lý luận chính trị, có năng lực chuyển đổi số, kỹ năng vận động thanh niên và tinh thần dấn thân vì cộng đồng.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(7)
                            .title("Theo Nghị quyết Đại hội đại biểu Đoàn TNCS Hồ Chí Minh tỉnh Nghệ An lần thứ XIX (nhiệm kỳ 2025 - 2030), chỉ tiêu đến cuối nhiệm kỳ về tỷ lệ thanh niên trên địa bàn tỉnh được tiếp cận các hoạt động nâng cao năng lực số đạt tối thiểu bao nhiêu %?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("60%")
                            .optionB("70%")
                            .optionC("90%")
                            .optionD("80%")
                            .correctOption("D")
                            .explanation("Nghị quyết xác định chỉ tiêu đến cuối nhiệm kỳ tối thiểu 80% thanh niên trên địa bàn tỉnh được tiếp cận các hoạt động nâng cao năng lực số.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(8)
                            .title("Theo Điều lệ Đoàn TNCS Hồ Chí Minh khóa XIII, trường hợp đoàn viên được hoãn sinh hoạt Đoàn tạm thời do đi làm việc lưu động hoặc đi học tập xa nơi cư trú được quy định như thế nào?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("Do Ban Chấp hành Chi đoàn xem xét, quyết định cho hoãn sinh hoạt nhưng thời hạn mỗi lần hoãn không quá 01 năm và đoàn viên vẫn phải đóng đoàn phí")
                            .optionB("Do Bí thư Đoàn cơ sở quyết định trực tiếp và đoàn viên được miễn toàn bộ nghĩa vụ đóng đoàn phí trong thời gian hoãn")
                            .optionC("Tự động được miễn sinh hoạt và không cần báo cáo với Ban Chấp hành Chi đoàn nếu thời gian đi xa dưới 06 tháng")
                            .optionD("Do Ủy ban Kiểm tra Đoàn cấp trên trực tiếp phê duyệt bằng văn bản chính thức")
                            .correctOption("A")
                            .explanation("Điều lệ Đoàn quy định: Do Ban Chấp hành Chi đoàn xem xét, quyết định cho hoãn sinh hoạt nhưng thời hạn mỗi lần hoãn không quá 01 năm và đoàn viên vẫn phải đóng đoàn phí.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(9)
                            .title("Theo Điều lệ Đoàn TNCS Hồ Chí Minh khóa XIII, đối với các quyết định kỷ luật đoàn viên hoặc tổ chức Đoàn, hiệu lực thi hành của quyết định kỷ luật được tính từ thời điểm nào?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("Có hiệu lực sau 15 ngày kể từ ngày ban hành nếu đoàn viên hoặc tổ chức Đoàn không có đơn khiếu nại")
                            .optionB("Có hiệu lực ngay sau khi cơ quan Đoàn có thẩm quyền công bố quyết định, mặc dù đoàn viên hoặc tổ chức Đoàn bị kỷ luật có quyền khiếu nại")
                            .optionC("Có hiệu lực ngay sau khi được cấp ủy Đảng cùng cấp hoặc Ban Thường vụ Đoàn cấp trên trực tiếp phê chuẩn")
                            .optionD("Có hiệu lực sau 30 ngày kể từ ngày họp xét kỷ luật của Ban Chấp hành Chi đoàn hoặc Đoàn cơ sở")
                            .correctOption("B")
                            .explanation("Hiệu lực kỷ luật có hiệu lực ngay sau khi cơ quan Đoàn có thẩm quyền công bố quyết định, mặc dù đoàn viên hoặc tổ chức Đoàn bị kỷ luật có quyền khiếu nại.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(10)
                            .title("Tại Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XIII (nhiệm kỳ 2026 - 2031), Tổng Bí thư, Chủ tịch nước Tô Lâm đã phát biểu chỉ đạo và đặt ra 5 yêu cầu trọng tâm đối với công tác Đoàn và phong trào thanh thiếu nhi. Yêu cầu thứ ba nhấn mạnh định hướng nào sau đây đối với các phong trào hành động cách mạng của Đoàn?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("Mở rộng quy mô tổ chức các hoạt động để thu hút tối đa số lượng thanh niên tham gia.")
                            .optionB("Tập trung nguồn lực cho công tác tình nguyện quốc tế và giao lưu văn hóa thanh niên")
                            .optionC("Đổi mới mạnh mẽ các phong trào hành động cách mạng theo hướng thiết thực, chuyên sâu, có sản phẩm cụ thể và tác động xã hội rõ ràng")
                            .optionD("Chuyển giao toàn bộ việc tổ chức phong trào hành động cách mạng cho các hội quần chúng trực thuộc tự đảm nhận")
                            .correctOption("C")
                            .explanation("Yêu cầu thứ ba: Đổi mới mạnh mẽ các phong trào hành động cách mạng theo hướng thiết thực, chuyên sâu, có sản phẩm cụ thể và tác động xã hội rõ ràng.")
                            .timeLimitSeconds(40)
                            .build()
            );
            liveQuestionRepository.saveAll(questions);
        }

        // 10 Bộ đề Vòng 2 chính thức từ Ban Tổ chức (Mỗi đề 2 câu hỏi thực hành trên phần mềm YUM)
        if (liveRound2TopicRepository.findBySessionIdOrderByCodeAsc(sessionId).isEmpty()) {
            resetDefaultRound2Topics(sessionId);
        }
    }

    private List<LiveRound2Topic> createDefault10Round2Topics(Long sessionId) {
        return List.of(
                LiveRound2Topic.builder()
                        .sessionId(sessionId)
                        .code("BỘ ĐỀ 01")
                        .scenario1("Câu 1: Thí sinh hãy thực hiện thao tác chuyển sinh hoạt Đoàn đi cho 01 đoàn viên bất kỳ từ 1 chi đoàn sang chi đoàn khác ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .scenario2("Câu 2: Thí sinh hãy sáp nhập 2 chi đoàn bất kỳ thành chi đoàn mới ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .maxScore1(BigDecimal.valueOf(20.0))
                        .maxScore2(BigDecimal.valueOf(20.0))
                        .build(),
                LiveRound2Topic.builder()
                        .sessionId(sessionId)
                        .code("BỘ ĐỀ 02")
                        .scenario1("Câu 1: Thí sinh hãy thực hiện nghiệp vụ trưởng thành Đoàn cho 01 đoàn viên bất kỳ ở chi đoàn thuộc xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .scenario2("Câu 2: Thí sinh hãy chia tách 01 chi đoàn bất kỳ thành 02 chi đoàn mới ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .maxScore1(BigDecimal.valueOf(20.0))
                        .maxScore2(BigDecimal.valueOf(20.0))
                        .build(),
                LiveRound2Topic.builder()
                        .sessionId(sessionId)
                        .code("BỘ ĐỀ 03")
                        .scenario1("Câu 1: Thí sinh hãy thực hiện thao tác cấp lại thẻ đoàn viên cho 01 đoàn viên bất kỳ ở chi đoàn thuộc xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .scenario2("Câu 2: Thí sinh hãy thực hiện quy trình kết nạp cho 01 đoàn viên mới (các trường thông tin của đoàn viên mới do thí sinh biên tập) của 01 chi đoàn tại xã nơi thí sinh công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .maxScore1(BigDecimal.valueOf(20.0))
                        .maxScore2(BigDecimal.valueOf(20.0))
                        .build(),
                LiveRound2Topic.builder()
                        .sessionId(sessionId)
                        .code("BỘ ĐỀ 04")
                        .scenario1("Câu 1: Thí sinh hãy thực hiện thao tác tạo 01 chi đoàn mới và cấp tài khoản đăng nhập cho chi đoàn đó ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .scenario2("Câu 2: Thí sinh hãy sáp nhập 2 chi đoàn bất kỳ thành chi đoàn mới ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .maxScore1(BigDecimal.valueOf(20.0))
                        .maxScore2(BigDecimal.valueOf(20.0))
                        .build(),
                LiveRound2Topic.builder()
                        .sessionId(sessionId)
                        .code("BỘ ĐỀ 05")
                        .scenario1("Câu 1: Thí sinh hãy thực hiện ban hành 01 văn bản/thông báo chỉ đạo điều hành gửi cho các chi đoàn trực thuộc ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .scenario2("Câu 2: Thí sinh hãy chia tách 01 chi đoàn bất kỳ thành 02 chi đoàn mới ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .maxScore1(BigDecimal.valueOf(20.0))
                        .maxScore2(BigDecimal.valueOf(20.0))
                        .build(),
                LiveRound2Topic.builder()
                        .sessionId(sessionId)
                        .code("BỘ ĐỀ 06")
                        .scenario1("Câu 1: Thí sinh hãy thực hiện thao tác chuyển sinh hoạt Đoàn đi cho 01 đoàn viên bất kỳ từ 1 chi đoàn sang chi đoàn khác ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .scenario2("Câu 2: Thí sinh hãy thực hiện quy trình kết nạp cho 01 đoàn viên mới (các trường thông tin của đoàn viên mới do thí sinh biên tập) của 01 chi đoàn tại xã nơi thí sinh công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .maxScore1(BigDecimal.valueOf(20.0))
                        .maxScore2(BigDecimal.valueOf(20.0))
                        .build(),
                LiveRound2Topic.builder()
                        .sessionId(sessionId)
                        .code("BỘ ĐỀ 07")
                        .scenario1("Câu 1: Thí sinh hãy thực hiện nghiệp vụ trưởng thành Đoàn cho 01 đoàn viên bất kỳ (đến tuổi trưởng thành đoàn) ở chi đoàn thuộc xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .scenario2("Câu 2: Thí sinh hãy sáp nhập 2 chi đoàn bất kỳ thành chi đoàn mới ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .maxScore1(BigDecimal.valueOf(20.0))
                        .maxScore2(BigDecimal.valueOf(20.0))
                        .build(),
                LiveRound2Topic.builder()
                        .sessionId(sessionId)
                        .code("BỘ ĐỀ 08")
                        .scenario1("Câu 1: Thí sinh hãy thực hiện thao tác cấp lại thẻ đoàn viên cho 01 đoàn viên bất kỳ ở chi đoàn thuộc xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .scenario2("Câu 2: Thí sinh hãy chia tách 01 chi đoàn bất kỳ thành 02 chi đoàn mới ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .maxScore1(BigDecimal.valueOf(20.0))
                        .maxScore2(BigDecimal.valueOf(20.0))
                        .build(),
                LiveRound2Topic.builder()
                        .sessionId(sessionId)
                        .code("BỘ ĐỀ 09")
                        .scenario1("Câu 1: Thí sinh hãy thực hiện thao tác tạo 01 chi đoàn mới và cấp tài khoản đăng nhập cho chi đoàn đó ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .scenario2("Câu 2: Thí sinh hãy thực hiện quy trình kết nạp cho 01 đoàn viên mới (các trường thông tin của đoàn viên mới do thí sinh biên tập) của 01 chi đoàn tại xã nơi thí sinh công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .maxScore1(BigDecimal.valueOf(20.0))
                        .maxScore2(BigDecimal.valueOf(20.0))
                        .build(),
                LiveRound2Topic.builder()
                        .sessionId(sessionId)
                        .code("BỘ ĐỀ 10")
                        .scenario1("Câu 1: Thí sinh hãy thực hiện ban hành 01 văn bản/thông báo chỉ đạo điều hành gửi cho các chi đoàn trực thuộc ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .scenario2("Câu 2: Thí sinh hãy sáp nhập 2 chi đoàn bất kỳ thành chi đoàn mới ở xã nơi thí sinh đang công tác trên Phần mềm Quản lý đoàn viên (YUM).")
                        .maxScore1(BigDecimal.valueOf(20.0))
                        .maxScore2(BigDecimal.valueOf(20.0))
                        .build()
        );
    }

    // ==========================================
    // HELPERS & DTO CONVERTERS
    // ==========================================

    private LiveSession getSessionEntity(Long sessionId) {
        return liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phiên thi: " + sessionId));
    }

    private LiveSessionDto convertToDto(LiveSession s) {
        List<LivePlayer> players = livePlayerRepository.findBySessionIdOrderByOrderNumberAsc(s.getId());
        LiveQuestion question = null;
        Long startedAt = null;
        if (s.getCurrentQuestionIndex() != null && s.getCurrentQuestionIndex() > 0) {
            question = liveQuestionRepository.findBySessionIdAndQuestionOrder(s.getId(), s.getCurrentQuestionIndex()).orElse(null);
            startedAt = questionStartTimes.get(s.getId() + ":" + s.getCurrentQuestionIndex());
        }

        Map<String, Object> revealedData = null;
        if (question != null && ("ANSWER_REVEALED".equalsIgnoreCase(s.getRound1State()) || "LEADERBOARD".equalsIgnoreCase(s.getRound1State()))) {
            List<LivePlayerAnswer> answers = livePlayerAnswerRepository.findBySessionIdAndQuestionId(s.getId(), question.getId());
            final LiveQuestion finalQ = question;
            long countA = answers.stream().filter(a -> {
                String sel = a.getSelectedOption() != null ? a.getSelectedOption().trim() : "";
                return "A".equalsIgnoreCase(sel) || (finalQ.getOptionA() != null && finalQ.getOptionA().trim().equalsIgnoreCase(sel));
            }).count();
            long countB = answers.stream().filter(a -> {
                String sel = a.getSelectedOption() != null ? a.getSelectedOption().trim() : "";
                return "B".equalsIgnoreCase(sel) || (finalQ.getOptionB() != null && finalQ.getOptionB().trim().equalsIgnoreCase(sel));
            }).count();
            long countC = answers.stream().filter(a -> {
                String sel = a.getSelectedOption() != null ? a.getSelectedOption().trim() : "";
                return "C".equalsIgnoreCase(sel) || (finalQ.getOptionC() != null && finalQ.getOptionC().trim().equalsIgnoreCase(sel));
            }).count();
            long countD = answers.stream().filter(a -> {
                String sel = a.getSelectedOption() != null ? a.getSelectedOption().trim() : "";
                return "D".equalsIgnoreCase(sel) || (finalQ.getOptionD() != null && finalQ.getOptionD().trim().equalsIgnoreCase(sel));
            }).count();
            long countCorrect = answers.stream().filter(a -> Boolean.TRUE.equals(a.getIsCorrect())).count();

            Map<String, Object> stats = Map.of(
                    "totalAnswered", answers.size(),
                    "countA", countA,
                    "countB", countB,
                    "countC", countC,
                    "countD", countD,
                    "countCorrect", countCorrect
            );

            revealedData = new HashMap<>();
            revealedData.put("questionOrder", s.getCurrentQuestionIndex());
            revealedData.put("questionId", question.getId());
            revealedData.put("correctOption", question.getCorrectOption());
            revealedData.put("explanation", question.getExplanation() != null ? question.getExplanation() : "");
            revealedData.put("stats", stats);
            revealedData.put("answers", answers.stream().map(a -> {
                Map<String, Object> ansMap = new HashMap<>();
                ansMap.put("playerId", a.getPlayerId());
                ansMap.put("selectedOption", a.getSelectedOption() != null ? a.getSelectedOption() : "");
                ansMap.put("isCorrect", Boolean.TRUE.equals(a.getIsCorrect()));
                ansMap.put("hasHopeStar", Boolean.TRUE.equals(a.getHasHopeStar()));
                ansMap.put("responseTimeMs", a.getResponseTimeMs());
                ansMap.put("scoreAwarded", a.getScoreAwarded());
                return ansMap;
            }).collect(Collectors.toList()));
        }

        // Lấy toàn bộ danh sách câu hỏi Vòng 1 của session để map lịch sử câu 1..N
        List<LiveQuestion> allSessionQuestions = liveQuestionRepository.findBySessionIdOrderByQuestionOrderAsc(s.getId());
        Map<Long, Integer> questionOrderMap = allSessionQuestions.stream()
                .collect(Collectors.toMap(LiveQuestion::getId, LiveQuestion::getQuestionOrder, (k1, k2) -> k1));

        List<LivePlayerAnswer> allSessionAnswers = livePlayerAnswerRepository.findBySessionId(s.getId());
        Map<Long, List<LivePlayerAnswer>> playerAnswersMap = allSessionAnswers.stream()
                .collect(Collectors.groupingBy(LivePlayerAnswer::getPlayerId));

        return LiveSessionDto.builder()
                .id(s.getId())
                .phaseId(s.getPhaseId())
                .name(s.getName())
                .status(s.getStatus())
                .currentRound(s.getCurrentRound())
                .currentQuestionIndex(s.getCurrentQuestionIndex())
                .round1State(s.getRound1State())
                .questionStartedAt(startedAt)
                .createdAt(s.getCreatedAt())
                .players(players.stream().map(p -> convertPlayerToDto(p, playerAnswersMap.get(p.getId()), questionOrderMap, s)).collect(Collectors.toList()))
                .currentQuestion((question != null && (s.getCurrentRound() == null || s.getCurrentRound() != 1 || "QUESTION_40S".equalsIgnoreCase(s.getRound1State()) || "ANSWER_REVEALED".equalsIgnoreCase(s.getRound1State()) || "LEADERBOARD".equalsIgnoreCase(s.getRound1State()))) ? convertQuestionToDto(question, "ANSWER_REVEALED".equalsIgnoreCase(s.getRound1State()) || "LEADERBOARD".equalsIgnoreCase(s.getRound1State())) : null)
                .revealedData(revealedData)
                .round2BatchEndAt(round2BatchEndTimes.get(s.getId()))
                .round2BatchRunning(round2BatchRunningMap.getOrDefault(s.getId(), false))
                .round2BatchPlayerIds(round2ActiveBatches.getOrDefault(s.getId(), List.of()))
                .round3DuelState(round3ActiveDuels.get(s.getId()))
                .round3ViewMode(round3ViewModes.getOrDefault(s.getId(), "PAIRS"))
                .build();
    }

    private LivePlayerDto convertPlayerToDto(LivePlayer p) {
        return convertPlayerToDto(p, null, null, null);
    }

    private LivePlayerDto convertPlayerToDto(LivePlayer p, List<LivePlayerAnswer> answers, Map<Long, Integer> questionOrderMap, LiveSession session) {
        List<Boolean> round1History = new ArrayList<>();
        List<BigDecimal> round1ScoreHistory = new ArrayList<>();
        if (questionOrderMap != null) {
            Map<Integer, Boolean> orderCorrectMap = new HashMap<>();
            Map<Integer, BigDecimal> orderScoreMap = new HashMap<>();
            if (answers != null) {
                for (LivePlayerAnswer a : answers) {
                    Integer qOrder = questionOrderMap.get(a.getQuestionId());
                    if (qOrder != null) {
                        orderCorrectMap.put(qOrder, Boolean.TRUE.equals(a.getIsCorrect()));
                        orderScoreMap.put(qOrder, a.getScoreAwarded() != null ? a.getScoreAwarded() : BigDecimal.ZERO);
                    }
                }
            }

            int currentQ = (session != null && session.getCurrentQuestionIndex() != null) ? session.getCurrentQuestionIndex() : 0;
            boolean isCurrentRevealed = session != null && ("ANSWER_REVEALED".equalsIgnoreCase(session.getRound1State()) || "LEADERBOARD".equalsIgnoreCase(session.getRound1State()));
            int completedQ = isCurrentRevealed ? currentQ : (currentQ - 1);

            // Mảng 10 câu Vòng 1: null nếu chưa thi, true nếu đúng, false nếu sai hoặc thí sinh tham gia nhưng không chọn
            for (int i = 1; i <= 10; i++) {
                if (orderCorrectMap.containsKey(i)) {
                    round1History.add(orderCorrectMap.get(i));
                    round1ScoreHistory.add(orderScoreMap.get(i));
                } else if (Boolean.TRUE.equals(p.getIsCheckedIn()) && i <= completedQ) {
                    // Thí sinh đã tham gia (điểm danh) nhưng không chọn/không nộp ở câu đã kết thúc -> tính là SAI (false, 0 điểm)
                    round1History.add(false);
                    round1ScoreHistory.add(BigDecimal.ZERO);
                } else {
                    round1History.add(null);
                    round1ScoreHistory.add(null);
                }
            }
        }

        return LivePlayerDto.builder()
                .id(p.getId())
                .sessionId(p.getSessionId())
                .contestantId(p.getContestantId())
                .orderNumber(p.getOrderNumber())
                .fullName(p.getFullName())
                .unit(p.getUnit())
                .position(p.getPosition())
                .email(p.getEmail())
                .maskedEmail(EmailMaskUtil.mask(p.getEmail()))
                .phone(p.getPhone())
                .avatarUrl(p.getAvatarUrl())
                .isCheckedIn(p.getIsCheckedIn())
                .checkedInAt(p.getCheckedInAt())
                .deviceId(p.getDeviceId())
                .isRescueRequested(p.getIsRescueRequested())
                .hopeStarUsed(p.getHopeStarUsed())
                .hopeStarQuestionIndex(p.getHopeStarQuestionIndex())
                .round1Score(p.getRound1Score())
                .round1TotalTimeMs(p.getRound1TotalTimeMs())
                .round2DrawCode(p.getRound2DrawCode())
                .round2Scenario1Score(p.getRound2Scenario1Score())
                .round2Scenario2Score(p.getRound2Scenario2Score())
                .round2Score(p.getRound2Score())
                .round3PairGroup(p.getRound3PairGroup())
                .round3Score(p.getRound3Score())
                .totalScore(p.getTotalScore())
                .finalRank(p.getFinalRank())
                .round1History(round1History.isEmpty() ? null : round1History)
                .round1ScoreHistory(round1ScoreHistory.isEmpty() ? null : round1ScoreHistory)
                .build();
    }

    private LiveQuestionDto convertQuestionToDto(LiveQuestion q, boolean revealCorrect) {
        return LiveQuestionDto.builder()
                .id(q.getId())
                .sessionId(q.getSessionId())
                .questionOrder(q.getQuestionOrder())
                .title(q.getTitle())
                .videoUrl(q.getVideoUrl())
                .videoType(q.getVideoType())
                .optionA(q.getOptionA())
                .optionB(q.getOptionB())
                .optionC(q.getOptionC())
                .optionD(q.getOptionD())
                .correctOption(revealCorrect ? q.getCorrectOption() : null)
                .explanation(revealCorrect ? q.getExplanation() : null)
                .timeLimitSeconds(q.getTimeLimitSeconds())
                .build();
    }

    private String getOptionTextByKeyOrContent(LiveQuestion q, String keyOrContent) {
        if (keyOrContent == null || keyOrContent.isBlank() || q == null) return "";
        String trimmed = keyOrContent.trim();
        if ("A".equalsIgnoreCase(trimmed)) return q.getOptionA() != null ? q.getOptionA().trim() : "";
        if ("B".equalsIgnoreCase(trimmed)) return q.getOptionB() != null ? q.getOptionB().trim() : "";
        if ("C".equalsIgnoreCase(trimmed)) return q.getOptionC() != null ? q.getOptionC().trim() : "";
        if ("D".equalsIgnoreCase(trimmed)) return q.getOptionD() != null ? q.getOptionD().trim() : "";
        return trimmed;
    }

    @Override
    @Transactional
    public void deleteSession(Long sessionId) {
        if (sessionId == null) return;
        log.info("Xóa hoàn toàn LiveSession ID: {}", sessionId);

        // 1. Xóa các bảng con trước để làm sạch triệt để
        livePlayerAnswerRepository.deleteBySessionId(sessionId);
        liveRound3PairRepository.deleteBySessionId(sessionId);
        liveRound2TopicRepository.deleteBySessionId(sessionId);
        liveQuestionRepository.deleteBySessionId(sessionId);
        livePlayerRepository.deleteBySessionId(sessionId);

        // 2. Xóa session
        liveSessionRepository.deleteById(sessionId);

        // 3. Xóa bộ nhớ đệm
        questionStartTimes.keySet().removeIf(k -> k.startsWith(sessionId + ":"));
        previousRanks.clear();

        // 4. Báo qua WebSocket
        broadcast(sessionId, "SESSION_DELETED", Map.of("sessionId", sessionId));
    }

    @Override
    @Transactional
    public void deleteAllSessionsByPhaseId(Long phaseId) {
        if (phaseId == null) return;
        log.info("Xóa toàn bộ các LiveSession thuộc phaseId: {}", phaseId);
        List<LiveSession> sessions = liveSessionRepository.findByPhaseId(phaseId);
        for (LiveSession s : sessions) {
            deleteSession(s.getId());
        }
    }

    @Override
    @Transactional
    public LiveSessionDto resetSessionData(Long sessionId) {
        LiveSession session = null;
        if (sessionId != null) {
            session = liveSessionRepository.findById(sessionId).orElse(null);
        }
        if (session == null) {
            session = liveSessionRepository.findFirstByStatusNotOrderByCreatedAtDesc("FINISHED")
                    .orElseGet(() -> {
                        List<LiveSession> sessions = liveSessionRepository.findAllByOrderByCreatedAtDesc();
                        if (!sessions.isEmpty()) {
                            return sessions.get(0);
                        }
                        return createDefaultSession();
                    });
            log.warn("Phiên thi ID {} không tồn tại. Tự động chuyển làm sạch phiên thi hiện tại: ID {}", sessionId, session.getId());
        }
        final Long actualSessionId = session.getId();
        log.info("Làm sạch toàn bộ dữ liệu thi test cho LiveSession ID: {}", actualSessionId);

        // 1. Xóa sạch lịch sử trả lời của thí sinh (Vòng 1 & Vòng 2)
        livePlayerAnswerRepository.deleteBySessionId(actualSessionId);

        // 2. Xóa sạch kết quả bốc thăm ghép cặp đối kháng Vòng 3
        liveRound3PairRepository.deleteBySessionId(actualSessionId);

        // 3. Reset điểm số, NSHV, mã đề thi và kết quả của các thí sinh về 0 (giữ nguyên danh sách và hồ sơ thí sinh)
        List<LivePlayer> players = livePlayerRepository.findBySessionIdOrderByOrderNumberAsc(actualSessionId);
        for (LivePlayer p : players) {
            p.setHopeStarUsed(false);
            p.setHopeStarQuestionIndex(null);
            p.setRound1Score(BigDecimal.ZERO);
            p.setRound1TotalTimeMs(0L);
            p.setRound2DrawCode(null);
            p.setRound2Scenario1Score(BigDecimal.ZERO);
            p.setRound2Scenario2Score(BigDecimal.ZERO);
            p.setRound2Score(BigDecimal.ZERO);
            p.setRound3PairGroup(null);
            p.setRound3Score(BigDecimal.ZERO);
            p.setTotalScore(BigDecimal.ZERO);
            p.setFinalRank(null);
            p.setIsCheckedIn(false);
            p.setDeviceId(null);
            p.setCheckedInAt(null);
            p.setIsRescueRequested(false);
        }
        livePlayerRepository.saveAll(players);

        // 4. Đưa phiên thi về sảnh chờ LOBBY ban đầu
        session.setStatus("LOBBY");
        session.setCurrentRound(1);
        session.setCurrentQuestionIndex(0);
        session.setRound1State("IDLE");
        liveSessionRepository.save(session);

        // 5. Làm sạch bộ nhớ đệm và trạng thái thời gian thực
        questionStartTimes.keySet().removeIf(k -> k.startsWith(actualSessionId + ":"));
        previousRanks.clear();
        round2BatchRunningMap.remove(actualSessionId);
        round2BatchEndTimes.remove(actualSessionId);
        round2ActiveBatches.remove(actualSessionId);

        // 6. Phát WebSocket broadcast đồng bộ trạng thái đến màn LED Host, Thí sinh và Ban tổ chức
        LiveSessionDto dto = convertToDto(session);
        broadcast(actualSessionId, "SESSION_STATUS_CHANGED", dto);
        broadcast(actualSessionId, "PLAYERS_CONFIGURED", dto.getPlayers());
        broadcast(actualSessionId, "ROUND2_BATCH_RESET", Map.of("sessionId", actualSessionId));
        broadcast(actualSessionId, "ROUND3_PAIR_DRAWN", Map.of("sessionId", actualSessionId, "pairs", List.of()));
        broadcast(actualSessionId, "SESSION_RESET", dto);

        return dto;
    }
}
