package com.quiz.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {

    @NotBlank
    @Size(max = 200)
    private String currentPassword;

    @NotBlank
    @Size(min = 8, max = 200, message = "Mật khẩu mới phải có ít nhất 8 ký tự")
    private String newPassword;
}