package com.quiz.controller.admin;

import com.quiz.dto.live.LivePlayerDto;
import com.quiz.dto.live.LiveSessionDto;
import com.quiz.dto.response.ApiResponse;
import com.quiz.entity.LivePlayerAnswer;
import com.quiz.entity.LiveQuestion;
import com.quiz.entity.LiveRound2Topic;
import com.quiz.entity.LiveRound3Pair;
import com.quiz.service.LiveArenaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin/live")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class LiveArenaAdminController {

    private final LiveArenaService liveArenaService;

    @PostMapping("/session/create")
    public ResponseEntity<ApiResponse<LiveSessionDto>> createOrActivateSession(@RequestBody Map<String, Object> body) {
        Long phaseId = body.get("phaseId") != null ? Long.valueOf(body.get("phaseId").toString()) : 1L;
        String name = body.get("name") != null ? body.get("name").toString() : "Vòng Chung kết Cấp tỉnh 2026";
        LiveSessionDto session = liveArenaService.createOrActivateSession(phaseId, name);
        return ResponseEntity.ok(ApiResponse.ok("Khởi tạo phiên thi thành công", session));
    }

    @PostMapping("/session/{id}/init-players")
    public ResponseEntity<ApiResponse<List<LivePlayerDto>>> initPlayers(@PathVariable Long id) {
        List<LivePlayerDto> players = liveArenaService.initTop10Players(id);
        return ResponseEntity.ok(ApiResponse.ok("Khởi tạo danh sách 10 thí sinh mẫu thành công", players));
    }

    @GetMapping("/session/{id}/preview-top10")
    public ResponseEntity<ApiResponse<List<LivePlayerDto>>> previewTop10(@PathVariable Long id) {
        List<LivePlayerDto> players = liveArenaService.getPreliminaryTop10(id);
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách Top 10 thí sinh từ Vòng sơ loại thành công", players));
    }

    @PostMapping("/session/{id}/import-top10")
    public ResponseEntity<ApiResponse<List<LivePlayerDto>>> importTop10(@PathVariable Long id) {
        List<LivePlayerDto> players = liveArenaService.importTop10FromPreliminary(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã lấy thành công Top 10 thí sinh từ Vòng sơ loại!", players));
    }

    @PostMapping("/session/{id}/save-players")
    public ResponseEntity<ApiResponse<List<LivePlayerDto>>> savePlayers(
            @PathVariable Long id,
            @RequestBody List<LivePlayerDto> players) {
        List<LivePlayerDto> saved = liveArenaService.saveTop10Players(id, players);
        return ResponseEntity.ok(ApiResponse.ok("Lưu danh sách thí sinh thành công", saved));
    }

    @PostMapping("/player/{id}/support-otp")
    public ResponseEntity<ApiResponse<Map<String, String>>> generateSupportOtp(@PathVariable Long id) {
        String otpCode = liveArenaService.generateSupportOtpForPlayer(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã cấp mã OTP cứu hộ thành công", Map.of("otpCode", otpCode)));
    }

    @PostMapping("/player/{id}/bypass-checkin")
    public ResponseEntity<ApiResponse<LivePlayerDto>> bypassCheckIn(@PathVariable Long id) {
        LivePlayerDto player = liveArenaService.bypassCheckIn(id);
        return ResponseEntity.ok(ApiResponse.ok("Cứu hộ thành công: Đã cho phép thí sinh vào thi trực tiếp!", player));
    }

    @PostMapping("/player/{id}/reset-checkin")
    public ResponseEntity<ApiResponse<LivePlayerDto>> resetCheckIn(@PathVariable Long id) {
        LivePlayerDto player = liveArenaService.resetPlayerCheckIn(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã mời thí sinh ra khỏi phòng chờ / Đặt lại trạng thái!", player));
    }

    @PostMapping("/player/{id}/avatar")
    public ResponseEntity<ApiResponse<LivePlayerDto>> updateAvatar(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String avatarUrl = body.get("avatarUrl");
        LivePlayerDto player = liveArenaService.updatePlayerAvatar(id, avatarUrl);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật ảnh đại diện thành công", player));
    }

    // ==========================================
    // CẤU HÌNH TRƯỚC CUỘC THI (PRE-CONTEST SETUP)
    // ==========================================

    @GetMapping("/session/{id}/questions")
    public ResponseEntity<ApiResponse<List<LiveQuestion>>> getQuestions(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(liveArenaService.getQuestions(id)));
    }

    @PostMapping("/session/{id}/save-questions")
    public ResponseEntity<ApiResponse<List<LiveQuestion>>> saveQuestions(
            @PathVariable Long id,
            @RequestBody List<LiveQuestion> questions) {
        List<LiveQuestion> saved = liveArenaService.saveQuestions(id, questions);
        return ResponseEntity.ok(ApiResponse.ok("Đã lưu bộ 10 câu hỏi Vòng 1 thành công", saved));
    }

    @PostMapping("/session/{id}/save-round2-topics")
    public ResponseEntity<ApiResponse<List<LiveRound2Topic>>> saveRound2Topics(
            @PathVariable Long id,
            @RequestBody List<LiveRound2Topic> topics) {
        List<LiveRound2Topic> saved = liveArenaService.saveRound2Topics(id, topics);
        return ResponseEntity.ok(ApiResponse.ok("Đã lưu danh sách đề thi Vòng 2 thành công", saved));
    }

    @PostMapping("/session/{id}/set-round")
    public ResponseEntity<ApiResponse<Void>> setSessionRound(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Integer round = Integer.valueOf(body.get("round").toString());
        String status = body.get("status") != null ? body.get("status").toString() : null;
        liveArenaService.setSessionRound(id, round, status);
        return ResponseEntity.ok(ApiResponse.ok("Chuyển chặng thi thành công", null));
    }

    // ==========================================
    // VÒNG 1: THÔNG THÁI (4 NHỊP ĐIỀU HÀNH)
    // ==========================================

    @PostMapping("/round1/{id}/hope-star-start")
    public ResponseEntity<ApiResponse<Void>> startHopeStar(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) {
        Integer questionOrder = body.get("questionOrder");
        liveArenaService.startHopeStarCountdown(id, questionOrder);
        return ResponseEntity.ok(ApiResponse.ok("Bắt đầu 5s chọn Ngôi sao hi vọng", null));
    }

    @PostMapping("/round1/{id}/video-play")
    public ResponseEntity<ApiResponse<Void>> playVideo(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) {
        Integer questionOrder = body.get("questionOrder");
        liveArenaService.setVideoPlaying(id, questionOrder);
        return ResponseEntity.ok(ApiResponse.ok("Bật video câu hỏi", null));
    }

    @PostMapping("/round1/{id}/question-read")
    public ResponseEntity<ApiResponse<Void>> readQuestion(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) {
        Integer questionOrder = body.get("questionOrder");
        liveArenaService.setQuestionReading(id, questionOrder);
        return ResponseEntity.ok(ApiResponse.ok("Hiển thị câu hỏi để MC đọc", null));
    }

    @PostMapping("/round1/{id}/question-start")
    public ResponseEntity<ApiResponse<Void>> startQuestion(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) {
        Integer questionOrder = body.get("questionOrder");
        liveArenaService.startQuestionTimer(id, questionOrder);
        return ResponseEntity.ok(ApiResponse.ok("Bắt đầu đếm ngược 40 giây", null));
    }

    @PostMapping("/round1/{id}/answer-reveal")
    public ResponseEntity<ApiResponse<LiveSessionDto>> revealAnswer(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) {
        Integer questionOrder = body.get("questionOrder");
        LiveSessionDto dto = liveArenaService.revealAnswer(id, questionOrder);
        return ResponseEntity.ok(ApiResponse.ok("Công bố đáp án", dto));
    }

    @PostMapping("/round1/{id}/show-leaderboard")
    public ResponseEntity<ApiResponse<LiveSessionDto>> showLeaderboard(@PathVariable Long id) {
        LiveSessionDto dto = liveArenaService.showLeaderboard(id);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật bảng xếp hạng", dto));
    }

    @GetMapping("/round1/session/{id}/question/{questionId}/answers")
    public ResponseEntity<ApiResponse<List<LivePlayerAnswer>>> getAnswersForQuestion(
            @PathVariable Long id,
            @PathVariable Long questionId) {
        return ResponseEntity.ok(ApiResponse.ok(liveArenaService.getAnswersForQuestion(id, questionId)));
    }

    // ==========================================
    // VÒNG 2: NHẠY BÉN (MÃ ĐỀ & ĐIỂM)
    // ==========================================

    @PostMapping("/round2/{id}/select-candidate")
    public ResponseEntity<ApiResponse<Void>> selectRound2Candidate(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Long playerId = Long.valueOf(body.get("playerId").toString());
        liveArenaService.selectRound2Candidate(id, playerId);
        return ResponseEntity.ok(ApiResponse.ok("Đã chọn thí sinh chuẩn bị chọn đề", null));
    }

    @PostMapping("/round2/{id}/assign-topic")
    public ResponseEntity<ApiResponse<Void>> assignTopic(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Long playerId = Long.valueOf(body.get("playerId").toString());
        String topicCode = body.get("topicCode").toString();
        liveArenaService.assignRound2Topic(id, playerId, topicCode);
        return ResponseEntity.ok(ApiResponse.ok("Gán mã đề thành công", null));
    }

    @PostMapping("/round2/{id}/unassign-topic")
    public ResponseEntity<ApiResponse<Void>> unassignRound2Topic(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Long playerId = Long.valueOf(body.get("playerId").toString());
        liveArenaService.unassignRound2Topic(id, playerId);
        return ResponseEntity.ok(ApiResponse.ok("Đã mở khóa mã đề cho thí sinh thành công", null));
    }

    @PostMapping("/round2/{id}/reset-player")
    public ResponseEntity<ApiResponse<Void>> resetPlayerRound2(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Long playerId = Long.valueOf(body.get("playerId").toString());
        liveArenaService.resetPlayerRound2(id, playerId);
        return ResponseEntity.ok(ApiResponse.ok("Đã thiết lập lại Vòng 2 cho thí sinh thành công", null));
    }

    @PostMapping("/round2/{id}/show-topic-question")
    public ResponseEntity<ApiResponse<Void>> showRound2TopicQuestion(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        String topicCode = body.get("topicCode") != null ? body.get("topicCode").toString() : "";
        liveArenaService.showRound2TopicQuestion(id, topicCode);
        return ResponseEntity.ok(ApiResponse.ok("Đã hiển thị nội dung đề thi Vòng 2 trên màn hình LED sân khấu", null));
    }

    @PostMapping("/round2/{id}/start-batch")
    public ResponseEntity<ApiResponse<Void>> startRound2Batch(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Object> rawList = (List<Object>) body.get("playerIds");
        List<Long> playerIds = rawList != null ? rawList.stream().map(o -> Long.valueOf(o.toString())).toList() : List.of();
        Integer duration = body.get("durationSeconds") != null ? Integer.valueOf(body.get("durationSeconds").toString()) : 600;
        liveArenaService.startRound2Batch(id, playerIds, duration);
        return ResponseEntity.ok(ApiResponse.ok("Bắt đầu đợt thi Vòng 2 thành công", null));
    }

    @PostMapping("/round2/{id}/end-batch")
    public ResponseEntity<ApiResponse<Void>> endRound2Batch(@PathVariable Long id) {
        liveArenaService.endRound2Batch(id);
        return ResponseEntity.ok(ApiResponse.ok("Kết thúc thời gian làm bài đợt thi Vòng 2", null));
    }

    @PostMapping("/round2/{id}/show-leaderboard")
    public ResponseEntity<ApiResponse<Void>> showRound2Leaderboard(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        String viewType = (body != null && body.get("viewType") != null) ? body.get("viewType").toString() : "ROUND2_ONLY";
        liveArenaService.showRound2Leaderboard(id, viewType);
        return ResponseEntity.ok(ApiResponse.ok("Công bố bảng điểm Vòng 2 thành công", null));
    }

    @PostMapping("/round2/{id}/show-selecting")
    public ResponseEntity<ApiResponse<Void>> showRound2Selecting(@PathVariable Long id) {
        liveArenaService.showRound2Selecting(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã chuyển màn hình LED về chế độ chọn mã đề", null));
    }

    @PostMapping("/round2/{id}/reset-batch")
    public ResponseEntity<ApiResponse<Void>> resetRound2Batch(@PathVariable Long id) {
        liveArenaService.resetRound2Batch(id);
        return ResponseEntity.ok(ApiResponse.ok("Làm mới đợt thi Vòng 2 thành công", null));
    }

    @PostMapping("/round2/{id}/reset-topics")
    public ResponseEntity<ApiResponse<List<LiveRound2Topic>>> resetRound2Topics(@PathVariable Long id) {
        List<LiveRound2Topic> topics = liveArenaService.resetDefaultRound2Topics(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã nạp lại 10 bộ đề thi chuẩn từ Ban tổ chức", topics));
    }

    @PostMapping("/round2/player/{id}/score")
    public ResponseEntity<ApiResponse<Void>> updateRound2Score(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        BigDecimal s1 = body.get("scenario1Score") != null ? new BigDecimal(body.get("scenario1Score").toString()) : BigDecimal.ZERO;
        BigDecimal s2 = body.get("scenario2Score") != null ? new BigDecimal(body.get("scenario2Score").toString()) : BigDecimal.ZERO;
        liveArenaService.updateRound2Score(id, s1, s2);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật điểm Vòng 2 thành công", null));
    }

    @GetMapping("/round2/{id}/topics")
    public ResponseEntity<ApiResponse<List<LiveRound2Topic>>> getRound2Topics(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(liveArenaService.getRound2Topics(id)));
    }

    // ==========================================
    // VÒNG 3: BẢN LĨNH (BỐC THĂM & ĐIỂM ĐỐI KHÁNG)
    // ==========================================

    @PostMapping("/round3/{id}/random-draw")
    public ResponseEntity<ApiResponse<List<LiveRound3Pair>>> drawRandomPairs(@PathVariable Long id) {
        List<LiveRound3Pair> pairs = liveArenaService.generateRandomPairs(id);
        return ResponseEntity.ok(ApiResponse.ok("Bốc thăm ghép cặp ngẫu nhiên thành công", pairs));
    }

    @PostMapping("/round3/{id}/assign-pair")
    public ResponseEntity<ApiResponse<LiveRound3Pair>> assignRound3Pair(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Integer pairNumber = Integer.valueOf(body.get("pairNumber").toString());
        Long player1Id = Long.valueOf(body.get("player1Id").toString());
        Long player2Id = Long.valueOf(body.get("player2Id").toString());
        LiveRound3Pair pair = liveArenaService.assignRound3Pair(id, pairNumber, player1Id, player2Id);
        return ResponseEntity.ok(ApiResponse.ok("Gán cặp đấu thành công", pair));
    }

    @PostMapping("/round3/{id}/delete-pair")
    public ResponseEntity<ApiResponse<Void>> deleteRound3Pair(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Integer pairNumber = Integer.valueOf(body.get("pairNumber").toString());
        liveArenaService.deleteRound3Pair(id, pairNumber);
        return ResponseEntity.ok(ApiResponse.ok("Đã xóa cặp đấu", null));
    }

    @PostMapping("/round3/{id}/reset-pairs")
    public ResponseEntity<ApiResponse<Void>> resetAllRound3Pairs(@PathVariable Long id) {
        liveArenaService.resetAllRound3Pairs(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã làm mới toàn bộ cặp đấu Vòng 3", null));
    }

    @GetMapping("/round3/{id}/display-pairs")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRound3DisplayPairs(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(liveArenaService.getRound3DisplayPairs(id)));
    }

    @PostMapping("/round3/{id}/display-duel")
    public ResponseEntity<ApiResponse<Void>> displayRound3Duel(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Integer pairNumber = Integer.valueOf(body.get("pairNumber").toString());
        liveArenaService.displayRound3Duel(id, pairNumber);
        return ResponseEntity.ok(ApiResponse.ok("Đã hiển thị cặp đấu trên màn hình LED (Chờ phổ biến đề)", null));
    }

    @PostMapping("/round3/{id}/start-duel")
    public ResponseEntity<ApiResponse<Void>> startRound3Duel(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Integer pairNumber = Integer.valueOf(body.get("pairNumber").toString());
        String stage = body.get("stage") != null ? body.get("stage").toString() : "STAGE_1_PREP";
        String stageTitle = body.get("stageTitle") != null ? body.get("stageTitle").toString() : "Giai đoạn 1: Đề xuất phương án";
        Integer durationSeconds = body.get("durationSeconds") != null ? Integer.valueOf(body.get("durationSeconds").toString()) : 120;
        Long activePlayerId = body.get("activePlayerId") != null && !body.get("activePlayerId").toString().isBlank()
                ? Long.valueOf(body.get("activePlayerId").toString())
                : null;
        liveArenaService.startRound3Duel(id, pairNumber, stage, stageTitle, durationSeconds, activePlayerId);
        return ResponseEntity.ok(ApiResponse.ok("Đã bắt đầu phần thi của cặp đấu", null));
    }

    @PostMapping("/round3/{id}/stop-duel-timer")
    public ResponseEntity<ApiResponse<Void>> stopRound3DuelTimer(@PathVariable Long id) {
        liveArenaService.stopRound3DuelTimer(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã dừng đồng hồ phần thi", null));
    }

    @PostMapping("/round3/{id}/start-overtime")
    public ResponseEntity<ApiResponse<Void>> startRound3Overtime(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        Long playerId = (body != null && body.get("playerId") != null) ? Long.valueOf(body.get("playerId").toString()) : null;
        liveArenaService.startRound3Overtime(id, playerId);
        return ResponseEntity.ok(ApiResponse.ok("Đã bắt đầu đếm thời gian quá giờ", null));
    }

    @PostMapping("/round3/{id}/stop-overtime")
    public ResponseEntity<ApiResponse<Void>> stopRound3Overtime(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        Integer overtimeSeconds = (body != null && body.get("overtimeSeconds") != null) ? Integer.valueOf(body.get("overtimeSeconds").toString()) : 0;
        liveArenaService.stopRound3Overtime(id, overtimeSeconds);
        return ResponseEntity.ok(ApiResponse.ok("Đã dừng đếm thời gian quá giờ", null));
    }

    @PostMapping("/round3/{id}/show-all-pairs")
    public ResponseEntity<ApiResponse<Void>> showAllRound3Pairs(@PathVariable Long id) {
        liveArenaService.showAllRound3Pairs(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã chuyển về màn hình tổng quan 5 cặp đấu", null));
    }

    @PostMapping("/round3/{id}/show-rules")
    public ResponseEntity<ApiResponse<Void>> showRound3Rules(@PathVariable Long id) {
        liveArenaService.showRound3Rules(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã chuyển màn hình LED sang phổ biến Thể lệ Vòng 3", null));
    }

    @PostMapping("/round3/player/{id}/score")
    public ResponseEntity<ApiResponse<Void>> updateRound3Score(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        BigDecimal score = body.get("score") != null ? new BigDecimal(body.get("score").toString()) : BigDecimal.ZERO;
        liveArenaService.updateRound3Score(id, score);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật điểm Vòng 3 thành công", null));
    }

    @GetMapping("/round3/{id}/pairs")
    public ResponseEntity<ApiResponse<List<LiveRound3Pair>>> getRound3Pairs(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(liveArenaService.getRound3Pairs(id)));
    }

    // ==========================================
    // TỔNG KẾT & VINH DANH
    // ==========================================

    @PostMapping("/session/{id}/finish")
    public ResponseEntity<ApiResponse<LiveSessionDto>> finishSession(@PathVariable Long id) {
        LiveSessionDto dto = liveArenaService.finishSession(id);
        return ResponseEntity.ok(ApiResponse.ok("Vinh danh và kết thúc phiên thi thành công", dto));
    }

    @PostMapping("/session/{id}/finish-view")
    public ResponseEntity<ApiResponse<Void>> switchFinishViewMode(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String viewMode = body != null ? body.getOrDefault("viewMode", "PODIUM") : "PODIUM";
        liveArenaService.switchFinishViewMode(id, viewMode);
        return ResponseEntity.ok(ApiResponse.ok("Đã chuyển chế độ hiển thị tổng kết", null));
    }

    // ==========================================
    // LÀM SẠCH & RESET DỮ LIỆU THI THỬ
    // ==========================================

    @PostMapping({"/session/{id}/reset", "/session/reset"})
    public ResponseEntity<ApiResponse<LiveSessionDto>> resetSession(@PathVariable(required = false) Long id) {
        LiveSessionDto dto = liveArenaService.resetSessionData(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã làm sạch toàn bộ dữ liệu thi thử, đưa phòng thi về trạng thái ban đầu thành công!", dto));
    }

    @DeleteMapping("/session/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(@PathVariable Long id) {
        liveArenaService.deleteSession(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã xóa hoàn toàn phiên thi và làm sạch dữ liệu thành công!", null));
    }
}
