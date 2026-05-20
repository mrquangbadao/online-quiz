package com.quiz.service;

import com.quiz.dto.request.LoginRequest;
import com.quiz.dto.response.AuthResponse;

public interface AuthService {
  AuthResponse login(LoginRequest request);
}