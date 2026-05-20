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
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 10;
    private static final Duration WINDOW = Duration.ofMinutes(15);

    private final StringRedisTemplate redisTemplate;

    // In-memory fallback when Redis is unavailable (e.g. local Windows dev)
    private final ConcurrentHashMap<String, long[]> inMemoryCounters = new ConcurrentHashMap<>();

    /**
     * Checks and increments the login attempt counter for the given IP.
     * Uses Redis when available, falls back to in-memory counter otherwise.
     * Throws BusinessException(TOO_MANY_REQUESTS) when the limit is exceeded.
     */
    public void checkAndIncrement(String ip) {
        try {
            checkAndIncrementRedis(ip);
        } catch (BusinessException ex) {
            throw ex; // re-throw rate-limit or other business exceptions
        } catch (Exception ex) {
            log.debug("Redis unavailable, using in-memory rate limiter for IP {}: {}", ip, ex.getMessage());
            checkAndIncrementInMemory(ip);
        }
    }

    public void reset(String ip) {
        try {
            redisTemplate.delete("login_attempts:" + ip);
        } catch (Exception ex) {
            log.debug("Redis unavailable, skipping Redis reset for IP: {}", ip);
        }
        inMemoryCounters.remove(ip);
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private void checkAndIncrementRedis(String ip) {
        String key = "login_attempts:" + ip;
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            redisTemplate.expire(key, WINDOW);
        }
        if (count != null && count > MAX_ATTEMPTS) {
            log.warn("Rate limit exceeded (Redis) for IP: {}", ip);
            throw new BusinessException("TOO_MANY_REQUESTS",
                    "Qu\u00e1 nhi\u1ec1u l\u1ea7n \u0111\u0103ng nh\u1eadp th\u1ea5t b\u1ea1i. Vui l\u00f2ng th\u1eed l\u1ea1i sau 15 ph\u00fat.");
        }
    }

    private void checkAndIncrementInMemory(String ip) {
        long now = System.currentTimeMillis();
        long windowMs = WINDOW.toMillis();

        // [0] = attempt count, [1] = window start timestamp
        inMemoryCounters.compute(ip, (k, v) -> {
            if (v == null || (now - v[1]) > windowMs) {
                return new long[]{1, now};
            }
            v[0]++;
            return v;
        });

        long[] entry = inMemoryCounters.get(ip);
        if (entry != null && entry[0] > MAX_ATTEMPTS) {
            log.warn("Rate limit exceeded (in-memory) for IP: {}", ip);
            throw new BusinessException("TOO_MANY_REQUESTS",
                    "Too many requests. Try again after 15 minutes");
        }
    }
}

