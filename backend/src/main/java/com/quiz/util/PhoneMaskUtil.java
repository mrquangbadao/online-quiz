package com.quiz.util;

public final class PhoneMaskUtil {

    private PhoneMaskUtil() {}

    /**
     * Masks a phone number showing only the first 2 and last 3 digits.
     * Example: "0912345678" → "09*****678"
     */
    public static String mask(String phone) {
        if (phone == null || phone.length() < 6) return phone;
        int keep = 2, tail = 3;
        int stars = phone.length() - keep - tail;
        return phone.substring(0, keep) + "*".repeat(stars) + phone.substring(phone.length() - tail);
    }
}
