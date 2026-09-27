package com.quiz.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RequestOtpRequest {

    @NotBlank
    @Email
    @Size(max = 200)
    private String email;

    @Size(max = 2048)
    private String captchaToken;
}
