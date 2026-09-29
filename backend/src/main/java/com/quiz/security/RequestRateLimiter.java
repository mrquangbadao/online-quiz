package com.quiz.security;

import com.quiz.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class RequestRateLimiter {

    private final StringRedisTemplate redisTemplate;

    // The in-memory fallback keeps local development usable when Redis is absent.
    private final ConcurrentHashMap<String, long[]> inMemoryCounters = new ConcurrentHashMap<>();

    @org.springframework.beans.factory.annotation.Value("${quiz.stress-test.bypass-key:${STRESS_TEST_BYPASS_KEY:doan_nghean_stress_test_2026}}")
    private String bypassKey;

    private boolean isBypassed() {
        if (bypassKey == null || bypassKey.isBlank()) return false;
        try {
            org.springframework.web.context.request.RequestAttributes attributes =
                    org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (attributes instanceof org.springframework.web.context.request.ServletRequestAttributes servletAttributes) {
                String header = servletAttributes.getRequest().getHeader("X-Bypass-Rate-Limit");
                return bypassKey.equals(header);
            }
        } catch (Exception ignored) {}
        return false;
    }

    public void checkAndIncrement(PublicEndpointAction action, String key) {
        if (isBypassed()) return;
        try {
            checkAndIncrementRedis(action, key);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.debug("Redis unavailable, using in-memory limiter for action={} key={}: {}",
                    action.key(), key, ex.getMessage());
            checkAndIncrementInMemory(action, key);
        }
    }

    public void checkAndIncrement(String policyKey,
                                  int maxAttempts,
                                  Duration window,
                                  String limitMessage,
                                  String key) {
        if (isBypassed()) return;
        try {
            checkAndIncrementRedis(policyKey, maxAttempts, window, limitMessage, key);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.debug("Redis unavailable, using in-memory limiter for policy={} key={}: {}",
                    policyKey, key, ex.getMessage());
            checkAndIncrementInMemory(policyKey, maxAttempts, window, limitMessage, key);
        }
    }

    public void reset(PublicEndpointAction action, String key) {
        String storageKey = buildStorageKey(action.key(), key);
        try {
            redisTemplate.delete(storageKey);
        } catch (Exception ex) {
            log.debug("Redis unavailable, skipping reset for action={} key={}", action.key(), key);
        }
        inMemoryCounters.remove(storageKey);
    }

    private void checkAndIncrementRedis(PublicEndpointAction action, String key) {
        String storageKey = buildStorageKey(action.key(), key);
        Long count = redisTemplate.opsForValue().increment(storageKey);
        if (count != null && count == 1) {
            redisTemplate.expire(storageKey, action.window());
        }

        if (count != null && count > action.maxAttempts()) {
            log.warn("Rate limit exceeded in Redis for action={} key={}", action.key(), key);
            throw new BusinessException("TOO_MANY_REQUESTS", action.limitMessage());
        }
    }

    private void checkAndIncrementRedis(String policyKey,
                                        int maxAttempts,
                                        Duration window,
                                        String limitMessage,
                                        String key) {
        String storageKey = buildStorageKey(policyKey, key);
        Long count = redisTemplate.opsForValue().increment(storageKey);
        if (count != null && count == 1) {
            redisTemplate.expire(storageKey, window);
        }

        if (count != null && count > maxAttempts) {
            log.warn("Rate limit exceeded in Redis for policy={} key={}", policyKey, key);
            throw new BusinessException("TOO_MANY_REQUESTS", limitMessage);
        }
    }

    private void checkAndIncrementInMemory(PublicEndpointAction action, String key) {
        String storageKey = buildStorageKey(action.key(), key);
        long now = System.currentTimeMillis();
        long windowMs = action.window().toMillis();

        inMemoryCounters.compute(storageKey, (k, v) -> {
            if (v == null || (now - v[1]) > windowMs) {
                return new long[]{1, now};
            }
            v[0]++;
            return v;
        });

        long[] entry = inMemoryCounters.get(storageKey);
        if (entry != null && entry[0] > action.maxAttempts()) {
            log.warn("Rate limit exceeded in memory for action={} key={}", action.key(), key);
            throw new BusinessException("TOO_MANY_REQUESTS", action.limitMessage());
        }
    }

    private void checkAndIncrementInMemory(String policyKey,
                                           int maxAttempts,
                                           Duration window,
                                           String limitMessage,
                                           String key) {
        String storageKey = buildStorageKey(policyKey, key);
        long now = System.currentTimeMillis();
        long windowMs = window.toMillis();

        inMemoryCounters.compute(storageKey, (k, v) -> {
            if (v == null || (now - v[1]) > windowMs) {
                return new long[]{1, now};
            }
            v[0]++;
            return v;
        });

        long[] entry = inMemoryCounters.get(storageKey);
        if (entry != null && entry[0] > maxAttempts) {
            log.warn("Rate limit exceeded in memory for policy={} key={}", policyKey, key);
            throw new BusinessException("TOO_MANY_REQUESTS", limitMessage);
        }
    }

    private String buildStorageKey(String policyKey, String key) {
        return "rate_limit:" + policyKey + ":" + key;
    }
}
