package com.quiz.service.admin;

import com.quiz.entity.Exam;
import com.quiz.entity.ExamAnswer;
import com.quiz.enums.ExamStatus;
import com.quiz.repository.ExamAnswerRepository;
import com.quiz.repository.ExamRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminReportService {

    private final ExamRepository examRepository;
    private final ExamAnswerRepository examAnswerRepository;

    public record DashboardStats(long totalParticipants, double averageScore,
                                 long perfectScores, long inProgress) {}

    public record UnitStat(String unit, long count) {}

    public DashboardStats getDashboardStats(Long phaseId) {
        long total, ongoing;
        double avg;
        long perfect;
        if (phaseId != null) {
            total = examRepository.countByStatusAndPhaseId(ExamStatus.SUBMITTED, phaseId);
            Double rawAvg = examRepository.findAverageScoreByPhase(phaseId);
            avg = rawAvg != null ? rawAvg : 0;
            perfect = examRepository.findLeaderboardByPhase(phaseId).stream()
                    .filter(e -> e.getTotalScore() == 20).count();
            ongoing = examRepository.countByStatusAndPhaseId(ExamStatus.IN_PROGRESS, phaseId);
        } else {
            total = examRepository.countByStatus(ExamStatus.SUBMITTED);
            Double rawAvg = examRepository.findAverageScore();
            avg = rawAvg != null ? rawAvg : 0;
            perfect = examRepository.findLeaderboard().stream()
                    .filter(e -> e.getTotalScore() == 20).count();
            ongoing = examRepository.countByStatus(ExamStatus.IN_PROGRESS);
        }
        return new DashboardStats(total, avg, perfect, ongoing);
    }

    public List<UnitStat> getUnitStats(Long phaseId) {
        List<Object[]> raw = phaseId != null
                ? examRepository.countSubmittedByUnitAndPhase(phaseId)
                : examRepository.countSubmittedByUnit();
        return raw.stream()
                .map(r -> new UnitStat((String) r[0], (Long) r[1]))
                .toList();
    }

    public byte[] exportExcel() throws IOException {
        List<Exam> exams = examRepository.findLeaderboard();
        try (Workbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Kết quả");
            Row header = sheet.createRow(0);
            String[] cols = {"STT", "Họ tên", "Đơn vị", "SĐT", "Điểm TN", "Điểm TH", "Tổng", "Thời gian (s)", "Dự đoán"};
            for (int i = 0; i < cols.length; i++) {
                header.createCell(i).setCellValue(cols[i]);
            }
            for (int i = 0; i < exams.size(); i++) {
                Exam e = exams.get(i);
                Row row = sheet.createRow(i + 1);
                row.createCell(0).setCellValue(i + 1);
                row.createCell(1).setCellValue(e.getContestant().getFullName());
                row.createCell(2).setCellValue(e.getContestant().getUnit());
                row.createCell(3).setCellValue(e.getContestant().getPhone());
                row.createCell(4).setCellValue(e.getMcScore());
                row.createCell(5).setCellValue(e.getScenarioScore());
                row.createCell(6).setCellValue(e.getTotalScore());
                row.createCell(7).setCellValue(e.getDurationSeconds());
                row.createCell(8).setCellValue(e.getPrediction() != null ? e.getPrediction() : 0);
            }
            wb.write(out);
            return out.toByteArray();
        }
    }
}

