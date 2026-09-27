package com.quiz.service;

import com.quiz.entity.AbuseLog;
import com.quiz.repository.AbuseLogRepository;
import com.quiz.security.PublicEndpointAction;
import com.quiz.security.RequestClientMetadata;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AbuseLogService {

    private final AbuseLogRepository abuseLogRepository;

    public void log(PublicEndpointAction action,
                    RequestClientMetadata metadata,
                    String result,
                    String reason,
                    String email,
                    Long contestantId) {
        try {
            abuseLogRepository.save(AbuseLog.builder()
                    .ip(metadata.clientIp())
                    .userAgent(metadata.userAgent())
                    .deviceId(metadata.deviceId())
                    .endpoint(action.endpoint())
                    .action(action.key())
                    .result(result)
                    .reason(reason)
                    .email(email)
                    .contestantId(contestantId)
                    .build());
        } catch (Exception ex) {
            // Logging failures must not block the primary public endpoint flow.
            log.error("Failed to persist abuse log for action={} endpoint={}: {}",
                    action.key(), action.endpoint(), ex.getMessage(), ex);
        }
    }
}
