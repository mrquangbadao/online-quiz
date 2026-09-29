package com.quiz.controller.admin;

import com.quiz.dto.response.ApiResponse;
import com.quiz.service.ExamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/exams")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminExamController {

    private final ExamService examService;

    /**
     * Resets (deletes) an exam so the contestant can retake it.
     * Use case: admin accidentally started a test, or contestant had technical issues.
     */
    @DeleteMapping("/{examId}")
    public ResponseEntity<ApiResponse<Void>> resetExam(@PathVariable Long examId) {
        examService.resetExam(examId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
