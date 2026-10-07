package com.quiz.service;

import com.quiz.dto.live.*;
import com.quiz.entity.LivePlayerAnswer;
import com.quiz.entity.LiveQuestion;
import com.quiz.entity.LiveRound2Topic;
import com.quiz.entity.LiveRound3Pair;

import java.math.BigDecimal;
import java.util.List;

public interface LiveArenaService {
    LiveSessionDto getActiveSession();
    LiveSessionDto getSessionById(Long sessionId);
    LiveSessionDto createOrActivateSession(Long phaseId, String name);
    List<LivePlayerDto> initTop10Players(Long sessionId);
    List<LivePlayerDto> getPreliminaryTop10(Long sessionId);
    List<LivePlayerDto> importTop10FromPreliminary(Long sessionId);
    List<LivePlayerDto> saveTop10Players(Long sessionId, List<LivePlayerDto> players);
    LivePlayerDto updatePlayerAvatar(Long playerId, String avatarUrl);
    LivePlayerDto checkInPlayer(Long sessionId, Long playerId);
    LivePlayerDto resetPlayerCheckIn(Long playerId);
    LivePlayerDto resetPlayerCheckIn(Long playerId, String deviceId);

    // Đăng nhập thí sinh bằng Email & OTP
    void requestPlayerOtp(Long sessionId, String email);
    void requestPlayerOtp(Long sessionId, Long playerId, String email);
    LivePlayerDto verifyPlayerOtp(Long sessionId, String email, String otp);
    LivePlayerDto verifyPlayerOtp(Long sessionId, Long playerId, String email, String otp);
    LivePlayerDto verifyPlayerOtp(Long sessionId, Long playerId, String email, String otp, String deviceId);

    // Cứu hộ thí sinh bởi Admin (Emergency Rescue)
    String generateSupportOtpForPlayer(Long playerId);
    LivePlayerDto bypassCheckIn(Long playerId);
    LivePlayerDto requestRescue(Long playerId);
    LivePlayerDto requestRescue(Long playerId, String deviceId);

    // Cấu hình trước cuộc thi (Pre-contest Setup)
    List<LiveQuestion> getQuestions(Long sessionId);
    List<LiveQuestion> saveQuestions(Long sessionId, List<LiveQuestion> questions);
    List<LiveRound2Topic> saveRound2Topics(Long sessionId, List<LiveRound2Topic> topics);

    // Vòng 1: Thông thái (4 nhịp điều hành)
    void startHopeStarCountdown(Long sessionId, Integer questionOrder);
    boolean activateHopeStar(Long sessionId, Long playerId, Integer questionOrder, String deviceId);
    void setVideoPlaying(Long sessionId, Integer questionOrder);
    void setQuestionReading(Long sessionId, Integer questionOrder);
    void startQuestionTimer(Long sessionId, Integer questionOrder);
    void submitAnswer(LiveAnswerSubmissionDto submission);
    LiveSessionDto revealAnswer(Long sessionId, Integer questionOrder);
    LiveSessionDto showLeaderboard(Long sessionId);
    LiveQuestionDto getShuffledQuestionForPlayer(Long questionId, Long playerId);

    // Vòng 2: Nhạy bén (Mã đề & Điểm 10 phút)
    void selectRound2Candidate(Long sessionId, Long playerId);
    void assignRound2Topic(Long sessionId, Long playerId, String topicCode);
    void unassignRound2Topic(Long sessionId, Long playerId);
    void resetPlayerRound2(Long sessionId, Long playerId);
    void showRound2TopicQuestion(Long sessionId, String topicCode);
    void startRound2Batch(Long sessionId, List<Long> playerIds, Integer durationSeconds);
    void endRound2Batch(Long sessionId);
    void showRound2Leaderboard(Long sessionId);
    void showRound2Leaderboard(Long sessionId, String viewType);
    void showRound2Selecting(Long sessionId);
    void resetRound2Batch(Long sessionId);
    List<LiveRound2Topic> resetDefaultRound2Topics(Long sessionId);
    void updateRound2Score(Long playerId, BigDecimal score1, BigDecimal score2);
    List<LiveRound2Topic> getRound2Topics(Long sessionId);
    List<LiveRound2Topic> getRound2TopicsForPublic(Long sessionId, Long playerId);

    // Vòng 3: Bản lĩnh (Live Pairing & Đối kháng 3 giai đoạn)
    List<LiveRound3Pair> generateRandomPairs(Long sessionId);
    LiveRound3Pair assignRound3Pair(Long sessionId, Integer pairNumber, Long player1Id, Long player2Id);
    void deleteRound3Pair(Long sessionId, Integer pairNumber);
    void resetAllRound3Pairs(Long sessionId);
    void displayRound3Duel(Long sessionId, Integer pairNumber);
    void startRound3Duel(Long sessionId, Integer pairNumber, String stage, String stageTitle, Integer durationSeconds, Long activePlayerId);
    void stopRound3DuelTimer(Long sessionId);
    void startRound3Overtime(Long sessionId, Long playerId);
    void stopRound3Overtime(Long sessionId, Integer overtimeSeconds);
    void showAllRound3Pairs(Long sessionId);
    void showRound3Rules(Long sessionId);
    java.util.List<java.util.Map<String, Object>> getRound3DisplayPairs(Long sessionId);
    void updateRound3Score(Long playerId, BigDecimal score);
    List<LiveRound3Pair> getRound3Pairs(Long sessionId);

    // Trạng thái phiên & seed
    void setSessionRound(Long sessionId, Integer round, String status);
    void initDefaultQuestionsAndTopics(Long sessionId);
    List<LivePlayerAnswer> getAnswersForQuestion(Long sessionId, Long questionId);

    // Kết thúc & Vinh danh
    LiveSessionDto finishSession(Long sessionId);
    void switchFinishViewMode(Long sessionId, String viewMode);

    // Xóa & Làm sạch dữ liệu phiên thi
    void deleteSession(Long sessionId);
    void deleteAllSessionsByPhaseId(Long phaseId);
    LiveSessionDto resetSessionData(Long sessionId);
}
