# Workflow: Implement Feature

## Goal
Ship a bounded feature change with the smallest safe set of edits.

## First Step
- Run `.codex/checklists/pre-code-senior-checklist.md` before planning edits or writing code.

## Steps
1. Read the relevant business doc and existing code path first.
2. Identify touched files before editing.
3. Implement the feature using existing project patterns.
4. Add or update migrations, DTOs, API clients, and tests only where needed.
5. Run `.codex/checklists/post-code-quality-checklist.md` against the completed change.
6. Run the narrowest useful verification for the affected area.
7. Report changed files, verification status, and any unresolved risk.

## Prompt Shape
- Objective
- Scope
- Constraints
- Done criteria

## Example
- "Read `docs/anti-spam-plan.md` and implement Phase 1 in backend only. Reuse existing rate-limiter patterns, add logging fields required by the plan, keep API responses consistent, and run backend verification after changes."
