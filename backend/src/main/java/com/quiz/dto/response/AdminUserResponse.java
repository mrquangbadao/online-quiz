package com.quiz.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminUserResponse {
    private Long id;
    private String username;
    private String fullName;
    private String role;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
