# Frontend Task Request Template

Use this template for frontend implementation tasks in `frontend/`.

```md
Read `AGENTS.md` first, then follow `.codex/rules/frontend.md` and the relevant workflow.

Objective:
- Describe the UI, state, or frontend integration task.

Scope:
- Frontend only.
- List the pages, components, API clients, hooks, or stores in scope.

Product Context:
- Link the source of truth document or describe the expected user behavior.
- State the user flow that should change.

Technical Constraints:
- Reuse existing API clients in `frontend/src/api`.
- Reuse existing route and store patterns where possible.
- Avoid broad visual redesign unless explicitly requested.
- Do not move backend logic into frontend code.

Expected Changes:
- Page or component updates
- API client additions or updates
- Store or hook changes
- Routing or form behavior changes
- Error and loading state handling

Done Criteria:
- Describe what the user can do when complete.
- State what verification should be run.
- Mention any manual browser checks that still matter.
```

## Example

```md
Read `AGENTS.md` first, then follow `.codex/rules/frontend.md`.

Objective:
- Add OTP request and verification UI to the exam registration flow.

Scope:
- Frontend only.
- `src/app/pages`, `src/api`, and any small supporting components in scope.

Product Context:
- Follow `docs/anti-spam-plan.md`.
- Users must verify OTP before they can start the exam.

Technical Constraints:
- Reuse existing API wrapper structure.
- Keep the current design language.
- Do not redesign unrelated pages.

Expected Changes:
- Add OTP request and verify interactions to the registration flow.
- Add API client methods for OTP endpoints.
- Show validation, loading, and error states clearly.

Done Criteria:
- A user can request OTP, enter OTP, and proceed only after successful verification.
- Frontend build passes if possible.
- Manual smoke-test notes are included if needed.
```
