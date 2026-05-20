package com.quiz.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ContestantRegisterRequest {

    @NotBlank
    @Size(max = 200, message = "Họ tên không được vượt quá 200 ký tự")
    private String fullName;

    @NotBlank
    @Size(max = 200, message = "Đơn vị không được vượt quá 200 ký tự")
    private String unit;

    @NotBlank
    @Pattern(regexp = "^0[0-9]{9}$", message = "Số điện thoại không hợp lệ")
    private String phone;

    @Size(max = 200)
    private String email;
}

