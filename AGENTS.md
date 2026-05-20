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

## Routing
- For project context, read `.codex/context/project-overview.md`.
- For backend work, read `.codex/rules/backend.md`.
- For frontend work, read `.codex/rules/frontend.md`.
- For auth, rate limit, OTP, and abuse controls, read `.codex/rules/security.md`.
- For execution style, read the relevant file in `.codex/workflows/`.
- For prompt drafting, use `.codex/templates/task-prompt-template.md`.

## Task Selection
- Feature implementation: use `.codex/workflows/implement-feature.md`.
- Bug fix: use `.codex/workflows/fix-bug.md`.
- Code review: use `.codex/workflows/review-change.md`.
- Planning from business docs: use `.codex/workflows/plan-from-doc.md`.
