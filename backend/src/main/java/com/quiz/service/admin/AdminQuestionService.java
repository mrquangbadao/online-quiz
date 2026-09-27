package com.quiz.service.admin;

import com.quiz.entity.Question;
import com.quiz.entity.ScenarioQuestion;
import com.quiz.exception.BusinessException;
import com.quiz.repository.QuestionRepository;
import com.quiz.repository.ScenarioQuestionRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminQuestionService {

    private final QuestionRepository questionRepository;
    private final ScenarioQuestionRepository scenarioQuestionRepository;

    @Transactional
    public int importFromExcel(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("IMPORT_FAILED", "File tải lên trống");
        }
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.toLowerCase().endsWith(".xlsx")) {
            throw new BusinessException("IMPORT_FAILED", "Chỉ hỗ trợ định dạng file .xlsx");
        }

        List<Question> questions = new ArrayList<>();
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            int lastRowNum = sheet.getLastRowNum();
            if (lastRowNum > 5000) {
                throw new BusinessException("IMPORT_FAILED", "File vượt quá số dòng tối đa cho phép (5000 dòng)");
            }
            for (int i = 1; i <= lastRowNum; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                // Auto-detect format:
                //   Old (7 cols): content, A, B, C, D, correct, category
                //   New (8 cols): content, A, B, C, D, E, correct, category
                // If col 6 is a single letter A-E it is the correct answer → new format
                String col5 = getCellValue(row, 5);
                String col6 = getCellValue(row, 6);
                boolean newFormat = col6.matches("[A-E]");
                Question q = Question.builder()
                        .content(getCellValue(row, 0))
                        .optionA(getCellValue(row, 1))
                        .optionB(getCellValue(row, 2))
                        .optionC(getCellValue(row, 3))
                        .optionD(nullIfBlank(getCellValue(row, 4)))
                        .optionE(newFormat ? nullIfBlank(col5) : null)
                        .correctAnswer((newFormat ? col6 : col5).toUpperCase())
                        .category(getCellValue(row, newFormat ? 7 : 6))
                        .isActive(true)
                        .build();
                questions.add(q);
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("IMPORT_FAILED", "Không thể đọc hoặc xử lý file Excel: " + e.getMessage());
        }
        questionRepository.saveAll(questions);
        return questions.size();
    }

    private String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    private String getCellValue(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            default -> "";
        };
    }

    @Transactional
    public Question createQuestion(Map<String, Object> body) {
        Question q = Question.builder()
                .content((String) body.getOrDefault("content", ""))
                .optionA((String) body.getOrDefault("optionA", ""))
                .optionB((String) body.getOrDefault("optionB", ""))
                .optionC((String) body.getOrDefault("optionC", ""))
                .optionD(nullIfBlank((String) body.get("optionD")))
                .optionE(nullIfBlank((String) body.get("optionE")))
                .correctAnswer(((String) body.getOrDefault("correctAnswer", "A")).toUpperCase())
                .category((String) body.getOrDefault("category", ""))
                .isActive(true)
                .build();
        return questionRepository.save(q);
    }

    public byte[] generateTemplate() {
        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Questions");
            CellStyle headerStyle = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            String[] cols = {"content", "optionA", "optionB", "optionC", "optionD", "optionE", "correctAnswer", "category"};
            Row header = sheet.createRow(0);
            for (int i = 0; i < cols.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(cols[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 7000);
            }
            Row example = sheet.createRow(1);
            example.createCell(0).setCellValue("Nội dung câu hỏi mẫu?");
            example.createCell(1).setCellValue("Đáp án A");
            example.createCell(2).setCellValue("Đáp án B");
            example.createCell(3).setCellValue("Đáp án C");
            example.createCell(4).setCellValue("Đáp án D (không bắt buộc)");
            example.createCell(5).setCellValue("");
            example.createCell(6).setCellValue("A");
            example.createCell(7).setCellValue("Phòng chống ma túy");
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new BusinessException("TEMPLATE_ERROR", "Không thể tạo template: " + e.getMessage());
        }
    }

    public List<Question> getAllQuestions() {
        return questionRepository.findAll();
    }

    @Transactional
    public void deleteQuestion(Long id) {
        if (!questionRepository.existsById(id))
            throw new BusinessException("QUESTION_NOT_FOUND", "Không tìm thấy câu hỏi");
        questionRepository.deleteById(id);
    }

    @Transactional
    public Question updateQuestion(Long id, Map<String, Object> body) {
        Question q = questionRepository.findById(id)
                .orElseThrow(() -> new BusinessException("QUESTION_NOT_FOUND", "Không tìm thấy câu hỏi"));
        if (body.containsKey("content")) q.setContent((String) body.get("content"));
        if (body.containsKey("optionA")) q.setOptionA((String) body.get("optionA"));
        if (body.containsKey("optionB")) q.setOptionB((String) body.get("optionB"));
        if (body.containsKey("optionC")) q.setOptionC((String) body.get("optionC"));
        if (body.containsKey("optionD")) q.setOptionD(nullIfBlank((String) body.get("optionD")));
        if (body.containsKey("optionE")) q.setOptionE(nullIfBlank((String) body.get("optionE")));
        if (body.containsKey("correctAnswer")) q.setCorrectAnswer(((String) body.get("correctAnswer")).toUpperCase());
        if (body.containsKey("category")) q.setCategory((String) body.get("category"));
        if (body.containsKey("isActive")) q.setIsActive((Boolean) body.get("isActive"));
        return questionRepository.save(q);
    }

    public List<ScenarioQuestion> getAllScenarioQuestions() {
        return scenarioQuestionRepository.findAll();
    }

    @Transactional
    public void deleteScenarioQuestion(Long id) {
        if (!scenarioQuestionRepository.existsById(id))
            throw new BusinessException("QUESTION_NOT_FOUND", "Không tìm thấy câu hỏi tình huống");
        scenarioQuestionRepository.deleteById(id);
    }

    @Transactional
    public ScenarioQuestion createScenarioQuestion(Map<String, Object> body) {
        int nextOrder = (int) scenarioQuestionRepository.count() + 1;
        ScenarioQuestion q = ScenarioQuestion.builder()
                .title((String) body.getOrDefault("title", ""))
                .description(nullIfBlank((String) body.get("description")))
                .videoUrl((String) body.getOrDefault("videoUrl", ""))
                .optionA((String) body.getOrDefault("optionA", ""))
                .optionB((String) body.getOrDefault("optionB", ""))
                .optionC((String) body.getOrDefault("optionC", ""))
                .optionD(nullIfBlank((String) body.get("optionD")))
                .optionE(nullIfBlank((String) body.get("optionE")))
                .correctAnswer(((String) body.getOrDefault("correctAnswer", "A")).toUpperCase())
                .displayOrder(nextOrder)
                .isActive(true)
                .build();
        return scenarioQuestionRepository.save(q);
    }

    @Transactional
    public ScenarioQuestion updateScenarioQuestion(Long id, Map<String, Object> body) {
        ScenarioQuestion q = scenarioQuestionRepository.findById(id)
                .orElseThrow(() -> new BusinessException("QUESTION_NOT_FOUND", "Không tìm thấy câu hỏi tình huống"));
        if (body.containsKey("title")) q.setTitle((String) body.get("title"));
        if (body.containsKey("description")) q.setDescription((String) body.get("description"));
        if (body.containsKey("videoUrl")) q.setVideoUrl((String) body.get("videoUrl"));
        if (body.containsKey("optionA")) q.setOptionA((String) body.get("optionA"));
        if (body.containsKey("optionB")) q.setOptionB((String) body.get("optionB"));
        if (body.containsKey("optionC")) q.setOptionC((String) body.get("optionC"));
        if (body.containsKey("optionD")) q.setOptionD(nullIfBlank((String) body.get("optionD")));
        if (body.containsKey("optionE")) q.setOptionE(nullIfBlank((String) body.get("optionE")));
        if (body.containsKey("correctAnswer")) q.setCorrectAnswer(((String) body.get("correctAnswer")).toUpperCase());
        if (body.containsKey("isActive")) q.setIsActive((Boolean) body.get("isActive"));
        return scenarioQuestionRepository.save(q);
    }
}

