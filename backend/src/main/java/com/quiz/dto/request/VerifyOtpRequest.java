package com.quiz.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class VerifyOtpRequest {

    @NotBlank
    @Email
    @Size(max = 200)
    private String email;

    @NotBlank
    @Pattern(regexp = "^\\d{6}$", message = "OTP must contain exactly 6 digits")
    private String otp;
}
