package com.quiz.service;

import com.quiz.dto.request.ExamStartRequest;
import com.quiz.dto.request.ExamSubmitRequest;
import com.quiz.dto.response.ExamResultResponse;
import com.quiz.dto.response.ExamStartResponse;

import com.quiz.dto.request.ExamDraftAnswerRequest;

public interface ExamService {
  ExamStartResponse startExam(ExamStartRequest request);
  ExamResultResponse submitExam(Long examId, ExamSubmitRequest request);
  void saveDraftAnswer(Long examId, ExamDraftAnswerRequest request);
  void autoSubmitInProgressExamsForPhase(Long phaseId);
  void autoSubmitOverdueExams();
  long getActiveExamCount();
  void resetExam(Long examId);
}
