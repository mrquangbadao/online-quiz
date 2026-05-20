# Task Prompt Template

Use this template when asking Codex to work on the repository.

```md
Objective:
- What needs to be achieved?

Scope:
- Backend only / frontend only / full stack / docs only
- Which folders or files are in scope?

Context:
- Which document or current behavior should Codex follow?

Constraints:
- Conventions to preserve
- Parts not to touch
- Performance or security constraints

Done Criteria:
- What must exist or be true when the task is complete?
- Which verification should be run?
```

## Example

```md
Objective:
- Implement Phase 3 email OTP flow for exam registration.

Scope:
- Backend only.
- Touch controller, service, repository, entity, DTO, and Flyway migration as needed.

Context:
- Follow `docs/anti-spam-plan.md`.

Constraints:
- Keep `ApiResponse` format.
- Reuse existing Spring patterns.
- Do not change frontend yet.

Done Criteria:
- Request OTP and verify OTP endpoints exist.
- OTP is hashed, expiring, and attempt-limited.
- Backend verification is run if possible.
```
