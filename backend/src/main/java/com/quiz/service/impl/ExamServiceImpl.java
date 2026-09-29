package com.quiz.service.impl;

import com.quiz.dto.request.ExamDraftAnswerRequest;
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
import com.quiz.repository.EligibleContestantRepository;
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
import java.util.Optional;
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
  private final EligibleContestantRepository eligibleContestantRepository;
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
      throw new BusinessException("ALREADY_PARTICIPATED", "Thí sinh đã nộp bài thi trong đợt thi này.");
    }

    log.info("Starting exam for contestant id={} name={}", contestant.getId(), contestant.getFullName());

    int timeLimitMinutes = (activePhase.getTimeLimitMinutes() != null && activePhase.getTimeLimitMinutes() > 0)
            ? activePhase.getTimeLimitMinutes()
            : settingRepository.findById("exam_time_limit_minutes")
            .map(s -> { try { return Integer.parseInt(s.getValue()); } catch (NumberFormatException e) { return 0; } })
            .orElse(0);

    // If contestant already has an IN_PROGRESS exam, resume that exact exam
    Optional<Exam> existingInProgress = examRepository.findFirstByContestantIdAndStatus(
            contestant.getId(), ExamStatus.IN_PROGRESS);
    if (existingInProgress.isPresent()) {
      Exam inProgress = existingInProgress.get();
      log.info("Resuming existing IN_PROGRESS exam id={} for contestant id={}", inProgress.getId(), contestant.getId());

      String submitToken = java.util.UUID.randomUUID().toString();
      inProgress.setSubmitTokenHash(passwordEncoder.encode(submitToken));
      inProgress.setSubmitTokenExpiresAt(LocalDateTime.now().plusMinutes(timeLimitMinutes > 0 ? timeLimitMinutes + 5 : 120));
      inProgress.setSubmitTokenConsumedAt(null);
      examRepository.save(inProgress);

      List<ExamStartResponse.MCQuestionDto> mcDtos = inProgress.getExamQuestions().stream()
              .sorted(java.util.Comparator.comparingInt(ExamQuestion::getDisplayOrder))
              .map(eq -> {
                Question q = eq.getQuestion();
                return ExamStartResponse.MCQuestionDto.builder()
                        .order(eq.getDisplayOrder())
                        .questionId(q.getId())
                        .content(q.getContent())
                        .optionA(q.getOptionA())
                        .optionB(q.getOptionB())
                        .optionC(q.getOptionC())
                        .optionD(q.getOptionD())
                        .optionE(q.getOptionE())
                        .build();
              }).collect(Collectors.toList());

      Map<String, String> draftMap = examAnswerRepository.findByExamId(inProgress.getId()).stream()
              .filter(a -> a.getSelectedAnswer() != null)
              .collect(Collectors.toMap(
                      a -> a.getQuestionType() + "-" + a.getQuestionId(),
                      ExamAnswer::getSelectedAnswer,
                      (ex, rep) -> rep
              ));

      return ExamStartResponse.builder()
              .examId(inProgress.getId())
              .submitToken(submitToken)
              .startTime(inProgress.getStartTime())
              .timeLimitMinutes(timeLimitMinutes)
              .multipleChoiceQuestions(mcDtos)
              .scenarioQuestions(List.of())
              .draftAnswers(draftMap)
              .isResumed(true)
              .build();
    }

    int questionCount = (activePhase.getMcQuestionCount() != null && activePhase.getMcQuestionCount() > 0)
            ? activePhase.getMcQuestionCount()
            : mcQuestionCount;

    List<Question> mcQuestions = questionRepository.findRandomActiveQuestions(questionCount);
    List<ScenarioQuestion> scenarioQuestions = Boolean.FALSE.equals(activePhase.getHasScenarios())
            ? List.of()
            : scenarioQuestionRepository.findByIsActiveTrueOrderByDisplayOrderAsc();

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
    Exam exam = examRepository.findById(examId)
            .orElseThrow(() -> new BusinessException("EXAM_NOT_FOUND", "Bài thi không tồn tại hoặc đã nộp"));

    // If the exam was already submitted (e.g. auto-submitted when admin closed the phase), return existing result
    if (exam.getStatus() == ExamStatus.SUBMITTED) {
      log.info("Exam id={} was already submitted. Returning existing result to client.", examId);
      return ExamResultResponse.builder()
              .examId(exam.getId())
              .mcScore(exam.getMcScore() != null ? exam.getMcScore() : 0)
              .scenarioScore(exam.getScenarioScore() != null ? exam.getScenarioScore() : 0)
              .totalScore(exam.getTotalScore() != null ? exam.getTotalScore() : 0)
              .durationSeconds(exam.getDurationSeconds() != null ? exam.getDurationSeconds() : 0)
              .prediction(exam.getPrediction() != null ? exam.getPrediction() : 0)
              .build();
    }

    if (exam.getStatus() != ExamStatus.IN_PROGRESS) {
      throw new BusinessException("EXAM_NOT_FOUND", "Bài thi không ở trạng thái làm bài");
    }

    LocalDateTime now = LocalDateTime.now();
    if (exam.getSubmitTokenHash() == null || exam.getSubmitTokenConsumedAt() != null ||
            (exam.getSubmitTokenExpiresAt() != null && exam.getSubmitTokenExpiresAt().isBefore(now)) ||
            !passwordEncoder.matches(request.getSubmitToken(), exam.getSubmitTokenHash())) {
      throw new BusinessException("INVALID_SUBMIT_TOKEN", "Token nộp bài không hợp lệ hoặc đã hết hạn");
    }
    exam.setSubmitTokenConsumedAt(now);

    log.info("Submitting exam id={} for contestant id={}", examId, exam.getContestant().getId());

    int limitMinutes = (exam.getPhase() != null && exam.getPhase().getTimeLimitMinutes() != null && exam.getPhase().getTimeLimitMinutes() > 0)
            ? exam.getPhase().getTimeLimitMinutes()
            : settingRepository.findById("exam_time_limit_minutes")
            .map(s -> { try { return Integer.parseInt(s.getValue()); } catch (NumberFormatException e) { return 0; } })
            .orElse(0);
    if (limitMinutes > 0) {
      long allowedSeconds = (long) limitMinutes * 60;
      long elapsed = java.time.temporal.ChronoUnit.SECONDS.between(exam.getStartTime(), LocalDateTime.now());
      if (elapsed > allowedSeconds + 180) {
        log.warn("Exam id={} submitted late (elapsed={}s > allowed={}s + grace). Auto-grading answers and accepting.",
                examId, elapsed, allowedSeconds);
        gradeAndSubmitExam(exam, LocalDateTime.now(), allowedSeconds);
        return ExamResultResponse.builder()
                .examId(exam.getId())
                .mcScore(exam.getMcScore() != null ? exam.getMcScore() : 0)
                .scenarioScore(exam.getScenarioScore() != null ? exam.getScenarioScore() : 0)
                .totalScore(exam.getTotalScore() != null ? exam.getTotalScore() : 0)
                .durationSeconds(allowedSeconds)
                .prediction(exam.getPrediction() != null ? exam.getPrediction() : 0)
                .build();
      }
    }

    LocalDateTime endTime = LocalDateTime.now();
    long duration = ChronoUnit.SECONDS.between(exam.getStartTime(), endTime);

    Map<Long, String> mcAnswerKey = exam.getExamQuestions().stream()
            .collect(Collectors.toMap(eq -> eq.getQuestion().getId(), eq -> eq.getQuestion().getCorrectAnswer()));

    Map<Long, String> scenarioAnswerKey = (exam.getPhase() != null && Boolean.FALSE.equals(exam.getPhase().getHasScenarios()))
            ? Map.of()
            : scenarioQuestionRepository.findByIsActiveTrueOrderByDisplayOrderAsc()
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

    // Clean up draft answers if any to avoid duplicates
    List<ExamAnswer> existingDrafts = examAnswerRepository.findByExamId(exam.getId());
    if (!existingDrafts.isEmpty()) {
      examAnswerRepository.deleteAll(existingDrafts);
      examAnswerRepository.flush();
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
  @Transactional
  public void saveDraftAnswer(Long examId, ExamDraftAnswerRequest request) {
    Exam exam = examRepository.findByIdAndStatus(examId, ExamStatus.IN_PROGRESS)
            .orElseThrow(() -> new BusinessException("EXAM_NOT_FOUND", "Bài thi không tồn tại hoặc đã nộp"));

    String correctAnswer = null;
    if ("MC".equals(request.getQuestionType())) {
      correctAnswer = exam.getExamQuestions().stream()
              .filter(eq -> eq.getQuestion().getId().equals(request.getQuestionId()))
              .map(eq -> eq.getQuestion().getCorrectAnswer())
              .findFirst()
              .orElse(null);
    } else if ("SC".equals(request.getQuestionType())) {
      correctAnswer = scenarioQuestionRepository.findById(request.getQuestionId())
              .map(ScenarioQuestion::getCorrectAnswer)
              .orElse(null);
    }

    boolean isCorrect = correctAnswer != null && correctAnswer.equals(request.getSelectedAnswer());

    ExamAnswer answer = examAnswerRepository.findByExamIdAndQuestionIdAndQuestionType(
            examId, request.getQuestionId(), request.getQuestionType())
            .orElseGet(() -> ExamAnswer.builder()
                    .exam(exam)
                    .questionId(request.getQuestionId())
                    .questionType(request.getQuestionType())
                    .build());

    answer.setSelectedAnswer(request.getSelectedAnswer());
    answer.setIsCorrect(isCorrect);
    examAnswerRepository.save(answer);
  }

  @Override
  @Transactional
  public void autoSubmitInProgressExamsForPhase(Long phaseId) {
    List<Exam> inProgressExams = examRepository.findByPhaseIdAndStatus(phaseId, ExamStatus.IN_PROGRESS);
    if (inProgressExams.isEmpty()) {
      return;
    }

    LocalDateTime now = LocalDateTime.now();
    for (Exam exam : inProgressExams) {
      gradeAndSubmitExam(exam, now, 0);
    }
  }

  @Override
  @Transactional
  public void autoSubmitOverdueExams() {
    List<Exam> inProgressExams = examRepository.findByStatus(ExamStatus.IN_PROGRESS);
    if (inProgressExams.isEmpty()) {
      return;
    }

    int defaultLimitMinutes = settingRepository.findById("exam_time_limit_minutes")
            .map(s -> {
              try { return Integer.parseInt(s.getValue()); }
              catch (NumberFormatException e) { return 0; }
            }).orElse(0);

    LocalDateTime now = LocalDateTime.now();
    for (Exam exam : inProgressExams) {
      int limitMinutes = (exam.getPhase() != null && exam.getPhase().getTimeLimitMinutes() != null && exam.getPhase().getTimeLimitMinutes() > 0)
              ? exam.getPhase().getTimeLimitMinutes()
              : defaultLimitMinutes;

      if (limitMinutes <= 0) continue;

      if (exam.getStartTime() != null) {
        long elapsedSecs = ChronoUnit.SECONDS.between(exam.getStartTime(), now);
        long allowedSecs = (long) limitMinutes * 60;
        // Auto-grade if elapsed exceeds time limit + 30s grace
        if (elapsedSecs >= allowedSecs + 30) {
          log.info("Auto-grading overdue exam id={} for contestant id={} (elapsed={}s >= allowed={}s)",
                  exam.getId(), exam.getContestant().getId(), elapsedSecs, allowedSecs);
          gradeAndSubmitExam(exam, now, allowedSecs);
        }
      }
    }
  }

  private void gradeAndSubmitExam(Exam exam, LocalDateTime now, long maxDurationSeconds) {
    List<ExamAnswer> answers = examAnswerRepository.findByExamId(exam.getId());

    int mcScore = 0;
    int scenarioScore = 0;
    for (ExamAnswer ans : answers) {
      if (Boolean.TRUE.equals(ans.getIsCorrect())) {
        if ("MC".equals(ans.getQuestionType())) {
          mcScore++;
        } else {
          scenarioScore++;
        }
      }
    }

    long duration = exam.getStartTime() != null
            ? Math.max(0, ChronoUnit.SECONDS.between(exam.getStartTime(), now))
            : 0;
    if (maxDurationSeconds > 0 && duration > maxDurationSeconds) {
      duration = maxDurationSeconds;
    }

    exam.setMcScore(mcScore);
    exam.setScenarioScore(scenarioScore);
    exam.setTotalScore(mcScore + scenarioScore);
    exam.setDurationSeconds(duration);
    exam.setEndTime(now);
    exam.setStatus(ExamStatus.SUBMITTED);
    exam.setSubmitTokenConsumedAt(now);
    examRepository.save(exam);
    log.info("Auto-submitted exam id={} for contestant id={} with totalScore={}/{} questions answered",
            exam.getId(), exam.getContestant().getId(), exam.getTotalScore(), answers.size());
  }

  @Override
  public long getActiveExamCount() {
    return examRepository.countByStatus(ExamStatus.IN_PROGRESS);
  }

  @Override
  @Transactional
  public void resetExam(Long examId) {
      Exam exam = examRepository.findById(examId)
              .orElseThrow(() -> new BusinessException("EXAM_NOT_FOUND", "Không tìm thấy bài thi"));

      Contestant contestant = exam.getContestant();
      Long contestantId = contestant != null ? contestant.getId() : null;

      // Delete all answers and questions for this exam, then delete the exam itself.
      examRepository.delete(exam);
      examRepository.flush();

      // If an eligible contestant was linked to this contestantId, reset it too
      if (contestantId != null) {
          eligibleContestantRepository.findFirstByRegisteredContestantId(contestantId)
                  .ifPresent(ec -> {
                      ec.setIsRegistered(false);
                      ec.setPhone(null);
                      ec.setEmail(null);
                      ec.setRegisteredContestantId(null);
                      eligibleContestantRepository.save(ec);
                      log.info("Reset eligible contestant id={} linked to reset examId={}", ec.getId(), examId);
                  });

          // Delete the contestant record so they can register fresh
          contestantRepository.deleteById(contestantId);
          log.info("Deleted contestant id={} after resetting examId={}", contestantId, examId);
      }
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
