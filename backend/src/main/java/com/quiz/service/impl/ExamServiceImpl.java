package com.quiz.service.impl;

import com.quiz.dto.request.ExamStartRequest;
import com.quiz.dto.request.ExamSubmitRequest;
import com.quiz.dto.response.ExamResultResponse;
import com.quiz.dto.response.ExamStartResponse;
import com.quiz.entity.*;
import com.quiz.enums.ExamStatus;
import com.quiz.enums.PhaseStatus;
import com.quiz.exception.BusinessException;
import com.quiz.repository.*;
import com.quiz.service.ExamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExamServiceImpl implements ExamService {

  private final ContestantRepository contestantRepository;
  private final ExamRepository examRepository;
  private final QuestionRepository questionRepository;
  private final ScenarioQuestionRepository scenarioQuestionRepository;
  private final ExamAnswerRepository examAnswerRepository;
  private final ContestPhaseRepository contestPhaseRepository;
  private final AppSettingRepository settingRepository;

  @Value("${quiz.exam.mc-question-count:10}")
  private int mcQuestionCount;

  @Override
  @Transactional
  public ExamStartResponse startExam(ExamStartRequest request) {
    Contestant contestant = contestantRepository.findById(request.getContestantId())
            .orElseThrow(() -> new BusinessException("CONTESTANT_NOT_FOUND", "Thí sinh không tồn tại"));

    boolean alreadyTaken = examRepository.existsByContestantIdAndStatusIn(
            contestant.getId(), List.of(ExamStatus.SUBMITTED));
    if (alreadyTaken) {
      throw new BusinessException("ALREADY_PARTICIPATED", "Thí sinh đã nộp bài trước đó");
    }

    // Require an active phase — contest must be opened by admin
    ContestPhase activePhase = contestPhaseRepository.findFirstByStatus(PhaseStatus.ACTIVE)
            .orElseThrow(() -> new BusinessException("NO_ACTIVE_PHASE",
                    "Cuộc thi chưa được mở. Vui lòng liên hệ ban tổ chức."));

    log.info("Starting exam for contestant id={} name={}", contestant.getId(), contestant.getFullName());

    // Read time limit from settings
    int timeLimitMinutes = settingRepository.findById("exam_time_limit_minutes")
            .map(s -> { try { return Integer.parseInt(s.getValue()); } catch (NumberFormatException e) { return 0; } })
            .orElse(0);

    List<Question> mcQuestions = questionRepository.findRandomActiveQuestions(mcQuestionCount);
    List<ScenarioQuestion> scenarioQuestions = scenarioQuestionRepository.findByIsActiveTrueOrderByDisplayOrderAsc();

    Exam exam = Exam.builder()
            .contestant(contestant)
            .phase(activePhase)
            .startTime(LocalDateTime.now())
            .status(ExamStatus.IN_PROGRESS)
            .build();
    exam = examRepository.save(exam);

    // Save exam questions mapping
    Exam finalExam = exam;
    List<ExamQuestion> examQuestions = IntStream.range(0, mcQuestions.size())
            .mapToObj(i -> ExamQuestion.builder()
                    .exam(finalExam)
                    .question(mcQuestions.get(i))
                    .displayOrder(i + 1)
                    .build())
            .collect(Collectors.toList());
    finalExam.setExamQuestions(examQuestions);

    // Build response — correctAnswer is intentionally omitted
    List<ExamStartResponse.MCQuestionDto> mcDtos = IntStream.range(0, mcQuestions.size())
            .mapToObj(i -> {
              Question q = mcQuestions.get(i);
              return ExamStartResponse.MCQuestionDto.builder()
                      .order(i + 1)
                      .questionId(q.getId())
                      .content(q.getContent())
                      .optionA(q.getOptionA())
                      .optionB(q.getOptionB())
                      .optionC(q.getOptionC())
                      .optionD(q.getOptionD())
                      .optionE(q.getOptionE())
                      .build();
            }).collect(Collectors.toList());

    List<ExamStartResponse.ScenarioQuestionDto> scenarioDtos = IntStream.range(0, scenarioQuestions.size())
            .mapToObj(i -> {
              ScenarioQuestion sq = scenarioQuestions.get(i);
              return ExamStartResponse.ScenarioQuestionDto.builder()
                      .order(i + 1)
                      .questionId(sq.getId())
                      .title(sq.getTitle())
                      .description(sq.getDescription())
                      .videoUrl(sq.getVideoUrl())
                      .optionA(sq.getOptionA())
                      .optionB(sq.getOptionB())
                      .optionC(sq.getOptionC())
                      .optionD(sq.getOptionD())
                      .optionE(sq.getOptionE())
                      .build();
            }).collect(Collectors.toList());

    return ExamStartResponse.builder()
            .examId(exam.getId())
            .startTime(exam.getStartTime())
            .timeLimitMinutes(timeLimitMinutes)
            .multipleChoiceQuestions(mcDtos)
            .scenarioQuestions(scenarioDtos)
            .build();
  }

  @Override
  @Transactional
  public ExamResultResponse submitExam(Long examId, ExamSubmitRequest request) {
    Exam exam = examRepository.findByIdAndStatus(examId, ExamStatus.IN_PROGRESS)
            .orElseThrow(() -> new BusinessException("EXAM_NOT_FOUND", "Bài thi không hợp lệ hoặc đã nộp"));
    log.info("Submitting exam id={} for contestant id={}", examId, exam.getContestant().getId());

    // Reject if time limit has been exceeded (scheduler may not have run yet)
    int limitMinutes = settingRepository.findById("exam_time_limit_minutes")
            .map(s -> { try { return Integer.parseInt(s.getValue()); } catch (NumberFormatException e) { return 0; } })
            .orElse(0);
    if (limitMinutes > 0) {
      long allowedSeconds = (long) limitMinutes * 60;
      long elapsed = java.time.temporal.ChronoUnit.SECONDS.between(exam.getStartTime(), LocalDateTime.now());
      if (elapsed > allowedSeconds + 180) { // 3-minute grace
        exam.setStatus(ExamStatus.EXPIRED);
        examRepository.save(exam);
        throw new BusinessException("EXAM_EXPIRED", "Hết thời gian làm bài. Bài thi không được tính.");
      }
    }

    LocalDateTime endTime = LocalDateTime.now();
    long duration = ChronoUnit.SECONDS.between(exam.getStartTime(), endTime);

    // Build answer key maps
    Map<Long, String> mcAnswerKey = questionRepository.findAllById(
            exam.getExamQuestions().stream().map(eq -> eq.getQuestion().getId()).collect(Collectors.toList())
    ).stream().collect(Collectors.toMap(Question::getId, Question::getCorrectAnswer));

    Map<Long, String> scenarioAnswerKey = scenarioQuestionRepository.findAll()
            .stream().collect(Collectors.toMap(ScenarioQuestion::getId, ScenarioQuestion::getCorrectAnswer));

    int mcScore = 0, scenarioScore = 0;
    List<ExamAnswer> answers = new ArrayList<>();
    List<ExamResultResponse.AnswerResultDto> resultDtos = new ArrayList<>();

    for (ExamSubmitRequest.AnswerItem item : request.getAnswers()) {
      String correctAnswer = "MC".equals(item.getQuestionType())
              ? mcAnswerKey.get(item.getQuestionId())
              : scenarioAnswerKey.get(item.getQuestionId());

      boolean isCorrect = correctAnswer != null && correctAnswer.equals(item.getSelectedAnswer());
      if (isCorrect) {
        if ("MC".equals(item.getQuestionType())) mcScore++;
        else scenarioScore++;
      }

      answers.add(ExamAnswer.builder()
              .exam(exam)
              .questionId(item.getQuestionId())
              .questionType(item.getQuestionType())
              .selectedAnswer(item.getSelectedAnswer())
              .isCorrect(isCorrect)
              .build());

      resultDtos.add(ExamResultResponse.AnswerResultDto.builder()
              .questionId(item.getQuestionId())
              .questionType(item.getQuestionType())
              .selectedAnswer(item.getSelectedAnswer())
              .correctAnswer(correctAnswer)
              .isCorrect(isCorrect)
              .build());
    }

    examAnswerRepository.saveAll(answers);

    exam.setEndTime(endTime);
    exam.setDurationSeconds(duration);
    exam.setMcScore(mcScore);
    exam.setScenarioScore(scenarioScore);
    exam.setTotalScore(mcScore + scenarioScore);
    exam.setPrediction(request.getPrediction());
    exam.setStatus(ExamStatus.SUBMITTED);
    examRepository.save(exam);

    return ExamResultResponse.builder()
            .examId(exam.getId())
            .mcScore(mcScore)
            .scenarioScore(scenarioScore)
            .totalScore(mcScore + scenarioScore)
            .durationSeconds(duration)
            .prediction(request.getPrediction() != null ? request.getPrediction() : 0)
            .build();
  }

  @Override
  public long getActiveExamCount() {
    return examRepository.countByStatus(ExamStatus.IN_PROGRESS);
  }
}
