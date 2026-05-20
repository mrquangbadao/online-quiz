# Review Request Template

Use this template when asking Codex to review code, a diff, or an implementation against a spec.

```md
Read `AGENTS.md` first, then follow `.codex/workflows/review-change.md`.

Review Target:
- Describe what should be reviewed.
- Specify files, folders, commits, or feature area if known.

Review Context:
- Link the source of truth document, requirement, or expected behavior.
- Mention whether this is backend, frontend, or full-stack.

Review Priorities:
- Bugs
- Security issues
- Regression risks
- Data integrity or migration gaps
- Missing tests or weak verification

Instructions:
- Findings first, ordered by severity.
- Include file references where possible.
- Keep summary brief and secondary to findings.
- If no findings, state that explicitly and mention residual risks or testing gaps.

Optional Focus:
- List any areas to emphasize, such as rate limit bypasses, OTP integrity, UI edge cases, or admin override paths.
```

## Example

```md
Read `AGENTS.md` first, then follow `.codex/workflows/review-change.md`.

Review Target:
- Review the anti-spam and OTP implementation for the current branch.

Review Context:
- Compare behavior against `docs/anti-spam-plan.md`.
- This is mainly backend, with frontend checks only where the flow depends on them.

Review Priorities:
- Bypass paths on unprotected endpoints
- Incorrect rate-limit thresholds
- Missing unique constraints for one-email-per-exam
- Missing tests or migration gaps

Instructions:
- Findings first, ordered by severity.
- Include concrete file references.
- Keep the summary short.

Optional Focus:
- Pay extra attention to `AuthController`, rate-limiter reuse, and Flyway migration completeness.
```
