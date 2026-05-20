package com.quiz.service.impl;

import com.quiz.dto.request.LoginRequest;
import com.quiz.dto.response.AuthResponse;
import com.quiz.security.JwtTokenProvider;
import com.quiz.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

  private final AuthenticationManager authenticationManager;
  private final JwtTokenProvider jwtTokenProvider;

  @Override
  public AuthResponse login(LoginRequest request) {
    Authentication auth = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
    );
    UserDetails userDetails = (UserDetails) auth.getPrincipal();
    String token = jwtTokenProvider.generateToken(userDetails.getUsername());
    return AuthResponse.builder()
            .token(token)
            .expiresIn(jwtTokenProvider.getExpirationMs() / 1000)
            .username(userDetails.getUsername())
            .fullName(userDetails.getUsername())
            .build();
  }
}
