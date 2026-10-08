# Post-Code Quality Checklist

Use this checklist after code changes are complete and before considering the task done.

## 1. Correctness
- Does the code fully satisfy the requested behavior?
- Does it handle the main success path and the expected failure paths?
- Are edge cases covered, especially around empty input, null values, invalid state, and retries?
- Did the change accidentally alter existing behavior outside the task scope?

## 2. Architecture And Design
- Does the change follow the repository's existing architecture and layering?
- Is the logic placed in the correct layer, not leaking business rules into controllers or UI?
- Is the design simple enough, or did the change introduce unnecessary abstraction?
- Is duplicated logic reduced rather than increased?

## 3. Readability And Maintainability
- Are names clear, consistent, and intention-revealing?
- Is the code easy to review without reconstructing the whole flow mentally?
- Are functions and classes still at a reasonable size and responsibility?
- Are English comments present for non-trivial logic, constraints, invariants, and security-sensitive behavior?
- Do comments explain intent rather than restate obvious syntax?

## 4. Data Integrity
- Are important invariants enforced in the right place?
- If uniqueness or consistency matters, is it protected at the database level as well as in application logic where needed?
- Are normalization rules applied consistently for identifiers such as email or phone?
- Is the code safe against duplicate writes, race conditions, and partial updates?
- If the code updates retry counters, OTP state, lock state, or audit-relevant state before throwing an exception, does the transaction configuration preserve the intended commit behavior?

## 5. API And Contract Safety
- Are request and response contracts still consistent?
- Were DTOs, types, validation rules, and API clients updated together?
- Are error responses clear and aligned with existing conventions?
- If behavior changed, is backward compatibility intentionally handled or intentionally broken with clear reasoning?

## 6. Security And Abuse Resistance
- Can the feature be bypassed through another endpoint or code path?
- Are authentication, authorization, rate limit, CAPTCHA, OTP, and validation checks applied where needed?
- Is the code trusting client input too much?
- Are secrets, tokens, OTP values, and internal error details handled safely?
- Are logs free of sensitive data that should not be stored?

## 7. Operational Quality
- Are important events logged with enough context to debug issues?
- Are metrics, audit signals, or abuse signals captured where relevant?
- Does the code fail safely when external dependencies are unavailable?
- Are new environment variables, config keys, and defaults documented or wired correctly?

## 8. Performance And Scalability
- Did the change add avoidable database queries, repeated remote calls, or heavy loops?
- Are indexes or query patterns still appropriate for the new access path?
- Could this logic become a bottleneck under repeated or abusive traffic?
- Is there any obvious memory or resource leak risk?

## 9. Tests And Verification
- Were the right automated checks run for the touched area?
- Are there missing tests for new business rules, failure modes, or regressions?
- Is there a manual verification path for behavior that automation does not cover?
- If tests were not run, is that stated explicitly?

## 10. Scope Discipline
- Did the change stay within the requested scope?
- Were unrelated refactors avoided?
- Were old files, migrations, or conventions left intact unless the task required changing them?
- Is every changed file justified by the task?

## 11. Final Reviewer Questions
- If another senior engineer reviewed this diff, what would they challenge first?
- Is there any part that feels fragile, implicit, or under-explained?
- Is there any missing guardrail that would be painful to add later?
- Would this still be understandable in three months without extra verbal context?

## 12. Deployment Safety
- NEVER automatically run VPS rebuild or deploy scripts (such as `.\rebuild-vps.ps1`, remote SSH docker restart) without explicit user approval.
- Always report what was verified locally and ask or wait for the user's explicit confirmation before triggering any deployment to VPS.

## Required Final Output
- What was changed
- What was verified
- What risks remain
- What was not verified

## Commenting Rule
- Use English comments only.
- Add comments where the code would otherwise hide business intent or constraints.
- Always comment security-sensitive logic, state transitions, data invariants, fallback logic, and non-obvious branching.
- Avoid line-by-line narration comments.
