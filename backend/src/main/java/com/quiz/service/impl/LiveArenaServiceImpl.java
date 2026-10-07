package com.quiz.service.impl;

import com.quiz.dto.live.*;
import com.quiz.entity.*;
import com.quiz.repository.*;
import com.quiz.service.LiveArenaService;
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
            LivePlayer p = LivePlayer.builder()
                    .sessionId(sessionId)
                    .contestantId(d.getContestantId())
                    .orderNumber(d.getOrderNumber() != 0 ? d.getOrderNumber() : order)
                    .fullName(d.getFullName() != null ? d.getFullName().trim() : "")
                    .unit(d.getUnit() != null ? d.getUnit().trim() : "")
                    .position(d.getPosition() != null ? d.getPosition().trim() : "Bí thư Đoàn cơ sở")
                    .email(d.getEmail() != null ? d.getEmail().trim() : "")
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
        payload.put("question", convertQuestionToDto(question, false)); // Chưa lộ đáp án đúng
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
    public void assignRound2Topic(Long sessionId, Long playerId, String topicCode) {
        LivePlayer player = livePlayerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh: " + playerId));
        player.setRound2DrawCode(topicCode);
        livePlayerRepository.save(player);

        LiveRound2Topic topic = liveRound2TopicRepository.findBySessionIdAndCode(sessionId, topicCode).orElse(null);

        Map<String, Object> payload = Map.of(
                "playerId", playerId,
                "playerFullName", player.getFullName(),
                "orderNumber", player.getOrderNumber(),
                "topicCode", topicCode,
                "topic", topic != null ? topic : Map.of()
        );
        broadcast(sessionId, "ROUND2_TOPIC_ASSIGNED", payload);
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
    public void updateRound2Score(Long playerId, BigDecimal score1, BigDecimal score2) {
        LivePlayer player = livePlayerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thí sinh: " + playerId));

        player.setRound2Scenario1Score(score1 != null ? score1 : BigDecimal.ZERO);
        player.setRound2Scenario2Score(score2 != null ? score2 : BigDecimal.ZERO);
        BigDecimal totalR2 = player.getRound2Scenario1Score().add(player.getRound2Scenario2Score());
        player.setRound2Score(totalR2);
        player.setTotalScore(player.getRound1Score().add(totalR2).add(player.getRound3Score()));
        livePlayerRepository.save(player);

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
    @Transactional(readOnly = true)
    public List<LiveRound2Topic> getRound2Topics(Long sessionId) {
        return liveRound2TopicRepository.findBySessionIdOrderByCodeAsc(sessionId);
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

        // Chuẩn bị payload trực quan cho màn hình LED hội trường
        List<Map<String, Object>> displayPairs = new ArrayList<>();
        for (LiveRound3Pair pair : savedPairs) {
            LivePlayer p1 = livePlayerRepository.findById(pair.getPlayer1Id()).orElse(null);
            LivePlayer p2 = livePlayerRepository.findById(pair.getPlayer2Id()).orElse(null);
            displayPairs.add(Map.of(
                    "pairNumber", pair.getPairNumber(),
                    "player1", p1 != null ? convertPlayerToDto(p1) : Map.of(),
                    "player2", p2 != null ? convertPlayerToDto(p2) : Map.of()
            ));
        }

        Map<String, Object> payload = Map.of(
                "sessionId", sessionId,
                "pairs", displayPairs
        );
        broadcast(sessionId, "ROUND3_PAIR_DRAWN", payload);
        return savedPairs;
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

        List<LivePlayer> ranked = livePlayerRepository.findBySessionIdOrderByTotalScoreDescRound1TotalTimeMsAsc(sessionId);
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

    // ==========================================
    // SEED DỮ LIỆU MẪU CHUẨN KỊCH BẢN
    // ==========================================

    @Override
    @Transactional
    public void initDefaultQuestionsAndTopics(Long sessionId) {
        // 10 câu hỏi Vòng 1
        if (liveQuestionRepository.findBySessionIdOrderByQuestionOrderAsc(sessionId).isEmpty()) {
            List<LiveQuestion> questions = List.of(
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(1)
                            .title("Nghị quyết Đại hội Đoàn toàn quốc lần thứ XII xác định mục tiêu xây dựng thế hệ thanh niên Việt Nam phát triển toàn diện, giàu lòng yêu nước, có ý chí tự cường, tự hào dân tộc với bao nhiêu nhóm chỉ tiêu trọng tâm công tác Đoàn và phong trào thanh thiếu nhi nhiệm kỳ 2022 - 2027?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("10 nhóm chỉ tiêu")
                            .optionB("12 nhóm chỉ tiêu")
                            .optionC("14 nhóm chỉ tiêu")
                            .optionD("16 nhóm chỉ tiêu")
                            .correctOption("B")
                            .explanation("Đại hội Đoàn toàn quốc lần thứ XII nhiệm kỳ 2022 - 2027 đã biểu quyết thông qua 12 nhóm chỉ tiêu trọng tâm của cả nhiệm kỳ.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(2)
                            .title("Theo Điều lệ Đoàn TNCS Hồ Chí Minh khóa XII, độ tuổi kết nạp thanh niên vào Đoàn TNCS Hồ Chí Minh được quy định trong khoảng độ tuổi nào sau đây?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("Từ đủ 15 tuổi và không quá 30 tuổi")
                            .optionB("Từ đủ 16 tuổi và không quá 30 tuổi")
                            .optionC("Từ đủ 16 tuổi và không quá 35 tuổi")
                            .optionD("Từ đủ 18 tuổi và không quá 35 tuổi")
                            .correctOption("B")
                            .explanation("Điều lệ Đoàn TNCS Hồ Chí Minh quy định: Thanh niên Việt Nam tuổi từ đủ 16 tuổi và không quá 30 tuổi, tích cực học tập, lao động và bảo vệ Tổ quốc được xét kết nạp vào Đoàn.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(3)
                            .title("Đoàn TNCS Hồ Chí Minh tỉnh Nghệ An được thành lập vào thời gian nào gắn liền với cao trào Xô viết Nghệ Tĩnh lịch sử?")
                            .videoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ") // Minh họa video
                            .videoType("YOUTUBE")
                            .optionA("Năm 1930")
                            .optionB("Năm 1931")
                            .optionC("Năm 1935")
                            .optionD("Năm 1945")
                            .correctOption("B")
                            .explanation("Tổ chức Đoàn TNCS Hồ Chí Minh tỉnh Nghệ An ra đời và trưởng thành gắn liền với mốc son lịch sử năm 1931.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(4)
                            .title("Nội dung nào sau đây KHÔNG thuộc 3 phong trào hành động cách mạng của Đoàn TNCS Hồ Chí Minh trong nhiệm kỳ 2022 - 2027?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("Thanh niên tình nguyện")
                            .optionB("Tuổi trẻ sáng tạo")
                            .optionC("Tuổi trẻ xung kích bảo vệ Tổ quốc")
                            .optionD("Thanh niên lập nghiệp làm giàu")
                            .correctOption("D")
                            .explanation("3 phong trào hành động cách mạng của Đoàn là: Thanh niên tình nguyện, Tuổi trẻ sáng tạo, Tuổi trẻ xung kích bảo vệ Tổ quốc.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(5)
                            .title("Theo Nghị quyết số 39-NQ/TW của Bộ Chính trị về xây dựng và phát triển tỉnh Nghệ An đến năm 2030, tầm nhìn đến năm 2045, Nghệ An được định hướng trở thành trung tâm của vùng nào?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("Bắc Trung Bộ")
                            .optionB("Duyên hải miền Trung")
                            .optionC("Vùng kinh tế trọng điểm miền Trung")
                            .optionD("Bắc Bộ và Bắc Trung Bộ")
                            .correctOption("A")
                            .explanation("Nghị quyết 39-NQ/TW xác định xây dựng Nghệ An phát triển toàn diện, là trung tâm khu vực Bắc Trung Bộ về y tế, giáo dục, thương mại, du lịch, logistics.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(6)
                            .title("Phần mềm Quản lý đoàn viên (App Thanh niên Việt Nam) được triển khai nghiệp vụ số nào sau đây để quản lý chuyển sinh hoạt đoàn tự động?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("Cấp phát mã định danh và QR đoàn viên")
                            .optionB("Nghiệp vụ chuyển sinh hoạt đoàn trực tuyến")
                            .optionC("Đánh giá xếp loại chất lượng đoàn viên tự động")
                            .optionD("Cả A, B và C")
                            .correctOption("D")
                            .explanation("Hệ thống Quản lý đoàn viên tích hợp toàn diện định danh số, chuyển tiếp hồ sơ sinh hoạt đoàn và xếp loại định kỳ.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(7)
                            .title("Chủ đề công tác Đoàn và phong trào thanh thiếu nhi năm 2024 được Ban Bí thư Trung ương Đoàn xác định là gì?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("Năm Chuyển đổi số các hoạt động của Đoàn")
                            .optionB("Năm Thanh niên tình nguyện")
                            .optionC("Xây dựng tổ chức Đoàn vững mạnh toàn diện")
                            .optionD("Khát vọng cống hiến - Lẽ sống thanh niên")
                            .correctOption("B")
                            .explanation("Chủ đề năm 2024 được xác định là: Năm Thanh niên tình nguyện.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(8)
                            .title("Nguyên tắc tổ chức và hoạt động cơ bản nhất của Đoàn TNCS Hồ Chí Minh là nguyên tắc nào?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("Tập trung dân chủ")
                            .optionB("Tự nguyện và hiệp thương")
                            .optionC("Phối hợp và thống nhất hành động")
                            .optionD("Dân chủ cơ sở")
                            .correctOption("A")
                            .explanation("Đoàn TNCS Hồ Chí Minh tổ chức và hoạt động theo nguyên tắc tập trung dân chủ.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(9)
                            .title("Trong sinh hoạt chi đoàn, tỷ lệ đoàn viên có mặt tối thiểu để cuộc họp chi đoàn được coi là hợp lệ theo Hướng dẫn thực hiện Điều lệ Đoàn là bao nhiêu?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("Trên 1/2 tổng số đoàn viên chi đoàn")
                            .optionB("Ít nhất 2/3 tổng số đoàn viên chi đoàn")
                            .optionC("Ít nhất 3/4 tổng số đoàn viên chi đoàn")
                            .optionD("100% đoàn viên chi đoàn")
                            .correctOption("B")
                            .explanation("Cuộc họp chi đoàn chỉ có giá trị khi có ít nhất 2/3 tổng số đoàn viên của chi đoàn có mặt tham dự.")
                            .timeLimitSeconds(40)
                            .build(),
                    LiveQuestion.builder()
                            .sessionId(sessionId)
                            .questionOrder(10)
                            .title("Hội thi Bí thư Đoàn cơ sở giỏi tỉnh Nghệ An năm 2026 đặt ra khẩu hiệu hành động tiêu biểu nào sau đây của người thủ lĩnh thanh niên cơ sở?")
                            .videoUrl("")
                            .videoType("NONE")
                            .optionA("Tiên phong - Bản lĩnh - Đoàn kết - Sáng tạo")
                            .optionB("Thông thái - Nhạy bén - Bản lĩnh")
                            .optionC("Khát vọng - Tiên phong - Đổi mới")
                            .optionD("Trách nhiệm - Kỷ cương - Gương mẫu")
                            .correctOption("B")
                            .explanation("3 chặng thi Vòng chung kết hội tụ phẩm chất của Bí thư Đoàn cơ sở giỏi: Thông thái (Vòng 1), Nhạy bén (Vòng 2), Bản lĩnh (Vòng 3).")
                            .timeLimitSeconds(40)
                            .build()
            );
            liveQuestionRepository.saveAll(questions);
        }

        // 5 Mã đề Vòng 2 (Mỗi đề 2 tình huống nghiệp vụ Quản lý đoàn viên)
        if (liveRound2TopicRepository.findBySessionIdOrderByCodeAsc(sessionId).isEmpty()) {
            List<LiveRound2Topic> topics = List.of(
                    LiveRound2Topic.builder()
                            .sessionId(sessionId)
                            .code("ĐỀ 01")
                            .scenario1("Tình huống 1 (20 điểm): Thao tác tiếp nhận 05 đoàn viên chuyển sinh hoạt Đoàn từ trường Đại học về sinh hoạt tại địa phương trên phần mềm Quản lý đoàn viên, đồng thời cập nhật biến động danh sách chi đoàn trực thuộc.")
                            .scenario2("Tình huống 2 (20 điểm): Thao tác tạo lập đợt đánh giá xếp loại đoàn viên cuối năm cho 10 đoàn viên theo hướng dẫn của Huyện đoàn, xuất báo cáo tổng hợp kết quả.")
                            .maxScore1(BigDecimal.valueOf(20.0))
                            .maxScore2(BigDecimal.valueOf(20.0))
                            .build(),
                    LiveRound2Topic.builder()
                            .sessionId(sessionId)
                            .code("ĐỀ 02")
                            .scenario1("Tình huống 1 (20 điểm): Thao tác chuyển sinh hoạt Đoàn tạm thời cho 03 đoàn viên đi làm ăn xa ngoài tỉnh và giải quyết thủ tục giới thiệu sinh hoạt nơi cư trú trên hệ thống phần mềm.")
                            .scenario2("Tình huống 2 (20 điểm): Thao tác thực hiện quy trình chuẩn bị hồ sơ kết nạp Đoàn viên mới (Lớp đoàn viên 95 năm thành lập Đoàn) trên hệ thống phần mềm Quản lý đoàn viên.")
                            .maxScore1(BigDecimal.valueOf(20.0))
                            .maxScore2(BigDecimal.valueOf(20.0))
                            .build(),
                    LiveRound2Topic.builder()
                            .sessionId(sessionId)
                            .code("ĐỀ 03")
                            .scenario1("Tình huống 1 (20 điểm): Thao tác thực hiện cấp lại thông tin định danh đoàn viên bị sai lệch căn cước công dân và xác thực số điện thoại trên hệ thống phần mềm Quản lý đoàn viên.")
                            .scenario2("Tình huống 2 (20 điểm): Thao tác thành lập mới 01 Chi đoàn Doanh nghiệp ngoài nhà nước trực thuộc Đoàn cơ sở và gán quyền quản trị cho Bí thư chi đoàn mới.")
                            .maxScore1(BigDecimal.valueOf(20.0))
                            .maxScore2(BigDecimal.valueOf(20.0))
                            .build(),
                    LiveRound2Topic.builder()
                            .sessionId(sessionId)
                            .code("ĐỀ 04")
                            .scenario1("Tình huống 1 (20 điểm): Thao tác phân bổ và quản lý thu nộp Đoàn phí trực tuyến năm 2026 cho toàn bộ các chi đoàn trực thuộc Đoàn cơ sở trên hệ thống phần mềm.")
                            .scenario2("Tình huống 2 (20 điểm): Thao tác xử lý thủ tục cho 02 đoàn viên trưởng thành Đoàn theo đúng quy định của Điều lệ Đoàn trên hệ thống.")
                            .maxScore1(BigDecimal.valueOf(20.0))
                            .maxScore2(BigDecimal.valueOf(20.0))
                            .build(),
                    LiveRound2Topic.builder()
                            .sessionId(sessionId)
                            .code("ĐỀ 05")
                            .scenario1("Tình huống 1 (20 điểm): Thao tác đồng bộ dữ liệu đoàn viên tham gia Chiến dịch Thanh niên tình nguyện Hè 2026 và ghi nhận điểm rèn luyện tình nguyện trên ứng dụng Thanh niên Việt Nam.")
                            .scenario2("Tình huống 2 (20 điểm): Thao tác trích xuất danh sách đoàn viên ưu tú giới thiệu cho Đảng xem xét kết nạp và hoàn thiện biên bản nhận xét trên phần mềm.")
                            .maxScore1(BigDecimal.valueOf(20.0))
                            .maxScore2(BigDecimal.valueOf(20.0))
                            .build()
            );
            liveRound2TopicRepository.saveAll(topics);
        }
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
                .currentQuestion(question != null ? convertQuestionToDto(question, "ANSWER_REVEALED".equalsIgnoreCase(s.getRound1State()) || "LEADERBOARD".equalsIgnoreCase(s.getRound1State())) : null)
                .revealedData(revealedData)
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
    public void resetSessionData(Long sessionId) {
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

        // 1. Xóa sạch lịch sử trả lời của thí sinh
        livePlayerAnswerRepository.deleteBySessionId(actualSessionId);

        // 2. Reset điểm số, NSHV, kết quả của các thí sinh về 0
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

        // 3. Đưa phiên thi về sảnh chờ LOBBY ban đầu
        session.setStatus("LOBBY");
        session.setCurrentRound(1);
        session.setCurrentQuestionIndex(0);
        session.setRound1State("IDLE");
        liveSessionRepository.save(session);

        questionStartTimes.keySet().removeIf(k -> k.startsWith(actualSessionId + ":"));
        previousRanks.clear();

        LiveSessionDto dto = convertToDto(session);
        broadcast(actualSessionId, "SESSION_STATUS_CHANGED", dto);
        broadcast(actualSessionId, "PLAYERS_CONFIGURED", dto.getPlayers());
    }
}
