# Backend Feature Request Template

Use this template for backend implementation tasks in `backend/`.

```md
Read `AGENTS.md` first, then follow `.codex/rules/backend.md` and the relevant workflow.

Objective:
- Describe the backend feature to implement.

Scope:
- Backend only.
- List the packages, layers, or files that are likely in scope.

Business Context:
- Link the source of truth document or describe the current behavior.
- State any business rules that must be enforced.

Technical Constraints:
- Keep existing controller -> service -> repository structure.
- Keep `ApiResponse` response format.
- Use Flyway for schema changes.
- Reuse existing exception and validation patterns.
- Do not change unrelated endpoints or refactor broadly.

Expected Changes:
- Endpoint additions or updates
- DTO additions or updates
- Service or repository changes
- Entity or migration changes
- Config or security updates if needed

Done Criteria:
- List the required backend behavior when complete.
- State what verification should be run.
- Call out any manual checks if automated checks are not enough.
```

## Example

```md
Read `AGENTS.md` first, then follow `.codex/rules/backend.md` and `.codex/rules/security.md`.

Objective:
- Implement email OTP request and verification for exam registration.

Scope:
- Backend only.
- `controller`, `service`, `repository`, `entity`, `dto`, and Flyway migration files are in scope.

Business Context:
- Follow `docs/anti-spam-plan.md`.
- OTP must expire, be attempt-limited, and be required before exam entry.

Technical Constraints:
- Keep `ApiResponse`.
- Store hashed OTP values.
- Reuse `BusinessException` and existing Spring validation patterns.
- Do not implement frontend in this task.

Expected Changes:
- Add `request-otp` and `verify-otp` endpoints.
- Add OTP persistence model and migration.
- Add service logic for TTL, attempts, and used status.

Done Criteria:
- OTP request and verification endpoints work.
- Expired or over-attempt OTPs are rejected.
- Backend verification is run if possible.
```
