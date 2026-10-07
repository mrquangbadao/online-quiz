package com.quiz.controller;

import com.quiz.dto.live.LiveAnswerSubmissionDto;
import com.quiz.dto.live.LivePlayerDto;
import com.quiz.dto.live.LiveQuestionDto;
import com.quiz.dto.live.LiveSessionDto;
import com.quiz.dto.response.ApiResponse;
import com.quiz.entity.LiveRound2Topic;
import com.quiz.entity.LiveRound3Pair;
import com.quiz.service.LiveArenaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/live")
@RequiredArgsConstructor
public class LiveArenaController {

    private final LiveArenaService liveArenaService;

    @GetMapping("/session/active")
    public ResponseEntity<ApiResponse<LiveSessionDto>> getActiveSession() {
        return ResponseEntity.ok(ApiResponse.ok(liveArenaService.getActiveSession()));
    }

    @GetMapping("/session/{id}")
    public ResponseEntity<ApiResponse<LiveSessionDto>> getSessionById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(liveArenaService.getSessionById(id)));
    }

    @GetMapping("/finalists")
    public ResponseEntity<ApiResponse<List<LivePlayerDto>>> getActiveFinalists() {
        LiveSessionDto active = liveArenaService.getActiveSession();
        return ResponseEntity.ok(ApiResponse.ok(active != null ? active.getPlayers() : List.of()));
    }

    @PostMapping("/auth/request-otp")
    public ResponseEntity<ApiResponse<String>> requestPlayerOtp(@RequestBody Map<String, Object> body) {
        Long sessionId = Long.valueOf(body.get("sessionId").toString());
        String email = body.get("email") != null ? body.get("email").toString() : "";
        Long playerId = body.get("playerId") != null ? Long.valueOf(body.get("playerId").toString()) : null;
        liveArenaService.requestPlayerOtp(sessionId, playerId, email);
        return ResponseEntity.ok(ApiResponse.ok("Mã xác thực OTP đã được gửi đến email " + email));
    }

    @PostMapping("/auth/verify-otp")
    public ResponseEntity<ApiResponse<LivePlayerDto>> verifyPlayerOtp(@RequestBody Map<String, Object> body) {
        Long sessionId = Long.valueOf(body.get("sessionId").toString());
        String email = body.get("email") != null ? body.get("email").toString() : "";
        String otp = body.get("otp").toString();
        Long playerId = body.get("playerId") != null ? Long.valueOf(body.get("playerId").toString()) : null;
        String deviceId = body.get("deviceId") != null ? body.get("deviceId").toString() : null;
        LivePlayerDto player = liveArenaService.verifyPlayerOtp(sessionId, playerId, email, otp, deviceId);
        return ResponseEntity.ok(ApiResponse.ok("Xác thực OTP thành công! Thí sinh đã sẵn sàng vào sàn đấu.", player));
    }

    @PostMapping("/player/check-in")
    public ResponseEntity<ApiResponse<LivePlayerDto>> checkInPlayer(@RequestBody Map<String, Long> payload) {
        Long sessionId = payload.get("sessionId");
        Long playerId = payload.get("playerId");
        LivePlayerDto player = liveArenaService.checkInPlayer(sessionId, playerId);
        return ResponseEntity.ok(ApiResponse.ok("Điểm danh thành công", player));
    }

    @PostMapping("/player/{playerId}/release-checkin")
    public ResponseEntity<ApiResponse<LivePlayerDto>> releaseCheckIn(
            @PathVariable Long playerId,
            @RequestParam(required = false) String deviceId) {
        LivePlayerDto player = liveArenaService.resetPlayerCheckIn(playerId, deviceId);
        return ResponseEntity.ok(ApiResponse.ok("Đã thoát phòng thi thành công", player));
    }

    @PostMapping("/player/{playerId}/request-rescue")
    public ResponseEntity<ApiResponse<LivePlayerDto>> requestRescue(
            @PathVariable Long playerId,
            @RequestParam(required = false) String deviceId) {
        LivePlayerDto player = liveArenaService.requestRescue(playerId, deviceId);
        return ResponseEntity.ok(ApiResponse.ok("Đã gửi yêu cầu cứu hộ tới Ban Tổ chức!", player));
    }

    @GetMapping("/question/{questionId}/player/{playerId}")
    public ResponseEntity<ApiResponse<LiveQuestionDto>> getShuffledQuestion(
            @PathVariable Long questionId,
            @PathVariable Long playerId) {
        LiveQuestionDto question = liveArenaService.getShuffledQuestionForPlayer(questionId, playerId);
        return ResponseEntity.ok(ApiResponse.ok(question));
    }

    @PostMapping("/answer/submit")
    public ResponseEntity<ApiResponse<String>> submitAnswer(@Valid @RequestBody LiveAnswerSubmissionDto submission) {
        liveArenaService.submitAnswer(submission);
        return ResponseEntity.ok(ApiResponse.ok("Nộp câu trả lời thành công"));
    }

    @PostMapping("/hope-star/activate")
    public ResponseEntity<ApiResponse<Boolean>> activateHopeStar(@RequestBody Map<String, Object> payload) {
        Long sessionId = Long.valueOf(payload.get("sessionId").toString());
        Long playerId = Long.valueOf(payload.get("playerId").toString());
        Integer questionOrder = Integer.valueOf(payload.get("questionOrder").toString());
        String deviceId = payload.get("deviceId") != null ? payload.get("deviceId").toString() : null;

        boolean success = liveArenaService.activateHopeStar(sessionId, playerId, questionOrder, deviceId);
        if (!success) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Không thể kích hoạt Ngôi sao hy vọng (sai thời điểm hoặc đã sử dụng)!"));
        }
        return ResponseEntity.ok(ApiResponse.ok("Kích hoạt Ngôi sao hy vọng thành công", true));
    }

    @GetMapping("/round2/session/{sessionId}/topics")
    public ResponseEntity<ApiResponse<List<LiveRound2Topic>>> getRound2Topics(@PathVariable Long sessionId) {
        return ResponseEntity.ok(ApiResponse.ok(liveArenaService.getRound2Topics(sessionId)));
    }

    @GetMapping("/round3/session/{sessionId}/pairs")
    public ResponseEntity<ApiResponse<List<LiveRound3Pair>>> getRound3Pairs(@PathVariable Long sessionId) {
        return ResponseEntity.ok(ApiResponse.ok(liveArenaService.getRound3Pairs(sessionId)));
    }
}
