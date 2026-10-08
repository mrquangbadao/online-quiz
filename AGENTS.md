# AGENTS.md

## Purpose
- This repository uses `AGENTS.md` as the primary instruction file for Codex-style agents.
- Read this file first, then load only the referenced `.codex` files that are relevant to the current task.

## Project Map
- `backend/`: Spring Boot 3, Java 17, Maven, JPA, Flyway, PostgreSQL, Redis.
- `frontend/`: React, Vite, TypeScript.
- `docs/`: business specs and implementation plans.

## Operating Rules
- Prefer minimal, targeted changes over broad refactors.
- Read the existing code path before editing.
- Follow existing naming and response conventions unless the task explicitly changes them.
- Do not change database schema outside Flyway migrations.
- Treat `docs/anti-spam-plan.md` as the source of truth for anti-spam and OTP work unless the user overrides it.
- After code changes, run the narrowest useful verification available for the touched area.
- Add clear English comments for non-trivial code so intent, constraints, and flow are easy to review later.
- Before coding, follow the pre-code checklist in `.codex/checklists/pre-code-senior-checklist.md`.
- Before considering a task complete, run `.codex/checklists/post-code-quality-checklist.md`.
- NEVER automatically rebuild or deploy to VPS (e.g., `.\rebuild-vps.ps1`, SSH deployment, or production restart scripts) without explicit approval from the user. Verify and build locally, and wait for the user to explicitly request or approve VPS deployment.

## Routing
- For project context, read `.codex/context/project-overview.md`.
- For backend work, read `.codex/rules/backend.md`.
- For frontend work, read `.codex/rules/frontend.md`.
- For auth, rate limit, OTP, and abuse controls, read `.codex/rules/security.md`.
- Before implementation, read `.codex/checklists/pre-code-senior-checklist.md`.
- Before finishing implementation or review, read `.codex/checklists/post-code-quality-checklist.md`.
- For execution style, read the relevant file in `.codex/workflows/`.
- For prompt drafting, use `.codex/templates/task-prompt-template.md`.

## Task Selection
- Feature implementation: use `.codex/workflows/implement-feature.md`.
- Bug fix: use `.codex/workflows/fix-bug.md`.
- Code review: use `.codex/workflows/review-change.md`.
- Planning from business docs: use `.codex/workflows/plan-from-doc.md`.
