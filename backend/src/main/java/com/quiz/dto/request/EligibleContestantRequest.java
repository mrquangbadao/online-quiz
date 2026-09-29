package com.quiz.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EligibleContestantRequest {

    @NotNull(message = "Số thứ tự không được để trống")
    private Integer orderNumber;

    @NotBlank(message = "Họ và tên không được để trống")
    private String fullName;

    @NotBlank(message = "Đơn vị không được để trống")
    private String unit;

    private String scoreWeek1;
    private String scoreWeek2;
    private String scoreWeek3;
    private String scoreWeek4;
    private Integer totalScorePreliminary;

    private String phone;
    private String email;
}
