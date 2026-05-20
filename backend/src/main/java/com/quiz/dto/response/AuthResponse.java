package com.quiz.dto.response;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class AuthResponse {
    private String token;
    private long expiresIn;
    private String username;
    private String fullName;
}
