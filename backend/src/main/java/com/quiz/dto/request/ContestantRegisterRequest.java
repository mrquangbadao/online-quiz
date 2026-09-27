package com.quiz.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ContestantRegisterRequest {

    @NotBlank
    @Size(max = 200, message = "Full name must not exceed 200 characters")
    private String fullName;

    @NotBlank
    @Size(max = 200, message = "Unit name must not exceed 200 characters")
    private String unit;

    @NotBlank
    @Pattern(regexp = "^0[0-9]{9}$", message = "Phone number is invalid")
    private String phone;

    @NotBlank
    @Email
    @Size(max = 200)
    private String email;

    @NotBlank
    @Size(max = 255)
    private String verificationToken;
}
