package com.quiz.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateAdminUserRequest {

    @NotBlank
    @Size(min = 3, max = 100, message = "Tên đăng nhập phải từ 3 đến 100 ký tự")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Tên đăng nhập chỉ được chứa chữ cái, số và dấu _")
    private String username;

    @NotBlank
    @Size(min = 8, max = 200, message = "Mật khẩu phải có ít nhất 8 ký tự")
    private String password;

    @Size(max = 200)
    private String fullName;
}
