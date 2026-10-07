package com.quiz.dto.live;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveQuestionDto {
    private Long id;
    private Long sessionId;
    private Integer questionOrder;
    private String title;
    private String videoUrl;
    private String videoType;
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private String correctOption; // null when sent to mobile during answering phase
    private String explanation;
    private Integer timeLimitSeconds;

    // Danh sách 4 phương án sau khi xáo trộn riêng cho thí sinh
    private List<ShuffledOption> shuffledOptions;

    // Trạng thái đã trả lời của thí sinh (phục vụ F5 / mất mạng tải lại)
    private Boolean hasAnswered;
    private String playerSelectedOption;
    private Long playerResponseTimeMs;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShuffledOption {
        private String originalKey; // 'A', 'B', 'C', 'D' (dùng để gửi câu trả lời lên server)
        private String content;     // Nội dung text hiển thị
    }
}
