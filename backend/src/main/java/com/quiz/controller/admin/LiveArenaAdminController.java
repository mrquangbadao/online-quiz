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

    @PostMapping("/round2/{id}/assign-topic")
    public ResponseEntity<ApiResponse<Void>> assignTopic(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Long playerId = Long.valueOf(body.get("playerId").toString());
        String topicCode = body.get("topicCode").toString();
        liveArenaService.assignRound2Topic(id, playerId, topicCode);
        return ResponseEntity.ok(ApiResponse.ok("Gán mã đề thành công", null));
    }

    @PostMapping("/round2/{id}/show-topic-question")
    public ResponseEntity<ApiResponse<Void>> showRound2TopicQuestion(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        String topicCode = body.get("topicCode") != null ? body.get("topicCode").toString() : "";
        liveArenaService.showRound2TopicQuestion(id, topicCode);
        return ResponseEntity.ok(ApiResponse.ok("Đã hiển thị nội dung đề thi Vòng 2 trên màn hình LED sân khấu", null));
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

    // ==========================================
    // LÀM SẠCH & RESET DỮ LIỆU THI THỬ
    // ==========================================

    @PostMapping({"/session/{id}/reset", "/session/reset"})
    public ResponseEntity<ApiResponse<LiveSessionDto>> resetSession(@PathVariable(required = false) Long id) {
        liveArenaService.resetSessionData(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã làm sạch toàn bộ dữ liệu thi thử, đưa phòng thi về trạng thái ban đầu thành công!", liveArenaService.getActiveSession()));
    }

    @DeleteMapping("/session/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(@PathVariable Long id) {
        liveArenaService.deleteSession(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã xóa hoàn toàn phiên thi và làm sạch dữ liệu thành công!", null));
    }
}
