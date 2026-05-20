package com.quiz.controller;

import com.quiz.dto.request.ContestantRegisterRequest;
import com.quiz.dto.response.ApiResponse;
import com.quiz.dto.response.ContestantResponse;
import com.quiz.service.ContestantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/contestant")
@RequiredArgsConstructor
public class ContestantController {

  private final ContestantService contestantService;

  @PostMapping("/register")
  public ResponseEntity<ApiResponse<ContestantResponse>> register(
          @Valid @RequestBody ContestantRegisterRequest request) {
    ContestantResponse response = contestantService.register(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
  }
}
