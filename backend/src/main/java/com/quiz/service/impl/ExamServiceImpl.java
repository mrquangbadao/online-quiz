package com.quiz.service.impl;

import com.quiz.dto.request.ExamStartRequest;
import com.quiz.dto.request.ExamSubmitRequest;
import com.quiz.dto.response.ExamResultResponse;
import com.quiz.dto.response.ExamStartResponse;
import com.quiz.entity.ContestPhase;
import com.quiz.entity.Contestant;
import com.quiz.entity.Exam;
import com.quiz.entity.ExamAnswer;
import com.quiz.entity.ExamQuestion;
import com.quiz.entity.Question;
import com.quiz.entity.ScenarioQuestion;
import com.quiz.enums.ExamStatus;
import com.quiz.enums.PhaseStatus;
import com.quiz.exception.BusinessException;
import com.quiz.repository.AppSettingRepository;
import com.quiz.repository.ContestPhaseRepository;
import com.quiz.repository.ContestantRepository;
import com.quiz.repository.ExamAnswerRepository;
import com.quiz.repository.ExamRepository;
import com.quiz.repository.QuestionRepository;
import com.quiz.repository.ScenarioQuestionRepository;
import com.quiz.service.ExamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
  private final PasswordEncoder passwordEncoder;

  @Value("${quiz.exam.mc-question-count:10}")
  private int mcQuestionCount;

  @Override
  @Transactional
  public ExamStartResponse startExam(ExamStartRequest request) {
    Contestant contestant = contestantRepository.findById(request.getContestantId())
            .orElseThrow(() -> new BusinessException("CONTESTANT_NOT_FOUND", "Contestant does not exist."));

    ContestPhase activePhase = contestPhaseRepository.findFirstByStatus(PhaseStatus.ACTIVE)
            .orElseThrow(() -> new BusinessException("NO_ACTIVE_PHASE",
                    "The contest phase is not active at the moment."));

    if (contestant.getPhase() == null || !activePhase.getId().equals(contestant.getPhase().getId())) {
      throw invalidStartExamToken();
    }

    validateAndConsumeStartExamToken(contestant, request.getStartExamToken());

    boolean alreadyTaken = examRepository.existsByContestantIdAndStatusIn(
            contestant.getId(), List.of(ExamStatus.SUBMITTED));
    if (alreadyTaken) {
      throw new BusinessException("ALREADY_PARTICIPATED", "Contestant has already submitted an exam.");
    }

    log.info("Starting exam for contestant id={} name={}", contestant.getId(), contestant.getFullName());

    int timeLimitMinutes = settingRepository.findById("exam_time_limit_minutes")
            .map(s -> { try { return Integer.parseInt(s.getValue()); } catch (NumberFormatException e) { return 0; } })
            .orElse(0);

    List<Question> mcQuestions = questionRepository.findRandomActiveQuestions(mcQuestionCount);
    List<ScenarioQuestion> scenarioQuestions = scenarioQuestionRepository.findByIsActiveTrueOrderByDisplayOrderAsc();

    String submitToken = java.util.UUID.randomUUID().toString();
    String submitTokenHash = passwordEncoder.encode(submitToken);

    Exam exam = Exam.builder()
            .contestant(contestant)
            .phase(activePhase)
            .startTime(LocalDateTime.now())
            .submitTokenHash(submitTokenHash)
            .submitTokenExpiresAt(LocalDateTime.now().plusMinutes(timeLimitMinutes > 0 ? timeLimitMinutes + 5 : 120))
            .status(ExamStatus.IN_PROGRESS)
            .build();
    exam = examRepository.save(exam);

    Exam finalExam = exam;
    List<ExamQuestion> examQuestions = IntStream.range(0, mcQuestions.size())
            .mapToObj(i -> ExamQuestion.builder()
                    .exam(finalExam)
                    .question(mcQuestions.get(i))
                    .displayOrder(i + 1)
                    .build())
            .collect(Collectors.toList());
    finalExam.setExamQuestions(examQuestions);

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
            .submitToken(submitToken)
            .startTime(exam.getStartTime())
            .timeLimitMinutes(timeLimitMinutes)
            .multipleChoiceQuestions(mcDtos)
            .scenarioQuestions(scenarioDtos)
            .build();
  }

  @Override
  @Transactional
  public ExamResultResponse submitExam(Long examId, ExamSubmitRequest request) {
    Exam exam = examRepository.findByIdAndStatusForUpdate(examId, ExamStatus.IN_PROGRESS)
            .orElseThrow(() -> new BusinessException("EXAM_NOT_FOUND", "Bài thi không hợp lệ hoặc đã nộp"));

    LocalDateTime now = LocalDateTime.now();
    if (exam.getSubmitTokenHash() == null || exam.getSubmitTokenConsumedAt() != null ||
            (exam.getSubmitTokenExpiresAt() != null && exam.getSubmitTokenExpiresAt().isBefore(now)) ||
            !passwordEncoder.matches(request.getSubmitToken(), exam.getSubmitTokenHash())) {
      throw new BusinessException("INVALID_SUBMIT_TOKEN", "Token nộp bài không hợp lệ hoặc đã hết hạn");
    }
    exam.setSubmitTokenConsumedAt(now);

    log.info("Submitting exam id={} for contestant id={}", examId, exam.getContestant().getId());

    int limitMinutes = settingRepository.findById("exam_time_limit_minutes")
            .map(s -> { try { return Integer.parseInt(s.getValue()); } catch (NumberFormatException e) { return 0; } })
            .orElse(0);
    if (limitMinutes > 0) {
      long allowedSeconds = (long) limitMinutes * 60;
      long elapsed = java.time.temporal.ChronoUnit.SECONDS.between(exam.getStartTime(), LocalDateTime.now());
      if (elapsed > allowedSeconds + 180) {
        exam.setStatus(ExamStatus.EXPIRED);
        examRepository.save(exam);
        throw new BusinessException("EXAM_EXPIRED", "Hết thời gian làm bài. Bài thi không được tính.");
      }
    }

    LocalDateTime endTime = LocalDateTime.now();
    long duration = ChronoUnit.SECONDS.between(exam.getStartTime(), endTime);

    Map<Long, String> mcAnswerKey = exam.getExamQuestions().stream()
            .collect(Collectors.toMap(eq -> eq.getQuestion().getId(), eq -> eq.getQuestion().getCorrectAnswer()));

    Map<Long, String> scenarioAnswerKey = scenarioQuestionRepository.findByIsActiveTrueOrderByDisplayOrderAsc()
            .stream().collect(Collectors.toMap(ScenarioQuestion::getId, ScenarioQuestion::getCorrectAnswer));

    int mcScore = 0, scenarioScore = 0;
    List<ExamAnswer> answers = new ArrayList<>();
    java.util.Set<String> processedQuestions = new java.util.HashSet<>();

    for (ExamSubmitRequest.AnswerItem item : request.getAnswers()) {
      String uniqueKey = item.getQuestionType() + "_" + item.getQuestionId();
      if (!processedQuestions.add(uniqueKey)) {
        continue;
      }

      String correctAnswer = "MC".equals(item.getQuestionType())
              ? mcAnswerKey.get(item.getQuestionId())
              : scenarioAnswerKey.get(item.getQuestionId());

      if (correctAnswer == null) {
        continue;
      }

      boolean isCorrect = correctAnswer.equals(item.getSelectedAnswer());
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

  private void validateAndConsumeStartExamToken(Contestant contestant, String providedToken) {
    LocalDateTime now = LocalDateTime.now();

    if (contestant.getStartExamTokenHash() == null
            || contestant.getStartExamTokenExpiresAt() == null
            || contestant.getStartExamTokenConsumedAt() != null
            || contestant.getStartExamTokenExpiresAt().isBefore(now)
            || !passwordEncoder.matches(providedToken, contestant.getStartExamTokenHash())) {
      throw invalidStartExamToken();
    }

    // The token is one-time use and must be consumed before exam creation
    // so replaying the same contestantId cannot start another exam.
    contestant.setStartExamTokenConsumedAt(now);
    contestantRepository.save(contestant);
  }

  private BusinessException invalidStartExamToken() {
    return new BusinessException("START_EXAM_TOKEN_INVALID",
            "The start exam token is invalid or has expired.");
  }
}
