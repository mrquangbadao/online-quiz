package com.quiz.controller.admin;

import com.quiz.dto.response.ApiResponse;
import com.quiz.service.admin.AdminQuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/questions")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminQuestionController {

    private final AdminQuestionService adminQuestionService;

    @PostMapping("/import")
    public ResponseEntity<ApiResponse<String>> importQuestions(@RequestParam("file") MultipartFile file) {
        int count = adminQuestionService.importFromExcel(file);
        return ResponseEntity.ok(ApiResponse.ok("Đã import " + count + " câu hỏi thành công", null));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<?>> createQuestion(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.ok("Tạo câu hỏi thành công",
                adminQuestionService.createQuestion(body)));
    }

    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() {
        byte[] bytes = adminQuestionService.generateTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=template_questions.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getAllQuestions() {
        return ResponseEntity.ok(ApiResponse.ok(adminQuestionService.getAllQuestions()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> updateQuestion(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật câu hỏi thành công",
                adminQuestionService.updateQuestion(id, body)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> deleteQuestion(@PathVariable Long id) {
        adminQuestionService.deleteQuestion(id);
        return ResponseEntity.ok(ApiResponse.ok("Xóa câu hỏi thành công", null));
    }

    @GetMapping("/scenarios")
    public ResponseEntity<ApiResponse<?>> getAllScenarioQuestions() {
        return ResponseEntity.ok(ApiResponse.ok(adminQuestionService.getAllScenarioQuestions()));
    }

    @PostMapping("/scenarios")
    public ResponseEntity<ApiResponse<?>> createScenarioQuestion(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.ok("Tạo câu hỏi tình huống thành công",
                adminQuestionService.createScenarioQuestion(body)));
    }

    @PutMapping("/scenarios/{id}")
    public ResponseEntity<ApiResponse<?>> updateScenarioQuestion(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật câu hỏi tình huống thành công",
                adminQuestionService.updateScenarioQuestion(id, body)));
    }

    @DeleteMapping("/scenarios/{id}")
    public ResponseEntity<ApiResponse<?>> deleteScenarioQuestion(@PathVariable Long id) {
        adminQuestionService.deleteScenarioQuestion(id);
        return ResponseEntity.ok(ApiResponse.ok("Xóa câu hỏi tình huống thành công", null));
    }
}

