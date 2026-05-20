package com.quiz.service;

import com.quiz.dto.request.ExamStartRequest;
import com.quiz.dto.request.ExamSubmitRequest;
import com.quiz.dto.response.ExamResultResponse;
import com.quiz.dto.response.ExamStartResponse;

public interface ExamService {
  ExamStartResponse startExam(ExamStartRequest request);
  ExamResultResponse submitExam(Long examId, ExamSubmitRequest request);
  long getActiveExamCount();
}
