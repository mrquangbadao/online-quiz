package com.quiz.controller.admin;

import com.quiz.dto.response.AdminExamDetailResponse;
import com.quiz.dto.response.ApiResponse;
import com.quiz.entity.Exam;
import com.quiz.entity.ExamAnswer;
import com.quiz.entity.Question;
import com.quiz.entity.ScenarioQuestion;
import com.quiz.exception.BusinessException;
import com.quiz.repository.ExamAnswerRepository;
import com.quiz.repository.ExamRepository;
import com.quiz.repository.QuestionRepository;
import com.quiz.repository.ScenarioQuestionRepository;
import com.quiz.service.LeaderboardService;
import com.quiz.service.admin.AdminReportService;
import com.quiz.util.PhoneMaskUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminReportController {

    private final AdminReportService adminReportService;
    private final LeaderboardService leaderboardService;
    private final ExamRepository examRepository;
    private final ExamAnswerRepository examAnswerRepository;
    private final QuestionRepository questionRepository;
    private final ScenarioQuestionRepository scenarioQuestionRepository;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<?>> getDashboard(
            @RequestParam(required = false) Long phaseId) {
        return ResponseEntity.ok(ApiResponse.ok(adminReportService.getDashboardStats(phaseId)));
    }

    @GetMapping("/exams")
    public ResponseEntity<ApiResponse<?>> getAllExams() {
        return ResponseEntity.ok(ApiResponse.ok(leaderboardService.getLeaderboard(null)));
    }

    @GetMapping("/exams/{examId}")
    public ResponseEntity<ApiResponse<AdminExamDetailResponse>> getExamDetail(
            @PathVariable Long examId) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new BusinessException("EXAM_NOT_FOUND", "Bài thi không tồn tại"));

        List<ExamAnswer> answers = examAnswerRepository.findByExamId(examId);

        // Build question content maps
        List<Long> mcIds = answers.stream()
                .filter(a -> "MC".equals(a.getQuestionType()))
                .map(ExamAnswer::getQuestionId).collect(Collectors.toList());
        List<Long> scIds = answers.stream()
                .filter(a -> "SC".equals(a.getQuestionType()))
                .map(ExamAnswer::getQuestionId).collect(Collectors.toList());

        Map<Long, Question> mcMap = questionRepository.findAllById(mcIds).stream()
                .collect(Collectors.toMap(Question::getId, q -> q));
        Map<Long, ScenarioQuestion> scMap = scenarioQuestionRepository.findAllById(scIds).stream()
                .collect(Collectors.toMap(ScenarioQuestion::getId, q -> q));

        List<AdminExamDetailResponse.AnswerDetail> answerDetails = answers.stream()
                .map(a -> {
                    AdminExamDetailResponse.AnswerDetail.AnswerDetailBuilder b =
                            AdminExamDetailResponse.AnswerDetail.builder()
                                    .questionId(a.getQuestionId())
                                    .questionType(a.getQuestionType())
                                    .selectedAnswer(a.getSelectedAnswer())
                                    .isCorrect(a.getIsCorrect());
                    if ("MC".equals(a.getQuestionType())) {
                        Question q = mcMap.get(a.getQuestionId());
                        if (q != null) {
                            b.questionContent(q.getContent())
                                    .correctAnswer(q.getCorrectAnswer())
                                    .optionA(q.getOptionA()).optionB(q.getOptionB())
                                    .optionC(q.getOptionC()).optionD(q.getOptionD())
                                    .optionE(q.getOptionE());
                        }
                    } else {
                        ScenarioQuestion sq = scMap.get(a.getQuestionId());
                        if (sq != null) {
                            b.questionContent(sq.getTitle())
                                    .correctAnswer(sq.getCorrectAnswer())
                                    .optionA(sq.getOptionA()).optionB(sq.getOptionB())
                                    .optionC(sq.getOptionC()).optionD(sq.getOptionD())
                                    .optionE(sq.getOptionE());
                        }
                    }
                    return b.build();
                })
                .collect(Collectors.toList());

        AdminExamDetailResponse response = AdminExamDetailResponse.builder()
                .examId(exam.getId())
                .fullName(exam.getContestant().getFullName())
                .unit(exam.getContestant().getUnit())
                .phone(PhoneMaskUtil.mask(exam.getContestant().getPhone()))
                .startTime(exam.getStartTime())
                .endTime(exam.getEndTime())
                .durationSeconds(exam.getDurationSeconds())
                .mcScore(exam.getMcScore())
                .scenarioScore(exam.getScenarioScore())
                .totalScore(exam.getTotalScore())
                .prediction(exam.getPrediction())
                .status(exam.getStatus().name())
                .phaseName(exam.getPhase() != null ? exam.getPhase().getName() : null)
                .answers(answerDetails)
                .build();

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/stats/by-unit")
    public ResponseEntity<ApiResponse<?>> getUnitStats(
            @RequestParam(required = false) Long phaseId) {
        return ResponseEntity.ok(ApiResponse.ok(adminReportService.getUnitStats(phaseId)));
    }

    @GetMapping("/reports/export")
    public ResponseEntity<byte[]> exportExcel() throws IOException {
        byte[] data = adminReportService.exportExcel();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"results.xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }
}
