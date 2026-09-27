# Workflow: Review Change

## Goal
Review code for correctness, regression risk, and missing coverage.

## First Step
- Use `.codex/checklists/pre-code-senior-checklist.md` as a review lens before writing findings.
- Use `.codex/checklists/post-code-quality-checklist.md` as the final quality gate for judging implementation completeness.

## Review Priorities
- Functional bugs
- Security or abuse-control gaps
- Behavioral regressions
- Missing migration or constraint updates
- Missing or weak verification

## Output Format
1. Findings ordered by severity with file references.
2. Open questions or assumptions.
3. Brief summary only after findings.

## Example
- "Review the OTP implementation against `docs/anti-spam-plan.md`. Focus on bypass paths, data integrity, and missing tests."
