package com.quiz.util;

public final class EmailMaskUtil {

    private EmailMaskUtil() {}

    /**
     * Masks an email address showing only the first 2 and last 2 characters of username,
     * while masking the middle with asterisks (*).
     * Example: "quangnb.premium@gmail.com" → "qu*********um@gmail.com"
     * Example: "ab@gmail.com" → "ab@gmail.com"
     * Example: "abc@gmail.com" → "a*c@gmail.com"
     * Example: "abcd@gmail.com" → "ab*cd@gmail.com"
     */
    public static String mask(String email) {
        if (email == null || email.isBlank()) {
            return "";
        }
        String trimmed = email.trim();
        int atIdx = trimmed.indexOf('@');
        if (atIdx <= 0) {
            return trimmed;
        }

        String username = trimmed.substring(0, atIdx);
        String domain = trimmed.substring(atIdx); // includes '@'

        if (username.length() <= 2) {
            return username + domain;
        }

        if (username.length() <= 4) {
            // e.g. "abc" -> "a*c", "abcd" -> "a**d"
            char first = username.charAt(0);
            char last = username.charAt(username.length() - 1);
            int starCount = username.length() - 2;
            return first + "*".repeat(Math.max(1, starCount)) + last + domain;
        }

        // username.length() > 4
        // Keep first 2 and last 2 characters, mask middle
        String prefix = username.substring(0, 2);
        String suffix = username.substring(username.length() - 2);
        int starCount = username.length() - 4;
        return prefix + "*".repeat(starCount) + suffix + domain;
    }
}
