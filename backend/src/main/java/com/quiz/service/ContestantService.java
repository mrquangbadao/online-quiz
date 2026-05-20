package com.quiz.service;

import com.quiz.dto.request.ContestantRegisterRequest;
import com.quiz.dto.response.ContestantResponse;

public interface ContestantService {
  ContestantResponse register(ContestantRegisterRequest request);
}
