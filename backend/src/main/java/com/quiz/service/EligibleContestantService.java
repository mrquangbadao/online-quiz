package com.quiz.service;

import com.quiz.dto.response.EligibleContestantResponse;
import com.quiz.entity.EligibleContestant;

import java.util.List;

public interface EligibleContestantService {

    List<EligibleContestantResponse> getPublicEligibleList();

    List<EligibleContestantResponse> getAdminEligibleList();

    EligibleContestant validateAndMatchContestant(Long eligibleContestantId, String fullName, String unit);

    void markAsRegistered(EligibleContestant eligibleContestant, Long contestantId, String phone, String email);

    EligibleContestantResponse createEligibleContestant(com.quiz.dto.request.EligibleContestantRequest request);

    EligibleContestantResponse updateEligibleContestant(Long id, com.quiz.dto.request.EligibleContestantRequest request);

    void deleteEligibleContestant(Long id);

    void resetContestantRegistration(Long id);

    void resetAllContestantRegistrations();
}
