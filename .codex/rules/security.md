# Security And Abuse-Control Rules

## Scope
- Applies to login, registration, OTP, CAPTCHA, password reset, and exam entry restrictions.

## Source Of Truth
- Use `docs/anti-spam-plan.md` as the primary business reference for anti-spam and OTP work.
- If code and the plan disagree, surface the mismatch explicitly.

## Implementation Guidance
- Prefer reusable rate-limit components over one-off logic in controllers.
- Capture abuse-relevant metadata consistently: IP, User-Agent, device identifier when available, endpoint, action, timestamp.
- Put hard invariants in the database when possible, such as unique `(email, examId)` constraints.
- Treat OTP as security-sensitive data: store hashes, TTL, attempt counts, and usage status.

## Review Checklist
- Which endpoints are protected?
- Are limits aligned with the current business rule?
- Is there a bypass path through an unprotected endpoint?
- Are failure cases logged appropriately?
- Are admin override paths explicit and controlled?
